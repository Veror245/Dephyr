"use client";

import React from "react";
import AgentEventStream from "./components/AgentEventStream";
import { Terminal } from "lucide-react";

export default function AgentActivityPage() {
  return (
    <div className="space-y-6 w-full">
      {/* Top Banner: Floating rounded panel */}
      <div className="p-6 lg:p-7 rounded-panel bg-[#111113] border border-white/[0.08] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#ff7300]/10 border border-[#ff7300]/25 flex items-center justify-center text-[#ff7300] shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">
              Autonomous Remediation Event Stream
            </h2>
            <p className="text-xs sm:text-sm text-[#8e8e8e] leading-relaxed max-w-3xl">
              Real-time audit log of Dephyr investigating dependencies, creating fix branches, inspecting CI build breakages, and committing self-healing follow-up patches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-14 md:pl-0">
          <div className="px-3.5 py-1.5 rounded-pill bg-[#161619] border border-white/[0.06] flex items-center gap-2">
            <span className="text-[#8e8e8e]">Pass Proof Rate:</span>
            <span className="text-[#52e185] font-bold">99.4% (84/84)</span>
          </div>
        </div>
      </div>

      {/* Main Terminal Card: Floating rounded panel */}
      <AgentEventStream />
    </div>
  );
}
