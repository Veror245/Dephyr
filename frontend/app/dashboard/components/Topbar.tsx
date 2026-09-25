"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import UserMenu from "./UserMenu";

interface TopbarProps {
  onOpenSidebar: () => void;
}

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Security Overview",
    subtitle: "Real-time posture and autonomous agent operations",
  },
  "/dashboard/overview": {
    title: "Security Overview",
    subtitle: "Real-time posture and autonomous agent operations",
  },
  "/dashboard/cve-feed": {
    title: "CVE Intelligence Feed",
    subtitle: "Live vulnerability disclosures matched against AST call graphs",
  },
  "/dashboard/repositories": {
    title: "Repository Risk",
    subtitle: "Continuous taint tracking and exposure classification across repos",
  },
  "/dashboard/agent-activity": {
    title: "Agent Activity Stream",
    subtitle: "Autonomous diagnosis, patching, and CI iteration logs",
  },
  "/dashboard/pull-requests": {
    title: "Remediation Pull Requests",
    subtitle: "Autonomous fix branches with verified CI test passing proofs",
  },
  "/dashboard/remediation-timeline": {
    title: "Remediation Timeline",
    subtitle: "Historical detection-to-resolution metrics and velocity",
  },
  "/dashboard/settings": {
    title: "Safety Policies & Integrations",
    subtitle: "Autonomy constraints, PR approval rules, and VCS webhooks",
  },
};

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const routeInfo = ROUTE_TITLES[pathname] || {
    title: "Dashboard",
    subtitle: "Autonomous application security",
  };

  return (
    <header className="sticky top-6 z-30 w-full rounded-panel bg-[#111113]/90 backdrop-blur-md border border-white/[0.08] shadow-card px-6 sm:px-8 py-3.5 mb-6 flex items-center justify-between gap-4">
      {/* Left side: Hamburger button on mobile + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-control text-[#8e8e8e] hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
              {routeInfo.title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-[#52e185]/10 border border-[#52e185]/20 text-[10px] font-semibold text-[#52e185] tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#52e185] animate-pulse" />
              ONLINE
            </span>
          </div>
          <p className="hidden md:block text-xs text-[#8e8e8e] truncate">
            {routeInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right side: Search, Status, Notifications, Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Search affordance */}
        <div className="relative hidden md:block w-56 lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8e8e8e]" />
          <input
            type="text"
            placeholder="Search CVE, repo, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141417] border border-white/10 rounded-pill pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8e8e8e] focus:outline-none focus:border-[#ff7300] transition-colors"
          />
        </div>

        {/* Autonomous pulse indicator for desktop */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-pill bg-[#141417] border border-white/[0.08] text-xs">
          <span className="w-2 h-2 rounded-full bg-[#ff7300] shadow-[0_0_8px_#ff7300] animate-pulse" />
          <span className="text-[#c8c8c8] font-medium text-[11px]">
            Autonomous Loop: <span className="text-white">Active</span>
          </span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-pill bg-[#141417] border border-white/[0.08] text-[#8e8e8e] hover:text-white hover:border-white/20 transition-all focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff7300] ring-2 ring-[#141417]" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-card bg-[#141417] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs font-semibold text-white">
                  Operational Alerts
                </span>
                <span className="text-[10px] text-[#ff7300] font-mono">
                  2 UNREAD
                </span>
              </div>

              <div className="py-1 divide-y divide-white/5 text-xs">
                <div className="p-2.5 hover:bg-white/5 rounded-control transition-colors cursor-pointer">
                  <div className="flex items-start gap-2">
                    <span className="p-1 rounded bg-[#ff5252]/10 text-[#ff5252] shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">
                        Level 3 Exposure in repo-c
                      </p>
                      <p className="text-[11px] text-[#8e8e8e] mt-0.5">
                        CVE-2026-4891: parseQuery() taint flow identified.
                      </p>
                      <span className="text-[10px] text-[#8e8e8e]">
                        2 min ago
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 hover:bg-white/5 rounded-control transition-colors cursor-pointer">
                  <div className="flex items-start gap-2">
                    <span className="p-1 rounded bg-[#52e185]/10 text-[#52e185] shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">
                        Autonomous PR #42 Verified
                      </p>
                      <p className="text-[11px] text-[#8e8e8e] mt-0.5">
                        CI tests passed (84/84) after self-healing patch.
                      </p>
                      <span className="text-[10px] text-[#8e8e8e]">
                        12 min ago
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

        {/* Quick User profile */}
        <div className="hidden sm:block">
          <UserMenu compact />
        </div>
      </div>
    </header>
  );
}
