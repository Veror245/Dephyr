"use client";

import React from "react";
import { CheckCircle2, Plus } from "lucide-react";

interface IntegrationItem {
  name: string;
  category: string;
  status: "connected" | "disconnected";
  detail: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    name: "GitHub App",
    category: "Version Control & PRs",
    status: "connected",
    detail: "18 repositories synchronized · Write access for fix branches",
  },
  {
    name: "GitHub Actions",
    category: "CI/CD Pipeline",
    status: "connected",
    detail: "Webhook events enabled for workflow_run & check_suite status",
  },
  {
    name: "Slack Webhook",
    category: "Notification Channel",
    status: "connected",
    detail: "Broadcasting Level 3 alerts & verified PR completions to #secops-live",
  },
  {
    name: "GitLab CI",
    category: "Version Control & CI",
    status: "disconnected",
    detail: "Connect self-managed or cloud GitLab instances",
  },
  {
    name: "CircleCI",
    category: "CI/CD Pipeline",
    status: "disconnected",
    detail: "Read job execution logs to diagnose failing assertions",
  },
  {
    name: "PagerDuty",
    category: "Incident Escalation",
    status: "connected",
    detail: "Automated high-urgency page if Level 3 active exploit detected",
  },
];

export default function IntegrationsList() {
  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card space-y-6">
      <div className="pb-4 border-b border-white/[0.06]">
        <h3 className="text-base font-bold text-white tracking-tight">
          Connected Toolchain & Webhooks
        </h3>
        <p className="text-xs sm:text-sm text-[#8e8e8e] mt-1">
          Dephyr hooks directly into your git repository, CI runner, and incident channels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INTEGRATIONS.map((item) => (
          <div
            key={item.name}
            className="p-5 sm:p-6 rounded-card bg-[#161619] border border-white/[0.04] hover:border-white/[0.08] transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-white text-sm sm:text-base">
                  {item.name}
                </span>

                {item.status === "connected" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#52e185]/15 text-[#52e185] border border-[#52e185]/30 uppercase tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-white/5 text-[#8e8e8e] border border-white/10 uppercase tracking-wide">
                    Available
                  </span>
                )}
              </div>

              <span className="text-xs text-[#ff7300] block font-mono">
                {item.category}
              </span>

              <p className="text-xs sm:text-sm text-[#8e8e8e] leading-relaxed">
                {item.detail}
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.04] flex items-center justify-end">
              {item.status === "connected" ? (
                <button
                  type="button"
                  className="text-xs text-[#8e8e8e] hover:text-white transition-colors cursor-pointer"
                >
                  Configure Settings →
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-control bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
