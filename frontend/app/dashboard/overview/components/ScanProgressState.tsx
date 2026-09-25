"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ScanProgressStateProps {
  repoUrl: string;
  onComplete: () => void;
}

interface Step {
  tag: string;
  badgeType: "action" | "info" | "warn" | "success";
  text: string;
  delayMs: number;
}

const STEPS: Step[] = [
  {
    tag: "FETCHING",
    badgeType: "action",
    text: "Cloning repository AST & package manifest lockfiles...",
    delayMs: 400,
  },
  {
    tag: "PARSING",
    badgeType: "info",
    text: "Constructing module dependency graph & static import matrix...",
    delayMs: 1100,
  },
  {
    tag: "SCANNING",
    badgeType: "warn",
    text: "Cross-referencing CVE database against installed symbols...",
    delayMs: 1900,
  },
  {
    tag: "ANALYZING",
    badgeType: "warn",
    text: "Tracing interprocedural taint flow from network entry points to parseQuery()...",
    delayMs: 2700,
  },
  {
    tag: "VERIFIED",
    badgeType: "success",
    text: "AST call graph resolved. Generating exposure classification report...",
    delayMs: 3500,
  },
];

export default function ScanProgressState({
  repoUrl,
  onComplete,
}: ScanProgressStateProps) {
  const [visibleStepCount, setVisibleStepCount] = useState(1);

  useEffect(() => {
    const timers = STEPS.map((step, idx) => {
      return setTimeout(() => {
        setVisibleStepCount(idx + 1);
        if (idx === STEPS.length - 1) {
          setTimeout(onComplete, 800);
        }
      }, step.delayMs);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <div className="w-full rounded-panel bg-[#121214] border border-white/[0.12] overflow-hidden shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="px-4 py-3 bg-[#18181b] border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          <span className="ml-2 text-xs font-mono text-[#8e8e8e] truncate max-w-xs">
            scan-session — {repoUrl}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#ff7300]">
          <Loader2 className="w-3 h-3 animate-spin text-[#ff7300]" />
          <span>AUTONOMOUS ENGINE SCANNING</span>
        </div>
      </div>

      {/* Terminal Log Stream */}
      <div className="p-4 sm:p-5 space-y-2.5 font-mono text-xs">
        {STEPS.slice(0, visibleStepCount).map((step, idx) => {
          const badgeStyles = {
            action: "bg-white/10 text-white border-white/20",
            info: "bg-[#79b0ff]/15 text-[#79b0ff] border-[#79b0ff]/30",
            warn: "bg-[#ffb300]/15 text-[#ffb300] border-[#ffb300]/30",
            success: "bg-[#52e185]/15 text-[#52e185] border-[#52e185]/30",
          }[step.badgeType];

          return (
            <div
              key={idx}
              className="flex items-start gap-3 p-2 rounded-control bg-white/[0.02] border border-white/[0.03] animate-in fade-in slide-in-from-bottom-1 duration-200"
            >
              <span className="text-[10px] text-[#8e8e8e] shrink-0 pt-0.5">
                00:0{idx + 1}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase border tracking-wider shrink-0 ${badgeStyles}`}
              >
                {step.tag}
              </span>
              <span className="text-white flex-1 leading-relaxed">
                {step.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
