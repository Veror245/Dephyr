"use client";

import React, { useState } from "react";
import { ShieldCheck, Check, Save } from "lucide-react";

interface PolicyItem {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export default function PolicySettingsForm() {
  const [policies, setPolicies] = useState<PolicyItem[]>([
    {
      id: "auto-pr",
      title: "Allow automatic Pull Request creation",
      description:
        "When an active exposure is classified as Level 2 or 3, autonomously fork branch, generate patch, and open PR.",
      enabled: true,
    },
    {
      id: "require-manual-approval",
      title: "Require manual human approval before merge",
      description:
        "Never merge autonomously into production or default branches without engineer review, even when CI passes.",
      enabled: true,
    },
    {
      id: "restrict-repos",
      title: "Restrict agent to designated tier-1 repositories",
      description:
        "Limit automated patching to repos explicitly added to the whitelist; run AST read-only scans elsewhere.",
      enabled: false,
    },
    {
      id: "strict-taint",
      title: "Strict AST Taint Boundary Verification",
      description:
        "Require proof of user/network-derived data flow reaching the vulnerable symbol before flagging critical.",
      enabled: true,
    },
    {
      id: "ci-retry-cap",
      title: "Cap autonomous CI iterations to 3 rounds",
      description:
        "If follow-up patches fail test suites after 3 iterations, freeze PR and page on-call security engineer.",
      enabled: true,
    },
  ]);

  const [saved, setSaved] = useState(false);

  const togglePolicy = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#ff7300]" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Autonomous Safety & Policy Guardrails
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#8e8e8e]">
            Configure autonomous boundaries, PR creation privileges, and CI self-healing limits.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-white text-black text-xs font-semibold shadow-glowPill hover:shadow-glowPillHover transition-all cursor-pointer"
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#52e185]" />
              <span className="text-[#52e185]">Changes Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Policy Rules</span>
            </>
          )}
        </button>
      </div>

      {/* Switch items */}
      <div className="divide-y divide-white/[0.04]">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className="py-5 flex items-start justify-between gap-6"
          >
            <div className="space-y-1.5 pr-4 flex-1">
              <span className="text-sm font-semibold text-white block">
                {policy.title}
              </span>
              <p className="text-xs sm:text-sm text-[#8e8e8e] leading-relaxed max-w-3xl">
                {policy.description}
              </p>
            </div>

            {/* Accessible toggle switch styled in dark + amber theme */}
            <button
              type="button"
              role="switch"
              aria-checked={policy.enabled}
              onClick={() => togglePolicy(policy.id)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                policy.enabled ? "bg-[#ff7300]" : "bg-[#28282a]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  policy.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
