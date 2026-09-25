"use client";

import React, { useState } from "react";
import { TIMELINE_DATA } from "../../lib/mock-data";

type TimeRangeKey = "7D" | "30D" | "90D" | "6M" | "1Y";

export default function TimelineChart() {
  const [selectedRange, setSelectedRange] = useState<TimeRangeKey>("30D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = TIMELINE_DATA[selectedRange];

  // SVG Chart Geometry Calculations (optimized for full-width expanse)
  const width = 1000;
  const height = 280;
  const paddingX = 40;
  const paddingY = 40;

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.detected, d.resolved]),
    10
  );

  const getX = (idx: number) =>
    paddingX + (idx / (data.length - 1 || 1)) * (width - paddingX * 2);

  const getY = (val: number) =>
    height - paddingY - (val / maxVal) * (height - paddingY * 2);

  const points = data.map((d, i) => ({
    x: getX(i),
    yDetected: getY(d.detected),
    yResolved: getY(d.resolved),
  }));

  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }
    return path;
  };

  const detectedLine = createSmoothPath(
    points.map((p) => ({ x: p.x, y: p.yDetected }))
  );
  const resolvedLine = createSmoothPath(
    points.map((p) => ({ x: p.x, y: p.yResolved }))
  );

  const resolvedArea = `${resolvedLine} L ${points[points.length - 1].x},${
    height - paddingY
  } L ${points[0].x},${height - paddingY} Z`;

  const activeHoverItem = hoveredIndex !== null ? data[hoveredIndex] : null;
  const activeHoverPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card space-y-6">
      {/* Top Header: Title + Range Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider block">
            Remediation Velocity
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Vulnerabilities Detected vs. Autonomously Resolved
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
              className={`px-3.5 py-1 rounded-pill text-xs font-semibold transition-colors ${
                selectedRange === range
                  ? "bg-[#28282a] text-white shadow-sm"
                  : "text-[#8e8e8e] hover:text-white"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Legend & Current Window Stat Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7300] shadow-[0_0_6px_#ff7300]" />
            <span className="text-white font-medium">Autonomously Resolved</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8e8e8e]" />
            <span className="text-[#8e8e8e]">Detected Incoming</span>
          </div>
        </div>

        <div className="text-xs text-[#8e8e8e]">
          Mean Time To Resolution (MTTR):{" "}
          <span className="text-white font-mono font-semibold">1m 48s</span>
        </div>
      </div>

      {/* SVG Interactive Chart Area */}
      <div className="relative w-full pt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <linearGradient id="amberGradientWide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff7300" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ff7300" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
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
              </g>
            );
          })}

          {/* Amber Area Fill */}
          <path d={resolvedArea} fill="url(#amberGradientWide)" />

          {/* Detected Line */}
          <path
            d={detectedLine}
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Resolved Line */}
          <path
            d={resolvedLine}
            fill="none"
            stroke="#ff7300"
            strokeWidth="2.5"
            className="drop-shadow-[0_0_8px_rgba(255,115,0,0.5)]"
          />

          {/* Interactive Data points */}
          {points.map((p, idx) => (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <circle
                cx={p.x}
                cy={p.yResolved}
                r={hoveredIndex === idx ? 6 : 4}
                fill={hoveredIndex === idx ? "#ffffff" : "#ff7300"}
                stroke="#000000"
                strokeWidth="2"
                className="transition-all duration-150"
              />

              <rect
                x={p.x - 20}
                y={0}
                width={40}
                height={height}
                fill="transparent"
              />
            </g>
          ))}

          {/* X Axis labels */}
          {data.map((d, idx) => (
            <text
              key={idx}
              x={getX(idx)}
              y={height - 10}
              textAnchor="middle"
              className="text-[11px] fill-[#8e8e8e] font-sans"
            >
              {d.label}
            </text>
          ))}

          {/* Hover Tooltip */}
          {activeHoverPoint && activeHoverItem && (
            <g pointerEvents="none">
              <line
                x1={activeHoverPoint.x}
                y1={paddingY}
                x2={activeHoverPoint.x}
                y2={height - paddingY}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="2 2"
              />

              <foreignObject
                x={Math.min(
                  Math.max(activeHoverPoint.x - 70, 10),
                  width - 150
                )}
                y={Math.max(activeHoverPoint.yResolved - 75, 10)}
                width="140"
                height="65"
              >
                <div className="p-2 rounded-control bg-[#161619] border border-white/20 shadow-xl text-center">
                  <div className="text-[10px] text-[#8e8e8e]">
                    {activeHoverItem.label}
                  </div>
                  <div className="font-mono text-xs font-bold text-[#ff8c2e]">
                    {activeHoverItem.resolved} Resolved
                  </div>
                  <div className="text-[9px] text-[#c8c8c8]">
                    {activeHoverItem.detected} Detected
                  </div>
                </div>
              </foreignObject>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
