"use client";

import React, { useState, useMemo } from "react";
import { useDashboardData } from "../../context/DashboardDataContext";
import { Loader2, RefreshCw, AlertCircle, Info, Calendar } from "lucide-react";

type TimeRangeKey = "7D" | "30D" | "90D" | "6M" | "1Y";

interface DayBucket {
  dateKey: string;
  label: string;
  count: number;
  cveIds: string[];
}

export default function TimelineChart() {
  const { cves, loadingCves, cveError, refreshCves } = useDashboardData();
  const [selectedRange, setSelectedRange] = useState<TimeRangeKey>("7D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group real CVE records into continuous calendar day buckets
  const chartData = useMemo<DayBucket[]>(() => {
    if (!cves || cves.length === 0) return [];

    // Parse valid dates from cve.publishedAt or cve.detectedAt
    const parsed: { cveId: string; date: Date; dateKey: string }[] = [];
    for (const c of cves) {
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
      parsed.push({ cveId: c.cveId, date: d, dateKey });
    }

    if (parsed.length === 0) return [];

    // Sort by timestamp ascending
    parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
    const earliest = new Date(parsed[0].date);
    const latest = new Date(parsed[parsed.length - 1].date);
    earliest.setHours(0, 0, 0, 0);
    latest.setHours(0, 0, 0, 0);

    // Calculate span in days. Ensure at least a 7-day span ending at latest date
    // to match backend NIST NVD's 7-day rolling window
    const daySpan = Math.round(
      (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)
    );
    const windowDays = Math.max(daySpan + 1, 7);

    const buckets: DayBucket[] = [];
    // Anchor to latest date and trace back windowDays - 1
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
        count: 0,
        cveIds: [],
      });
    }

    // Accumulate real counts
    for (const item of parsed) {
      const bucket = buckets.find((b) => b.dateKey === item.dateKey);
      if (bucket) {
        bucket.count += 1;
        bucket.cveIds.push(item.cveId);
      }
    }

    return buckets;
  }, [cves]);

  // SVG Chart Geometry Calculations
  const width = 1000;
  const height = 280;
  const paddingX = 55;
  const paddingY = 40;

  const maxVal = Math.max(...chartData.map((d) => d.count), 0);
  // Establish integer headroom so top points don't clip SVG boundary
  const yMax = Math.max(Math.ceil(maxVal * 1.25), 4);

  const getX = (idx: number) => {
    if (chartData.length <= 1) {
      return paddingX + (width - paddingX * 2) / 2;
    }
    return paddingX + (idx / (chartData.length - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) =>
    height - paddingY - (val / yMax) * (height - paddingY * 2);

  // Map to discrete SVG coordinates
  const points = chartData.map((d, i) => ({
    x: getX(i),
    y: getY(d.count),
    data: d,
  }));

  // Standard linear polyline path (pure line chart without fake bezier smoothing)
  const linePath =
    points.length > 0
      ? points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(" ")
      : "";

  // Subtle gradient polygon matching real line bounds
  const areaPolygon =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)},${height - paddingY} L ${points[0].x.toFixed(1)},${height - paddingY} Z`
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
            Vulnerability Detection Velocity
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Disclosures Detected Over Time
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
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7300] shadow-[0_0_6px_#ff7300]" />
            <span className="text-white font-medium">Vulnerabilities Detected (Live NIST NVD)</span>
          </div>

          <div
            className="flex items-center gap-2 opacity-60"
            title="Backend lacks a GET /pull-requests endpoint to track PRs over time"
          >
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#8e8e8e]" />
            <span className="text-[#8e8e8e]">Pull Requests (Pending backend GET /pull-requests)</span>
          </div>
        </div>

        <div className="text-xs text-[#8e8e8e] flex items-center gap-3">
          <span>
            Stream Window:{" "}
            <span className="text-white font-mono font-semibold">Past 7 Days</span>
          </span>
          <span>·</span>
          <span>
            Total Ingested:{" "}
            <span className="text-[#ff7300] font-mono font-semibold">
              {cves.length} Disclosures
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
              <p className="text-sm font-semibold text-white">No Vulnerability Disclosures Available</p>
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
            <defs>
              <linearGradient id="amberGradientLinear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7300" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ff7300" stopOpacity="0.0" />
              </linearGradient>
            </defs>

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

            {/* Linear Area Polygon Fill */}
            {areaPolygon && <path d={areaPolygon} fill="url(#amberGradientLinear)" />}

            {/* Real Linear Data Path (No artificial bezier curves) */}
            <path
              d={linePath}
              fill="none"
              stroke="#ff7300"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(255,115,0,0.45)]"
            />

            {/* Interactive Data Point Vertices */}
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

                {/* Outer halo when active */}
                {hoveredIndex === idx && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={9}
                    fill="#ff7300"
                    fillOpacity={0.25}
                  />
                )}

                {/* Vertex node circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIndex === idx ? 6 : 4}
                  fill={hoveredIndex === idx ? "#ffffff" : "#ff7300"}
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

            {/* Interactive Hover Vertical Guide & Tooltip */}
            {activeHoverPoint && activeHoverItem && (
              <g pointerEvents="none">
                <line
                  x1={activeHoverPoint.x}
                  y1={paddingY}
                  x2={activeHoverPoint.x}
                  y2={height - paddingY}
                  stroke="rgba(255, 115, 0, 0.4)"
                  strokeDasharray="2 2"
                />

                <foreignObject
                  x={Math.min(
                    Math.max(activeHoverPoint.x - 80, 10),
                    width - 170
                  )}
                  y={Math.max(activeHoverPoint.y - 85, 10)}
                  width="160"
                  height="78"
                >
                  <div className="p-2.5 rounded-control bg-[#161619] border border-white/20 shadow-xl text-center">
                    <div className="text-[10px] text-[#8e8e8e] font-semibold">
                      {activeHoverItem.label}
                    </div>
                    <div className="font-mono text-sm font-bold text-[#ff8c2e]">
                      {activeHoverItem.count}{" "}
                      {activeHoverItem.count === 1 ? "Disclosed" : "Disclosed"}
                    </div>
                    <div className="text-[9px] text-[#8e8e8e] mt-0.5 truncate">
                      {activeHoverItem.count === 0
                        ? "0 detections"
                        : activeHoverItem.cveIds.slice(0, 2).join(", ") +
                          (activeHoverItem.cveIds.length > 2
                            ? ` +${activeHoverItem.cveIds.length - 2} more`
                            : "")}
                    </div>
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
