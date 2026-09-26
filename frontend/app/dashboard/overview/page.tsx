"use client";

import React, { useState, useEffect, useRef } from "react";
import RepoScanInput from "./components/RepoScanInput";
import HeroStatCard from "./components/HeroStatCard";
import ExposureSummaryCard from "./components/ExposureSummaryCard";
import RecentActivityFeed from "./components/RecentActivityFeed";
import Link from "next/link";
import { ShieldAlert, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { RepositoryRecord } from "../lib/mock-data";
import { api, HealthResponse } from "@/app/lib/api";
import { useDashboardData } from "../context/DashboardDataContext";

export default function OverviewPage() {
  const { repositories, stats, updateRepository } = useDashboardData();
  const criticalRepos = repositories.filter((r) => r.risk !== "SAFE");
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // 1. Verify health status from GET /health
    api.health
      .check()
      .then((data) => {
        setHealthStatus(data);
        setBackendOnline(true);
      })
      .catch((err) => {
        console.warn("Backend /health check failed:", err);
        setBackendOnline(false);
      })
      .finally(() => {
        setHealthLoading(false);
      });

    // Guard against duplicate network calls during React StrictMode initial mount
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // 2. Fetch metadata for real monitored repos (skip fictional mock demo repos)
    const reposToFetch = repositories.filter((r) => r.org !== "dephyr-demo");
    if (reposToFetch.length > 0) {
      Promise.allSettled(
        reposToFetch.map((r) => api.repositories.getMetadata({ repo: `${r.org}/${r.name}` }))
      ).then((results) => {
        const failed = results.find((r) => r.status === "rejected");
        if (failed && failed.status === "rejected") {
          const msg = failed.reason instanceof Error ? failed.reason.message : "GitHub metadata service unavailable";
          setMetadataError(msg);
        } else {
          setMetadataError(null);
        }

        results.forEach((res, idx) => {
          if (res.status === "fulfilled" && res.value) {
            const target = reposToFetch[idx];
            updateRepository(target.id, {
              defaultBranch: res.value.default_branch || target.defaultBranch,
              url: res.value.html_url || target.url,
            });
          }
        });
      });
    }
  }, []);

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
        <div className="flex items-center justify-between pl-1">
          <div className="text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider">
            Operational Benchmarks
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            {healthLoading ? (
              <span className="text-[#8e8e8e] flex items-center gap-1.5 text-[11px]">
                <Loader2 className="w-3 h-3 animate-spin text-[#ff7300]" />
                Checking Backend...
              </span>
            ) : backendOnline ? (
              <span className="text-[#52e185] bg-[#52e185]/10 border border-[#52e185]/20 px-2 py-0.5 rounded-pill flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                Backend Connected: {healthStatus?.service}
              </span>
            ) : (
              <span className="text-[#ffb300] bg-[#ffb300]/10 border border-[#ffb300]/20 px-2 py-0.5 rounded-pill flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3 h-3" />
                Backend Offline (http://localhost:8000)
              </span>
            )}
          </div>
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
              <div className="flex items-center gap-3">
                {metadataError && (
                  <span
                    title={metadataError}
                    className="text-[10px] font-mono text-[#ffb300] bg-[#ffb300]/10 border border-[#ffb300]/25 px-2 py-0.5 rounded-pill flex items-center gap-1 cursor-help"
                  >
                    <AlertCircle className="w-3 h-3" />
                    GitHub Sync Offline
                  </span>
                )}
                <Link
                  href="/dashboard/repositories"
                  className="text-xs text-[#8e8e8e] hover:text-white transition-colors"
                >
                  View all {stats.monitoredRepos} repos →
                </Link>
              </div>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {criticalRepos.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8e8e8e]">
                  {repositories.length === 0
                    ? "No repositories scanned yet. Scan a repository to view exposures."
                    : "All monitored repositories are verified safe. No active exposures."}
                </div>
              ) : (
                criticalRepos.map((repo) => (
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
              ))
            )}
            </div>
          </div>

          <Link
            href="/dashboard/repositories"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-card bg-[#161619] hover:bg-[#202024] border border-white/[0.06] text-xs font-semibold text-white transition-colors"
          >
            <span>Manage All {stats.monitoredRepos} Monitored Repos</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#ff7300]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
