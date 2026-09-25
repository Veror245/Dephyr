import React from "react";

interface LiveStatusIndicatorProps {
  statusText?: string;
  isPulsing?: boolean;
}

export default function LiveStatusIndicator({
  statusText = "AUTONOMOUS",
  isPulsing = true,
}: LiveStatusIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-pill bg-[#52e185]/10 border border-[#52e185]/20 text-[10px] font-bold tracking-wider text-[#52e185] uppercase">
      <span
        className={`w-1.5 h-1.5 rounded-full bg-[#52e185] ${
          isPulsing ? "animate-pulse shadow-[0_0_8px_#52e185]" : ""
        }`}
      />
      <span>{statusText}</span>
    </div>
  );
}
