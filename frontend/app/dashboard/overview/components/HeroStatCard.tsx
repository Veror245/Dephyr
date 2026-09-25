"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HERO_STATS } from "../../lib/mock-data";

export default function HeroStatCard() {
  const [selectedRange, setSelectedRange] = useState("Today");

  return (
    <div className="relative overflow-hidden rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card flex flex-col justify-between space-y-6">
      {/* Soft inner ambient warmth in card background - subtle, restrained */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none rounded-full"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, rgba(255, 115, 0, 0.08) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* Top row: Label + Range pills */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider block">
            Total Exposure Posture
          </span>
          <h2 className="text-base font-bold text-white tracking-tight">
            Active Vulnerability Exposures
          </h2>
        </div>

        {/* Range toggle pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-pill bg-[#161619] border border-white/[0.06] text-xs">
          {["Today", "7D", "30D"].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1 rounded-pill text-xs font-medium transition-colors ${
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

      {/* Big Metric Display */}
      <div className="relative z-10 flex flex-wrap items-baseline gap-4 my-2">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-5xl sm:text-6xl text-white font-bold tracking-tight">
            {HERO_STATS.activeExposures}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-control bg-[#ff5252]/15 text-[#ff5252] border border-[#ff5252]/30 uppercase tracking-wide">
            ACTION REQUIRED
          </span>
        </div>

        <div className="text-sm text-[#8e8e8e]">
          across <span className="text-white font-semibold">18 monitored repositories</span>
        </div>
      </div>

      {/* Breakdown Bar & Details */}
      <div className="relative z-10 pt-5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5252]" />
            <span className="text-white font-semibold">2 Critical</span>
            <span className="text-[#8e8e8e]">(Level 3)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffb300]" />
            <span className="text-white font-semibold">1 Medium</span>
            <span className="text-[#8e8e8e]">(Level 1)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#52e185]" />
            <span className="text-white font-semibold">15 Safe</span>
          </div>
        </div>

        <Link
          href="/dashboard/cve-feed"
          className="inline-flex items-center gap-1 text-xs text-[#ff8c2e] hover:text-white font-semibold transition-colors"
        >
          <span>Triage CVE Feed</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
