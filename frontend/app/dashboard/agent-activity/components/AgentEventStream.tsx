"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MOCK_AGENT_EVENTS, AgentLogEvent } from "../../lib/mock-data";
import AgentEventRow from "./AgentEventRow";
import LiveStatusIndicator from "./LiveStatusIndicator";
import { Play, Pause, Terminal, Send, Loader2, CheckCircle2, AlertCircle, Wifi } from "lucide-react";
import { api, JobEvent, JobRecord } from "@/app/lib/api";
import { useDashboardData } from "../../context/DashboardDataContext";

function mapEventTypeToBadge(type: string): AgentLogEvent["badge"] {
  switch (type.toUpperCase()) {
    case "STARTED":
      return "ANALYSIS";
    case "SCAN_RESULT":
      return "STATIC";
    case "COMMIT_PUSHED":
      return "COMMIT";
    case "PR_CREATED":
      return "GIT";
    case "FOLLOWUP_PUSHED":
      return "DIAGNOSIS";
    case "COMPLETED":
      return "CI PASS";
    case "FAILED":
      return "CI FAIL";
    default:
      return "ALERT";
  }
}

function mapEventTypeToBadgeType(type: string): AgentLogEvent["badgeType"] {
  switch (type.toUpperCase()) {
    case "STARTED":
      return "info";
    case "SCAN_RESULT":
      return "warn";
    case "COMMIT_PUSHED":
      return "action";
    case "PR_CREATED":
      return "action";
    case "FOLLOWUP_PUSHED":
      return "warn";
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "error";
    default:
      return "info";
  }
}

function formatJobEvent(evt: JobEvent, repoFallback: string): AgentLogEvent {
  const time = evt.timestamp
    ? new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  let detail: string | undefined = undefined;
  if (evt.data && Object.keys(evt.data).length > 0) {
    detail = JSON.stringify(evt.data);
  }

  return {
    id: `evt-${evt.id || Math.random().toString(36).slice(2, 9)}`,
    timestamp: time,
    repo: (evt.data?.repo as string) || repoFallback || "dephyr-runtime",
    badge: mapEventTypeToBadge(evt.type),
    badgeType: mapEventTypeToBadgeType(evt.type),
    text: evt.message || `Event: ${evt.type}`,
    detail,
  };
}

export default function AgentEventStream() {
  const { agentEvents, addAgentEvent } = useDashboardData();
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("job_id") || "";

  const [jobId, setJobId] = useState<string>(initialJobId);
  const [jobInput, setJobInput] = useState<string>(initialJobId);
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null);

  const [events, setEvents] = useState<AgentLogEvent[]>(agentEvents);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [streamStatus, setStreamStatus] = useState<string>("IDLE");
  const [streamError, setStreamError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState<string>("ALL");
  const [selectedBadge, setSelectedBadge] = useState<string>("ALL");

  // Keep events synced with agentEvents when no specific job stream is active
  useEffect(() => {
    if (!jobId) {
      setEvents(agentEvents);
    }
  }, [agentEvents, jobId]);

  // Agent dispatch states
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [dispatchForm, setDispatchForm] = useState({
    repo_name: "dephyr-demo/repo-c",
    cve_id: "CVE-2026-4891",
    package_name: "example-lib",
    vulnerable_symbol: "parseQuery",
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Stream subscription effect
  useEffect(() => {
    if (!jobId) return;

    // First load job info and durable past events from database
    api.jobs
      .getJob(jobId)
      .then((job) => setActiveJob(job))
      .catch((err) => console.warn(`Could not load job ${jobId}:`, err));

    api.jobs
      .getEvents(jobId, 0)
      .then((historyEvents) => {
        if (historyEvents && historyEvents.length > 0) {
          const formattedHistory = historyEvents.map((e) => formatJobEvent(e, "dephyr-runtime"));
          setEvents((prev) => {
            const combined = [...formattedHistory, ...prev];
            // Deduplicate by ID
            const seen = new Set<string>();
            return combined.filter((item) => {
              if (seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            });
          });
        }
      })
      .catch((err) => console.warn("Could not load past events:", err));

    // Connect to live SSE stream
    setIsLiveStreaming(true);
    setStreamStatus("CONNECTING");
    setStreamError(null);

    const unsubscribe = api.jobs.streamJobEvents(jobId, {
      onOpen: () => {
        setStreamStatus("STREAMING");
      },
      onEvent: (liveEvent) => {
        const formatted = formatJobEvent(liveEvent, "dephyr-runtime");
        // Incrementally update UI as stream data arrives
        setEvents((prev) => [formatted, ...prev]);
      },
      onError: (err) => {
        setStreamStatus("ERROR");
        setStreamError(err.message);
      },
      onDone: () => {
        setStreamStatus("COMPLETED");
        setIsLiveStreaming(false);
      },
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [jobId]);

  const handleToggleStream = () => {
    if (isLiveStreaming) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsLiveStreaming(false);
      setStreamStatus("PAUSED");
    } else if (jobId) {
      // Reconnect
      setIsLiveStreaming(true);
      setStreamStatus("CONNECTING");
      const unsubscribe = api.jobs.streamJobEvents(jobId, {
        onOpen: () => setStreamStatus("STREAMING"),
        onEvent: (liveEvent) => {
          const formatted = formatJobEvent(liveEvent, "dephyr-runtime");
          setEvents((prev) => [formatted, ...prev]);
        },
        onError: (err) => {
          setStreamStatus("ERROR");
          setStreamError(err.message);
        },
        onDone: () => {
          setStreamStatus("COMPLETED");
          setIsLiveStreaming(false);
        },
      });
      unsubscribeRef.current = unsubscribe;
    }
  };

  const handleConnectJob = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = jobInput.trim();
    if (clean) {
      setJobId(clean);
    }
  };

  const handleDispatchAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    setDispatchResult(null);
    setDispatchError(null);

    try {
      const res = await api.agent.dispatch(dispatchForm);
      setDispatchResult(res.status || "Agent dispatched successfully");
      addAgentEvent({
        id: `dispatch-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        repo: dispatchForm.repo_name,
        badge: "ANALYSIS",
        badgeType: "info",
        text: `Agent dispatched for ${dispatchForm.cve_id} on ${dispatchForm.package_name} (${dispatchForm.vulnerable_symbol})`,
        detail: JSON.stringify(res),
      });
      setTimeout(() => setShowDispatchModal(false), 2000);
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : "Failed to dispatch agent");
    } finally {
      setIsDispatching(false);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesRepo = selectedRepo === "ALL" || evt.repo === selectedRepo;
    const matchesBadge = selectedBadge === "ALL" || evt.badge === selectedBadge;
    return matchesRepo && matchesBadge;
  });

  return (
    <div className="w-full rounded-panel bg-[#121214] border border-white/[0.12] overflow-hidden shadow-2xl space-y-0">
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
              dephyr-agent-daemon {jobId ? `— job_id: ${jobId.slice(0, 12)}` : "— listening"}
            </span>
            {activeJob && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white uppercase">
                {activeJob.kind} ({activeJob.status})
              </span>
            )}
          </div>
        </div>

        {/* Live Status Indicator, Stream Controls & Dispatch Action */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowDispatchModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-[#ff7300] hover:bg-[#ff8c2e] text-black font-semibold text-xs transition-colors cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Dispatch Agent (POST /dispatch)</span>
          </button>

          {jobId && (
            <button
              onClick={handleToggleStream}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-control bg-white/5 hover:bg-white/10 text-xs text-[#8e8e8e] hover:text-white transition-colors cursor-pointer"
            >
              {isLiveStreaming ? (
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
          )}

          <LiveStatusIndicator
            statusText={streamStatus === "STREAMING" ? "LIVE STREAM" : streamStatus}
            isPulsing={streamStatus === "STREAMING"}
          />
        </div>
      </div>

      {/* Real-time Job Connection Bar */}
      <div className="px-6 sm:px-7 py-3 bg-[#151518] border-b border-white/[0.04] flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleConnectJob} className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-[#8e8e8e] font-mono shrink-0">Live SSE Stream (/jobs/stream):</span>
          <input
            type="text"
            placeholder="Enter Job ID (e.g. from Remediation run)..."
            value={jobInput}
            onChange={(e) => setJobInput(e.target.value)}
            className="flex-1 bg-[#1a1a1e] border border-white/10 rounded-pill px-3 py-1 text-xs text-white placeholder-[#8e8e8e] focus:outline-none focus:border-[#ff7300] font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-pill bg-white/10 hover:bg-white/15 text-white font-mono text-xs transition-colors cursor-pointer"
          >
            Connect
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs font-mono text-[#8e8e8e]">
          <Wifi className={`w-3.5 h-3.5 ${streamStatus === "STREAMING" ? "text-[#52e185] animate-pulse" : "text-[#8e8e8e]"}`} />
          <span>Status: {streamStatus}</span>
        </div>
      </div>

      {/* Stream Error Notice */}
      {streamError && (
        <div className="px-6 py-2.5 bg-[#ff5252]/10 border-b border-[#ff5252]/20 text-xs text-[#ff5252] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Stream subscription notice: {streamError}</span>
        </div>
      )}

      {/* Dispatch Modal / Drawer */}
      {showDispatchModal && (
        <div className="p-6 bg-[#161619] border-b border-white/[0.08] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Send className="w-4 h-4 text-[#ff7300]" />
              Dispatch Autonomous Dephyr Agent (POST /agent/dispatch)
            </h4>
            <button
              onClick={() => setShowDispatchModal(false)}
              className="text-[#8e8e8e] hover:text-white text-xs cursor-pointer font-mono"
            >
              [Close]
            </button>
          </div>

          <form onSubmit={handleDispatchAgent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[#8e8e8e] block mb-1 font-mono">repo_name</label>
              <input
                type="text"
                value={dispatchForm.repo_name}
                onChange={(e) => setDispatchForm({ ...dispatchForm, repo_name: e.target.value })}
                className="w-full bg-[#111113] border border-white/10 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#ff7300]"
                required
              />
            </div>
            <div>
              <label className="text-[#8e8e8e] block mb-1 font-mono">cve_id</label>
              <input
                type="text"
                value={dispatchForm.cve_id}
                onChange={(e) => setDispatchForm({ ...dispatchForm, cve_id: e.target.value })}
                className="w-full bg-[#111113] border border-white/10 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#ff7300]"
                required
              />
            </div>
            <div>
              <label className="text-[#8e8e8e] block mb-1 font-mono">package_name</label>
              <input
                type="text"
                value={dispatchForm.package_name}
                onChange={(e) => setDispatchForm({ ...dispatchForm, package_name: e.target.value })}
                className="w-full bg-[#111113] border border-white/10 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#ff7300]"
                required
              />
            </div>
            <div>
              <label className="text-[#8e8e8e] block mb-1 font-mono">vulnerable_symbol</label>
              <input
                type="text"
                value={dispatchForm.vulnerable_symbol}
                onChange={(e) => setDispatchForm({ ...dispatchForm, vulnerable_symbol: e.target.value })}
                className="w-full bg-[#111113] border border-white/10 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#ff7300]"
                required
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#8e8e8e]">
                Forwards task payload to Dephyr Agent daemon listening on port 8001.
              </span>
              <button
                type="submit"
                disabled={isDispatching}
                className="px-5 py-2 rounded-pill bg-[#ff7300] hover:bg-[#ff8c2e] text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Trigger Dispatch</span>
              </button>
            </div>
          </form>

          {dispatchResult && (
            <div className="p-3 rounded bg-[#52e185]/10 border border-[#52e185]/20 text-xs text-[#52e185] flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{dispatchResult}</span>
            </div>
          )}

          {dispatchError && (
            <div className="p-3 rounded bg-[#ff5252]/10 border border-[#ff5252]/20 text-xs text-[#ff5252] flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dispatchError}</span>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="px-6 sm:px-7 py-3.5 bg-[#141417] border-b border-white/[0.04] flex flex-wrap items-center justify-between gap-4">
        {/* Repo Filter Pills */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-[#8e8e8e] font-semibold uppercase tracking-wider">
            Repository:
          </span>
          <div className="flex items-center gap-1 p-0.5 rounded-pill bg-[#1c1c20] border border-white/[0.06] text-xs">
            {["ALL", "repo-c", "gateway-proxy", "dephyr-runtime"].map((repo) => (
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
          {streamStatus === "STREAMING" ? "Listening to live SSE stream (/jobs/stream)" : "Listening to webhook push triggers"}
        </span>
      </div>
    </div>
  );
}
