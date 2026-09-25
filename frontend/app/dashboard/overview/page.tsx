"use client";

import React from "react";
import RepoScanInput from "./components/RepoScanInput";
import HeroStatCard from "./components/HeroStatCard";
import ExposureSummaryCard from "./components/ExposureSummaryCard";
import RecentActivityFeed from "./components/RecentActivityFeed";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { MOCK_REPOSITORIES } from "../lib/mock-data";

export default function OverviewPage() {
  const criticalRepos = MOCK_REPOSITORIES.filter((r) => r.risk !== "SAFE");

  return (
    <div className="space-y-6 w-full">
      {/* Top Interactive Hero Section: Generous two-column split across full width */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Primary Action: Repository Scanner (7 cols) */}
        <div className="xl:col-span-7">
          <RepoScanInput />
        </div>

        {/* Hero Stat Card: Total Exposure Posture (5 cols) */}
        <div className="xl:col-span-5">
          <HeroStatCard />
        </div>
      </div>

      {/* Row of 4 Core Dashboard Metric Cards */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider pl-1">
          Operational Benchmarks
        </div>
        <ExposureSummaryCard />
      </div>

      {/* Lower Section: 2 Columns - Recent Agent Activity (7 cols) + Priority Repositories Watchlist (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7">
          <RecentActivityFeed />
        </div>

        {/* Priority Repositories Panel */}
        <div className="xl:col-span-5 rounded-panel bg-[#111113] border border-white/[0.08] p-6 lg:p-7 shadow-card flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#ff5252]" />
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Attention Required
                </h2>
              </div>
              <Link
                href="/dashboard/repositories"
                className="text-xs text-[#8e8e8e] hover:text-white transition-colors"
              >
                View all 18 repos →
              </Link>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {criticalRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="py-4 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-white text-sm">
                        {repo.name}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          repo.risk === "CRITICAL"
                            ? "bg-[#ff5252]/15 text-[#ff5252] border border-[#ff5252]/30"
                            : "bg-[#ffb300]/15 text-[#ffb300] border border-[#ffb300]/30"
                        }`}
                      >
                        {repo.risk}
                      </span>
                    </div>
                    <p className="text-xs text-[#8e8e8e] truncate">
                      {repo.remediationStatus}
                    </p>
                  </div>

                  <span className="text-[11px] font-mono text-[#8e8e8e] shrink-0">
                    {repo.lastScanned}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/dashboard/repositories"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-card bg-[#161619] hover:bg-[#202024] border border-white/[0.06] text-xs font-semibold text-white transition-colors"
          >
            <span>Manage All 18 Monitored Repos</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#ff7300]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
