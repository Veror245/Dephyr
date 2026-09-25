import React from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, ArrowRight, ShieldAlert, GitPullRequest, Terminal } from "lucide-react";
import { MOCK_CVES, VulnerabilityRecord } from "../../lib/mock-data";
import VulnerabilityCard from "./VulnerabilityCard";

interface ScanResultPanelProps {
  repoUrl: string;
  onReset: () => void;
}

export default function ScanResultPanel({
  repoUrl,
  onReset,
}: ScanResultPanelProps) {
  const resultVulnerabilities: VulnerabilityRecord[] = [
    MOCK_CVES[0],
    {
      id: "cve-2026-2209",
      cveId: "CVE-2026-2209",
      package: "cookie-signature",
      affectedVersions: "< 1.0.6",
      fixedVersion: "1.0.6",
      severity: "LOW",
      cvss: 3.1,
      exposureLevel: 0,
      status: "TRIAGED",
      detectedAt: "Just now",
      summary: "Timing discrepancy in HMAC comparison",
      description: "Level 0 evidence: module is transitive dependency in lockfile, but verifyCookie() symbol is never imported.",
    },
  ];

  const cleanRepoName = repoUrl
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/$/, "");

  return (
    <div className="w-full rounded-panel bg-[#121214] border border-white/[0.12] p-7 lg:p-8 shadow-2xl animate-in fade-in duration-300 space-y-6">
      {/* Header bar: Repo info + Risk Badge + Dismiss affordance */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-card bg-[#ff5252]/10 border border-[#ff5252]/25 flex items-center justify-center text-[#ff5252] shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {cleanRepoName || "dephyr-demo/repo-c"}
              </h2>
              <a
                href={
                  repoUrl.startsWith("http")
                    ? repoUrl
                    : `https://github.com/${cleanRepoName || "dephyr-demo/repo-c"}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8e8e8e] hover:text-white transition-colors"
                title="View on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-[#8e8e8e] mt-0.5">
              Scanned 42 dependencies · 1 critical tainted path reachable
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Risk Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-[#ff5252]/15 border border-[#ff5252]/30 text-xs font-bold text-[#ff5252] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#ff5252] animate-pulse" />
            CRITICAL RISK
          </div>

          {/* Dismiss / Scan another */}
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] hover:text-white transition-colors px-3 py-1.5 rounded-control hover:bg-white/5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan another repo</span>
          </button>
        </div>
      </div>

      {/* Exposure Differentiator Notice */}
      <div className="p-4 rounded-card bg-[#ff7300]/10 border border-[#ff7300]/25 flex items-start gap-3.5 text-xs">
        <span className="w-2 h-2 rounded-full bg-[#ff7300] shrink-0 mt-1.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white text-sm">
            Autonomous Taint Analysis Verified: Level 3 Exposure
          </p>
          <p className="text-[#c8c8c8] leading-relaxed">
            Dephyr differentiated this from inactive dependencies: <code className="text-[#ff8c2e] font-mono">parseQuery()</code> receives raw user query parameters at <code className="text-white font-mono">src/api/query.js:84</code>. Immediate autonomous patch cycle initiated.
          </p>
        </div>
      </div>

      {/* Vulnerability Cards List */}
      <div className="space-y-4">
        <div className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider pl-1">
          Detected Vulnerabilities (2)
        </div>
        {resultVulnerabilities.map((vuln) => (
          <VulnerabilityCard key={vuln.id} vuln={vuln} />
        ))}
      </div>

      {/* Action Footer */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08]">
        <span className="text-xs text-[#8e8e8e]">
          Autonomous branch <code className="font-mono text-white text-xs">dephyr/remediate-cve-2026-4891</code> ready for test execution.
        </span>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/agent-activity"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card bg-[#1c1c20] hover:bg-[#28282a] border border-white/10 text-xs font-semibold text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-[#ff7300]" />
            View in Agent Activity
          </Link>

          <Link
            href="/dashboard/pull-requests"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-white text-black font-semibold text-xs shadow-glowPill hover:shadow-glowPillHover hover:-translate-y-0.5 transition-all"
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            Inspect PR #42 Fix
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
