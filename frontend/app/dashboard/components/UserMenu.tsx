"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, Settings, ExternalLink, ShieldCheck, ChevronDown } from "lucide-react";

interface UserMenuProps {
  compact?: boolean;
}

export default function UserMenu({ compact = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-card text-left transition-colors hover:bg-[#1c1c20] focus:outline-none"
        aria-expanded={isOpen}
      >
        {/* User avatar circle */}
        <div className="relative w-8 h-8 rounded-full bg-[#28282a] border border-white/15 flex items-center justify-center text-white shrink-0 overflow-hidden font-medium text-xs">
          <span>AG</span>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#52e185] ring-2 ring-black" />
        </div>

        {!compact && (
          <div className="flex flex-col min-w-0 pr-1 text-left">
            <span className="text-xs font-semibold text-white tracking-tight truncate">
              Arjya Ghosh
            </span>
            <span className="text-[11px] text-[#8e8e8e] truncate">
              Rust Developer
            </span>
          </div>
        )}

        <ChevronDown className="w-3.5 h-3.5 text-[#8e8e8e] shrink-0 ml-auto" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-56 rounded-card bg-[#161619] border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-white/5 mb-1">
            <p className="text-xs font-semibold text-white truncate">Arjya Ghosh</p>
            <p className="text-[11px] text-[#8e8e8e] truncate">arjyaghosh@gmail.com</p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#52e185]/10 text-[#52e185] text-[10px] font-medium">
              <ShieldCheck className="w-3 h-3" />
              Rust Developer
            </div>
          </div>

          <Link
            href="/dashboard/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#c8c8c8] hover:text-white hover:bg-white/5 rounded-control transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-[#8e8e8e]" />
            Security Policies
          </Link>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#c8c8c8] hover:text-white hover:bg-white/5 rounded-control transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#8e8e8e]" />
            GitHub Connection
          </a>

          <div className="my-1 border-t border-white/5" />

          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className=" flex items-center gap-2.5 px-3 py-1 text-xs text-[#ff5252] hover:bg-[#ff5252]/10 rounded-control transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out to Landing
          </Link>
        </div>
      )}
    </div>
  );
}
