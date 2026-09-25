import React from "react";
import { MOCK_REMEDIATION_HISTORY } from "../../lib/mock-data";
import { GitPullRequest } from "lucide-react";
import Link from "next/link";

export default function RemediationHistoryTable() {
  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] shadow-card overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">
          Individual Remediation Audit Log
        </h3>
        <span className="text-xs text-[#8e8e8e]">
          Showing latest 5 verified runs
        </span>
      </div>

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
            {MOCK_REMEDIATION_HISTORY.map((item) => (
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
