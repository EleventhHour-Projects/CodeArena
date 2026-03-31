"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Server, Activity, Zap, Clock, Code, PlusCircle, StopCircle,
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Cpu, MemoryStick,
  Container, BarChart3, ToggleLeft, ToggleRight, ExternalLink,
} from "lucide-react";
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

  const fetchAll = useCallback(async () => {
    try {
      const [infoRes, usageRes, autoRes] = await Promise.all([
        fetch("/api/admin/executor-info"),
        fetch("/api/admin/executor/usage"),
        fetch("/api/admin/executor/auto"),
      ]);
      if (infoRes.ok) setInfo(await infoRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
      if (autoRes.ok) { const d = await autoRes.json(); setIsAuto(d.auto); }
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

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
                        className={`relative rounded-2xl border p-6 transition-all group/worker ${
                          isRunning
                            ? "bg-card/80 border-border/60 hover:border-indigo-500/30"
                            : "bg-zinc-950 border-zinc-800/60 opacity-70"
                        }`}
                      >
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
                            <div className={`h-2 w-2 rounded-full shrink-0 ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                            <h4 className="font-bold text-sm truncate">
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

      {/* ── METRICS IFRAME DIALOG ───────────────────────────── */}
      <Dialog open={showMetrics} onOpenChange={setShowMetrics}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 overflow-hidden bg-zinc-950 border-zinc-800">
          <DialogHeader className="px-5 py-3 border-b border-zinc-800 flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              Performance Metrics
            </DialogTitle>
            <Button
              size="sm" variant="ghost"
              onClick={() => window.open("/api/admin/executor/metrics", "_blank")}
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in tab
            </Button>
          </DialogHeader>
          <iframe
            src="/api/admin/executor/metrics"
            className="w-full h-full border-0"
            title="Executor Metrics"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
