"use client";

import React, { useState, useMemo } from "react";
import { useDashboardData } from "../../context/DashboardDataContext";
import { FileScanResult } from "@/app/lib/api";
import { Loader2, RefreshCw, AlertCircle, Info, Calendar, Code2, ShieldAlert } from "lucide-react";

type TimeRangeKey = "7D" | "30D" | "90D" | "6M" | "1Y";

export interface TimelineDataPoint {
  dateKey: string;
  label: string;
  detected: number; // Vulnerabilities disclosed on this date from NIST NVD
  cveIds: string[];
  total_function_call: number; // Real client-side sum of total_calls across files scanned on this date
  scanCount: number;
  files: FileScanResult[]; // Per-file array with each file's total_calls breakdown
  scanRepos: string[];
}

export default function TimelineChart() {
  const { cves, loadingCves, cveError, refreshCves, scanHistory, repositories } = useDashboardData();
  const [selectedRange, setSelectedRange] = useState<TimeRangeKey>("7D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group real CVE records and scan telemetry into continuous calendar day buckets
  const chartData = useMemo<TimelineDataPoint[]>(() => {
    // 1. Parse CVE dates from cves
    const parsedCves: { cveId: string; date: Date; dateKey: string }[] = [];
    for (const c of cves || []) {
      const raw =
        c.publishedAt ||
        (c.detectedAt && c.detectedAt !== "Recently disclosed"
          ? c.detectedAt
          : null);
      if (!raw) continue;
      const d = new Date(raw);
      if (isNaN(d.getTime())) continue;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;
      parsedCves.push({ cveId: c.cveId, date: d, dateKey });
    }

    // 2. Parse Scan dates and per-file total_function_call from scanHistory
    const parsedScans: {
      date: Date;
      dateKey: string;
      repo: string;
      files: FileScanResult[];
      total_function_call: number;
    }[] = [];

    // Collect from scanHistory
    for (const s of scanHistory || []) {
      const d = new Date(s.timestamp || s.dateKey);
      if (isNaN(d.getTime())) continue;
      parsedScans.push({
        date: d,
        dateKey: s.dateKey,
        repo: s.repo,
        files: s.files || [],
        total_function_call: s.total_function_call || 0,
      });
    }

    // Also collect from repositories if a repo has files/total_function_call not yet in scanHistory
    for (const r of repositories || []) {
      if (r.files && r.files.length > 0) {
        const alreadyInScans = parsedScans.some(
          (s) => s.repo.toLowerCase() === `${r.org}/${r.name}`.toLowerCase() || s.repo.toLowerCase() === r.name.toLowerCase()
        );
        if (!alreadyInScans) {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const dd = String(now.getDate()).padStart(2, "0");
          parsedScans.push({
            date: now,
            dateKey: `${yyyy}-${mm}-${dd}`,
            repo: `${r.org}/${r.name}`,
            files: r.files,
            total_function_call: r.total_function_call || 0,
          });
        }
      }
    }

    if (parsedCves.length === 0 && parsedScans.length === 0) return [];

    // Collect all timestamps to find earliest and latest date bounds
    const allTimestamps: number[] = [
      ...parsedCves.map((c) => c.date.getTime()),
      ...parsedScans.map((s) => s.date.getTime()),
    ];

    allTimestamps.sort((a, b) => a - b);
    const earliest = new Date(allTimestamps[0]);
    const latest = new Date(allTimestamps[allTimestamps.length - 1]);
    earliest.setHours(0, 0, 0, 0);
    latest.setHours(0, 0, 0, 0);

    // Calculate span in days (minimum 7-day span ending on latest date)
    const daySpan = Math.round(
      (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)
    );
    const windowDays = Math.max(daySpan + 1, 7);

    const buckets: TimelineDataPoint[] = [];
    const anchorDate = new Date(latest);
    const startDate = new Date(anchorDate);
    startDate.setDate(startDate.getDate() - (windowDays - 1));

    for (let i = 0; i < windowDays; i++) {
      const curr = new Date(startDate);
      curr.setDate(curr.getDate() + i);
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, "0");
      const dd = String(curr.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const label = curr.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      buckets.push({
        dateKey,
        label,
        detected: 0,
        cveIds: [],
        total_function_call: 0,
        scanCount: 0,
        files: [],
        scanRepos: [],
      });
    }

    // Accumulate real CVE counts
    for (const item of parsedCves) {
      const bucket = buckets.find((b) => b.dateKey === item.dateKey);
      if (bucket) {
        bucket.detected += 1;
        bucket.cveIds.push(item.cveId);
      }
    }

    // Accumulate real per-file scan results and client-side total_function_call
    for (const scan of parsedScans) {
      const bucket = buckets.find((b) => b.dateKey === scan.dateKey);
      if (bucket) {
        bucket.total_function_call += scan.total_function_call;
        bucket.scanCount += 1;
        bucket.files.push(...scan.files);
        if (!bucket.scanRepos.includes(scan.repo)) {
          bucket.scanRepos.push(scan.repo);
        }
      }
    }

    return buckets;
  }, [cves, scanHistory, repositories]);

  // Overall totals across the active timeline
  const totalCallsAnalyzed = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.total_function_call, 0);
  }, [chartData]);

  // SVG Chart Geometry Calculations
  const width = 1000;
  const height = 280;
  const paddingX = 55;
  const paddingY = 40;

  // Maximum value across BOTH series (vulnerabilities detected + total function calls analyzed)
  const maxVal = Math.max(
    ...chartData.flatMap((d) => [d.detected, d.total_function_call]),
    0
  );
  // Integer ceiling with headroom so vertices don't clip top SVG border
  const yMax = Math.max(Math.ceil(maxVal * 1.25), 4);

  const getX = (idx: number) => {
    if (chartData.length <= 1) {
      return paddingX + (width - paddingX * 2) / 2;
    }
    return paddingX + (idx / (chartData.length - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) =>
    height - paddingY - (val / yMax) * (height - paddingY * 2);

  // Map to discrete SVG coordinates for both series
  const points = chartData.map((d, i) => ({
    x: getX(i),
    yDetected: getY(d.detected),
    yCalls: getY(d.total_function_call),
    data: d,
  }));

  // Series 1: Vulnerabilities Detected (Amber line)
  const detectedLine =
    points.length > 0
      ? points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.yDetected.toFixed(1)}`)
          .join(" ")
      : "";

  // Series 2: Total Function Calls Analyzed (Cyan line)
  const callsLine =
    points.length > 0
      ? points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.yCalls.toFixed(1)}`)
          .join(" ")
      : "";

  const activeHoverItem = hoveredIndex !== null ? chartData[hoveredIndex] : null;
  const activeHoverPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  // Y-axis tick values (4 steps)
  const yTicks = [
    0,
    Math.round(yMax * 0.33),
    Math.round(yMax * 0.66),
    yMax,
  ];

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card space-y-6">
      {/* Top Header: Title + Range Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider block">
            Security Engine Telemetry
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Vulnerabilities Detected vs. Total Function Calls Analyzed
            {loadingCves && <Loader2 className="w-4 h-4 text-[#ff7300] animate-spin" />}
          </h2>
        </div>

        {/* Time-range toggle pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-pill bg-[#161619] border border-white/[0.06] text-xs">
          {(["7D", "30D", "90D", "6M", "1Y"] as TimeRangeKey[]).map((range) => (
            <button
              key={range}
              onClick={() => {
                setSelectedRange(range);
                setHoveredIndex(null);
              }}
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition-colors ${
                selectedRange === range
                  ? "bg-[#28282a] text-white shadow-sm"
                  : "text-[#8e8e8e] hover:text-white"
              }`}
            >
              {range === "7D" ? "7D (Live)" : range}
            </button>
          ))}
        </div>
      </div>

      {/* Historical Range Notice (if user clicks beyond available 7D backend window) */}
      {selectedRange !== "7D" && (
        <div className="p-3 rounded-control bg-[#1c1815] border border-[#ff7300]/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#ff9540]">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              Backend NIST NVD ingestion streams a 7-day rolling window. Historical archive for <strong>{selectedRange}</strong> is not persisted.
            </span>
          </div>
          <button
            onClick={() => setSelectedRange("7D")}
            className="px-2.5 py-1 rounded-control bg-[#ff7300]/20 text-[#ff7300] hover:bg-[#ff7300]/30 font-medium shrink-0 transition-colors"
          >
            Reset to 7D Live
          </button>
        </div>
      )}

      {/* Legend & Real Ingestion Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 border-t border-white/[0.04]">
        <div className="flex flex-wrap items-center gap-6">
          {/* Series 1: Vulnerabilities Detected */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7300] shadow-[0_0_6px_#ff7300]" />
            <span className="text-white font-medium">Vulnerabilities Detected (Live NIST NVD)</span>
          </div>

          {/* Series 2: Total Function Calls Analyzed */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff]" />
            <span className="text-white font-medium">Total Function Calls Analyzed (AST Scans)</span>
          </div>

          {/* Series 3: Pending PRs */}
          <div
            className="flex items-center gap-2 opacity-50"
            title="Backend lacks a GET /pull-requests endpoint to track PRs over time"
          >
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#8e8e8e]" />
            <span className="text-[#8e8e8e]">Pull Requests (Pending backend GET /pull-requests)</span>
          </div>
        </div>

        <div className="text-xs text-[#8e8e8e] flex items-center gap-3">
          <span>
            Window: <span className="text-white font-mono font-semibold">Past 7 Days</span>
          </span>
          <span>·</span>
          <span>
            Total Calls Analyzed:{" "}
            <span className="text-[#00d2ff] font-mono font-bold">
              {totalCallsAnalyzed}
            </span>
          </span>
          <span>·</span>
          <span>
            Total Disclosures:{" "}
            <span className="text-[#ff7300] font-mono font-semibold">
              {cves.length}
            </span>
          </span>
        </div>
      </div>

      {/* SVG Interactive Chart Area */}
      <div className="relative w-full pt-2">
        {loadingCves && chartData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center gap-3 text-center border border-white/[0.04] rounded-control bg-[#0d0d0f]">
            <Loader2 className="w-6 h-6 text-[#ff7300] animate-spin" />
            <p className="text-xs text-[#8e8e8e]">Ingesting live telemetry from GET /cves/latest...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center gap-3 text-center border border-dashed border-white/[0.08] rounded-control bg-[#0d0d0f] p-6">
            <AlertCircle className="w-8 h-8 text-[#ff7300]/60" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">No Telemetry Data Available</p>
              <p className="text-xs text-[#8e8e8e] max-w-md">
                Backend GET /cves/latest returned an empty set or is unreachable. Ensure the backend server is listening on port 8000.
              </p>
            </div>
            <button
              onClick={() => refreshCves()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-[#ff7300]/15 text-[#ff7300] hover:bg-[#ff7300]/25 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Ingestion
            </button>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Horizontal gridlines with Y-axis tick values */}
            {yTicks.map((val, i) => {
              const y = getY(val);
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 12}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-[#666666] font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Line 1: Vulnerabilities Detected (Amber) */}
            <path
              d={detectedLine}
              fill="none"
              stroke="#ff7300"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(255,115,0,0.45)]"
            />

            {/* Line 2: Total Function Calls Analyzed (Cyan) */}
            <path
              d={callsLine}
              fill="none"
              stroke="#00d2ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(0,210,255,0.45)]"
            />

            {/* Interactive Data Point Vertices for Both Series */}
            {points.map((p, idx) => (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Hit target for easy hover */}
                <rect
                  x={p.x - 20}
                  y={0}
                  width={40}
                  height={height}
                  fill="transparent"
                />

                {/* Series 1 Vertex: Detected Vulnerabilities (Amber) */}
                {hoveredIndex === idx && (
                  <circle
                    cx={p.x}
                    cy={p.yDetected}
                    r={9}
                    fill="#ff7300"
                    fillOpacity={0.25}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.yDetected}
                  r={hoveredIndex === idx ? 6 : 4}
                  fill={hoveredIndex === idx ? "#ffffff" : "#ff7300"}
                  stroke="#111113"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Series 2 Vertex: Total Function Calls (Cyan) */}
                {hoveredIndex === idx && (
                  <circle
                    cx={p.x}
                    cy={p.yCalls}
                    r={9}
                    fill="#00d2ff"
                    fillOpacity={0.25}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.yCalls}
                  r={hoveredIndex === idx ? 6 : 4}
                  fill={hoveredIndex === idx ? "#ffffff" : "#00d2ff"}
                  stroke="#111113"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
              </g>
            ))}

            {/* X-Axis labels (Actual dates, e.g. Sep 20, Sep 21) */}
            {chartData.map((d, idx) => (
              <text
                key={idx}
                x={getX(idx)}
                y={height - 12}
                textAnchor="middle"
                className="text-[11px] fill-[#8e8e8e] font-sans"
              >
                {d.label}
              </text>
            ))}

            {/* Interactive Hover Guide & Multi-Series Tooltip with Per-File Breakdown */}
            {activeHoverPoint && activeHoverItem && (
              <g pointerEvents="none">
                <line
                  x1={activeHoverPoint.x}
                  y1={paddingY}
                  x2={activeHoverPoint.x}
                  y2={height - paddingY}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeDasharray="2 2"
                />

                <foreignObject
                  x={Math.min(
                    Math.max(activeHoverPoint.x - 110, 10),
                    width - 240
                  )}
                  y={Math.max(
                    Math.min(activeHoverPoint.yDetected, activeHoverPoint.yCalls) - 130,
                    10
                  )}
                  width="220"
                  height="125"
                >
                  <div className="p-3 rounded-control bg-[#161619] border border-white/20 shadow-2xl space-y-1.5">
                    <div className="text-[10px] text-[#8e8e8e] font-semibold flex items-center justify-between">
                      <span>{activeHoverItem.label}</span>
                      {activeHoverItem.scanCount > 0 && (
                        <span className="text-[#00d2ff] font-mono text-[9px]">
                          {activeHoverItem.scanCount} scan{activeHoverItem.scanCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Series 1 count */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#ff8c2e]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff7300]" />
                        Vulnerabilities:
                      </span>
                      <span className="font-mono font-bold text-white">
                        {activeHoverItem.detected}
                      </span>
                    </div>

                    {/* Series 2 count */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#00d2ff]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                        Function Calls:
                      </span>
                      <span className="font-mono font-bold text-white">
                        {activeHoverItem.total_function_call}
                      </span>
                    </div>

                    {/* Per-file Breakdown */}
                    {activeHoverItem.files.length > 0 ? (
                      <div className="pt-1 border-t border-white/[0.08] text-[9px] text-[#c8c8c8] space-y-0.5 max-h-[42px] overflow-hidden">
                        <div className="text-[8px] text-[#8e8e8e] uppercase tracking-wider font-semibold">
                          Per-File Call Breakdown:
                        </div>
                        {activeHoverItem.files.slice(0, 2).map((f, i) => (
                          <div key={i} className="flex items-center justify-between font-mono truncate">
                            <span className="truncate max-w-[130px]" title={f.file}>
                              {f.file.split(/[/\\]/).pop() || f.file}
                            </span>
                            <span className="text-[#00d2ff] font-bold">
                              {f.total_calls ?? (f.calls?.length || 0)} calls
                            </span>
                          </div>
                        ))}
                        {activeHoverItem.files.length > 2 && (
                          <div className="text-[#8e8e8e] text-[8px]">
                            +{activeHoverItem.files.length - 2} more files
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-1 border-t border-white/[0.08] text-[9px] text-[#666666]">
                        No repo AST scans recorded on this date
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
