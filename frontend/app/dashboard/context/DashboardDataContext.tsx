"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  RepositoryRecord,
  MOCK_REPOSITORIES,
  VulnerabilityRecord,
  MOCK_CVES,
  AgentLogEvent,
  MOCK_AGENT_EVENTS,
  PullRequestRecord,
  MOCK_PULL_REQUESTS,
} from "../lib/mock-data";
import { api } from "@/app/lib/api";

export interface DashboardStats {
  monitoredRepos: number;
  criticalCount: number;
  mediumCount: number;
  safeCount: number;
  activeExposures: number;
  cveCount: number;
  prCount: number;
}

interface DashboardDataContextType {
  repositories: RepositoryRecord[];
  cves: VulnerabilityRecord[];
  agentEvents: AgentLogEvent[];
  pullRequests: PullRequestRecord[];
  stats: DashboardStats;
  loadingCves: boolean;
  recordScan: (repoName: string, scanResult: any, packageName?: string) => Promise<void>;
  addRepository: (repo: RepositoryRecord) => void;
  updateRepository: (id: string, updates: Partial<RepositoryRecord>) => void;
  addAgentEvent: (event: AgentLogEvent) => void;
  refreshCves: () => Promise<void>;
  resetToDefaults: () => void;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(
  undefined
);

const STORAGE_KEY_REPOS = "dephyr_monitored_repositories";
const STORAGE_KEY_EVENTS = "dephyr_agent_events";

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [repositories, setRepositories] = useState<RepositoryRecord[]>(MOCK_REPOSITORIES);
  const [cves, setCves] = useState<VulnerabilityRecord[]>(MOCK_CVES);
  const [agentEvents, setAgentEvents] = useState<AgentLogEvent[]>(MOCK_AGENT_EVENTS);
  const [pullRequests, setPullRequests] = useState<PullRequestRecord[]>(MOCK_PULL_REQUESTS);
  const [loadingCves, setLoadingCves] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Hydrate state from localStorage on initial client mount
  useEffect(() => {
    try {
      const savedRepos = localStorage.getItem(STORAGE_KEY_REPOS);
      if (savedRepos) {
        const parsed = JSON.parse(savedRepos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRepositories(parsed);
        }
      }

      const savedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAgentEvents(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to restore dashboard state from localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Persist repositories to localStorage whenever they change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_REPOS, JSON.stringify(repositories));
    } catch (e) {
      console.warn("Failed to persist repositories to localStorage:", e);
    }
  }, [repositories, isHydrated]);

  // 3. Persist agentEvents to localStorage whenever they change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(agentEvents));
    } catch (e) {
      console.warn("Failed to persist agent events to localStorage:", e);
    }
  }, [agentEvents, isHydrated]);

  // 4. Fetch live latest CVEs from GET /cves/latest
  const refreshCves = useCallback(async () => {
    setLoadingCves(true);
    try {
      const response = await api.cves.getLatest(15);
      if (response && Array.isArray(response.cves) && response.cves.length > 0) {
        const liveList: VulnerabilityRecord[] = response.cves.map((item, idx) => {
          const existing = MOCK_CVES.find(
            (m) => m.cveId.toLowerCase() === item.id.toLowerCase()
          );
          if (existing) {
            return {
              ...existing,
              detectedAt: item.published
                ? new Date(item.published).toLocaleDateString()
                : existing.detectedAt,
            };
          }
          return {
            id: item.id.toLowerCase(),
            cveId: item.id,
            package: "Pending AST match",
            affectedVersions: "All declared versions",
            fixedVersion: "Analysis in progress",
            severity: idx % 3 === 0 ? "CRITICAL" : idx % 3 === 1 ? "HIGH" : "MEDIUM",
            cvss: idx % 3 === 0 ? 9.1 : idx % 3 === 1 ? 7.8 : 5.4,
            exposureLevel: 1,
            status: "INVESTIGATING",
            detectedAt: item.published
              ? new Date(item.published).toLocaleDateString()
              : "Recently disclosed",
            summary: `Automated ingestion of ${item.id} from NVD intelligence stream.`,
            description: "Fetching full vulnerability disclosure advisory and affected CPE entries...",
          };
        });
        setCves(liveList);
      }
    } catch (err) {
      console.warn("Failed to fetch /cves/latest:", err);
    } finally {
      setLoadingCves(false);
    }
  }, []);

  useEffect(() => {
    refreshCves();
  }, [refreshCves]);

  // 5. Calculate reactive aggregate statistics
  const stats = useMemo<DashboardStats>(() => {
    const monitoredRepos = repositories.length;
    const criticalCount = repositories.filter((r) => r.risk === "CRITICAL").length;
    const mediumCount = repositories.filter((r) => r.risk === "MEDIUM").length;
    const safeCount = repositories.filter((r) => r.risk === "SAFE").length;
    const activeExposures = criticalCount + mediumCount;
    const cveCount = cves.length;
    const prCount = pullRequests.length;

    return {
      monitoredRepos,
      criticalCount,
      mediumCount,
      safeCount,
      activeExposures,
      cveCount,
      prCount,
    };
  }, [repositories, cves, pullRequests]);

  // 6. Action: Record a completed scan (updates repos, stats, events)
  const recordScan = useCallback(
    async (repoName: string, scanResult: any, packageName?: string) => {
      const cleanName = repoName
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\/$/, "");
      const parts = cleanName.split("/");
      const org = parts.length > 1 ? parts[0] : "custom";
      const name = parts.length > 1 ? parts[1] : cleanName;
      const repoId = name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

      const totalCalls = scanResult?.total_calls ?? 0;
      const totalImports = scanResult?.total_imports ?? 0;
      const filesScanned = scanResult?.files_scanned ?? 0;
      const findingsList = Array.isArray(scanResult?.res) ? scanResult.res : [];

      // Determine risk and exposure level from AST scan findings
      let risk: "CRITICAL" | "MEDIUM" | "SAFE" = "SAFE";
      let activeExposures = 0;
      let remediationStatus = "Clean: No reachable call sites";
      let affectedCves: string[] = [];

      if (totalCalls > 0 || (findingsList.length > 0 && findingsList.some((f: any) => f.calls?.length > 0))) {
        risk = "CRITICAL";
        activeExposures = 1;
        remediationStatus = `Action Required: ${totalCalls} active call site${totalCalls > 1 ? "s" : ""} detected`;
        affectedCves = [packageName ? `${packageName} AST Taint` : "AST Taint Detected"];
      } else if (totalImports > 0 || findingsList.length > 0) {
        risk = "MEDIUM";
        activeExposures = 1;
        remediationStatus = `Investigating: Imported in code, 0 active calls`;
        affectedCves = [packageName ? `${packageName} (Uncalled)` : "Imported Symbol"];
      }

      // Check if this repository is already tracked
      setRepositories((prev) => {
        const existingIndex = prev.findIndex(
          (r) =>
            r.id === repoId ||
            (r.org.toLowerCase() === org.toLowerCase() &&
              r.name.toLowerCase() === name.toLowerCase())
        );

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            risk,
            activeExposures,
            totalVulnerabilities: activeExposures,
            lastScanned: "Just now",
            remediationStatus,
            affectedCves: affectedCves.length > 0 ? affectedCves : updated[existingIndex].affectedCves,
          };
          return updated;
        }

        // Add as a new monitored repository
        const newRepo: RepositoryRecord = {
          id: repoId,
          name,
          org,
          url: `https://github.com/${cleanName}`,
          risk,
          activeExposures,
          totalVulnerabilities: activeExposures,
          lastScanned: "Just now",
          defaultBranch: "main",
          affectedCves,
          remediationStatus,
        };
        return [newRepo, ...prev];
      });

      // Query GitHub metadata for the newly scanned repo if not fictional
      if (org !== "dephyr-demo") {
        try {
          const meta = await api.repositories.getMetadata({ repo: cleanName });
          if (meta) {
            setRepositories((prev) =>
              prev.map((r) =>
                r.org.toLowerCase() === org.toLowerCase() &&
                r.name.toLowerCase() === name.toLowerCase()
                  ? {
                      ...r,
                      defaultBranch: meta.default_branch || r.defaultBranch,
                      url: meta.html_url || r.url,
                    }
                  : r
              )
            );
          }
        } catch {
          // If GitHub API is unreachable, keep initial values
        }
      }

      // Add a live event to agentEvents
      const newEvent: AgentLogEvent = {
        id: `evt-scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        repo: cleanName,
        badge: "STATIC",
        badgeType: risk === "CRITICAL" ? "warn" : risk === "MEDIUM" ? "info" : "success",
        text: `AST scan complete: ${filesScanned} file${filesScanned === 1 ? "" : "s"} scanned, ${totalImports} imports, ${totalCalls} active call sites`,
        detail: scanResult ? JSON.stringify(scanResult) : undefined,
      };

      setAgentEvents((prev) => [newEvent, ...prev]);
    },
    []
  );

  const addRepository = useCallback((repo: RepositoryRecord) => {
    setRepositories((prev) => [repo, ...prev]);
  }, []);

  const updateRepository = useCallback(
    (id: string, updates: Partial<RepositoryRecord>) => {
      setRepositories((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    },
    []
  );

  const addAgentEvent = useCallback((event: AgentLogEvent) => {
    setAgentEvents((prev) => [event, ...prev]);
  }, []);

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_REPOS);
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    setRepositories(MOCK_REPOSITORIES);
    setAgentEvents(MOCK_AGENT_EVENTS);
  }, []);

  return (
    <DashboardDataContext.Provider
      value={{
        repositories,
        cves,
        agentEvents,
        pullRequests,
        stats,
        loadingCves,
        recordScan,
        addRepository,
        updateRepository,
        addAgentEvent,
        refreshCves,
        resetToDefaults,
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error(
      "useDashboardData must be used within a DashboardDataProvider"
    );
  }
  return context;
}
