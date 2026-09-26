"use client";

import React, { useState } from "react";
import { RepositoryRecord } from "../../lib/mock-data";
import RepositoryRiskBadge from "./RepositoryRiskBadge";
import { Search, ChevronRight, RefreshCw, CheckCircle2 } from "lucide-react";

interface RepositoryTableProps {
  onSelectRepo: (repo: RepositoryRecord) => void;
  selectedRepoId?: string;
  repositories?: RepositoryRecord[];
  loading?: boolean;
  onRefresh?: () => void;
  liveConnected?: boolean;
}

export default function RepositoryTable({
  onSelectRepo,
  selectedRepoId,
  repositories,
  loading = false,
  onRefresh,
  liveConnected = false,
}: RepositoryTableProps) {
  const [filterRisk, setFilterRisk] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const dataList = repositories || [];

  const filtered = dataList.filter((r) => {
    const matchesRisk = filterRisk === "ALL" || r.risk === filterRisk;
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.org.toLowerCase().includes(search.toLowerCase()) ||
      r.remediationStatus.toLowerCase().includes(search.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] shadow-card overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-5 sm:p-6 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161619] border border-white/10 rounded-pill pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-[#8e8e8e] focus:outline-none focus:border-[#ff7300] transition-colors"
          />
        </div>

        {/* Risk filter buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-pill bg-[#161619] border border-white/[0.06] text-xs">
          {["ALL", "CRITICAL", "MEDIUM", "SAFE"].map((risk) => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition-colors ${
                filterRisk === risk
                  ? "bg-[#28282a] text-white shadow-sm"
                  : "text-[#8e8e8e] hover:text-white"
              }`}
            >
              {risk}
            </button>
          ))}
        </div>

        {/* Live sync indicator & Refresh button */}
        <div className="flex items-center gap-2.5">
          {liveConnected && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-[#52e185]/10 border border-[#52e185]/20 text-[11px] font-mono text-[#52e185]">
              <CheckCircle2 className="w-3 h-3" />
              <span>Metadata Synced</span>
            </span>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh repository metadata from backend POST /repositories/metadata"
              className="p-1.5 rounded-control bg-white/5 hover:bg-white/10 text-[#8e8e8e] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#ff7300]" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0e0e10] text-[#8e8e8e] uppercase text-[10px] tracking-wider">
              <th className="py-3.5 px-5 font-semibold">Repository</th>
              <th className="py-3.5 px-5 font-semibold">Risk Level</th>
              <th className="py-3.5 px-5 font-semibold">Exposures</th>
              <th className="py-3.5 px-5 font-semibold">Findings</th>
              <th className="py-3.5 px-5 font-semibold">Last Scanned</th>
              <th className="py-3.5 px-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#8e8e8e]">
                  {dataList.length === 0
                    ? "No repositories scanned yet in this session. Run a scan from the Overview page to analyze and monitor repositories."
                    : "No repositories found matching your filter criteria."}
                </td>
              </tr>
            ) : (
              filtered.map((repo) => {
                const isSelected = repo.id === selectedRepoId;
              return (
                <tr
                  key={repo.id}
                  onClick={() => onSelectRepo(repo)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected ? "bg-[#1f1f24]" : "hover:bg-[#161619]"
                  }`}
                >
                  <td className="py-4 px-5">
                    <span className="font-semibold text-white group-hover:text-[#ff8c2e] transition-colors text-xs sm:text-sm">
                      {repo.name}
                    </span>
                  </td>

                  <td className="py-4 px-5">
                    <RepositoryRiskBadge risk={repo.risk} />
                  </td>

                  <td className="py-4 px-5">
                    <span
                      className={`font-semibold font-mono text-xs ${
                        repo.activeExposures > 0 ? "text-[#ff5252]" : "text-[#52e185]"
                      }`}
                    >
                      {repo.activeExposures} active
                    </span>
                  </td>

                  <td className="py-4 px-5 font-mono text-xs">
                    {repo.affectedCves.length > 0 ? (
                      <span className="text-[#ff7300]">
                        {repo.affectedCves.join(", ")}
                      </span>
                    ) : (
                      <span className="text-[#8e8e8e]">—</span>
                    )}
                  </td>

                  <td className="py-4 px-5 text-[#8e8e8e] whitespace-nowrap font-mono text-xs">
                    {repo.lastScanned}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <ChevronRight className="w-4 h-4 text-[#8e8e8e] group-hover:text-white inline-block transition-transform group-hover:translate-x-0.5" />
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
