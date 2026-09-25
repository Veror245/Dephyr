"use client";

import React, { useState } from "react";
import { Search, GitBranch, ArrowRight } from "lucide-react";
import ScanProgressState from "./ScanProgressState";
import ScanResultPanel from "./ScanResultPanel";

type ScanState = "idle" | "scanning" | "completed";

const getMockDetails = (repo: string) => {
  if (repo.includes("gateway-proxy")) {
    return { cve_id: "CVE-2026-3102", package: "http-proxy-middleware", vulnerable_function: "proxy.web" };
  }
  if (repo.includes("repo-b")) {
    return { cve_id: "CVE-2025-9104", package: "xml-parser", vulnerable_function: "parse" };
  }
  return { cve_id: "CVE-2026-4891", package: "example-lib", vulnerable_function: "parseQuery" };
};

export default function RepoScanInput() {
  const [repoInput, setRepoInput] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState("dephyr-demo/repo-c");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = repoInput.trim();

    if (!trimmed) {
      setValidationError("Please enter a GitHub repository path (e.g. org/repo or github.com/org/repo)");
      return;
    }

    const regex = /^(https?:\/\/)?(github\.com\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/;
    const match = trimmed.match(regex);
    let repoName = trimmed;
    
    if (match) {
      repoName = `${match[3]}/${match[4]}`;
    } else if (!trimmed.includes("/")) {
      setValidationError("Please enter a valid format, like org/repo or https://github.com/org/repo");
      return;
    }

    triggerScan(repoName);
  };


  // Redefine handleQuickDemo to use the extracted logic
  const triggerScan = async (repoUrl: string) => {
    setValidationError(null);
    setActiveRepo(repoUrl);
    setState("scanning");

    try {
      const details = getMockDetails(repoUrl);
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/repositories/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "",
        },
        body: JSON.stringify({
          repo: repoUrl,
          ...details
        })
      });

      if (!response.ok) {
        throw new Error(`Scan request failed: ${response.statusText}`);
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to start scan");
      setState("idle");
    }
  }

  const handleQuickDemo = (demoRepo: string) => {
    setRepoInput(demoRepo);
    triggerScan(demoRepo);
  };

  const handleReset = () => {
    setState("idle");
    setRepoInput("");
    setValidationError(null);
  };

  if (state === "scanning") {
    return (
      <ScanProgressState
        repoUrl={activeRepo}
        onComplete={() => setState("completed")}
      />
    );
  }

  if (state === "completed") {
    return <ScanResultPanel repoUrl={activeRepo} onReset={handleReset} />;
  }

  return (
    <div className="w-full rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card transition-all">
      {/* Eyebrow Label & Subtext */}
      <div className="mb-6 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#ff7300] tracking-wider uppercase font-mono">
          <GitBranch className="w-4 h-4" />
          <span>Scan a Repository</span>
        </div>
        <p className="text-sm text-[#8e8e8e] leading-relaxed">
          Inspect dependency call graphs and determine if vulnerable APIs receive untrusted external input.
        </p>
      </div>

      {/* Single Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => {
                setRepoInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="github.com/org/repo or org/repo (e.g. dephyr-demo/repo-c)"
              className="w-full bg-[#161619] border border-white/10 rounded-pill pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#8e8e8e] focus:outline-none focus:border-[#ff7300] transition-colors"
            />
          </div>

          {/* Primary Action Button: White pill soft glow matching landing page Get Started */}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-pill bg-white text-black font-semibold text-sm tracking-tight shadow-glowPill hover:shadow-glowPillHover hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 cursor-pointer"
          >
            <span>Analyze Exposure</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quiet inline validation */}
        {validationError && (
          <p className="text-xs text-[#ff5252] pl-3 pt-1">
            {validationError}
          </p>
        )}
      </form>

      {/* Demo Scenario Quick-picks */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-3 text-xs">
        <span className="text-xs text-[#8e8e8e]">Quick demo targets:</span>
        <button
          type="button"
          onClick={() => handleQuickDemo("dephyr-demo/repo-c")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-[#1c1c20] hover:bg-[#28282a] border border-white/[0.08] text-xs text-[#c8c8c8] hover:text-white transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5252]" />
          <span>dephyr-demo/repo-c</span>
          <span className="text-[11px] text-[#ff7300] font-mono">(CVE-2026-4891)</span>
        </button>
        <button
          type="button"
          onClick={() => handleQuickDemo("dephyr-demo/gateway-proxy")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-[#1c1c20] hover:bg-[#28282a] border border-white/[0.08] text-xs text-[#c8c8c8] hover:text-white transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffb300]" />
          <span>dephyr-demo/gateway-proxy</span>
        </button>
        <button
          type="button"
          onClick={() => handleQuickDemo("dephyr-demo/repo-a")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-[#1c1c20] hover:bg-[#28282a] border border-white/[0.08] text-xs text-[#c8c8c8] hover:text-white transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#52e185]" />
          <span>dephyr-demo/repo-a (Safe)</span>
        </button>
      </div>
    </div>
  );
}
