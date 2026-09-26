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
  RemediationHistoryItem,
  MOCK_PULL_REQUESTS,
} from "../lib/mock-data";
import { api, computeTotalFunctionCalls, FileScanResult } from "@/app/lib/api";

export interface ScanTelemetryRecord {
  id: string;
  repo: string;
  timestamp: string;
  dateKey: string;
  label: string;
  files: FileScanResult[];
  total_function_call: number;
  total_imports: number;
}

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
  remediationHistory: RemediationHistoryItem[];
  scanHistory: ScanTelemetryRecord[];
  latestScan: ScanTelemetryRecord | null;
  stats: DashboardStats;
  loadingCves: boolean;
  cveError: string | null;
  recordScan: (repoName: string, scanResult: any, packageName?: string) => Promise<void>;
  addRepository: (repo: RepositoryRecord) => void;
  updateRepository: (id: string, updates: Partial<RepositoryRecord>) => void;
  addAgentEvent: (event: AgentLogEvent) => void;
  updateCve: (cveId: string, updates: Partial<VulnerabilityRecord>) => void;
  addRemediation: (item: RemediationHistoryItem) => void;
  addPullRequest: (pr: PullRequestRecord) => void;
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
  const [remediationHistory, setRemediationHistory] = useState<RemediationHistoryItem[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanTelemetryRecord[]>([]);
  const [latestScan, setLatestScan] = useState<ScanTelemetryRecord | null>(null);
  const [loadingCves, setLoadingCves] = useState(false);
  const [cveError, setCveError] = useState<string | null>(null);

  const addRemediation = useCallback((item: RemediationHistoryItem) => {
    setRemediationHistory((prev) => [item, ...prev]);
  }, []);

  const addPullRequest = useCallback((pr: PullRequestRecord) => {
    setPullRequests((prev) => [pr, ...prev]);
  }, []);

  // Update a specific CVE in state
  const updateCve = useCallback(
    (cveId: string, updates: Partial<VulnerabilityRecord>) => {
      setCves((prev) =>
        prev.map((c) =>
          c.cveId.toLowerCase() === cveId.toLowerCase()
            ? { ...c, ...updates }
            : c
        )
      );
    },
    []
  );

  // Fetch live latest CVEs from GET /cves/latest and hydrate details from GET /cves/{cve_id}
  const refreshCves = useCallback(async () => {
    setLoadingCves(true);
    setCveError(null);
    try {
      const response = await api.cves.getLatest(10);
      if (response && Array.isArray(response.cves)) {
        if (response.cves.length === 0) {
          setCves((prev) => prev.filter((c) => c.id.startsWith("vuln-scan-")));
          return;
        }

        // 1. Immediately populate feed with real NVD entries from /cves/latest
        const initialList: VulnerabilityRecord[] = response.cves.map((item) => ({
          id: item.id.toLowerCase(),
          cveId: item.id,
          package: "Disclosed Dependency",
          affectedVersions: "See advisory",
          fixedVersion: "Check vendor release",
          severity: "UNKNOWN",
          cvss: 0,
          exposureLevel: 0,
          status: "INVESTIGATING",
          detectedAt: item.published
            ? new Date(item.published).toLocaleDateString()
            : "Recently disclosed",
          publishedAt: item.published || undefined,
          summary: `Disclosed vulnerability ${item.id} ingested from live NVD stream.`,
          description: "Fetching full vulnerability disclosure advisory...",
        }));

        // Keep any active scanned repo findings at the top, merge global NVD entries
        setCves((prev) => {
          const scanVulns = prev.filter((c) => c.id.startsWith("vuln-scan-"));
          return [...scanVulns, ...initialList];
        });

        // 2. Hydrate details sequentially with 150ms throttle to prevent NVD 429 rate-limiting
        (async () => {
          for (const item of response.cves) {
            try {
              const d = await api.cves.getDetails(item.id);
              if (!d) continue;

              const rawSev = (d.severity || "UNKNOWN").toUpperCase();
              let validSev: VulnerabilityRecord["severity"] = "UNKNOWN" as any;
              if (
                rawSev === "CRITICAL" ||
                rawSev === "HIGH" ||
                rawSev === "MEDIUM" ||
                rawSev === "LOW"
              ) {
                validSev = rawSev;
              }

              const cvss = d.cvss_score ?? 0;
              let exposureLevel: 0 | 1 | 2 | 3 = 0;
              if (validSev === "CRITICAL") exposureLevel = 3;
              else if (validSev === "HIGH") exposureLevel = 2;
              else if (validSev === "MEDIUM") exposureLevel = 1;

              // Parse human-readable package name from NVD description
              let extractedPkg = "";
              let extractedVer = "";
              if (d.description) {
                const pkgMatch = d.description.match(
                  /^([A-Za-z0-9_\-\.\s]{2,28}?)\s+(?:before|through|prior to|up to|in|contains|version|allows)/i
                );
                if (pkgMatch && pkgMatch[1]) {
                  extractedPkg = pkgMatch[1].trim();
                }
                const verMatch = d.description.match(
                  /(?:before\s+[0-9a-zA-Z\.\-]+|through\s+[0-9a-zA-Z\.\-]+|up to\s+[0-9a-zA-Z\.\-]+)/i
                );
                if (verMatch && verMatch[0]) {
                  extractedVer = verMatch[0].trim();
                }
              }

              setCves((prev) =>
                prev.map((rec) => {
                  if (rec.cveId.toUpperCase() === item.id.toUpperCase()) {
                    return {
                      ...rec,
                      package: extractedPkg || rec.package,
                      affectedVersions: extractedVer || rec.affectedVersions,
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
                      publishedAt: d.published || rec.publishedAt,
                    };
                  }
                  return rec;
                })
              );

              // 150ms throttle between detail requests
              await new Promise((res) => setTimeout(res, 150));
            } catch {
              // Ignore single item detail errors; list remains visible
            }
          }
        })();
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
      const perFileResults: FileScanResult[] = findingsList.map((f: any) => ({
        file: f.file || "unknown",
        imports: Array.isArray(f.imports) ? f.imports : [],
        total_imports: typeof f.total_imports === "number" ? f.total_imports : (f.imports?.length || 0),
        calls: Array.isArray(f.calls) ? f.calls : [],
        total_calls: typeof f.total_calls === "number" ? f.total_calls : (f.calls?.length || 0),
        exposure_level: f.exposure_level ?? 0,
      }));

      // Real client-side reduction over the real per-file array
      const total_function_call = computeTotalFunctionCalls(perFileResults);
      const totalImports = perFileResults.reduce((acc, f) => acc + (f.total_imports || 0), 0);
      const filesScanned = scanResult?.files_scanned || perFileResults.length;

      let risk: "CRITICAL" | "MEDIUM" | "SAFE" = "SAFE";
      let activeExposures = 0;
      let remediationStatus = "Clean: 0 reachable call sites detected";
      let affectedCves: string[] = [];

      if (total_function_call > 0) {
        risk = "CRITICAL";
        activeExposures = 1;
        remediationStatus = `Action Required: ${total_function_call} active call site${total_function_call > 1 ? "s" : ""} detected`;
        affectedCves = [packageName || "AST Taint Detected"];
      } else if (totalImports > 0 || perFileResults.length > 0) {
        risk = "MEDIUM";
        activeExposures = 1;
        remediationStatus = `Investigating: Imported in code, 0 active calls`;
        affectedCves = [packageName || "Imported Symbol"];
      }

      // Record telemetry data point with real per-file array and computed total_function_call
      const now = new Date();
      const telemetryRecord: ScanTelemetryRecord = {
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        repo: cleanName,
        timestamp: now.toISOString(),
        dateKey: now.toISOString().slice(0, 10),
        label: now.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        files: perFileResults,
        total_function_call,
        total_imports: totalImports,
      };

      setScanHistory((prev) => [telemetryRecord, ...prev]);
      setLatestScan(telemetryRecord);

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
            files: perFileResults,
            total_function_call,
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
          files: perFileResults,
          total_function_call,
        };
        return [newRepo, ...prev];
      });

      // 1. Add scanned repo finding to cves feed so it appears on the CVE Feed page
      if (risk !== "SAFE" || total_function_call > 0 || totalImports > 0) {
        const primaryFile = perFileResults.find((f) => (f.total_calls ?? 0) > 0) || perFileResults[0];
        const primaryCallObj = primaryFile?.calls?.[0];
        const primaryCall = primaryCallObj
          ? `${primaryCallObj.function}${primaryCallObj.attribute ? "." + primaryCallObj.attribute : ""}()`
          : total_function_call > 0
          ? "dynamic call site"
          : undefined;

        const primaryImpObj = primaryFile?.imports?.[0];
        const primaryImport = primaryImpObj
          ? `${primaryImpObj.module}${primaryImpObj.name ? "." + primaryImpObj.name : ""}`
          : packageName
          ? `${packageName} import`
          : "package symbol";
        
        const scanVulnId = `vuln-scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const scanCveId = packageName
          ? `AST-${packageName.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`
          : `AST-${name.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;

        const scannedVuln: VulnerabilityRecord = {
          id: scanVulnId,
          cveId: scanCveId,
          package: packageName || name,
          affectedVersions: `Branch: ${cleanName}`,
          fixedVersion: "Audit & sanitize AST call sites",
          severity: risk === "CRITICAL" ? "CRITICAL" : "MEDIUM",
          cvss: risk === "CRITICAL" ? 9.1 : 5.4,
          exposureLevel: (risk === "CRITICAL" ? 2 : 1) as 0 | 1 | 2 | 3,
          callSite: primaryCall ? `${primaryFile?.file || "code"}: ${primaryCall}` : undefined,
          taintSource: primaryImport,
          status: "INVESTIGATING",
          detectedAt: "Just now",
          publishedAt: new Date().toISOString(),
          summary: `${cleanName}: ${total_function_call} active call site(s) and ${totalImports} import(s) detected via AST analysis.`,
          description: `AST taint analysis of ${cleanName} identified reachable function invocations in ${filesScanned} scanned file(s). Vulnerability exposure: ${risk}. Call sites: ${total_function_call}, imports: ${totalImports}.`,
        };

        setCves((prev) => {
          const filtered = prev.filter(
            (c) => !(c.id.startsWith("vuln-scan-") && c.package === (packageName || name))
          );
          return [scannedVuln, ...filtered];
        });
      }

      // 2. Immediately log live event to agentEvents
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
        text: `AST scan complete: ${filesScanned} file${filesScanned === 1 ? "" : "s"} scanned, ${totalImports} imports, ${total_function_call} active call sites`,
        detail: scanResult ? JSON.stringify(scanResult) : undefined,
      };

      setAgentEvents((prev) => [newEvent, ...prev]);

      // 3. Query GitHub metadata in background for the newly scanned repo if reachable
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
    setPullRequests([]);
    setRemediationHistory([]);
    setScanHistory([]);
    setLatestScan(null);
  }, []);

  return (
    <DashboardDataContext.Provider
      value={{
        repositories,
        cves,
        agentEvents,
        pullRequests,
        remediationHistory,
        scanHistory,
        latestScan,
        stats,
        loadingCves,
        cveError,
        recordScan,
        addRepository,
        updateRepository,
        addAgentEvent,
        updateCve,
        addRemediation,
        addPullRequest,
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
