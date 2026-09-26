"use client";

import React from "react";
import TimelineChart from "./components/TimelineChart";
import RemediationHistoryTable from "./components/RemediationHistoryTable";
import { TrendingUp } from "lucide-react";
import { useDashboardData } from "../context/DashboardDataContext";

export default function RemediationTimelinePage() {
  const { cves, loadingCves, scanHistory } = useDashboardData();
  const totalFunctionCalls = scanHistory.reduce((sum, s) => sum + s.total_function_call, 0);

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner: Floating rounded panel */}
      <div className="p-6 lg:p-7 rounded-panel bg-[#111113] border border-white/[0.08] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#ff7300]/10 border border-[#ff7300]/25 flex items-center justify-center text-[#ff7300] shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">
              Remediation Velocity & Telemetry
            </h2>
            <p className="text-xs sm:text-sm text-[#8e8e8e] leading-relaxed max-w-3xl">
              Longitudinal tracking of disclosed CVEs vs. analyzed AST function calls. PR resolution metrics pending backend PR tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-14 md:pl-0">
          <div className="px-3.5 py-1.5 rounded-pill bg-[#161619] border border-white/[0.06] flex items-center gap-2">
            <span className="text-[#8e8e8e]">Disclosures:</span>
            <span className="text-[#ff7300] font-bold">
              {loadingCves ? "..." : `${cves.length}`}
            </span>
            <span className="text-[#8e8e8e]">·</span>
            <span className="text-[#8e8e8e]">Calls Analyzed:</span>
            <span className="text-[#00d2ff] font-bold">{totalFunctionCalls}</span>
            <span className="text-[#8e8e8e]">·</span>
            <span className="text-[#8e8e8e]">Window:</span>
            <span className="text-white font-bold">7-Day Rolling</span>
          </div>
        </div>
      </div>

      {/* Main Chart Area: Floating rounded panel */}
      <TimelineChart />

      {/* Audit History Table: Floating rounded panel */}
      <RemediationHistoryTable />
    </div>
  );
}
