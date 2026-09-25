"use client";

import React, { useState } from "react";
import { PullRequestRecord } from "../../lib/mock-data";
import CiStatusBadge from "./CiStatusBadge";
import DiffPreview from "./DiffPreview";
import { RotateCcw, ExternalLink, GitBranch, Check, Terminal, FileText, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { api, PullRequestDetailsResponse, WorkflowRun } from "@/app/lib/api";

interface PullRequestCardProps {
  pr: PullRequestRecord;
}

export default function PullRequestCard({ pr }: PullRequestCardProps) {
  const [retrying, setRetrying] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState(false);
  const [liveDetails, setLiveDetails] = useState<PullRequestDetailsResponse | null>(null);
  const [ciRuns, setCiRuns] = useState<WorkflowRun[] | null>(null);
  const [ciError, setCiError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [ciLogs, setCiLogs] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [showRunsPanel, setShowRunsPanel] = useState<boolean>(false);

  const handleFetchCiAndDetails = async () => {
    setRetrying(true);
    setCiError(null);
    try {
      const [detailsData, ciData] = await Promise.allSettled([
        api.pullRequests.getDetails(pr.repo, pr.number),
        api.pullRequests.getCi(pr.repo, pr.number),
      ]);

      if (detailsData.status === "fulfilled") {
        setLiveDetails(detailsData.value);
      }
      if (ciData.status === "fulfilled") {
        setCiRuns(ciData.value.runs);
        setShowRunsPanel(true);
        setRetrySuccess(true);
        setTimeout(() => setRetrySuccess(false), 2500);
      } else {
        setCiError(ciData.reason instanceof Error ? ciData.reason.message : "Failed to fetch CI");
      }
    } catch (err) {
      setCiError(err instanceof Error ? err.message : "Error querying pull request endpoints");
    } finally {
      setRetrying(false);
    }
  };

  const handleFetchLogs = async (runId: number) => {
    if (selectedRunId === runId && ciLogs) {
      // Toggle close
      setSelectedRunId(null);
      setCiLogs(null);
      return;
    }

    setSelectedRunId(runId);
    setLoadingLogs(true);
    try {
      const logData = await api.pullRequests.getLogs(pr.repo, runId);
      setCiLogs(logData.logs || "No log output recorded for this run.");
    } catch (err) {
      setCiLogs(`Failed to retrieve logs: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] hover:border-white/[0.14] p-7 lg:p-8 shadow-card transition-all space-y-6">
      {/* Top row: Repo & PR # + CI Status */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-semibold text-[#8e8e8e]">
              {pr.repo}
            </span>
            <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/5 border border-white/5">
              #{pr.number}
            </span>
            <span className="text-xs font-mono text-[#ff7300] px-2 py-0.5 rounded bg-[#ff7300]/10 border border-[#ff7300]/20">
              {pr.cveId}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {pr.title}
          </h3>
        </div>

        <CiStatusBadge
          status={pr.ciStatus}
          testsRun={pr.testsRun}
          testsPassed={pr.testsPassed}
        />
      </div>

      {/* Branch & Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#8e8e8e]">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[#ff7300]" />
          <code className="font-mono text-xs text-[#c8c8c8]">
            {liveDetails?.branch || pr.branch}
          </code>
          {liveDetails?.head_sha && (
            <span className="text-[10px] font-mono text-[#8e8e8e]">
              ({liveDetails.head_sha.slice(0, 7)})
            </span>
          )}
        </div>
        <span>
          Opened by {pr.author} · {pr.openedAt}
          {liveDetails && (
            <span className="ml-2 font-mono text-[#52e185] uppercase text-[10px] bg-[#52e185]/10 px-1.5 py-0.5 rounded border border-[#52e185]/20">
              {liveDetails.state}
            </span>
          )}
        </span>
      </div>

      {/* Diff Preview */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider pl-1">
          Automated Patch Diff
        </div>
        <DiffPreview diff={pr.diff} />
      </div>

      {/* CI Runs & Logs Panel (Triggered by POST /pull-requests/ci and /logs) */}
      {ciError && (
        <div className="p-3.5 rounded-card bg-[#ff5252]/10 border border-[#ff5252]/20 text-xs text-[#ff5252] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Backend CI response: {ciError}</span>
        </div>
      )}

      {ciRuns && ciRuns.length > 0 && (
        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.08] space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#ff7300]" />
              GitHub Actions Runs ({ciRuns.length})
            </span>
            <button
              onClick={() => setShowRunsPanel(!showRunsPanel)}
              className="text-[#8e8e8e] hover:text-white transition-colors"
            >
              {showRunsPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showRunsPanel && (
            <div className="space-y-2 pt-2 border-t border-white/[0.04]">
              {ciRuns.map((run) => (
                <div
                  key={run.id}
                  className="p-3 rounded-control bg-[#0c0c0e] border border-white/[0.06] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          run.conclusion === "success"
                            ? "bg-[#52e185]"
                            : run.conclusion === "failure"
                            ? "bg-[#ff5252]"
                            : "bg-[#ffb300]"
                        }`}
                      />
                      <span className="font-mono font-medium text-white">{run.name}</span>
                      <span className="text-[10px] text-[#8e8e8e] font-mono">#{run.id}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          run.conclusion === "success"
                            ? "bg-[#52e185]/15 text-[#52e185]"
                            : run.conclusion === "failure"
                            ? "bg-[#ff5252]/15 text-[#ff5252]"
                            : "bg-[#ffb300]/15 text-[#ffb300]"
                        }`}
                      >
                        {run.conclusion || run.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFetchLogs(run.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-white/5 hover:bg-white/10 text-[#c8c8c8] hover:text-white transition-colors text-xs font-mono cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-[#ff7300]" />
                        <span>{selectedRunId === run.id ? "Hide Logs" : "Inspect Logs"}</span>
                      </button>
                      <a
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8e8e8e] hover:text-white"
                        title="View run on GitHub"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {selectedRunId === run.id && (
                    <div className="mt-2 pt-2 border-t border-white/[0.04]">
                      {loadingLogs ? (
                        <div className="py-4 text-center text-[#8e8e8e] flex items-center justify-center gap-2 font-mono">
                          <Loader2 className="w-4 h-4 animate-spin text-[#ff7300]" />
                          <span>Streaming logs archive via POST /pull-requests/logs...</span>
                        </div>
                      ) : (
                        <pre className="p-3 rounded-control bg-black/60 font-mono text-[11px] text-[#c8c8c8] max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                          {ciLogs}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06]">
        <span className="text-xs text-[#8e8e8e]">
          Verified against test suite: <span className="text-white font-semibold">{pr.testsPassed} passing</span>
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFetchCiAndDetails}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-[#1c1c20] hover:bg-[#28282a] border border-white/10 text-xs font-semibold text-[#c8c8c8] hover:text-white transition-colors cursor-pointer"
          >
            {retrySuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#52e185]" />
                <span className="text-[#52e185]">CI Synced</span>
              </>
            ) : (
              <>
                <RotateCcw className={`w-3.5 h-3.5 text-[#ff7300] ${retrying ? "animate-spin" : ""}`} />
                <span>{retrying ? "Querying..." : "Check Live CI (POST /ci)"}</span>
              </>
            )}
          </button>

          <a
            href={liveDetails?.url || `https://github.com/${pr.repo}/pull/${pr.number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-white text-black text-xs font-semibold shadow-glowPill hover:shadow-glowPillHover transition-all cursor-pointer"
          >
            <span>Review on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
