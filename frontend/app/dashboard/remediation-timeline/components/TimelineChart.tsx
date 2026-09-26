"use client";

import React, { useState, useMemo } from "react";
import { useDashboardData, ScanTelemetryRecord } from "../../context/DashboardDataContext";
import { computeTotalFunctionCalls, FileScanResult } from "@/app/lib/api";
import { RepositoryRecord, PullRequestRecord } from "../../lib/mock-data";
import {
  BarChart3,
  TrendingUp,
  GitBranch,
  ShieldAlert,
  Info,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type ChartMode = "bars" | "line";

export interface RepoComparisonPoint {
  id: string;
  repo: string;
  displayName: string;
  vulnerabilities: number; // Real client-side summed total_function_call
  patches: number; // Real count of pull requests
  files: FileScanResult[]; // Real per-file breakdown
  scanIndex: number;
}

export interface TimelineChartProps {
  scanHistory?: ScanTelemetryRecord[];
  repositories?: RepositoryRecord[];
  pullRequests?: PullRequestRecord[];
}

export default function TimelineChart({
  scanHistory: propScanHistory,
  repositories: propRepositories,
  pullRequests: propPullRequests,
}: TimelineChartProps = {}) {
  const contextData = useDashboardData();
  const scanHistory = propScanHistory ?? contextData.scanHistory;
  const repositories = propRepositories ?? contextData.repositories;
  const pullRequests = propPullRequests ?? contextData.pullRequests;

  const [chartMode, setChartMode] = useState<ChartMode>("bars");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group real scan telemetry indexed by scanned repository (non-date axis)
  const chartData = useMemo<RepoComparisonPoint[]>(() => {
    const points: RepoComparisonPoint[] = [];
    const seenRepos = new Set<string>();

    // Collect from scanHistory in chronological order
    const chronologicalHistory = [...(scanHistory || [])].reverse();
    for (const scan of chronologicalHistory) {
      const cleanRepo = scan.repo;
      const lower = cleanRepo.toLowerCase();

      // Aggregate total_calls across per-file array using client-side reduction
      const aggregatedCalls =
        Array.isArray(scan.files) && scan.files.length > 0
          ? computeTotalFunctionCalls(scan.files)
          : (scan.total_function_call ?? 0);

      if (seenRepos.has(lower)) {
        const existing = points.find((p) => p.repo.toLowerCase() === lower);
        if (existing) {
          existing.vulnerabilities = aggregatedCalls;
          existing.files = scan.files || [];
        }
        continue;
      }
      seenRepos.add(lower);

      const parts = cleanRepo.split("/");
      const displayName = parts.length > 1 ? parts[1] : cleanRepo;

      // Real pull requests count for this repo from shared state
      const repoPrs = (pullRequests || []).filter((pr) => {
        const prRepoLower = pr.repo.toLowerCase();
        return (
          prRepoLower === lower ||
          prRepoLower.endsWith("/" + lower) ||
          lower.endsWith("/" + prRepoLower)
        );
      }).length;

      points.push({
        id: scan.id,
        repo: cleanRepo,
        displayName,
        vulnerabilities: aggregatedCalls,
        patches: repoPrs,
        files: scan.files || [],
        scanIndex: points.length + 1,
      });
    }

    // Also check repositories if loaded with scan data
    for (const r of repositories || []) {
      const cleanRepo = `${r.org}/${r.name}`;
      const lower = cleanRepo.toLowerCase();
      if (!seenRepos.has(lower) && (r.total_function_call !== undefined || (r.files && r.files.length > 0))) {
        seenRepos.add(lower);
        const aggregatedCalls =
          Array.isArray(r.files) && r.files.length > 0
            ? computeTotalFunctionCalls(r.files)
            : (r.total_function_call ?? 0);

        const repoPrs = (pullRequests || []).filter((pr) => {
          const prRepoLower = pr.repo.toLowerCase();
          return (
            prRepoLower === lower ||
            prRepoLower.endsWith("/" + lower) ||
            lower.endsWith("/" + prRepoLower)
          );
        }).length;

        points.push({
          id: r.id,
          repo: cleanRepo,
          displayName: r.name,
          vulnerabilities: aggregatedCalls,
          patches: repoPrs,
          files: r.files || [],
          scanIndex: points.length + 1,
        });
      }
    }

    return points;
  }, [scanHistory, repositories, pullRequests]);

  // Overall aggregates
  const totalVulnerabilities = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.vulnerabilities, 0);
  }, [chartData]);

  const totalPatches = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.patches, 0);
  }, [chartData]);

  // SVG Chart Geometry Calculations
  const width = 1000;
  const height = 300;
  const paddingX = 65;
  const paddingY = 45;

  const maxVal = Math.max(
    ...chartData.flatMap((d) => [d.vulnerabilities, d.patches]),
    0
  );
  const yMax = Math.max(Math.ceil(maxVal * 1.25), 4);

  const getY = (val: number) =>
    height - paddingY - (val / yMax) * (height - paddingY * 2);

  // Geometry for Line Chart Mode
  const getLineX = (idx: number) => {
    if (chartData.length <= 1) {
      return paddingX + (width - paddingX * 2) / 2;
    }
    return paddingX + (idx / (chartData.length - 1)) * (width - paddingX * 2);
  };

  const linePoints = chartData.map((d, i) => ({
    x: getLineX(i),
    yVulns: getY(d.vulnerabilities),
    yPatches: getY(d.patches),
    data: d,
  }));

  const vulnsLine =
    linePoints.length > 1
      ? linePoints
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.yVulns.toFixed(1)}`)
          .join(" ")
      : linePoints.length === 1
      ? `M ${(linePoints[0].x - 60).toFixed(1)},${linePoints[0].yVulns.toFixed(1)} L ${(linePoints[0].x + 60).toFixed(1)},${linePoints[0].yVulns.toFixed(1)}`
      : "";

  const patchesLine =
    linePoints.length > 1
      ? linePoints
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.yPatches.toFixed(1)}`)
          .join(" ")
      : linePoints.length === 1
      ? `M ${(linePoints[0].x - 60).toFixed(1)},${linePoints[0].yPatches.toFixed(1)} L ${(linePoints[0].x + 60).toFixed(1)},${linePoints[0].yPatches.toFixed(1)}`
      : "";

  // Geometry for Grouped Bar Chart Mode
  const slotWidth = chartData.length > 0 ? (width - paddingX * 2) / chartData.length : 0;
  const barWidth = Math.min(Math.max(slotWidth * 0.22, 16), 40);
  const barGap = 6;

  const yTicks = [
    0,
    Math.round(yMax * 0.33),
    Math.round(yMax * 0.66),
    yMax,
  ];

  const activeHoverItem = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card space-y-6">
      {/* Top Header: Title + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider block">
            Security Engine Telemetry
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Vulnerabilities vs. Total Patches
          </h2>
          <p className="text-xs text-[#8e8e8e]">
            Per-repository AST call-site taint (vulnerabilities) vs. verified pull requests (patches)
          </p>
        </div>

        {/* View mode toggle pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-pill bg-[#161619] border border-white/[0.06] text-xs">
            <button
              onClick={() => setChartMode("bars")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold transition-colors ${
                chartMode === "bars"
                  ? "bg-[#28282a] text-white shadow-sm"
                  : "text-[#8e8e8e] hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grouped Bars</span>
            </button>

            <button
              onClick={() => setChartMode("line")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold transition-colors ${
                chartMode === "line"
                  ? "bg-[#28282a] text-white shadow-sm"
                  : "text-[#8e8e8e] hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Sequential Line</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block text-xs mb-1 font-mono uppercase">
            Scanned Repositories
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">
              {chartData.length}
            </span>
            <span className="text-xs text-[#8e8e8e]">active in session</span>
          </div>
        </div>

        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block text-xs mb-1 font-mono uppercase">
            Total Vulnerabilities (Calls)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-[#ff7300]">
              {totalVulnerabilities}
            </span>
            <span className="text-xs text-[#8e8e8e]">active AST call sites</span>
          </div>
        </div>

        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block text-xs mb-1 font-mono uppercase">
            Total Patches (PRs)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-[#52e185]">
              {totalPatches}
            </span>
            <span className="text-[11px] text-[#8e8e8e]">
              {totalPatches > 0 ? "generated PRs" : "pending backend PR endpoint"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      {chartData.length === 0 ? (
        <div className="p-16 rounded-card bg-[#0e0e10] border border-dashed border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#ff7300] mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">No repository AST scans recorded yet</h4>
            <p className="text-xs text-[#8e8e8e] max-w-md mx-auto leading-relaxed">
              Scan a repository on the Overview or Repositories page to generate real client-side <code className="text-[#ff7300] font-mono">total_function_call</code> vulnerability data and compare it against opened patches.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-white text-black font-semibold text-xs shadow-glowPill hover:shadow-glowPillHover transition-all"
            >
              <span>Scan a Repository</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative w-full rounded-card bg-[#0e0e10] border border-white/[0.04] p-4 sm:p-6 overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              {/* Vulnerabilities Gradients */}
              <linearGradient id="vulnBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7300" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ff5252" stopOpacity="0.4" />
              </linearGradient>

              {/* Patches Gradients */}
              <linearGradient id="patchBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#52e185" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.4" />
              </linearGradient>

              <filter id="glowVuln" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff7300" floodOpacity="0.5" />
              </filter>
              <filter id="glowPatch" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#52e185" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Horizontal Grid Lines */}
            {yTicks.map((tickVal) => {
              const y = getY(tickVal);
              return (
                <g key={tickVal}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray={tickVal === 0 ? undefined : "3 3"}
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 12}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#8e8e8e"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* GROUPED BARS MODE */}
            {chartMode === "bars" &&
              chartData.map((d, i) => {
                const centerX = paddingX + (i + 0.5) * slotWidth;
                const hasVulns = d.vulnerabilities > 0;
                const hasPatches = d.patches > 0;

                const rawVulnHeight = Math.max(0, height - paddingY - getY(d.vulnerabilities));
                const rawPatchHeight = Math.max(0, height - paddingY - getY(d.patches));

                // If value is 0, render a 3px baseline indicator cap so the column is visually present and acknowledged
                const vulnBarHeight = hasVulns ? Math.max(rawVulnHeight, 6) : 3;
                const patchBarHeight = hasPatches ? Math.max(rawPatchHeight, 6) : 3;

                const vulnBarY = hasVulns ? getY(d.vulnerabilities) : height - paddingY - 3;
                const patchBarY = hasPatches ? getY(d.patches) : height - paddingY - 3;

                const bar1X = centerX - barWidth - barGap / 2;
                const bar2X = centerX + barGap / 2;
                const isHovered = hoveredIndex === i;

                return (
                  <g
                    key={d.id}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer"
                  >
                    {/* Hover highlight background column */}
                    <rect
                      x={paddingX + i * slotWidth + 4}
                      y={paddingY}
                      width={Math.max(slotWidth - 8, 20)}
                      height={height - paddingY * 2}
                      fill={isHovered ? "rgba(255, 255, 255, 0.03)" : "transparent"}
                      rx="6"
                    />

                    {/* Numeric Count Badges above bars */}
                    <text
                      x={bar1X + barWidth / 2}
                      y={vulnBarY - 6}
                      textAnchor="middle"
                      fill={hasVulns ? "#ff7300" : "#666666"}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {d.vulnerabilities}
                    </text>

                    <text
                      x={bar2X + barWidth / 2}
                      y={patchBarY - 6}
                      textAnchor="middle"
                      fill={hasPatches ? "#52e185" : "#666666"}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {d.patches}
                    </text>

                    {/* Bar 1: Vulnerabilities (total_function_call) */}
                    <rect
                      x={bar1X}
                      y={vulnBarY}
                      width={barWidth}
                      height={vulnBarHeight}
                      rx={hasVulns ? "4" : "1.5"}
                      fill={hasVulns ? "url(#vulnBarGrad)" : "#ff7300"}
                      fillOpacity={hasVulns ? 1 : 0.4}
                      stroke="#ff7300"
                      strokeWidth={isHovered ? "1.5" : "0.5"}
                      filter={isHovered ? "url(#glowVuln)" : undefined}
                    />

                    {/* Bar 2: Patches (Pull Requests) */}
                    <rect
                      x={bar2X}
                      y={patchBarY}
                      width={barWidth}
                      height={patchBarHeight}
                      rx={hasPatches ? "4" : "1.5"}
                      fill={hasPatches ? "url(#patchBarGrad)" : "#52e185"}
                      fillOpacity={hasPatches ? 1 : 0.4}
                      stroke="#52e185"
                      strokeWidth={isHovered ? "1.5" : "0.5"}
                      filter={isHovered ? "url(#glowPatch)" : undefined}
                    />

                    {/* X-axis Label: Scanned Repository Name */}
                    <text
                      x={centerX}
                      y={height - paddingY + 22}
                      textAnchor="middle"
                      fill={isHovered ? "#ffffff" : "#8e8e8e"}
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight={isHovered ? "bold" : "normal"}
                    >
                      {d.displayName.length > 14
                        ? d.displayName.slice(0, 12) + "…"
                        : d.displayName}
                    </text>
                  </g>
                );
              })}

            {/* SEQUENTIAL LINE MODE */}
            {chartMode === "line" && (
              <>
                {/* Vulnerabilities Line */}
                {vulnsLine && (
                  <path
                    d={vulnsLine}
                    fill="none"
                    stroke="#ff7300"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Patches Line */}
                {patchesLine && (
                  <path
                    d={patchesLine}
                    fill="none"
                    stroke="#52e185"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Line Points */}
                {linePoints.map((p, i) => {
                  const isHovered = hoveredIndex === i;
                  const sameY = Math.abs(p.yVulns - p.yPatches) < 6;
                  const vulnX = sameY ? p.x - 6 : p.x;
                  const patchX = sameY ? p.x + 6 : p.x;

                  return (
                    <g
                      key={p.data.id}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="cursor-pointer"
                    >
                      {/* Vertical tracker */}
                      {isHovered && (
                        <line
                          x1={p.x}
                          y1={paddingY}
                          x2={p.x}
                          y2={height - paddingY}
                          stroke="rgba(255, 255, 255, 0.15)"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Vuln vertex */}
                      <circle
                        cx={vulnX}
                        cy={p.yVulns}
                        r={isHovered ? 6 : 4}
                        fill="#ff7300"
                        stroke="#111113"
                        strokeWidth="2"
                        filter={isHovered ? "url(#glowVuln)" : undefined}
                      />

                      {/* Patch vertex */}
                      <circle
                        cx={patchX}
                        cy={p.yPatches}
                        r={isHovered ? 6 : 4}
                        fill="#52e185"
                        stroke="#111113"
                        strokeWidth="2"
                        filter={isHovered ? "url(#glowPatch)" : undefined}
                      />

                      {/* X-axis Label */}
                      <text
                        x={p.x}
                        y={height - paddingY + 22}
                        textAnchor="middle"
                        fill={isHovered ? "#ffffff" : "#8e8e8e"}
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight={isHovered ? "bold" : "normal"}
                      >
                        {p.data.displayName.length > 14
                          ? p.data.displayName.slice(0, 12) + "…"
                          : p.data.displayName}
                      </text>
                    </g>
                  );
                })}
              </>
            )}
          </svg>

          {/* Interactive Tooltip Card */}
          {activeHoverItem && (
            <div className="mt-4 p-4 rounded-control bg-[#161619] border border-white/10 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-150 font-mono">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-[#ff7300]" />
                  <span className="font-bold text-white text-xs">
                    {activeHoverItem.repo}
                  </span>
                  <span className="text-[10px] text-[#8e8e8e] px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                    Scan #{activeHoverItem.scanIndex}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border uppercase font-semibold ${
                      activeHoverItem.vulnerabilities > 0
                        ? "bg-[#ffb300]/10 text-[#ffb300] border-[#ffb300]/25"
                        : "bg-[#79b0ff]/10 text-[#79b0ff] border-[#79b0ff]/25"
                    }`}
                  >
                    {activeHoverItem.vulnerabilities > 0
                      ? "Level 2: Actively Called"
                      : "Level 1: Symbol Imported (Uncalled)"}
                  </span>
                </div>
                <div className="text-[11px] text-[#8e8e8e]">
                  {activeHoverItem.files.length} scanned file{activeHoverItem.files.length === 1 ? "" : "s"} analyzed
                  {activeHoverItem.vulnerabilities === 0 && " · 0 active call sites detected"}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff7300]" />
                  <span className="text-[#8e8e8e]">Vulnerabilities:</span>
                  <span className="text-[#ff7300] font-bold">
                    {activeHoverItem.vulnerabilities} call sites
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#52e185]" />
                  <span className="text-[#8e8e8e]">Patches:</span>
                  <span className="text-[#52e185] font-bold">
                    {activeHoverItem.patches > 0
                      ? `${activeHoverItem.patches} PRs`
                      : "0 (Pending PR API)"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend & Telemetry Metadata */}
      <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-[#ff7300]" />
            <span className="text-[#c8c8c8]">
              Vulnerabilities (<span className="text-[#ff7300]">total_function_call</span>)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-[#52e185]" />
            <span className="text-[#c8c8c8]">
              Patches (<span className="text-[#52e185]">Pull Requests</span>)
            </span>
          </div>
        </div>

        <div className="text-[#8e8e8e] text-[11px] flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#ff7300]" />
          <span>Non-temporal axis: indexed by scanned repositories in execution order.</span>
        </div>
      </div>
    </div>
  );
}
