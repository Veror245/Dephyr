import React from "react";
import { OVERVIEW_METRIC_CARDS } from "../../lib/mock-data";

export default function ExposureSummaryCard() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {OVERVIEW_METRIC_CARDS.map((stat) => (
        <div
          key={stat.label}
          className="p-6 lg:p-7 rounded-panel bg-[#111113] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between space-y-4"
        >
          {/* Top row: Label + Glyph */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider">
              {stat.label}
            </span>
            <span className="font-mono text-xs font-bold text-[#ff7300] px-2 py-0.5 rounded bg-[#ff7300]/10 border border-[#ff7300]/20">
              {stat.glyph}
            </span>
          </div>

          {/* Metric Value */}
          <div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {stat.value}
            </div>
          </div>

          {/* Bottom trend/detail */}
          <div className="text-xs text-[#c8c8c8] flex items-center gap-2 pt-1 border-t border-white/[0.04]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#52e185]" />
            <span>{stat.change}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
