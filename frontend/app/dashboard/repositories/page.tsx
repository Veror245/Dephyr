"use client";

import React, { useState } from "react";
import RepositoryTable from "./components/RepositoryTable";
import RepositoryDetailDrawer from "./components/RepositoryDetailDrawer";
import DashboardModal from "../components/DashboardModal";
import { RepositoryRecord } from "../lib/mock-data";
import { GitBranch } from "lucide-react";

export default function RepositoriesPage() {
  const [selectedRepo, setSelectedRepo] = useState<RepositoryRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectRepo = (repo: RepositoryRecord) => {
    setSelectedRepo(repo);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const handleModalExited = () => {
    setSelectedRepo(null);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner: Floating rounded panel */}
      <div className="p-6 lg:p-7 rounded-panel bg-[#111113] border border-white/[0.08] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#ff7300]/10 border border-[#ff7300]/25 flex items-center justify-center text-[#ff7300] shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">
              Repository Risk & Taint Monitoring
            </h2>
            <p className="text-xs sm:text-sm text-[#8e8e8e] leading-relaxed max-w-3xl">
              Continuous AST analysis across all monitored repositories. When a vulnerable dependency is introduced, Dephyr inspects whether calls receive external parameters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-14 md:pl-0">
          <div className="px-3 py-1.5 rounded-pill bg-[#161619] border border-white/[0.06] flex items-center gap-2">
            <span className="text-[#8e8e8e]">Total Repos:</span>
            <span className="text-white font-bold">18</span>
            <span className="text-[#8e8e8e]">·</span>
            <span className="text-[#52e185] font-bold">15 Safe</span>
            <span className="text-[#8e8e8e]">·</span>
            <span className="text-[#ff5252] font-bold">2 Critical</span>
          </div>
        </div>
      </div>

      {/* Main List Column - Expands to full width */}
      <div className="w-full">
        <RepositoryTable
          onSelectRepo={handleSelectRepo}
          selectedRepoId={selectedRepo?.id}
        />
      </div>

      {/* Centered Modal Overlay on top of full-width list */}
      <DashboardModal
        isOpen={isModalOpen}
        onClose={handleModalExited}
        ariaLabel={selectedRepo?.name || "Repository Details"}
      >
        {selectedRepo && (
          <RepositoryDetailDrawer
            repo={selectedRepo}
            onClose={handleClose}
          />
        )}
      </DashboardModal>
    </div>
  );
}
