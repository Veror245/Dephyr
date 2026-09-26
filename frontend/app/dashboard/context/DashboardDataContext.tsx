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
  VulnerabilityRecord,
  AgentLogEvent,
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
  cveError: string | null;
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

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  // Session-scoped live state (resets on refresh as instructed in Step 6b, no fabricated localStorage)
  const [repositories, setRepositories] = useState<RepositoryRecord[]>([]);
  const [cves, setCves] = useState<VulnerabilityRecord[]>([]);
  const [agentEvents, setAgentEvents] = useState<AgentLogEvent[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestRecord[]>([]);
  const [loadingCves, setLoadingCves] = useState(false);
  const [cveError, setCveError] = useState<string | null>(null);

  // Fetch live latest CVEs from GET /cves/latest and hydrate details from GET /cves/{cve_id}
  const refreshCves = useCallback(async () => {
    setLoadingCves(true);
    setCveError(null);
    try {
      const response = await api.cves.getLatest(10);
      if (response && Array.isArray(response.cves)) {
        if (response.cves.length === 0) {
          setCves([]);
          return;
        }

        // 1. Immediately populate feed with real NVD entries from /cves/latest
        const initialList: VulnerabilityRecord[] = response.cves.map((item) => ({
          id: item.id.toLowerCase(),
          cveId: item.id,
          package: "External NVD Disclosure",
          affectedVersions: "See advisory",
          fixedVersion: "Check vendor release",
          severity: "UNKNOWN",
          cvss: 0,
          exposureLevel: 0,
          status: "INVESTIGATING",
          detectedAt: item.published
            ? new Date(item.published).toLocaleDateString()
            : "Recently disclosed",
          summary: `Disclosed vulnerability ${item.id} ingested from live NVD stream.`,
          description: "Fetching full vulnerability disclosure advisory...",
        }));

        setCves(initialList);

        // 2. Concurrently fetch real details from GET /cves/{cve_id} to populate real severity & CVSS
        Promise.allSettled(
          response.cves.map((item) => api.cves.getDetails(item.id))
        ).then((detailResults) => {
          setCves((prev) =>
            prev.map((rec, idx) => {
              const res = detailResults[idx];
              if (res && res.status === "fulfilled" && res.value) {
                const d = res.value;
                const rawSev = (d.severity || "UNKNOWN").toUpperCase();
                let validSev: VulnerabilityRecord["severity"] = "UNKNOWN" as any;
                if (rawSev === "CRITICAL" || rawSev === "HIGH" || rawSev === "MEDIUM" || rawSev === "LOW") {
                  validSev = rawSev;
                }

                const cvss = d.cvss_score ?? 0;
                let exposureLevel: 0 | 1 | 2 | 3 = 0;
                if (validSev === "CRITICAL") exposureLevel = 3;
                else if (validSev === "HIGH") exposureLevel = 2;
                else if (validSev === "MEDIUM") exposureLevel = 1;

                return {
                  ...rec,
                  severity: validSev,
                  cvss,
                  exposureLevel,
                  summary: d.description
                    ? d.description.length > 140
                      ? d.description.slice(0, 140) + "..."
                      : d.description
                    : rec.summary,
                  description: d.description || rec.description,
                  detectedAt: d.published
                    ? new Date(d.published).toLocaleDateString()
                    : rec.detectedAt,
                };
              }
              return rec;
            })
          );
        });
      }
    } catch (err) {
      console.warn("Failed to fetch /cves/latest:", err);
      setCveError(err instanceof Error ? err.message : "Failed to connect to /cves/latest");
    } finally {
      setLoadingCves(false);
    }
  }, []);

  useEffect(() => {
    refreshCves();
  }, [refreshCves]);

  // Calculate reactive aggregate statistics derived strictly from real tracked data
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

  // Action: Record a completed scan (updates repos, stats, events)
  const recordScan = useCallback(
    async (repoName: string, scanResult: any, packageName?: string) => {
      const cleanName = repoName
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\/$/, "");
      const parts = cleanName.split("/");
      const org = parts.length > 1 ? parts[0] : "custom";
      const name = parts.length > 1 ? parts[1] : cleanName;
      const repoId = name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

      const findingsList = Array.isArray(scanResult?.res) ? scanResult.res : [];
      const totalCalls =
        findingsList.reduce((acc: number, f: any) => acc + (f.calls?.length || 0), 0) +
        (scanResult?.total_calls || 0);
      const totalImports =
        findingsList.reduce((acc: number, f: any) => acc + (f.imports?.length || 0), 0) +
        (scanResult?.total_imports || 0);
      const filesScanned = scanResult?.files_scanned || findingsList.length;

      let risk: "CRITICAL" | "MEDIUM" | "SAFE" = "SAFE";
      let activeExposures = 0;
      let remediationStatus = "Clean: 0 reachable call sites detected";
      let affectedCves: string[] = [];

      if (totalCalls > 0) {
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

      // 1. Immediately log live event to agentEvents
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

      // 2. Query GitHub metadata in background for the newly scanned repo if reachable
      if (org !== "dephyr-demo") {
        api.repositories
          .getMetadata({ repo: cleanName })
          .then((meta) => {
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
          })
          .catch(() => {
            // Non-blocking fallback if GitHub token is unavailable
          });
      }
    },
    []
  );

  const addRepository = useCallback((repo: RepositoryRecord) => {
    setRepositories((prev) => [repo, ...prev]);
  }, []);

  const updateRepository = useCallback(
    (id: string, updates: Partial<RepositoryRecord>) => {
      setRepositories((prev) => {
        const target = prev.find((r) => r.id === id);
        if (!target) return prev;
        const hasDiff = Object.entries(updates).some(
          ([key, value]) => (target as any)[key] !== value
        );
        if (!hasDiff) return prev;
        return prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      });
    },
    []
  );

  const addAgentEvent = useCallback((event: AgentLogEvent) => {
    setAgentEvents((prev) => [event, ...prev]);
  }, []);

  const resetToDefaults = useCallback(() => {
    setRepositories([]);
    setAgentEvents([]);
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
        cveError,
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
