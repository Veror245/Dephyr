"use client";

import React, { useState } from "react";
import "./dashboard.css";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DashboardPageTransition from "./components/DashboardPageTransition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-root min-h-screen bg-black text-white flex">
      {/* Persistent Left Sidebar - Inset floating panel on desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area - Inset margins mirroring the sidebar */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[19rem] lg:pr-6 lg:pt-6 lg:pb-6 px-4 pt-4 pb-6">
        {/* Subtle, restrained ambient warmth in top-right corner - non-distracting */}
        <div
          className="fixed top-0 right-0 w-[500px] h-[500px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(255, 115, 0, 0.045) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        {/* Floating Topbar */}
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Page Inner Container - Content only transitions with GSAP */}
        <main className="relative z-10 flex-1 w-full">
          <DashboardPageTransition>
            {children}
          </DashboardPageTransition>
        </main>
      </div>
    </div>
  );
}
