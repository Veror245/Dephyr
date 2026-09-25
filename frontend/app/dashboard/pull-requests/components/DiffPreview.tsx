import React from "react";
import { FileCode } from "lucide-react";

interface DiffPreviewProps {
  diff: {
    file: string;
    line: number;
    removed: string;
    added: string;
  };
}

export default function DiffPreview({ diff }: DiffPreviewProps) {
  return (
    <div className="rounded-control bg-[#0a0a0c] border border-white/[0.08] overflow-hidden text-xs font-mono">
      {/* Diff File Header */}
      <div className="px-4 py-2 bg-[#141417] border-b border-white/[0.06] flex items-center justify-between text-xs text-[#8e8e8e]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#ff7300]" />
          <span className="text-white font-semibold">{diff.file}</span>
        </div>
        <span>Line {diff.line}</span>
      </div>

      {/* Code Snippets */}
      <div className="p-3 space-y-1.5">
        {/* Removed line */}
        <div className="flex items-start gap-3 p-2 rounded bg-[#ff5252]/10 border border-[#ff5252]/15 text-[#ff8c8c] overflow-x-auto">
          <span className="select-none font-bold text-[#ff5252] w-4 text-center">-</span>
          <code className="text-xs break-all">{diff.removed}</code>
        </div>

        {/* Added line */}
        <div className="flex items-start gap-3 p-2 rounded bg-[#52e185]/10 border border-[#52e185]/15 text-[#8cebb2] overflow-x-auto">
          <span className="select-none font-bold text-[#52e185] w-4 text-center">+</span>
          <code className="text-xs break-all">{diff.added}</code>
        </div>
      </div>
    </div>
  );
}
