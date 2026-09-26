"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
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
import { useDashboardData } from "../context/DashboardDataContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isHidden?: boolean;
}

export default function Sidebar({
  isOpen,
  onClose,
  isHidden = false,
}: SidebarProps) {
  const { stats } = useDashboardData();
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);

  const navItems = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboard/repositories",
      label: "Repositories",
      icon: GitBranch,
      badge: stats.monitoredRepos > 0 ? stats.monitoredRepos : undefined,
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
      badge: stats.prCount > 0 ? stats.prCount : undefined,
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

  useEffect(() => {
    if (!navRef.current || !pillRef.current) return;
    const activeItem = navRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeItem) {
      const top = activeItem.offsetTop;
      const height = activeItem.offsetHeight;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(pillRef.current, { top, height, opacity: 1 });
      } else {
        gsap.to(pillRef.current, {
          top,
          height,
          opacity: 1,
          duration: 0.28,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    } else {
      gsap.to(pillRef.current, { opacity: 0, duration: 0.15 });
    }
  }, [pathname]);

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

      {/* Main Sidebar Panel - Inset floating rounded panel on desktop */}
      <aside
        className={`fixed z-50 w-64 bg-[#0a0a0c] flex flex-col transition-all duration-300 ease-in-out overflow-hidden lg:top-6 lg:bottom-6 lg:left-6 lg:rounded-panel lg:border lg:border-white/[0.08] lg:shadow-card ${isHidden
            ? "lg:-translate-x-[120%] lg:opacity-0 pointer-events-none"
            : "lg:translate-x-0 lg:opacity-100 pointer-events-auto"
          } ${isOpen
            ? "top-0 bottom-0 left-0 border-r border-white/[0.08] translate-x-0"
            : "top-0 bottom-0 left-0 border-r border-white/[0.08] -translate-x-full"
          }`}
      >
        {/* Top Logo Header */}
        <div className="h-16 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
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
                Autonomous SEC
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

        {/* Navigation Item List with Animated Sliding Pill */}
        <div
          ref={navRef}
          className="relative flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar"
        >
          {/* Smooth Sliding Active Pill Indicator */}
          <div
            ref={pillRef}
            className="absolute left-3 right-3 rounded-card bg-[#28282a] border border-white/5 shadow-sm pointer-events-none opacity-0"
            style={{ top: 0, height: 40 }}
          >
            {/* Glowing amber active dot attached to sliding pill */}
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#ff7300] shadow-[0_0_8px_#ff7300]" />
          </div>

          <div className="px-3 pb-2 text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider">
            Operations
          </div>

          {navItems.slice(0, 6).map((item) => (
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
        <div className="p-3 border-t border-white/[0.06] bg-[#0c0c0e]/80 space-y-2 shrink-0">
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
