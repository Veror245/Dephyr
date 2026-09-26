"use client";

import React, { useState } from "react";
import PullRequestCard from "./PullRequestCard";
import { Search, GitPullRequest } from "lucide-react";
import { useDashboardData } from "../../context/DashboardDataContext";

export default function PullRequestList() {
  const { pullRequests } = useDashboardData();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filteredPrs = pullRequests.filter((pr) => {
    const matchesStatus =
      filterStatus === "ALL" ||
      (filterStatus === "PASSED" && pr.ciStatus === "passed") ||
      (filterStatus === "RUNNING" && pr.ciStatus === "running") ||
      (filterStatus === "FAILED" && pr.ciStatus === "failed");

    const matchesSearch =
      pr.title.toLowerCase().includes(search.toLowerCase()) ||
      pr.repo.toLowerCase().includes(search.toLowerCase()) ||
      pr.cveId.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="p-5 sm:p-6 rounded-panel bg-[#111113] border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
          <input
            type="text"
            placeholder="Search pull requests or CVE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161619] border border-white/10 rounded-pill pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-[#8e8e8e] focus:outline-none focus:border-[#ff7300] transition-colors"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-pill bg-[#161619] border border-white/[0.06] text-xs">
          {[
            { id: "ALL", label: "All PRs" },
            { id: "PASSED", label: "CI Passed" },
            { id: "RUNNING", label: "In Verification" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition-colors ${
                filterStatus === tab.id
                  ? "bg-[#28282a] text-white shadow-sm"
                  : "text-[#8e8e8e] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* PR Cards */}
      <div className="space-y-6">
        {filteredPrs.length > 0 ? (
          filteredPrs.map((pr) => <PullRequestCard key={pr.id} pr={pr} />)
        ) : (
          <div className="p-12 rounded-panel bg-[#111113] border border-white/[0.08] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#8e8e8e] mx-auto">
              <GitPullRequest className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">
                {pullRequests.length === 0
                  ? "No Autonomous Pull Requests Active"
                  : "No Pull Requests Found"}
              </h3>
              <p className="text-xs text-[#8e8e8e] max-w-md mx-auto leading-relaxed">
                {pullRequests.length === 0
                  ? "Autonomous pull requests will appear here when remediation patches or agent workflows execute against repositories. Note: current backend endpoints only inspect specific known PR numbers (POST /pull-requests/details); a general repository PR listing endpoint is pending on the backend."
                  : "No pull requests match the selected search or status filter criteria."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
