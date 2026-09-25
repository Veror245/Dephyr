"use client";

import React, { useState } from "react";
import { MOCK_REMEDIATION_HISTORY, RemediationHistoryItem } from "../../lib/mock-data";
import { GitPullRequest, Play, RotateCcw, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { api, JobSubmitResponse } from "@/app/lib/api";

export default function RemediationHistoryTable() {
  const [history, setHistory] = useState<RemediationHistoryItem[]>(MOCK_REMEDIATION_HISTORY);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [submittingFollowup, setSubmittingFollowup] = useState(false);
  const [lastJob, setLastJob] = useState<JobSubmitResponse | null>(null);
  const [remediationError, setRemediationError] = useState<string | null>(null);

  const handleApplyRemediation = async () => {
    setSubmittingApply(true);
    setRemediationError(null);
    try {
      const response = await api.remediation.apply({
        repo: "dephyr-demo/repo-c",
        cve_id: "CVE-2026-4891",
        title: "Dephyr: autonomous remediation for CVE-2026-4891",
        description: "Automated patch upgrading vulnerable package and adapting AST call site.",
        base_branch: "main",
        patches: [
          {
            path: "package.json",
            old: '"example-lib": "^1.0.0"',
            new: '"example-lib": "^1.2.0"',
          },
        ],
      });
      setLastJob(response);

      const newItem: RemediationHistoryItem = {
        id: `job-${response.job_id.slice(0, 8)}`,
        repo: "dephyr-demo/repo-c",
        cveId: "CVE-2026-4891",
        package: "example-lib",
        status: "In Progress",
        prNumber: 42,
        latency: "Running",
        resolvedAt: "Just now",
      };
      setHistory([newItem, ...history]);
    } catch (err) {
      setRemediationError(
        err instanceof Error ? err.message : "Failed to queue remediation job"
      );
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleApplyFollowup = async () => {
    setSubmittingFollowup(true);
    setRemediationError(null);
    try {
      const response = await api.remediation.followup({
        repo: "dephyr-demo/repo-c",
        branch: "dephyr/cve-2026-4891",
        message: "Dephyr follow-up remediation after AST verification",
        patches: [
          {
            path: "src/api/query.js",
            old: "parseQuery(req.query)",
            new: "parseQuery(sanitize(req.query))",
          },
        ],
      });
      setLastJob(response);

      const newItem: RemediationHistoryItem = {
        id: `followup-${response.job_id.slice(0, 8)}`,
        repo: "dephyr-demo/repo-c",
        cveId: "CVE-2026-4891",
        package: "example-lib (follow-up)",
        status: "In Progress",
        prNumber: 42,
        latency: "Queued",
        resolvedAt: "Just now",
      };
      setHistory([newItem, ...history]);
    } catch (err) {
      setRemediationError(
        err instanceof Error ? err.message : "Failed to submit follow-up remediation"
      );
    } finally {
      setSubmittingFollowup(false);
    }
  };

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] shadow-card overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">
            Individual Remediation Audit Log
          </h3>
          <span className="text-xs text-[#8e8e8e]">
            Showing latest {history.length} verified runs
          </span>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyRemediation}
            disabled={submittingApply || submittingFollowup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-[#ff7300] hover:bg-[#ff8c2e] text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {submittingApply ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Queueing...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-black" />
                <span>Apply Patch (POST /apply)</span>
              </>
            )}
          </button>

          <button
            onClick={handleApplyFollowup}
            disabled={submittingApply || submittingFollowup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {submittingFollowup ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3 h-3 text-[#52e185]" />
                <span>Follow-up Patch (POST /followup)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {remediationError && (
        <div className="p-3.5 bg-[#ff5252]/10 border-b border-[#ff5252]/20 flex items-center gap-2 text-xs text-[#ff5252] px-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Remediation response: {remediationError}</span>
        </div>
      )}

      {lastJob && (
        <div className="p-3 bg-[#52e185]/10 border-b border-[#52e185]/20 flex items-center justify-between text-xs text-[#52e185] px-6 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Job Queued Successfully (job_id: {lastJob.job_id}, status: {lastJob.status})</span>
          </div>
          <Link
            href={`/dashboard/agent-activity?job_id=${lastJob.job_id}`}
            className="inline-flex items-center gap-1 font-semibold text-white underline hover:no-underline"
          >
            <span>Live Stream</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0e0e10] text-[#8e8e8e] uppercase text-[10px] tracking-wider">
              <th className="py-3.5 px-6 font-semibold">Repository</th>
              <th className="py-3.5 px-6 font-semibold">Remediated CVE</th>
              <th className="py-3.5 px-6 font-semibold">Target Package</th>
              <th className="py-3.5 px-6 font-semibold">Status</th>
              <th className="py-3.5 px-6 font-semibold">PR Proof</th>
              <th className="py-3.5 px-6 font-semibold">Latency</th>
              <th className="py-3.5 px-6 text-right font-semibold">Resolved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {history.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-[#161619] transition-colors"
              >
                <td className="py-4 px-6 font-mono font-bold text-white text-xs sm:text-sm">
                  {item.repo}
                </td>

                <td className="py-4 px-6 font-mono text-[#ff7300] text-xs sm:text-sm">
                  {item.cveId}
                </td>

                <td className="py-4 px-6 text-[#c8c8c8] text-xs">
                  {item.package}
                </td>

                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      item.status === "Resolved"
                        ? "bg-[#52e185]/15 text-[#52e185]"
                        : item.status === "In Progress"
                        ? "bg-[#ffb300]/15 text-[#ffb300]"
                        : "bg-white/10 text-[#c8c8c8]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {item.status}
                  </span>
                </td>

                <td className="py-4 px-6">
                  <Link
                    href="/dashboard/pull-requests"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-[#79b0ff] hover:underline"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    PR #{item.prNumber}
                  </Link>
                </td>

                <td className="py-4 px-6 text-[#8e8e8e] font-mono text-xs">
                  {item.latency}
                </td>

                <td className="py-4 px-6 text-right text-[#8e8e8e] font-mono text-xs">
                  {item.resolvedAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
