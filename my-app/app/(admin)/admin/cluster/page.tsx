"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Server, Activity, Zap, Clock, Code, PlusCircle, StopCircle,
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Cpu, MemoryStick,
  Container, BarChart3, ToggleLeft, ToggleRight, ExternalLink,
  ActivitySquare, TrendingUp, History,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ResponsiveContainer as RC,
} from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ─── Types ─────────────────────────────────────────────── */
type WorkerDetail = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  cpu_usage: number;
  online_cpus: number;
  memory_usage: number;
  memory_limit: number;
  created_at: number;      // unix seconds
  started_at: string;      // RFC3339
  restart_count: number;
  pid: number;
  network_mode: string;
  ports: string;
  network_rx_mb: number;
  network_tx_mb: number;
};

type ExecutorInfo = {
  active_worker: number;
  average_time_to_execute_task_inSec: number;
  total_active_time: string;
  total_tasks: number;
  total_time_to_execute_task_inSec: number;
  worker_details?: WorkerDetail[];
};

type UsageInfo = {
  cpu_usage?: string;
  memory_usage?: string;
  numeric_cpu?: number;
  numeric_memory?: number;
};

type HistoryPoint = {
  time: string;
  cpu: number;
  memory: number;
  tasks: number;
};

/* ─── Helpers ────────────────────────────────────────────── */
const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatUptime = (s: string) =>
  s.replace(/(\d+)\.\d+s/, "$1s").replace(/(\d+[hms])/g, "$1 ").trim();

function relativeTime(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return "—"; }
}

function usageColor(pct: number) {
  if (pct >= 80) return { label: "text-rose-400", bar: "from-rose-500/80 to-rose-400", glow: "shadow-[0_0_10px_rgba(244,63,94,0.25)]", bg: "bg-rose-400/10 border-rose-400/20", dot: "bg-rose-400" };
  if (pct >= 50) return { label: "text-amber-400", bar: "from-amber-500/80 to-amber-400", glow: "shadow-[0_0_10px_rgba(251,191,36,0.2)]", bg: "bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400" };
  return { label: "text-emerald-400", bar: "from-emerald-500/80 to-emerald-400", glow: "shadow-[0_0_10px_rgba(52,211,153,0.2)]", bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" };
}

/* ─── Sub-components ─────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color = "text-foreground", sub }: {
  label: string; value: string | number; icon: React.ElementType; color?: string; sub?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition group">
      <div className="flex justify-between items-start mb-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</p>
        <Icon className={`h-4 w-4 ${color} opacity-60 group-hover:opacity-100 transition`} />
      </div>
      <h3 className={`text-xl font-semibold ${color} truncate`}>{value}</h3>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ label, value, pct, sub }: { label: string; value: string; pct: number; sub?: string }) {
  const c = usageColor(pct);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">{label}</span>
        <span className={`text-sm font-mono font-bold ${c.label}`}>{value}</span>
      </div>
      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${c.bar} rounded-full ${c.glow}`}
        />
      </div>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function ClusterPage() {
  const [info, setInfo] = useState<ExecutorInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo>({});
  const [isAuto, setIsAuto] = useState(false);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [showAutoWarning, setShowAutoWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const parseUsage = useCallback((val: string | undefined) => {
    if (!val) return 0;
    return parseFloat(val.replace(/[^\d.]/g, '')) || 0;
  }, []);

  const curCpu = usage.numeric_cpu ?? parseUsage(usage.cpu_usage);
  const curMem = usage.numeric_memory ?? parseUsage(usage.memory_usage);

  const fetchAll = useCallback(async () => {
    try {
      const [infoRes, usageRes, autoRes] = await Promise.all([
        fetch("/api/admin/executor-info"),
        fetch("/api/admin/executor/usage"),
        fetch("/api/admin/executor/auto"),
      ]);
      const infoData = infoRes.ok ? await infoRes.json() : null;
      const usageData = usageRes.ok ? await usageRes.json() : {};
      const autoData = autoRes.ok ? await autoRes.json() : null;

      if (infoData) setInfo(infoData);
      if (usageData) setUsage(usageData);
      if (autoData) setIsAuto(autoData.auto);

      // Update history buffer
      const numericCpu = usageData.numeric_cpu ?? parseUsage(usageData.cpu_usage);
      const numericMem = usageData.numeric_memory ?? parseUsage(usageData.memory_usage);

      setHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: numericCpu,
          memory: numericMem,
          tasks: infoData?.total_tasks || 0,
        };
        const next = [...prev, newPoint];
        return next.slice(-30); // Keep last 30 points (approx 2 mins)
      });

      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [parseUsage]);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 4000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const spawn = async () => {
    if (isAuto) { toast.error("Disable Auto Scale first"); return; }
    const res = await fetch("/api/admin/executor/spawn", { method: "POST" });
    res.ok ? toast.success("Worker spawned") : toast.error("Failed to spawn worker");
    fetchAll();
  };

  const stop = async () => {
    if (isAuto) { toast.error("Disable Auto Scale first"); return; }
    const res = await fetch("/api/admin/executor/stop", { method: "POST" });
    res.ok ? toast.success("Stop signal sent") : toast.error("Failed to stop worker");
    fetchAll();
  };

  const toggleAuto = () => { if (!isAuto) setShowAutoWarning(true); else confirmAuto(false); };

  const confirmAuto = async (val: boolean) => {
    setIsAutoLoading(true);
    setShowAutoWarning(false);
    const res = await fetch("/api/admin/executor/auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto: val }),
    });
    if (res.ok) { setIsAuto(val); toast.success(`Auto scale ${val ? "enabled" : "disabled"}`); }
    else toast.error("Failed to update auto scale");
    setIsAutoLoading(false);
  };

  /* ─── Derived data ──────────────────────────────────────── */
  const workers = info?.worker_details ?? [];
  const runningWorkers = workers.filter(w => w.state === "running");
  const stoppedWorkers = workers.filter(w => w.state !== "running");

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest mb-2">
                <Container className="h-3.5 w-3.5" />
                Admin · Cluster
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Cluster Monitor</h1>
              {lastUpdated && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Last updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Live badge */}
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold px-3 py-1.5 bg-emerald-400/5 border border-emerald-400/10 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live · 4s
              </div>

              <Button
                size="sm" variant="outline"
                onClick={fetchAll}
                className="h-8 border-border text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>

              <Button
                size="sm" variant="outline"
                onClick={() => setShowMetrics(true)}
                className="h-8 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 gap-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5" /> Metrics
              </Button>

              {/* Auto Scale toggle */}
              <button
                onClick={!isAutoLoading ? toggleAuto : undefined}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
                  isAuto
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {isAuto ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                <span className="text-xs font-bold uppercase tracking-tight">Auto Scale</span>
                {isAutoLoading && <div className="h-3 w-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
              </button>

              {/* Spawn / Stop */}
              <Button
                size="sm" variant="outline"
                onClick={spawn}
                disabled={isAuto}
                className={`h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5 ${isAuto ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                <PlusCircle className="h-3.5 w-3.5" /> Spawn
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={stop}
                disabled={isAuto}
                className={`h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1.5 ${isAuto ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                <StopCircle className="h-3.5 w-3.5" /> Stop
              </Button>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground">
            <div className="h-6 w-6 border-2 border-border border-t-primary rounded-full animate-spin mr-3" />
            Connecting to executor...
          </div>
        ) : !info ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
            <XCircle className="h-10 w-10 text-rose-400/40" />
            <p className="font-medium">Executor unreachable</p>
            <p className="text-sm">The executor service at :6969 is not responding.</p>
          </div>
        ) : (
          <>
            {/* ── TOP STATS GRID ──────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
            >
              <StatCard label="Workers" value={info.active_worker} icon={Server} color="text-indigo-400" />
              <StatCard label="Running" value={runningWorkers.length} icon={CheckCircle} color="text-emerald-400" />
              <StatCard label="Stopped" value={stoppedWorkers.length} icon={XCircle} color={stoppedWorkers.length > 0 ? "text-rose-400" : "text-zinc-500"} />
              <StatCard label="Tasks Done" value={info.total_tasks.toLocaleString()} icon={Code} color="text-purple-400" />
              <StatCard label="Avg Time" value={`${info.average_time_to_execute_task_inSec.toFixed(2)}s`} icon={Clock} color="text-amber-400" sub="per task" />
              <StatCard label="CPU" value={usage.cpu_usage || "N/A"} icon={Cpu} color="text-orange-400" />
              <StatCard label="Memory" value={usage.memory_usage || "N/A"} icon={MemoryStick} color="text-teal-400" />
            </motion.div>

            {/* ── SECONDARY STATS ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Uptime */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Total Uptime</p>
                <p className="text-2xl font-bold font-mono text-foreground">{formatUptime(info.total_active_time)}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">since executor start</p>
              </div>

              {/* Total execution time */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Total Exec Time</p>
                <p className="text-2xl font-bold font-mono text-foreground">{info.total_time_to_execute_task_inSec.toFixed(2)}s</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">sum of all task durations</p>
              </div>

              {/* Auto Scale status */}
              <div className={`border rounded-2xl p-5 flex items-center gap-4 transition-all ${isAuto ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${isAuto ? "bg-primary/20" : "bg-muted"}`}>
                  <Zap className={`h-6 w-6 ${isAuto ? "text-primary" : "text-zinc-500"}`} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Auto Scale</p>
                  <p className={`text-lg font-bold ${isAuto ? "text-primary" : "text-zinc-500"}`}>
                    {isAuto ? "Enabled" : "Disabled"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {isAuto ? "System manages workers dynamically" : "Manual control active"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ── WORKER CARDS ────────────────────────────────── */}
            {workers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Active Worker Instances ({workers.length})
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {workers.map((worker, i) => {
                    const cpuPct = Math.min(worker.cpu_usage * 2, 100);
                    const memPct = (worker.memory_usage / worker.memory_limit) * 100;
                    const cpuC = usageColor(cpuPct);
                    const memC = usageColor(memPct);
                    const isRunning = worker.state === "running";

                    return (
                      <motion.div
                        key={worker.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className={`relative rounded-3xl border p-6 transition-all duration-500 group/worker ${
                          isRunning
                            ? "bg-[#09090b] border-white/5 hover:border-indigo-500/40 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_-10px_rgba(99,102,241,0.1)]"
                            : "bg-zinc-950 border-zinc-800/60 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                        }`}
                      >
                        {/* Pulse effect for active cards */}
                        {isRunning && (
                          <div className="absolute inset-0 rounded-3xl border border-indigo-500/0 group-hover:border-indigo-500/10 transition-colors pointer-events-none" />
                        )}
                        {/* State badge */}
                        <div className="absolute top-4 right-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            isRunning
                              ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5"
                              : "text-zinc-500 border-zinc-800 bg-zinc-900"
                          }`}>
                            {worker.state.toUpperCase()}
                          </span>
                        </div>

                        {/* Identity */}
                        <div className="mb-5 pr-16">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="relative">
                              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isRunning ? "bg-emerald-400" : "bg-zinc-600"}`} />
                              {isRunning && (
                                <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                              )}
                            </div>
                            <h4 className="font-bold text-sm truncate text-zinc-100 group-hover/worker:text-white transition-colors">
                              {worker.name.replace(/^\//, "")}
                            </h4>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono truncate pl-4">
                            {worker.id.substring(0, 24)}…
                          </p>
                          <p className="text-[11px] text-muted-foreground/60 pl-4 mt-0.5 truncate">
                            {worker.image}
                          </p>
                        </div>

                        {/* Usage bars */}
                        <div className="space-y-4">
                          <ProgressBar
                            label="CPU Load"
                            value={`${worker.cpu_usage.toFixed(1)}%`}
                            pct={cpuPct}
                          />
                          <ProgressBar
                            label="Memory"
                            value={formatBytes(worker.memory_usage)}
                            pct={memPct}
                            sub={`/ ${formatBytes(worker.memory_limit)}`}
                          />
                        </div>

                        {/* Metadata grid */}
                        <div className="mt-5 pt-4 border-t border-border/20 grid grid-cols-2 gap-x-4 gap-y-3">
                          {[
                            { label: "CPU Cores",    value: worker.online_cpus ? `${worker.online_cpus} vCPU` : "—" },
                            { label: "PID",          value: worker.pid ? String(worker.pid) : "—" },
                            { label: "Network",      value: worker.network_mode || "—" },
                            { label: "Ports",        value: worker.ports || "none" },
                            { label: "Net Rx",       value: worker.network_rx_mb != null ? `${worker.network_rx_mb.toFixed(2)} MB` : "—" },
                            { label: "Net Tx",       value: worker.network_tx_mb != null ? `${worker.network_tx_mb.toFixed(2)} MB` : "—" },
                            { label: "Started",      value: relativeTime(worker.started_at) },
                            { label: "Restarts",     value: worker.restart_count != null ? String(worker.restart_count) : "0" },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">{label}</p>
                              <p className="text-[11px] font-mono text-foreground/80 truncate mt-0.5">{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Full ID */}
                        <div className="mt-3 pt-3 border-t border-border/10">
                          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mb-0.5">Container ID</p>
                          <p className="text-[10px] font-mono text-muted-foreground/50 break-all leading-relaxed">{worker.id}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── NO WORKERS ──────────────────────────────────── */}
            {workers.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground border border-dashed border-border rounded-2xl"
              >
                <Server className="h-10 w-10 opacity-20" />
                <p className="font-medium">No workers running</p>
                <p className="text-sm">Spawn a worker using the button above.</p>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ── AUTO SCALE WARNING DIALOG ───────────────────────── */}
      <Dialog open={showAutoWarning} onOpenChange={setShowAutoWarning}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800">
          <DialogHeader className="flex flex-col items-center gap-3 py-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">Enable Auto Scale?</DialogTitle>
            <DialogDescription asChild>
              <div className="text-left text-zinc-400 space-y-3 text-sm">
                <p>Auto Scale dynamically manages worker count based on traffic:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs">
                  <li><b>Traffic-based:</b> Scales 1–10 workers based on task volume per 10s window.</li>
                  <li><b>Resource protection:</b> Workers with &gt;80% CPU/Memory for 10+ minutes are replaced.</li>
                  <li><b>Efficiency:</b> Ramps down workers when traffic drops.</li>
                </ul>
                <p className="text-amber-500/80 font-medium pt-1">
                  Manual Spawn/Stop will be disabled while Auto Scale is active.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setShowAutoWarning(false)} className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 px-8">
              Cancel
            </Button>
            <Button onClick={() => confirmAuto(true)} className="bg-amber-500 text-black hover:bg-amber-400 font-bold px-8 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              Enable Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── METRICS DASHBOARD DIALOG ────────────────────────── */}
      <Dialog open={showMetrics} onOpenChange={setShowMetrics}>
        <DialogContent className="sm:max-w-[90vw] w-[95vw] h-[90vh] p-0 overflow-hidden bg-[#0a0a0a] border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <DialogHeader className="px-6 py-4 border-b border-white/5 flex flex-row items-center justify-between bg-zinc-900/30 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <ActivitySquare className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold tracking-tight text-zinc-100">Executor Analytics</DialogTitle>
                <p className="text-[10px] text-zinc-500 font-medium">Real-time performance telemetry</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Live Stream</span>
              </div>
              <Button
                size="sm" variant="ghost"
                onClick={() => window.open("/api/admin/executor/metrics", "_blank")}
                className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent hover:border-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Raw
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Top Cards in Modal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Cpu className="h-12 w-12 text-orange-500" />
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">Current CPU</p>
                <h2 className="text-3xl font-black text-white font-mono tracking-tighter">{usage.cpu_usage || "0%"}</h2>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${curCpu || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-orange-500/80 font-bold">LOAD</span>
                </div>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <MemoryStick className="h-12 w-12 text-teal-500" />
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">Memory Pool</p>
                <h2 className="text-3xl font-black text-white font-mono tracking-tighter">{usage.memory_usage || "0%"}</h2>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${curMem || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-teal-500/80 font-bold">USED</span>
                </div>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="h-12 w-12 text-indigo-500" />
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">Total Workers</p>
                <h2 className="text-3xl font-black text-white font-mono tracking-tighter">{info?.active_worker || 0}</h2>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className="text-emerald-500 font-bold">{runningWorkers.length} Active</span>
                  <span>•</span>
                  <span>{stoppedWorkers.length} Terminated</span>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <ActivitySquare className="h-4 w-4 text-orange-400" />
                    <h3 className="text-sm font-bold text-zinc-200">CPU Load History</h3>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-orange-500" /> CPU %
                    </div>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525b', fontSize: 9 }}
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525b', fontSize: 9 }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px' }}
                        itemStyle={{ color: '#f97316' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        stroke="#f97316"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#cpuGradient)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-teal-400" />
                    <h3 className="text-sm font-bold text-zinc-200">Memory Allocation</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                    <div className="h-2 w-2 rounded-full bg-teal-500" /> Memory %
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525b', fontSize: 9 }}
                        minTickGap={30}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525b', fontSize: 9 }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px' }}
                        itemStyle={{ color: '#14b8a6' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="memory"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#memGradient)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
