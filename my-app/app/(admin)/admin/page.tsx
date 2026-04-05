"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Users, Swords, Activity, Server, Clock, Shield, Zap, Code, PlusCircle, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalBattles: number;
  topUsers: any[];
  recentBattles: any[];
  growthTrend: { date: string; users: number }[];
};

type WorkerDetail = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  cpu_usage: number;
  memory_usage: number;
  memory_limit: number;
};

type ExecutorInfo = {
  active_worker: number;
  average_time_to_execute_task_inSec: number;
  total_active_time: string;
  total_tasks: number;
  total_time_to_execute_task_inSec: number;
  worker_details?: WorkerDetail[];
  cpu_usage?: string;
  memory_usage?: string;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [executorInfo, setExecutorInfo] = useState<ExecutorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuto, setIsAuto] = useState<boolean>(false);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [showAutoWarning, setShowAutoWarning] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("7d");

  const fetchData = async (p: string) => {
    try {
      const [statsRes, execRes, autoRes, usageRes] = await Promise.all([
        fetch(`/api/admin/stats?period=${p}`),
        fetch("/api/admin/executor-info"),
        fetch("/api/admin/executor/auto"),
        fetch("/api/admin/executor/usage")
      ]);

      if (statsRes.ok) setStats(await statsRes.json());

      let executorData = {};
      if (execRes.ok) executorData = await execRes.json();
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        executorData = { ...executorData, ...usageData };
      }
      if (Object.keys(executorData).length > 0) setExecutorInfo(executorData as ExecutorInfo);

      if (autoRes.ok) {
        const data = await autoRes.json();
        setIsAuto(data.auto);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedPeriod);
    const interval = setInterval(() => fetchData(selectedPeriod), 5000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const handleSpawnWorker = async () => {
    if (isAuto) {
      toast.error("Manual spawn disabled. Please turn OFF Auto Scale first.");
      return;
    }
    try {
      const res = await fetch("/api/admin/executor/spawn", { method: "POST" });
      if (res.ok) {
        toast.success("Worker spawned successfully");
        fetchData(selectedPeriod);
      } else {
        toast.error("Failed to spawn worker");
      }
    } catch (err) {
      toast.error("An error occurred while spawning worker");
    }
  };

  const handleStopWorker = async () => {
    if (isAuto) {
      toast.error("Manual stop disabled. Please turn OFF Auto Scale first.");
      return;
    }
    try {
      const res = await fetch("/api/admin/executor/stop", { method: "POST" });
      if (res.ok) {
        toast.success("Worker stop signal sent");
        fetchData(selectedPeriod);
      } else {
        toast.error("Failed to stop worker");
      }
    } catch (err) {
      toast.error("An error occurred while stopping worker");
    }
  };

  const handleToggleAuto = () => {
    if (!isAuto) {
      setShowAutoWarning(true);
    } else {
      confirmToggleAuto(false);
    }
  };

  const confirmToggleAuto = async (targetState: boolean) => {
    setIsAutoLoading(true);
    setShowAutoWarning(false);
    try {
      const res = await fetch("/api/admin/executor/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto: targetState })
      });
      if (res.ok) {
        setIsAuto(targetState);
        toast.success(`Auto scale ${targetState ? "enabled" : "disabled"}`);
      } else {
        toast.error("Failed to update auto scale status");
      }
    } catch (err) {
      toast.error("An error occurred while updating auto scale status");
    } finally {
      setIsAutoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-6 sm:py-10 selection:bg-primary/30 transition-colors overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">

        {/* HEADER */}
        <div className="flex items-center gap-2 mb-12">
          <h1 className="text-3xl font-semibold tracking-tight">
            Dashboard
          </h1>
        </div>

        {/* HERO STAT (Redesigned) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-sm group shadow-2xl">
            {/* dynamic accents */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none group-hover:bg-primary/15 transition-all duration-1000" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2">

              {/* LEFT COLUMN: Main Stats */}
              <div className="p-8 md:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/40">
                <div>
                  <div className="flex items-center gap-2 mb-8">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">Total User</span>
                    <div className="ml-auto flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold px-2.5 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </div>
                  </div>

                  <h1 className="text-6xl md:text-8xl font-black tracking-tighter tabular-nums text-foreground mb-4 bg-gradient-to-br from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
                    {loading ? <span className="opacity-20 animate-pulse">---</span> : stats?.totalUsers?.toLocaleString()}
                  </h1>

                  <div className="flex flex-wrap gap-3 mt-8">
                    <div className="flex items-center gap-3 bg-muted/30 px-4 py-2.5 rounded-2xl border border-border/40">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Online</span>
                      <span className="text-sm font-bold tabular-nums text-emerald-400 ml-1">{loading ? "—" : stats?.activeUsers}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/30 px-4 py-2.5 rounded-2xl border border-border/40">
                      <div className="h-2 w-2 rounded-full bg-indigo-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Battle played</span>
                      <span className="text-sm font-bold tabular-nums text-indigo-400 ml-1">{loading ? "—" : stats?.totalBattles}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Graph & Insight */}
              <div className="p-8 md:p-10 flex flex-col justify-between bg-muted/5">
                <div className="flex-1 min-h-[180px] w-full relative">
                  <div className="absolute inset-0 flex flex-col">
                    <div className="flex justify-between gap-4 mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest leading-none mb-1">Growth Trend</span>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {(() => {
                            if (!stats?.growthTrend || stats.growthTrend.length < 2) return "---";
                            const first = stats.growthTrend[0].users;
                            const last = stats.growthTrend[stats.growthTrend.length - 1].users;
                            if (first === 0) return `+${last} users`;
                            const pct = ((last - first) / first) * 100;
                            const sign = pct >= 0 ? "+" : "";
                            const periodLabel = selectedPeriod === "7d" ? "this week" : selectedPeriod === "30d" ? "this month" : "overall";
                            return `${sign}${pct.toFixed(1)}% ${periodLabel}`;
                          })()}
                        </span>
                      </div>

                      {/* Period Selector */}
                      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg self-start">
                        {[
                          { label: "7D", value: "7d" },
                          { label: "30D", value: "30d" },
                          { label: "All", value: "all" },
                        ].map((p) => (
                          <button
                            key={p.value}
                            onClick={() => setSelectedPeriod(p.value)}
                            className={`px-3 py-1 text-[9px] font-black rounded-md transition-all ${selectedPeriod === p.value
                                ? "bg-white text-black shadow-lg"
                                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                              }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats?.growthTrend?.map(item => {
                          const d = new Date(item.date);
                          let label = format(d, "EEE"); // default Mon, Tue
                          if (selectedPeriod === '30d') label = format(d, "dd"); // 15, 18
                          if (selectedPeriod === 'all') label = format(d, "MMM"); // Jan, Feb

                          return {
                            date: format(d, "MMM dd, yyyy"),
                            displayDate: label,
                            users: item.users
                          };
                        }) || []}>
                          <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="displayDate"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#71717a' }}
                            dy={10}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#09090b',
                              borderColor: '#27272a',
                              borderRadius: '12px',
                              fontSize: '11px',
                              padding: '8px 12px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                            labelStyle={{ color: '#71717a', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}
                            labelFormatter={(label, payload) => payload[0]?.payload?.date || label}
                            formatter={(value: any) => [
                              `${(value || 0).toLocaleString()} Users`,
                              "Count"
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="users"
                            stroke="var(--primary)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorUsers)"
                            animationDuration={2000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-border/40 flex items-center justify-between">
                  <div className="max-w-[240px]">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Platform user base is expanding steadily with a focus on competitive retention and battle frequency.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-tighter">
                    Analytical View <Zap className="h-3 w-3 fill-primary/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>





        {/* DATA GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Top Performers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1 bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 tracking-tight">
                <Swords className="h-4 w-4 text-indigo-400" /> TOP PERFORMERS
              </h3>
            </div>
            <div className="p-2">
              {stats?.topUsers?.length ? stats.topUsers.map((u, i) => (
                <div key={u.username} className="flex items-center justify-between p-3 hover:bg-muted rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground/60 w-3">{i + 1}</span>
                    <img src={u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="h-7 w-7 rounded-full border border-border" alt="" />
                    <span className="font-medium text-sm truncate">{u.username}</span>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <span className="text-sm font-bold text-indigo-400">{u.rating}</span>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-zinc-600 text-xs italic">No players ranked</div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 tracking-tight">
                <Activity className="h-4 w-4 text-emerald-400" /> RECENT ACTIVITY
              </h3>
            </div>
            <div className="p-2 overflow-x-auto">
              {stats?.recentBattles?.length ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] text-zinc-500 uppercase tracking-widest text-left">
                      <th className="p-4 font-bold">Battle</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentBattles.map((b: any) => (
                      <tr key={b._id} className="border-t border-border/40 hover:bg-muted transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-foreground/90">
                              {b.player1?.username} <span className="text-muted-foreground/60 italic px-1">vs</span> {b.player2?.username}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${b.status === 'Active' ? 'text-primary border-primary/20 bg-primary/5' : 'text-muted-foreground border-border bg-muted/20'}`}>
                            {b.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-[10px] text-muted-foreground font-mono text-right">
                          {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-muted-foreground text-sm italic">Waiting for battle records...</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* EXECUTOR PANEL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/20 border border-border rounded-3xl p-5 md:p-8 backdrop-blur overflow-x-hidden"
          >
          {/* header */}
          <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-center gap-6 mb-10 pb-4 border-b border-border/20">
            <div className="flex items-center gap-3 text-muted-foreground mr-auto">
              <Server className="h-4 w-4" />
              <h2 className="text-md font-bold uppercase tracking-widest italic">
                Cluster Monitor
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={() => window.open("/api/admin/executor/metrics", "_blank")}
                size="sm"
                variant="outline"
                className="h-8 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
              >
                <Activity className="h-3.5 w-3.5 mr-1.5" />
                Performance Metrics
              </Button>
              {/* Premium Auto Scale Toggle */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-2 pl-4 pr-3 transition-all hover:border-primary/20 group/auto"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg transition-colors ${isAuto ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" : "bg-zinc-800 text-zinc-500"}`}>
                      <Zap className={`h-3.5 w-3.5 ${isAuto ? "fill-primary/20" : ""}`} />
                    </div>
                    <span className="text-[11px] font-bold tracking-tight uppercase text-zinc-300 group-hover/auto:text-foreground transition-colors">
                      Auto Scale
                    </span>
                  </div>
                </div>

                <div
                  onClick={!isAutoLoading ? handleToggleAuto : undefined}
                  className={`relative w-11 h-6 rounded-full cursor-pointer transition-all duration-300 ${isAuto ? "bg-primary/20 border-primary/30" : "bg-zinc-800 border-zinc-700"} border p-0.5 overflow-hidden active:scale-95`}
                >
                  <motion.div
                    animate={{
                      x: isAuto ? 20 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-4.5 h-4.5 aspect-square rounded-full flex items-center justify-center shadow-lg transition-colors ${isAuto ? "bg-primary" : "bg-zinc-500"}`}
                  >
                    {isAutoLoading ? (
                      <div className="w-2.5 h-2.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <div className={`w-1.5 h-1.5 rounded-full ${isAuto ? "bg-white/80" : "bg-zinc-800/40"}`} />
                    )}
                  </motion.div>
                </div>
              </motion.div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSpawnWorker}
                  size="sm"
                  variant="outline"
                  className={`h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 ${isAuto ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  Spawn
                </Button>
                <Button
                  onClick={handleStopWorker}
                  size="sm"
                  variant="outline"
                  className={`h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 ${isAuto ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5 rotate-90" />
                  Stop
                </Button>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 bg-emerald-400/5 border border-emerald-400/10 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
          </div>

          {/* grid */}
          {executorInfo ? (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
                <Stat label="Workers" value={executorInfo.active_worker} icon={Activity} />
                <Stat label="Tasks" value={executorInfo.total_tasks} icon={Code} />
                <Stat label="Avg Time" value={`${executorInfo.average_time_to_execute_task_inSec.toFixed(2)}s`} icon={Clock} />
                <Stat
                  label="Uptime"
                  value={executorInfo.total_active_time.replace(/(\d+)\.\d+s/, "$1s").replace(/(\d+[hms])/g, "$1 ").trim()}
                  icon={Activity}
                />
                <Stat label="CPU" value={executorInfo.cpu_usage || "N/A"} icon={Zap} color="text-amber-400" />
                <Stat label="Memory" value={executorInfo.memory_usage || "N/A"} icon={Server} color="text-emerald-400" />
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition flex flex-col justify-center">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Total Time</p>
                  <h3 className="text-lg font-semibold truncate">{executorInfo.total_time_to_execute_task_inSec.toFixed(2)}s</h3>
                </div>
              </div>

              {/* Workers Detail List */}
              {executorInfo.worker_details && executorInfo.worker_details.length > 0 && (
                <div className="pt-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                    <div className="h-1 w-8 bg-primary/40 rounded-full" />
                    Active Worker Instances
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {executorInfo.worker_details.map((worker) => (
                      <div key={worker.id} className="bg-card/50 border border-border/60 rounded-2xl p-6 hover:border-primary/30 transition-all group/worker">
                        <div className="flex justify-between items-start mb-6">
                          <div className="min-w-0">
                            <h4 className="text-base font-bold truncate pr-3">{worker.name.replace(/^\//, "")}</h4>
                            <p className="text-xs text-muted-foreground font-mono truncate tracking-tight">{worker.id.substring(0, 16)}</p>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${worker.state === 'running' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 'text-zinc-500 border-zinc-800 bg-zinc-900'}`}>
                            {worker.state.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-6">
                          {/* CPU */}
                          {(() => {
                            const cpu = Math.min(worker.cpu_usage * 2, 100);
                            const cpuColor = cpu >= 80
                              ? { label: "text-rose-400", bar: "from-rose-500/80 to-rose-400", glow: "shadow-[0_0_10px_rgba(244,63,94,0.25)]" }
                              : cpu >= 50
                                ? { label: "text-amber-400", bar: "from-amber-500/80 to-amber-400", glow: "shadow-[0_0_10px_rgba(251,191,36,0.2)]" }
                                : { label: "text-emerald-400", bar: "from-emerald-500/80 to-emerald-400", glow: "shadow-[0_0_10px_rgba(52,211,153,0.2)]" };
                            return (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">CPU Load</span>
                                  <span className={`text-sm font-mono font-bold ${cpuColor.label}`}>{worker.cpu_usage.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${cpu}%` }}
                                    className={`h-full bg-gradient-to-r ${cpuColor.bar} rounded-full ${cpuColor.glow}`}
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          {/* RAM */}
                          {(() => {
                            const memPct = (worker.memory_usage / worker.memory_limit) * 100;
                            const memColor = memPct >= 80
                              ? { label: "text-rose-400", bar: "from-rose-500/80 to-rose-400", glow: "shadow-[0_0_10px_rgba(244,63,94,0.25)]" }
                              : memPct >= 50
                                ? { label: "text-amber-400", bar: "from-amber-500/80 to-amber-400", glow: "shadow-[0_0_10px_rgba(251,191,36,0.2)]" }
                                : { label: "text-emerald-400", bar: "from-emerald-500/80 to-emerald-400", glow: "shadow-[0_0_10px_rgba(52,211,153,0.2)]" };
                            return (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Memory</span>
                                  <span className={`text-sm font-mono font-bold ${memColor.label}`}>
                                    {formatBytes(worker.memory_usage)}
                                    <span className="text-[10px] text-zinc-600 font-normal ml-1">/ {formatBytes(worker.memory_limit)}</span>
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${memPct}%` }}
                                    className={`h-full bg-gradient-to-r ${memColor.bar} rounded-full ${memColor.glow}`}
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          <div className="pt-2 flex items-center justify-between border-t border-border/20 mt-2">
                            <span className="text-xs text-zinc-500 font-medium">Status: <span className="text-zinc-300 ml-1">{worker.status}</span></span>
                            <Server className="h-4 w-4 text-zinc-700 group-hover/worker:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-zinc-500 text-center py-10">
              Loading executor data...
            </div>
          )}
        </motion.div>

      </div>

      <Dialog open={showAutoWarning} onOpenChange={setShowAutoWarning}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800">
          <DialogHeader className="flex flex-col items-center gap-3 py-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 transition-all animate-pulse">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">Experimental Feature</DialogTitle>
            <DialogDescription asChild>
              <div className="text-left text-zinc-400 space-y-4">
                <p>
                  Worker Auto-Scaling is an intelligent resource management system that dynamically adjusts your cluster size:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs">
                  <li>
                    <b>Traffic-Based Scaling:</b> The system monitors task volume in 10-second windows. It scales from 1 worker (low traffic) up to 10 workers (high traffic, &gt;180 tasks/period).
                  </li>
                  <li>
                    <b>Resource Protection:</b> An "Auto-Clean" routine runs regularly. If a worker maintains <b>&gt;80% CPU or Memory</b> usage over a 10-minute threshold, it is automatically retired and replaced.
                  </li>
                  <li>
                    <b>Efficiency:</b> When traffic drops, the system automatically ramps down excess workers to save resources.
                  </li>
                </ul>
                <p className="pt-2 text-amber-500/80 font-medium">
                  Note: Manual Spawn/Stop controls are disabled while Auto Scale is active.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAutoWarning(false)}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 px-8"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmToggleAuto(true)}
              className="bg-amber-500 text-black hover:bg-amber-400 font-bold px-8 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              Enable Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* reusable stat */
function Stat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition">
      <div className="flex justify-between items-center mb-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${color || "text-zinc-400"}`} />
      </div>
      <h3 className="text-xl font-semibold">{value}</h3>
    </div>
  );
}