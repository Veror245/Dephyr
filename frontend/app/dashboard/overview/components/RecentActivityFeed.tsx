import React from "react";
import Link from "next/link";
import { Terminal, ArrowRight } from "lucide-react";
import { useDashboardData } from "../../context/DashboardDataContext";

export default function RecentActivityFeed() {
  const { agentEvents } = useDashboardData();
  const recentEvents = agentEvents.slice(0, 5);

  const badgeStyles = {
    warn: "bg-[#ffb300]/15 text-[#ffb300] border-[#ffb300]/30",
    info: "bg-[#79b0ff]/15 text-[#79b0ff] border-[#79b0ff]/30",
    error: "bg-[#ff5252]/15 text-[#ff5252] border-[#ff5252]/30",
    action: "bg-white/10 text-[#c8c8c8] border-white/15",
    success: "bg-[#52e185]/15 text-[#52e185] border-[#52e185]/30",
  };

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#ff7300]" />
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Recent Autonomous Activity
          </h2>
        </div>

        <Link
          href="/dashboard/agent-activity"
          className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] hover:text-white transition-colors"
        >
          <span>See all events</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stream preview list */}
      <div className="space-y-3">
        {recentEvents.length === 0 ? (
          <div className="p-5 rounded-card bg-[#161619] border border-white/[0.04] text-xs text-[#8e8e8e] text-center">
            No autonomous activity logged in this session yet. Events will appear when repository scans or agent patches execute.
          </div>
        ) : (
          recentEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-3.5 sm:p-4 rounded-card bg-[#161619] border border-white/[0.04] hover:bg-[#1a1a1e] hover:border-white/[0.08] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-xs text-[#8e8e8e] shrink-0 font-mono">
                {evt.timestamp}
              </span>

              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                  badgeStyles[evt.badgeType]
                }`}
              >
                {evt.badge}
              </span>

              <span className="text-white text-xs font-medium truncate">
                {evt.text}
              </span>
            </div>

            <div className="flex items-center gap-2 pl-9 sm:pl-0 shrink-0">
              <span className="px-2 py-0.5 rounded bg-white/5 text-[#c8c8c8] text-[11px] font-mono border border-white/5">
                {evt.repo}
              </span>
            </div>
          </div>
        ))
      )}
      </div>
    </div>
  );
}
