"use client";

import React, { useState } from "react";
import { Search, GitBranch, ArrowRight, Package } from "lucide-react";
import ScanProgressState from "./ScanProgressState";
import ScanResultPanel from "./ScanResultPanel";

import { api } from "@/app/lib/api";
import { useDashboardData } from "../../context/DashboardDataContext";

type ScanState = "idle" | "scanning" | "completed";

export default function RepoScanInput() {
  const { recordScan } = useDashboardData();
  const [repoInput, setRepoInput] = useState("");
  const [packageInput, setPackageInput] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRepo = repoInput.trim();
    const trimmedPkg = packageInput.trim();

    if (!trimmedRepo) {
      setValidationError("Please enter a GitHub repository path (e.g. org/repo or github.com/org/repo)");
      return;
    }

    const regex = /^(https?:\/\/)?(github\.com\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/;
    const match = trimmedRepo.match(regex);
    let repoName = trimmedRepo;

    if (match) {
      repoName = `${match[3]}/${match[4]}`;
    } else if (!trimmedRepo.includes("/")) {
      setValidationError("Please enter a valid format, like org/repo or https://github.com/org/repo");
      return;
    }

    // Default fallback values for manual UI submissions
    triggerScan(repoName, trimmedPkg, "CVE-MANUAL-SCAN", "unknown_symbol");
  };

  const triggerScan = async (
    repoUrl: string,
    targetPkg?: string,
    cveId: string = "CVE-2024-TEST",
    vulnerableSymbol: string = "app"
  ) => {
    setValidationError(null);
    setActiveRepo(repoUrl);
    setState("scanning");

    const selectedPkg = targetPkg !== undefined ? targetPkg : packageInput.trim();

    try {
      const scanResult = await api.repositories.scan({
        repo: repoUrl,
        package: selectedPkg,
        version: "",
        cve_id: cveId,
        vulnerable_symbol: vulnerableSymbol
      });
      await recordScan(repoUrl, scanResult, selectedPkg || undefined);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to start scan");
      setState("idle");
    }
  };

  const handleQuickDemo = (demoRepo: string, defaultPkg: string, cveId: string, symbol: string) => {
    setRepoInput(demoRepo);
    setPackageInput(defaultPkg);
    triggerScan(demoRepo, defaultPkg, cveId, symbol);
  };

  const handleReset = () => {
    setState("idle");
    setRepoInput("");
    setPackageInput("");
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

      {/* Input Form with Repo & Dependency Package Fields */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Repo Input Field */}
          <div className="relative md:col-span-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => {
                setRepoInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="github.com/org/repo or org/repo (e.g. Veror245/SynapseOS)"
              className="w-full bg-[#161619] border border-white/10 rounded-pill pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#8e8e8e] focus:outline-none focus:border-[#ff7300] transition-colors"
            />
          </div>

          {/* Dependency / Package Input Field (Optional) */}
          <div className="relative md:col-span-4">
            <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
            <input
              type="text"
              value={packageInput}
              onChange={(e) => {
                setPackageInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Dependency / Package (optional, e.g. fastapi)"
              className="w-full bg-[#161619] border border-white/10 rounded-pill pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#8e8e8e] focus:outline-none focus:border-[#ff7300] transition-colors"
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="md:col-span-2 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-pill bg-white text-black font-semibold text-sm tracking-tight shadow-glowPill hover:shadow-glowPillHover hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 cursor-pointer w-full"
          >
            <span>Analyze</span>
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
        <span className="text-xs text-[#8e8e8e]">Quick scan targets:</span>
        <button
          type="button"
          onClick={() => handleQuickDemo("Veror245/SynapseOS", "fastapi", "CVE-2024-1234", "app")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-[#1c1c20] hover:bg-[#28282a] border border-[#52e185]/30 text-xs text-[#52e185] hover:text-white transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#52e185]" />
          <span>Veror245/SynapseOS</span>
          <span className="text-[11px] font-mono text-[#8e8e8e]">(fastapi)</span>
        </button>
        <button
          type="button"
          onClick={() => handleQuickDemo("dephyr-demo/repo-c", "example-lib", "CVE-2023-9999", "connect")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-[#1c1c20] hover:bg-[#28282a] border border-white/[0.08] text-xs text-[#c8c8c8] hover:text-white transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5252]" />
          <span>dephyr-demo/repo-c</span>
          <span className="text-[11px] text-[#ff7300] font-mono">(example-lib)</span>
        </button>
        <button
          type="button"
          onClick={() => handleQuickDemo("dephyr-demo/gateway-proxy", "http-proxy-middleware", "CVE-2024-5555", "createProxyMiddleware")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-[#1c1c20] hover:bg-[#28282a] border border-white/[0.08] text-xs text-[#c8c8c8] hover:text-white transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffb300]" />
          <span>dephyr-demo/gateway-proxy</span>
        </button>
      </div>
    </div>
  );
}