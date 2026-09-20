"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal,
  Activity,
  RefreshCw,
  Play,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Trash2,
  Server,
  Cpu,
  History,
  Radio,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface DeploymentStatus {
  status: string;
  start_time: string;
  end_time: string;
}

interface LogEntry {
  id: string;
  text: string;
  timestamp: Date;
}

interface CommandHistoryEntry {
  command: string;
  timestamp: string;
}

interface CommandHistoryResponse {
  history: CommandHistoryEntry[];
  system_history: CommandHistoryEntry[];
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ConsolePage() {
  /* ------------------------------------------------------------------------ */
  /* Authentication                                                           */
  /* ------------------------------------------------------------------------ */

  const [token, setToken] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [healthStatus, setHealthStatus] = useState<
    "ok" | "error" | "loading"
  >("loading");

  const [generalLogs, setGeneralLogs] = useState<LogEntry[]>([]);
  const [containerLogs, setContainerLogs] = useState("");
  const [selectedService, setSelectedService] =
    useState("frontend-service");

  const [deploymentStatus, setDeploymentStatus] =
    useState<DeploymentStatus | null>(null);

  const [commandHistory, setCommandHistory] =
    useState<CommandHistoryResponse | null>(null);

  const [isDeploying, setIsDeploying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Refs                                                                     */
  /* ------------------------------------------------------------------------ */

  const generalLogsContainerRef = useRef<HTMLDivElement>(null);
  const containerLogsRef = useRef<HTMLDivElement>(null);
  const commandHistoryRef = useRef<HTMLDivElement>(null);

  const pollingRef = useRef(false);

  /* ------------------------------------------------------------------------ */
  /* Initial configuration                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const savedToken = sessionStorage.getItem("x-deploy-token");

    if (savedToken) {
      setToken(savedToken);
      setIsConfigured(true);
    } else {
      setIsTokenModalOpen(true);
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* API helper                                                               */
  /* ------------------------------------------------------------------------ */

  const fetchFromProxy = useCallback(
    async (
      endpoint: string,
      params: Record<string, string> = {}
    ) => {
      const url = new URL(
        "/api/admin/deploy-proxy",
        window.location.origin
      );

      url.searchParams.set("endpoint", endpoint);

      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      const headers: Record<string, string> = {};

      if (token) {
        headers["X-Deploy-Token"] = token;
      }

      const res = await fetch(url.toString(), {
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Invalid Deployment Token");
          setIsConfigured(false);
          setIsTokenModalOpen(true);
        }

        throw new Error(`Failed to fetch ${endpoint}`);
      }

      return res.json();
    },
    [token]
  );

  /* ------------------------------------------------------------------------ */
  /* Helpers                                                                  */
  /* ------------------------------------------------------------------------ */

  const isNearBottom = (element: HTMLElement | null) => {
    if (!element) return false;

    const threshold = 120;

    return (
      element.scrollHeight -
        element.scrollTop -
        element.clientHeight <
      threshold
    );
  };

  const scrollToBottomIfNeeded = (
    element: HTMLElement | null,
    wasNearBottom: boolean
  ) => {
    if (!element || !wasNearBottom) return;

    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Health                                                                   */
  /* ------------------------------------------------------------------------ */

  const refreshHealth = useCallback(async () => {
    if (!isConfigured) return;

    try {
      const data = await fetchFromProxy("/health");

      setHealthStatus(
        data.status === "ok" ? "ok" : "error"
      );
    } catch {
      setHealthStatus("error");
    }
  }, [fetchFromProxy, isConfigured]);

  /* ------------------------------------------------------------------------ */
  /* General logs                                                             */
  /* ------------------------------------------------------------------------ */

  const refreshLogs = useCallback(async () => {
    if (!isConfigured) return;

    const container = generalLogsContainerRef.current;
    const shouldStickToBottom = isNearBottom(container);

    try {
      const data = await fetchFromProxy("/logs");

      if (!Array.isArray(data.logs)) return;

      const newLogs: LogEntry[] = data.logs.map(
        (log: string, idx: number) => ({
          id: `${idx}-${log}`,
          text: log,
          timestamp: new Date(),
        })
      );

      setGeneralLogs(newLogs);

      scrollToBottomIfNeeded(
        generalLogsContainerRef.current,
        shouldStickToBottom
      );
    } catch (err) {
      console.error("Logs refresh failed:", err);
    }
  }, [fetchFromProxy, isConfigured]);

  /* ------------------------------------------------------------------------ */
  /* Container logs                                                           */
  /* ------------------------------------------------------------------------ */

  const refreshContainerLogs = useCallback(async () => {
    if (!isConfigured) return;

    const container = containerLogsRef.current;
    const shouldStickToBottom = isNearBottom(container);

    try {
      const data = await fetchFromProxy("/container-logs", {
        service: selectedService,
      });

      setContainerLogs(data.logs || "");

      scrollToBottomIfNeeded(
        containerLogsRef.current,
        shouldStickToBottom
      );
    } catch (err) {
      console.error(
        "Container logs refresh failed:",
        err
      );
    }
  }, [
    fetchFromProxy,
    isConfigured,
    selectedService,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Deployment status                                                        */
  /* ------------------------------------------------------------------------ */

  const refreshStatus = useCallback(async () => {
    if (!isConfigured) return;

    try {
      const data = await fetchFromProxy(
        "/deployment-status"
      );

      setDeploymentStatus(data);
    } catch (err) {
      console.error("Status refresh failed:", err);
    }
  }, [fetchFromProxy, isConfigured]);

  /* ------------------------------------------------------------------------ */
  /* Command history                                                          */
  /* ------------------------------------------------------------------------ */

  const refreshCommandHistory = useCallback(async () => {
    if (!isConfigured) return;

    const container = commandHistoryRef.current;
    const shouldStickToBottom = isNearBottom(container);

    try {
      const data = await fetchFromProxy(
        "/command-history"
      );

      setCommandHistory(data);

      scrollToBottomIfNeeded(
        commandHistoryRef.current,
        shouldStickToBottom
      );
    } catch (err) {
      console.error(
        "Command history refresh failed:",
        err
      );
    }
  }, [fetchFromProxy, isConfigured]);

  /* ------------------------------------------------------------------------ */
  /* Refresh everything                                                       */
  /* ------------------------------------------------------------------------ */

  const refreshAll = useCallback(
    async (showSpinner = false) => {
      if (!isConfigured || pollingRef.current) return;

      pollingRef.current = true;

      if (showSpinner) {
        setIsRefreshing(true);
      }

      try {
        await Promise.allSettled([
          refreshHealth(),
          refreshLogs(),
          refreshContainerLogs(),
          refreshStatus(),
          refreshCommandHistory(),
        ]);

        setLastUpdated(new Date());
      } finally {
        pollingRef.current = false;

        if (showSpinner) {
          setIsRefreshing(false);
        }
      }
    },
    [
      isConfigured,
      refreshHealth,
      refreshLogs,
      refreshContainerLogs,
      refreshStatus,
      refreshCommandHistory,
    ]
  );

  /* ------------------------------------------------------------------------ */
  /* Automatic polling                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isConfigured) return;

    refreshAll();

    const interval = setInterval(() => {
      refreshAll();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [isConfigured, refreshAll]);

  /* ------------------------------------------------------------------------ */
  /* Refresh container logs when service changes                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isConfigured) return;

    refreshContainerLogs();
  }, [
    selectedService,
    isConfigured,
    refreshContainerLogs,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Deploy                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleDeploy = async () => {
    if (
      !confirm(
        "Are you sure you want to trigger a new deployment?"
      )
    ) {
      return;
    }

    setIsDeploying(true);

    try {
      const url = new URL(
        "/api/admin/deploy-proxy",
        window.location.origin
      );

      url.searchParams.set("endpoint", "/deploy");

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "X-Deploy-Token": token,
        },
      });

      if (!res.ok) {
        toast.error("Failed to trigger deployment");
        return;
      }

      toast.success(
        "Deployment process triggered successfully!"
      );

      // Immediately update status/logs instead of waiting
      // for the next polling cycle.
      await Promise.allSettled([
        refreshStatus(),
        refreshLogs(),
        refreshCommandHistory(),
      ]);
    } catch {
      toast.error("Error triggering deployment");
    } finally {
      setIsDeploying(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Manual refresh                                                           */
  /* ------------------------------------------------------------------------ */

  const handleRefresh = async () => {
    await refreshAll(true);
  };

  /* ------------------------------------------------------------------------ */
  /* Token                                                                    */
  /* ------------------------------------------------------------------------ */

  const saveToken = async () => {
    const cleanToken = tempToken.trim();

    if (!cleanToken) {
      toast.error("Token cannot be empty");
      return;
    }

    sessionStorage.setItem(
      "x-deploy-token",
      cleanToken
    );

    setToken(cleanToken);
    setIsConfigured(true);
    setIsTokenModalOpen(false);

    toast.success(
      "Deployment token saved for this session"
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Data                                                                     */
  /* ------------------------------------------------------------------------ */

  const services = [
    {
      name: "Frontend",
      id: "frontend-service",
    },
    {
      name: "Express Server",
      id: "express-server",
    },
    {
      name: "Executor Service",
      id: "executor-service",
    },
    {
      name: "Redis",
      id: "redis",
    },
  ];

  const allHistory = [
    ...(commandHistory?.history || []),
    ...(commandHistory?.system_history || []),
  ].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime()
  );

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans overflow-x-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div
                className={`h-2 w-2 rounded-full ${
                  healthStatus === "ok"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    : healthStatus === "error"
                    ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                    : "bg-zinc-500 animate-pulse"
                }`}
              />

              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                {healthStatus === "ok"
                  ? "System Healthy"
                  : healthStatus === "error"
                  ? "System Offline"
                  : "Checking Status"}
              </span>
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Terminal className="h-5 w-5 text-indigo-400" />
              Deployment Console
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-600 mr-2">
                <Radio className="h-3 w-3 text-emerald-500" />
                Live ·{" "}
                {lastUpdated.toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={
                isRefreshing || !isConfigured
              }
              className="gap-2 text-zinc-500 hover:text-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </Button>

            <Button
              variant={
                isConfigured
                  ? "outline"
                  : "default"
              }
              size="sm"
              onClick={() =>
                setIsTokenModalOpen(true)
              }
              className="gap-2 border-white/10 hover:bg-white/5"
            >
              <Settings className="h-4 w-4" />
              Config
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleDeploy}
              disabled={
                isDeploying || !isConfigured
              }
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-5 gap-2"
            >
              {isDeploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}

              Deploy Now
            </Button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Dashboard stats                                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 sm:px-6 pt-4 sm:pt-5">
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="p-4 rounded-xl bg-white/[0.035] border border-white/10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>

            <span className="text-sm font-medium text-zinc-400">
              Last Deployment
            </span>
          </div>

          <p className="text-xl font-bold text-white">
            {deploymentStatus?.status ===
            "success"
              ? "Successful"
              : deploymentStatus
              ? "Failed"
              : "Unknown"}
          </p>

          <p className="text-xs text-zinc-600 mt-1">
            {deploymentStatus?.end_time
              ? new Date(
                  deploymentStatus.end_time
                ).toLocaleString()
              : "Never"}
          </p>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.05,
          }}
          className="p-4 rounded-xl bg-white/[0.035] border border-white/10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <RefreshCw className="h-4 w-4 text-emerald-400" />
            </div>

            <span className="text-sm font-medium text-zinc-400">
              Duration
            </span>
          </div>

          <p className="text-xl font-bold text-white">
            {deploymentStatus?.start_time &&
            deploymentStatus?.end_time
              ? `${Math.round(
                  (new Date(
                    deploymentStatus.end_time
                  ).getTime() -
                    new Date(
                      deploymentStatus.start_time
                    ).getTime()) /
                    1000
                )}s`
              : "0s"}
          </p>

          <p className="text-xs text-zinc-600 mt-1">
            Build & cleanup time
          </p>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
          }}
          className="p-4 rounded-xl bg-white/[0.035] border border-white/10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Cpu className="h-4 w-4 text-amber-400" />
            </div>

            <span className="text-sm font-medium text-zinc-400">
              Active Services
            </span>
          </div>

          <p className="text-xl font-bold text-white">
            4 / 4
          </p>

          <p className="text-xs text-zinc-600 mt-1">
            Connected to deploy engine
          </p>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Main                                                                */}
      {/* ------------------------------------------------------------------ */}

      <main className="p-4 sm:p-6 space-y-4">
        {/* Top row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* General logs */}
          <section className="flex flex-col h-[420px] xl:h-[480px] bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-400" />

                <span className="text-sm font-semibold text-white">
                  Deployment Server Logs
                </span>

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-600 hover:text-white"
                onClick={() =>
                  setGeneralLogs([])
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div
              ref={generalLogsContainerRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
            >
              {generalLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 italic">
                  Waiting for logs...
                </div>
              ) : (
                generalLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-3 hover:bg-white/5 px-2 py-1 rounded transition-colors"
                  >
                    <span className="text-zinc-600 shrink-0 select-none">
                      {new Date(
                        log.timestamp
                      ).toLocaleTimeString([], {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>

                    <span
                      className={`break-words ${
                        log.text
                          .toLowerCase()
                          .includes("error") ||
                        log.text.includes("Failed")
                          ? "text-rose-400"
                          : log.text
                              .toLowerCase()
                              .includes("success")
                          ? "text-emerald-400"
                          : "text-zinc-300"
                      }`}
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Container logs */}
          <section className="flex flex-col h-[420px] xl:h-[480px] bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-400" />

                  <span className="text-sm font-semibold text-white">
                    Container Logs
                  </span>
                </div>

                <Select
                  value={selectedService}
                  onValueChange={
                    setSelectedService
                  }
                >
                  <SelectTrigger className="w-[145px] h-8 bg-white/5 border-white/10 text-xs focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="bg-zinc-900 border-white/10">
                    {services.map((service) => (
                      <SelectItem
                        key={service.id}
                        value={service.id}
                        className="text-xs focus:bg-white/10"
                      >
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-600 hover:text-white"
                onClick={() =>
                  setContainerLogs("")
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div
              ref={containerLogsRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-zinc-400 scrollbar-thin scrollbar-thumb-white/10"
            >
              {containerLogs ||
                "No logs available for this service."}
            </div>
          </section>
        </div>

        {/* Command history */}
        <section className="flex flex-col h-[360px] bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-400" />

              <span className="text-sm font-semibold text-white">
                System Command History
              </span>

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-600 hover:text-white"
              onClick={() =>
                setCommandHistory(null)
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={commandHistoryRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
          >
            {allHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 italic">
                Waiting for history...
              </div>
            ) : (
              allHistory.map((entry, idx) => (
                <div
                  key={`${entry.timestamp}-${idx}`}
                  className="flex gap-3 hover:bg-white/5 px-2 py-1 rounded transition-colors"
                >
                  <span className="text-zinc-600 shrink-0 select-none">
                    {new Date(
                      entry.timestamp
                    ).toLocaleTimeString([], {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>

                  <span className="break-words text-zinc-300">
                    {entry.command}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Token dialog                                                        */}
      {/* ------------------------------------------------------------------ */}

      <Dialog
        open={isTokenModalOpen}
        onOpenChange={setIsTokenModalOpen}
      >
        <DialogContent className="bg-zinc-950 border border-white/10 text-zinc-300 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              Auth Configuration
            </DialogTitle>

            <DialogDescription className="text-zinc-500">
              Enter your deployment server token.
              This is used for authentication and
              will only be stored for this browser
              session.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="token"
                className="text-sm font-medium text-zinc-400"
              >
                X-Deploy-Token
              </label>

              <div className="relative">
                <Input
                  id="token"
                  type="password"
                  placeholder="Enter deployment token..."
                  value={tempToken}
                  onChange={(e) =>
                    setTempToken(e.target.value)
                  }
                  className="bg-white/5 border-white/10 focus:border-indigo-500/50 pr-10 h-11"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveToken();
                    }
                  }}
                />

                <div className="absolute right-3 top-3.5 text-zinc-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button
              variant="ghost"
              onClick={() =>
                setIsTokenModalOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              onClick={saveToken}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Scrollbar                                                           */}
      {/* ------------------------------------------------------------------ */}

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}