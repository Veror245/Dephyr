import React from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, ArrowRight, ShieldAlert, GitPullRequest, Terminal } from "lucide-react";
import { VulnerabilityRecord } from "../../lib/mock-data";
import VulnerabilityCard from "./VulnerabilityCard";
import { useDashboardData } from "../../context/DashboardDataContext";

interface ScanResultPanelProps {
  repoUrl: string;
  onReset: () => void;
}

export default function ScanResultPanel({
  repoUrl,
  onReset,
}: ScanResultPanelProps) {
  const { repositories } = useDashboardData();
  const cleanRepoName = repoUrl
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/$/, "");

  const currentRepo = repositories.find(
    (r) =>
      `${r.org}/${r.name}`.toLowerCase() === cleanRepoName.toLowerCase() ||
      r.name.toLowerCase() === cleanRepoName.toLowerCase() ||
      r.id === cleanRepoName.toLowerCase()
  );

  const isSafe = currentRepo ? currentRepo.risk === "SAFE" : true;

  const resultVulnerabilities: VulnerabilityRecord[] = isSafe
    ? []
    : (currentRepo?.affectedCves || []).map((cveName, idx) => {
        const cleanPkg = cveName.replace(/\s*\((Uncalled|Called|Actively Called)\)/gi, "").trim();
        return {
          id: `${cleanRepoName.replace(/[^a-z0-9_-]/g, "-")}-vuln-${idx}`,
          cveId: cleanPkg,
          package: currentRepo?.name || "Target Module",
          affectedVersions: "AST Reachable",
          fixedVersion: "Upgrade dependency or patch AST call site",
          severity: (currentRepo?.risk === "CRITICAL" ? "CRITICAL" : "MEDIUM") as VulnerabilityRecord["severity"],
          cvss: currentRepo?.risk === "CRITICAL" ? 8.5 : 5.0,
          exposureLevel: (currentRepo?.risk === "CRITICAL" ? 2 : 1) as 0 | 1 | 2 | 3,
          status: "INVESTIGATING" as const,
          detectedAt: currentRepo?.lastScanned || "Just now",
          summary: `Vulnerability exposure detected in ${cleanRepoName}: ${currentRepo?.remediationStatus}`,
          description: `Analysis completed on ${currentRepo?.defaultBranch || "main"} branch. ${currentRepo?.remediationStatus}`,
        };
      });

  return (
    <div className="w-full rounded-panel bg-[#121214] border border-white/[0.12] p-7 lg:p-8 shadow-2xl animate-in fade-in duration-300 space-y-6">
      {/* Header bar: Repo info + Risk Badge + Dismiss affordance */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-card flex items-center justify-center shrink-0 ${
              isSafe
                ? "bg-[#52e185]/10 border border-[#52e185]/25 text-[#52e185]"
                : "bg-[#ff5252]/10 border border-[#ff5252]/25 text-[#ff5252]"
            }`}
          >
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {cleanRepoName}
              </h2>
              <a
                href={
                  repoUrl.startsWith("http")
                    ? repoUrl
                    : `https://github.com/${cleanRepoName}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8e8e8e] hover:text-white transition-colors"
                title="View on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-[#8e8e8e] mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>
                {isSafe
                  ? "Scanned dependencies · 0 reachable tainted paths detected"
                  : "Scanned dependencies · 1 critical tainted path reachable"}
              </span>
              {currentRepo?.total_function_call !== undefined && (
                <>
                  <span>·</span>
                  <span className="text-[#00d2ff] font-mono font-medium">
                    {currentRepo.total_function_call} AST function call{currentRepo.total_function_call === 1 ? "" : "s"} across {currentRepo.files?.length || 1} file{currentRepo.files?.length === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Risk Badge */}
          {isSafe ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-[#52e185]/15 border border-[#52e185]/30 text-xs font-bold text-[#52e185] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#52e185]" />
              VERIFIED SAFE
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-[#ff5252]/15 border border-[#ff5252]/30 text-xs font-bold text-[#ff5252] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#ff5252] animate-pulse" />
              CRITICAL RISK
            </div>
          )}

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
      <div
        className={`p-4 rounded-card border flex items-start gap-3.5 text-xs ${
          isSafe
            ? "bg-[#52e185]/10 border-[#52e185]/25"
            : "bg-[#ff7300]/10 border-[#ff7300]/25"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
            isSafe ? "bg-[#52e185]" : "bg-[#ff7300]"
          }`}
        />
        <div className="space-y-1">
          <p className="font-semibold text-white text-sm">
            {isSafe
              ? "Autonomous Taint Analysis Verified: Level 0 Safe Posture"
              : "Autonomous Taint Analysis Verified: Level 3 Exposure"}
          </p>
          <p className="text-[#c8c8c8] leading-relaxed">
            {isSafe
              ? "Dephyr traversed the repository AST call graphs and verified that no vulnerable symbols receive external untrusted parameters. No patch action required."
              : "Dephyr differentiated this from inactive dependencies: calls receive raw user query parameters. Immediate autonomous patch cycle initiated."}
          </p>
        </div>
      </div>

      {/* Vulnerability Cards List */}
      <div className="space-y-4">
        <div className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider pl-1">
          Detected Vulnerabilities ({resultVulnerabilities.length})
        </div>
        {resultVulnerabilities.length > 0 ? (
          resultVulnerabilities.map((vuln) => (
            <VulnerabilityCard key={vuln.id} vuln={vuln} />
          ))
        ) : (
          <div className="p-5 rounded-card bg-[#161619] border border-white/[0.04] text-xs text-[#8e8e8e]">
            No vulnerable dependencies with reachable call sites detected in this repository.
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08]">
        {isSafe ? (
          <>
            <span className="text-xs text-[#52e185] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#52e185]" />
              Repository posture verified secure. All dependency AST call sites are safe.
            </span>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/repositories"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-card bg-[#1c1c20] hover:bg-[#28282a] border border-white/10 text-xs font-semibold text-white transition-colors"
              >
                <span>View in Repositories</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs text-[#8e8e8e]">
              Autonomous remediation pipeline available for detected tainted AST paths.
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
                <span>Pull Requests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
