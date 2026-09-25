import React from "react";

interface RepositoryRiskBadgeProps {
  risk: "SAFE" | "MEDIUM" | "CRITICAL";
}

export default function RepositoryRiskBadge({ risk }: RepositoryRiskBadgeProps) {
  const styles = {
    CRITICAL: "bg-[#ff5252]/15 text-[#ff5252] border-[#ff5252]/30",
    MEDIUM: "bg-[#ffb300]/15 text-[#ffb300] border-[#ffb300]/30",
    SAFE: "bg-[#52e185]/15 text-[#52e185] border-[#52e185]/30",
  }[risk];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-control text-[10px] font-bold tracking-wider uppercase border ${styles}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          risk === "CRITICAL"
            ? "bg-[#ff5252] animate-pulse"
            : risk === "MEDIUM"
            ? "bg-[#ffb300]"
            : "bg-[#52e185]"
        }`}
      />
      {risk}
    </span>
  );
}
