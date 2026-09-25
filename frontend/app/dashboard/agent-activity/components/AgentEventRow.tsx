import React from "react";
import { AgentLogEvent } from "../../lib/mock-data";

interface AgentEventRowProps {
  event: AgentLogEvent;
}

export default function AgentEventRow({ event }: AgentEventRowProps) {
  const badgeStyles = {
    warn: "bg-[#ffb300]/15 text-[#ffb300] border-[#ffb300]/30",
    info: "bg-[#79b0ff]/15 text-[#79b0ff] border-[#79b0ff]/30",
    error: "bg-[#ff5252]/15 text-[#ff5252] border-[#ff5252]/30",
    action: "bg-white/10 text-[#e0e0e0] border-white/20",
    success: "bg-[#52e185]/15 text-[#52e185] border-[#52e185]/30",
  }[event.badgeType];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-4.5 rounded-card bg-[#161619] border border-white/[0.04] hover:bg-[#1a1a1e] hover:border-white/[0.08] transition-all">
      {/* Left side: Step/Timestamp + Badge + Message */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <span className="text-xs font-mono text-[#8e8e8e] shrink-0 min-w-[46px]">
          {event.timestamp}
        </span>

        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase border tracking-wider shrink-0 ${badgeStyles}`}
        >
          {event.badge}
        </span>

        <span className="text-xs sm:text-sm text-white font-medium truncate">
          {event.text}
        </span>
      </div>

      {/* Right side: Detail trace + Repo badge */}
      <div className="flex items-center gap-3.5 shrink-0 pl-14 md:pl-0">
        {event.detail && (
          <span className="text-xs font-mono text-[#8e8e8e] max-w-md truncate md:text-right">
            {event.detail}
          </span>
        )}

        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-white/5 border border-white/5 text-[#c8c8c8] shrink-0">
          {event.repo}
        </span>
      </div>
    </div>
  );
}
