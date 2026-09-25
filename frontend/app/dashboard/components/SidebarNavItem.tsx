"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: "amber" | "neutral" | "green";
  onClick?: () => void;
}

export default function SidebarNavItem({
  href,
  label,
  icon: Icon,
  badge,
  badgeColor = "neutral",
  onClick,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  
  // Exact match for /dashboard, startsWith for subroutes
  const isActive =
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/dashboard/overview"
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-card text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-[#28282a] text-white shadow-sm"
          : "text-[#8e8e8e] hover:text-[#ffffff] hover:bg-[#161619]"
      }`}
    >
      {/* Active left indicator dot (matching landing page active dot aesthetic) */}
      {isActive && (
        <span className="absolute left-1.5 w-1.5 h-1.5 rounded-full bg-[#ff7300] shadow-[0_0_8px_#ff7300]" />
      )}

      <Icon
        className={`w-4 h-4 shrink-0 transition-colors ${
          isActive ? "text-[#ff7300]" : "text-[#8e8e8e] group-hover:text-white"
        }`}
      />

      <span className="truncate flex-1 tracking-tight">{label}</span>

      {badge !== undefined && (
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-pill ${
            badgeColor === "amber"
              ? "bg-[#ff7300]/15 text-[#ff8c2e] border border-[#ff7300]/30"
              : badgeColor === "green"
              ? "bg-[#52e185]/15 text-[#52e185] border border-[#52e185]/30"
              : "bg-white/10 text-[#c8c8c8]"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
