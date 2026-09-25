"use client";

import React, { useState, useEffect } from "react";
import { Server, CheckCircle2, AlertCircle, Loader2, Key } from "lucide-react";
import { api, getApiBaseUrl, getApiKey, setApiKey, HealthResponse } from "@/app/lib/api";

export default function BackendConnectionCard() {
  const [baseUrl] = useState<string>(getApiBaseUrl());
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    setApiKeyInput(getApiKey());
    handleCheckHealth();
  }, []);

  const handleCheckHealth = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await api.health.check();
      setHealthStatus(res);
    } catch (err) {
      setHealthStatus(null);
      setError(err instanceof Error ? err.message : "Backend unreachable on " + baseUrl);
    } finally {
      setChecking(false);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(apiKeyInput.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="rounded-panel bg-[#111113] border border-white/[0.08] p-7 lg:p-8 shadow-card space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#ff7300]/10 border border-[#ff7300]/25 flex items-center justify-center text-[#ff7300] shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              FastAPI Backend Gateway Connectivity
            </h3>
            <p className="text-xs sm:text-sm text-[#8e8e8e]">
              Connected to backend instance running at <code className="font-mono text-[#c8c8c8]">{baseUrl}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {checking ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff7300]" />
              Pinging /health...
            </span>
          ) : healthStatus ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-[#52e185]/15 border border-[#52e185]/30 text-xs font-mono text-[#52e185]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{healthStatus.service}: {healthStatus.status}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-[#ffb300]/15 border border-[#ffb300]/30 text-xs font-mono text-[#ffb300]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Backend Offline</span>
            </span>
          )}

          <button
            onClick={handleCheckHealth}
            disabled={checking}
            className="px-3.5 py-1.5 rounded-control bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
          >
            Check GET /health
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-control bg-[#ff5252]/10 border border-[#ff5252]/20 text-xs text-[#ff5252] flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* API Key Configuration Form */}
      <form onSubmit={handleSaveApiKey} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-white block mb-1.5 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-[#ff7300]" />
            <span>X-API-Key Authentication Header</span>
          </label>
          <p className="text-xs text-[#8e8e8e] mb-2 leading-relaxed">
            Attached automatically to all non-/health backend requests. Must match <code className="text-[#c8c8c8] font-mono">settings.api_key</code> in backend <code className="text-[#c8c8c8] font-mono">.env</code> when authentication is enabled.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="password"
              placeholder="Enter API Key or leave empty if allow_unauthenticated=true..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1 bg-[#161619] border border-white/10 rounded-pill px-4 py-2.5 text-xs text-white placeholder-[#8e8e8e] focus:outline-none focus:border-[#ff7300] font-mono"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-pill bg-[#ff7300] hover:bg-[#ff8c2e] text-black font-semibold text-xs transition-colors cursor-pointer shrink-0"
            >
              {savedNotice ? "Saved to Local Storage!" : "Save API Key"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
