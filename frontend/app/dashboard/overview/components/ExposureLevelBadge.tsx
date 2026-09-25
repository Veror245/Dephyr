import React from "react";
import { EXPOSURE_LEVELS } from "../../lib/mock-data";

interface ExposureLevelBadgeProps {
  level: 0 | 1 | 2 | 3;
  showDescription?: boolean;
}

export default function ExposureLevelBadge({
  level,
  showDescription = false,
}: ExposureLevelBadgeProps) {
  const info = EXPOSURE_LEVELS[level] || EXPOSURE_LEVELS[0];

  const colorStyles: Record<number, { bg: string; text: string; border: string }> = {
    0: {
      bg: "bg-[#28282a]",
      text: "text-[#c8c8c8]",
      border: "border-white/10",
    },
    1: {
      bg: "bg-[#79b0ff]/10",
      text: "text-[#79b0ff]",
      border: "border-[#79b0ff]/25",
    },
    2: {
      bg: "bg-[#ffb300]/10",
      text: "text-[#ffb300]",
      border: "border-[#ffb300]/25",
    },
    3: {
      bg: "bg-[#ff5252]/15",
      text: "text-[#ff5252]",
      border: "border-[#ff5252]/30",
    },
  };

  const style = colorStyles[level];

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-control text-[11px] font-semibold tracking-wide border uppercase ${style.bg} ${style.text} ${style.border}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${level === 3 ? "bg-[#ff5252] animate-pulse" : style.text.replace("text-", "bg-")
            }`}
        />
        LEVEL {level}: {level === 0 ? "Dep Present" : level === 1 ? "Symbol Imported" : level === 2 ? "Call Executed" : "External Input Flow"}
      </span>
      {showDescription && (
        <span className="text-[11px] text-[#8e8e8e] leading-snug">
          {info.description}
        </span>
      )}
    </div>
  );
}
