"use client";

import React, { useState } from "react";
import { MOCK_AGENT_EVENTS } from "../../lib/mock-data";
import AgentEventRow from "./AgentEventRow";
import LiveStatusIndicator from "./LiveStatusIndicator";
import { Play, Pause, Terminal } from "lucide-react";

export default function AgentEventStream() {
  const [selectedRepo, setSelectedRepo] = useState<string>("ALL");
  const [selectedBadge, setSelectedBadge] = useState<string>("ALL");
  const [isLive, setIsLive] = useState(true);

  const filteredEvents = MOCK_AGENT_EVENTS.filter((evt) => {
    const matchesRepo = selectedRepo === "ALL" || evt.repo === selectedRepo;
    const matchesBadge =
      selectedBadge === "ALL" || evt.badge === selectedBadge;
    return matchesRepo && matchesBadge;
  });

  return (
    <div className="w-full rounded-panel bg-[#121214] border border-white/[0.12] overflow-hidden shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="px-6 sm:px-7 py-4 bg-[#18181b] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        {/* Terminal Dots + Session Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>

          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-[#ff7300]" />
            <span className="text-xs sm:text-sm font-mono text-[#8e8e8e]">
              dephyr-agent-daemon — session_id: act_9941a8
            </span>
          </div>
        </div>

        {/* Live Status Indicator & Pause/Play */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-control bg-white/5 hover:bg-white/10 text-xs text-[#8e8e8e] hover:text-white transition-colors cursor-pointer"
          >
            {isLive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-[#ffb300]" />
                <span>Pause Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#52e185]" />
                <span>Resume Stream</span>
              </>
            )}
          </button>

          <LiveStatusIndicator
            statusText={isLive ? "AUTONOMOUS" : "PAUSED"}
            isPulsing={isLive}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 sm:px-7 py-3.5 bg-[#141417] border-b border-white/[0.04] flex flex-wrap items-center justify-between gap-4">
        {/* Repo Filter Pills */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-[#8e8e8e] font-semibold uppercase tracking-wider">
            Repository:
          </span>
          <div className="flex items-center gap-1 p-0.5 rounded-pill bg-[#1c1c20] border border-white/[0.06] text-xs">
            {["ALL", "repo-c", "gateway-proxy"].map((repo) => (
              <button
                key={repo}
                onClick={() => setSelectedRepo(repo)}
                className={`px-3 py-1 rounded-pill text-xs font-mono transition-colors ${
                  selectedRepo === repo
                    ? "bg-[#28282a] text-white shadow-sm font-semibold"
                    : "text-[#8e8e8e] hover:text-white"
                }`}
              >
                {repo}
              </button>
            ))}
          </div>
        </div>

        {/* Badge Filter Pills */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-[#8e8e8e] font-semibold uppercase tracking-wider">
            Filter Stage:
          </span>
          <div className="flex items-center gap-1 p-0.5 rounded-pill bg-[#1c1c20] border border-white/[0.06] text-xs">
            {["ALL", "ALERT", "GIT", "CI FAIL", "CI PASS"].map((badge) => (
              <button
                key={badge}
                onClick={() => setSelectedBadge(badge)}
                className={`px-2.5 py-1 rounded-pill text-[11px] font-semibold transition-colors ${
                  selectedBadge === badge
                    ? "bg-[#28282a] text-white shadow-sm"
                    : "text-[#8e8e8e] hover:text-white"
                }`}
              >
                {badge}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log Events List */}
      <div className="p-6 sm:p-7 space-y-3 max-h-[640px] overflow-y-auto custom-scrollbar">
        {filteredEvents.map((evt) => (
          <AgentEventRow key={evt.id} event={evt} />
        ))}
      </div>

      {/* Terminal Footer */}
      <div className="px-6 sm:px-7 py-3.5 bg-[#141417] border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-[#8e8e8e]">
        <span>Showing {filteredEvents.length} autonomous events</span>
        <span className="text-[#52e185] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#52e185] animate-pulse" />
          Listening to webhook push triggers
        </span>
      </div>
    </div>
  );
}
