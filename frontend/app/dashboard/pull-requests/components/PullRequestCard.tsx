"use client";

import React, { useState } from "react";
import { PullRequestRecord } from "../../lib/mock-data";
import CiStatusBadge from "./CiStatusBadge";
import DiffPreview from "./DiffPreview";
import { RotateCcw, ExternalLink, GitBranch, Check } from "lucide-react";

interface PullRequestCardProps {
  pr: PullRequestRecord;
}

export default function PullRequestCard({ pr }: PullRequestCardProps) {
  const [retrying, setRetrying] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      setRetrySuccess(true);
      setTimeout(() => setRetrySuccess(false), 2500);
    }, 1200);
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
          <code className="font-mono text-xs text-[#c8c8c8]">{pr.branch}</code>
        </div>
        <span>Opened by {pr.author} · {pr.openedAt}</span>
      </div>

      {/* Diff Preview */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider pl-1">
          Automated Patch Diff
        </div>
        <DiffPreview diff={pr.diff} />
      </div>

      {/* Actions */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06]">
        <span className="text-xs text-[#8e8e8e]">
          Verified against test suite: <span className="text-white font-semibold">{pr.testsPassed} passing</span>
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-[#1c1c20] hover:bg-[#28282a] border border-white/10 text-xs font-semibold text-[#c8c8c8] hover:text-white transition-colors cursor-pointer"
          >
            {retrySuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#52e185]" />
                <span className="text-[#52e185]">Analysis Re-queued</span>
              </>
            ) : (
              <>
                <RotateCcw className={`w-3.5 h-3.5 text-[#ff7300] ${retrying ? "animate-spin" : ""}`} />
                <span>{retrying ? "Re-triggering..." : "Re-trigger CI"}</span>
              </>
            )}
          </button>

          <a
            href={`https://github.com/${pr.repo}/pull/${pr.number}`}
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
