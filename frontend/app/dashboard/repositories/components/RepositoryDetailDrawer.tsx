import React from "react";
import { RepositoryRecord } from "../../lib/mock-data";
import RepositoryRiskBadge from "./RepositoryRiskBadge";
import { X, ExternalLink, Shield, GitPullRequest } from "lucide-react";
import Link from "next/link";

interface RepositoryDetailDrawerProps {
  repo: RepositoryRecord | null;
  onClose: () => void;
}

export default function RepositoryDetailDrawer({
  repo,
  onClose,
}: RepositoryDetailDrawerProps) {
  if (!repo) return null;

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.12] p-7 lg:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-base sm:text-lg font-bold text-white">
              {repo.org}/{repo.name}
            </span>
            <RepositoryRiskBadge risk={repo.risk} />
          </div>
          <p className="text-xs sm:text-sm text-[#8e8e8e]">
            Continuous AST taint monitoring enabled on branch <code className="text-[#c8c8c8] font-mono">{repo.defaultBranch}</code>
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-control text-[#8e8e8e] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close repository drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block mb-1 text-xs">Active Exposures</span>
          <span className="font-display text-2xl font-bold text-white">
            {repo.activeExposures}
          </span>
        </div>

        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block mb-1 text-xs">Last Full Scan</span>
          <span className="text-white font-medium text-xs sm:text-sm">{repo.lastScanned}</span>
        </div>

        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block mb-1 text-xs">Target Branch</span>
          <span className="font-mono text-[#c8c8c8] text-xs sm:text-sm">{repo.defaultBranch}</span>
        </div>
      </div>

      {/* Affected CVEs */}
      <div className="p-5 rounded-card bg-[#161619] border border-white/[0.08] space-y-3">
        <div className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider">
          Detected CVE Findings
        </div>

        {repo.affectedCves.length > 0 ? (
          <div className="space-y-2.5">
            {repo.affectedCves.map((cve) => (
              <div
                key={cve}
                className="flex items-center justify-between p-3 rounded-control bg-[#0c0c0e] border border-white/[0.06] text-xs font-mono"
              >
                <span className="text-[#ff5252] font-bold text-xs">{cve}</span>
                <Link
                  href="/dashboard/cve-feed"
                  className="text-xs text-[#8e8e8e] hover:text-white transition-colors"
                >
                  View AST Evidence →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-control bg-[#52e185]/5 border border-[#52e185]/15 text-xs text-[#52e185] flex items-center gap-2.5">
            <Shield className="w-4 h-4 shrink-0" />
            <span>All dependency AST paths verified secure. Zero active exposures.</span>
          </div>
        )}
      </div>

      {/* Remediation Status */}
      <div className="space-y-2 text-xs text-[#8e8e8e]">
        <span className="font-semibold text-white block">Autonomous Status</span>
        <p className="p-4 rounded-control bg-[#161619] border border-white/[0.04] text-[#c8c8c8] leading-relaxed">
          {repo.remediationStatus}
        </p>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open on GitHub</span>
        </a>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/pull-requests"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-white text-black text-xs font-semibold shadow-glowPill hover:shadow-glowPillHover transition-all"
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Autonomous PRs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
