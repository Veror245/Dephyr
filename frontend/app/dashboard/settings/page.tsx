"use client";

import React from "react";
import PolicySettingsForm from "./components/PolicySettingsForm";
import IntegrationsList from "./components/IntegrationsList";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 w-full">
      {/* Top Banner */}
      <div className="p-6 lg:p-7 rounded-panel bg-[#111113] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#ff7300]/10 border border-[#ff7300]/25 flex items-center justify-center text-[#ff7300] shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">
              Policy Configuration & Toolchain Integrations
            </h2>
            <p className="text-xs sm:text-sm text-[#8e8e8e] leading-relaxed max-w-3xl">
              Manage autonomous agent privileges, merge guardrails, and VCS/CI webhooks across your organization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-14 md:pl-0">
          <div className="px-3.5 py-1.5 rounded-pill bg-[#161619] border border-white/[0.06] flex items-center gap-2">
            <span className="text-[#8e8e8e]">Autonomy Level:</span>
            <span className="text-[#52e185] font-bold">SUPERVISED AUTO-PASS</span>
          </div>
        </div>
      </div>

      {/* Safety Policy Form */}
      <PolicySettingsForm />

      {/* Integrations List */}
      <IntegrationsList />
    </div>
  );
}
