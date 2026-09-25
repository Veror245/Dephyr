import React from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface CiStatusBadgeProps {
  status: "passed" | "failed" | "running";
  testsRun?: number;
  testsPassed?: number;
}

export default function CiStatusBadge({
  status,
  testsRun,
  testsPassed,
}: CiStatusBadgeProps) {
  if (status === "passed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-control text-[11px] font-bold tracking-wide uppercase bg-[#52e185]/15 text-[#52e185] border border-[#52e185]/30">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>CI PASS {testsPassed && testsRun ? `(${testsPassed}/${testsRun})` : ""}</span>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-control text-[11px] font-bold tracking-wide uppercase bg-[#ff5252]/15 text-[#ff5252] border border-[#ff5252]/30">
        <XCircle className="w-3.5 h-3.5" />
        <span>CI FAIL</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-control text-[11px] font-bold tracking-wide uppercase bg-[#ffb300]/15 text-[#ffb300] border border-[#ffb300]/30">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      <span>TESTS RUNNING</span>
    </span>
  );
}
