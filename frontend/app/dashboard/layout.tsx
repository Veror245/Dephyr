"use client";

import React, { useState } from "react";
import "./dashboard.css";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-root min-h-screen bg-black text-white flex">
      {/* Persistent Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Subtle, restrained ambient warmth in top-right corner - non-distracting */}
        <div
          className="fixed top-0 right-0 w-[500px] h-[500px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(255, 115, 0, 0.045) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        {/* Topbar */}
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Page Inner Container - Spans full width next to sidebar */}
        <main className="relative z-10 flex-1 px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
