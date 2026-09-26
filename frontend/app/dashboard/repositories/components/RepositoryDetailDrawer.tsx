import React, { useState, useEffect } from "react";
import { RepositoryRecord } from "../../lib/mock-data";
import RepositoryRiskBadge from "./RepositoryRiskBadge";
import { X, ExternalLink, Shield, GitPullRequest, Play, RefreshCw, Loader2, CheckCircle2, AlertCircle, FileCode2 } from "lucide-react";
import Link from "next/link";
import { api, RepoMetadataResponse, ScanCallbackResponse } from "@/app/lib/api";
import { useDashboardData } from "../../context/DashboardDataContext";

interface RepositoryDetailDrawerProps {
  repo: RepositoryRecord | null;
  onClose: () => void;
}

export default function RepositoryDetailDrawer({
  repo,
  onClose,
}: RepositoryDetailDrawerProps) {
  const { recordScan } = useDashboardData();
  const [liveMetadata, setLiveMetadata] = useState<RepoMetadataResponse | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackResponse, setCallbackResponse] = useState<ScanCallbackResponse | null>(null);

  const repoFullName = repo ? `${repo.org}/${repo.name}` : "";

  useEffect(() => {
    if (!repoFullName) return;
    setLoadingMetadata(true);
    setMetadataError(null);
    setScanResult(null);
    setScanError(null);
    setCallbackResponse(null);

    api.repositories
      .getMetadata({ repo: repoFullName })
      .then((data) => {
        setLiveMetadata(data);
      })
      .catch((err) => {
        setMetadataError(err instanceof Error ? err.message : "GitHub metadata unavailable");
      })
      .finally(() => {
        setLoadingMetadata(false);
      });
  }, [repoFullName]);

  const handleRunScan = async () => {
    if (!repo) return;
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    // Target relevant package based on repo context
    const packageName = repo.name.includes("gateway-proxy")
      ? "http-proxy-middleware"
      : repo.name.includes("repo-b")
      ? "xml-parser"
      : "example-lib";

    try {
      const result = await api.repositories.scan({
        repo: repoFullName,
        package: packageName,
      });
      setScanResult(result);
      await recordScan(repoFullName, result, packageName);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSimulateCallback = async () => {
    setCallbackLoading(true);
    try {
      const res = await api.repositories.scanCallback({
        res: [
          {
            file: "src/index.js",
            imports: [{ module: "example-lib", name: "parseQuery", start: 12, end: 40 }],
            total_imports: 1,
            calls: [{ function: "parseQuery", args: "req.query", start: 84, end: 110 }],
            total_calls: 1,
          },
        ],
      });
      setCallbackResponse(res);
    } catch (err) {
      console.warn("Callback simulation error:", err);
    } finally {
      setCallbackLoading(false);
    }
  };

  if (!repo) return null;

  return (
    <div className="rounded-panel bg-[#111113] border-solid border-[0.06px] border-white/[0.05] p-7 lg:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-base sm:text-lg font-bold text-white">
              {repo.org}/{repo.name}
            </span>
            <RepositoryRiskBadge risk={repo.risk} />
          </div>
          <p className="text-xs sm:text-sm text-[#8e8e8e]">
            Continuous AST taint monitoring enabled on branch <code className="text-[#c8c8c8] font-mono">{repo.defaultBranch}</code>
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-control text-[#8e8e8e] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close repository drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block mb-1 text-xs">Active Exposures</span>
          <span className="font-display text-2xl font-bold text-white">
            {repo.activeExposures}
          </span>
        </div>

        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block mb-1 text-xs">Last Full Scan</span>
          <span className="text-white font-medium text-xs sm:text-sm">{repo.lastScanned}</span>
        </div>

        <div className="p-4 rounded-card bg-[#161619] border border-white/[0.04]">
          <span className="text-[#8e8e8e] block mb-1 text-xs">Target Branch</span>
          <span className="font-mono text-[#c8c8c8] text-xs sm:text-sm">
            {liveMetadata?.default_branch || repo.defaultBranch}
            {liveMetadata?.private !== undefined && (
              <span className="ml-2 text-[10px] text-[#8e8e8e]">
                ({liveMetadata.private ? "Private" : "Public"})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Affected CVEs */}
      <div className="p-5 rounded-card bg-[#161619] border border-white/[0.08] space-y-3">
        <div className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider">
          Detected CVE Findings
        </div>

        {repo.affectedCves.length > 0 ? (
          <div className="space-y-2.5">
            {repo.affectedCves.map((cve) => (
              <div
                key={cve}
                className="flex items-center justify-between p-3 rounded-control bg-[#0c0c0e] border border-white/[0.06] text-xs font-mono"
              >
                <span className="text-[#ff5252] font-bold text-xs">{cve}</span>
                <Link
                  href="/dashboard/cve-feed"
                  className="text-xs text-[#8e8e8e] hover:text-white transition-colors"
                >
                  View AST Evidence →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-control bg-[#52e185]/5 border border-[#52e185]/15 text-xs text-[#52e185] flex items-center gap-2.5">
            <Shield className="w-4 h-4 shrink-0" />
            <span>All dependency AST paths verified secure. Zero active exposures.</span>
          </div>
        )}
      </div>

      {/* Real Backend AST Scan Trigger */}
      <div className="p-5 rounded-card bg-[#161619] border border-white/[0.08] space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-[#ff7300]" />
            Backend AST Analysis Engine
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-[#ff7300] hover:bg-[#ff8c2e] text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning AST...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-black" />
                  <span>Trigger AST Scan</span>
                </>
              )}
            </button>
            <button
              onClick={handleSimulateCallback}
              disabled={callbackLoading}
              title="Test Webhook Callback Endpoint (POST /repositories/scan/callback)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/10 hover:bg-white/15 text-white text-xs transition-colors cursor-pointer disabled:opacity-50 font-mono"
            >
              {callbackLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>Test Callback</span>
              )}
            </button>
          </div>
        </div>

        {scanError && (
          <div className="p-3 rounded-control bg-[#ff5252]/10 border border-[#ff5252]/20 text-xs text-[#ff5252] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Scan notice: {scanError}</span>
          </div>
        )}

        {scanResult && (
          <div className="p-3.5 rounded-control bg-[#0c0c0e] border border-[#52e185]/30 text-xs space-y-2 font-mono">
            <div className="flex items-center gap-2 text-[#52e185] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>AST Scan Completed Successfully</span>
            </div>
            <pre className="text-[11px] text-[#c8c8c8] max-h-36 overflow-y-auto custom-scrollbar bg-black/40 p-2 rounded">
              {JSON.stringify(scanResult, null, 2)}
            </pre>
          </div>
        )}

        {callbackResponse && (
          <div className="p-3 rounded-control bg-[#52e185]/10 border border-[#52e185]/20 text-xs text-[#52e185] flex items-center justify-between font-mono">
            <span>Webhook Callback Verified: {callbackResponse.files_scanned} files, {callbackResponse.total_imports} imports, {callbackResponse.total_calls} calls</span>
          </div>
        )}
      </div>

      {/* Remediation Status */}
      <div className="space-y-2 text-xs text-[#8e8e8e]">
        <span className="font-semibold text-white block">Autonomous Status</span>
        <p className="p-4 rounded-control bg-[#161619] border border-white/[0.04] text-[#c8c8c8] leading-relaxed">
          {repo.remediationStatus}
        </p>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
        <a
          href={liveMetadata?.html_url || repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open on GitHub</span>
        </a>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/pull-requests"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-white text-black text-xs font-semibold shadow-glowPill hover:shadow-glowPillHover transition-all"
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Autonomous PRs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
