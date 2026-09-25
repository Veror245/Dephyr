"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  ShieldAlert,
  GitBranch,
  Terminal,
  GitPullRequest,
  TrendingUp,
  Settings,
  HelpCircle,
  X,
  ExternalLink,
} from "lucide-react";
import SidebarNavItem from "./SidebarNavItem";
import UserMenu from "./UserMenu";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/cve-feed",
    label: "CVE Feed",
    icon: ShieldAlert,
    badge: 3,
    badgeColor: "amber" as const,
  },
  {
    href: "/dashboard/repositories",
    label: "Repositories",
    icon: GitBranch,
    badge: 18,
    badgeColor: "neutral" as const,
  },
  {
    href: "/dashboard/agent-activity",
    label: "Agent Activity",
    icon: Terminal,
    badge: "LIVE",
    badgeColor: "green" as const,
  },
  {
    href: "/dashboard/pull-requests",
    label: "Pull Requests",
    icon: GitPullRequest,
    badge: 2,
    badgeColor: "neutral" as const,
  },
  {
    href: "/dashboard/remediation-timeline",
    label: "Remediation Timeline",
    icon: TrendingUp,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0a0c] border-r border-white/[0.08] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Logo Header */}
        <div className="h-16 px-5 border-b border-white/[0.06] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
              <Image
                src="/assets/logo.webp"
                alt="Dephyr Logo"
                width={22}
                height={22}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display tracking-widest text-sm text-white font-semibold">
                DEPHYR
              </span>
              <span className="text-[10px] text-[#ff7300] tracking-wider uppercase font-semibold font-mono">
                AUTONOMOUS SEC
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-control text-[#8e8e8e] hover:text-white hover:bg-white/5"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Item List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <div className="px-3 pb-2 text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider">
            Operations
          </div>

          {NAV_ITEMS.slice(0, 6).map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              badgeColor={item.badgeColor}
              onClick={onClose}
            />
          ))}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider">
            System & Policies
          </div>

          <SidebarNavItem
            href="/dashboard/settings"
            label="Settings"
            icon={Settings}
            onClick={onClose}
          />
        </div>

        {/* Bottom Support & Profile Section */}
        <div className="p-3 border-t border-white/[0.06] bg-[#0c0c0e]/80 space-y-2">
          {/* Support link */}
          <a
            href="mailto:support@dephyr.ai?subject=Dephyr%20Dashboard%20Support"
            className="flex items-center gap-2.5 px-3 py-2 rounded-card text-xs text-[#8e8e8e] hover:text-white hover:bg-[#161619] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#8e8e8e]" />
            <span>Support & Docs</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </a>

          {/* User profile dropdown trigger */}
          <div className="pt-1">
            <UserMenu />
          </div>
        </div>
      </aside>
    </>
  );
}
