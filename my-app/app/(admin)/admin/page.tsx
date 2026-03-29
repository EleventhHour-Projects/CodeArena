"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Swords, Activity, Server, Clock, LogOut, Code, PlusCircle, Shield, Flag, GitPullRequest, Zap
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

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalBattles: number;
  topUsers: any[];
  recentBattles: any[];
};

type ExecutorInfo = {
  active_worker: number;
  average_time_to_execute_task_inSec: number;
  total_active_time: string;
  total_tasks: number;
  total_time_to_execute_task_inSec: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [executorInfo, setExecutorInfo] = useState<ExecutorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuto, setIsAuto] = useState<boolean>(false);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [showAutoWarning, setShowAutoWarning] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, execRes, autoRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/executor-info"),
        fetch("/api/admin/executor/auto")
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (execRes.ok) setExecutorInfo(await execRes.json());
      if (autoRes.ok) {
        const data = await autoRes.json();
        setIsAuto(data.auto);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const handleSpawnWorker = async () => {
    if (isAuto) {
      toast.error("Manual spawn disabled. Please turn OFF Auto Scale first.");
      return;
    }
    try {
      const res = await fetch("/api/admin/executor/spawn", { method: "POST" });
      if (res.ok) {
        toast.success("Worker spawned successfully");
        fetchData();
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
        fetchData();
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
    <div className="min-h-screen bg-background text-foreground px-6 py-10 selection:bg-primary/30 transition-colors">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest mb-2">
              <Shield className="h-4 w-4" />
              Admin Control
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => router.push("/admin/add")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex gap-2 font-medium"
            >
              <PlusCircle className="h-4 w-4" />
              Add Problem
            </Button>

            <Button
              onClick={() => router.push("/admin/testproblem")}
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground flex gap-2 font-medium"
            >
              <Code className="h-4 w-4" />
              Test Problem
            </Button>

            <Button
              onClick={() => router.push("/admin/reports")}
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground flex gap-2 font-medium"
            >
              <Flag className="h-4 w-4" />
              Reports
            </Button>

            <Button
              onClick={() => router.push("/admin/prs")}
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground flex gap-2 font-medium"
            >
              <GitPullRequest className="h-4 w-4" />
              Pull Requests
            </Button>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* HERO STAT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="relative overflow-hidden rounded-3xl p-10 border border-border bg-card group">
            <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-3xl group-hover:opacity-20 transition-opacity" />

            <div className="relative z-10">
              <p className="text-muted-foreground mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Total Users
              </p>
              <h1 className="text-5xl font-bold tracking-tight">
                {loading ? "..." : stats?.totalUsers?.toLocaleString()}
              </h1>
              <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live platform growth
              </div>
            </div>
          </div>
        </motion.div>

        {/* SECONDARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {[
            { label: "Active Users", value: stats?.activeUsers, icon: Activity, sub: "Last 5 mins" },
            { label: "Battles Played", value: stats?.totalBattles, icon: Swords, sub: "All time" }
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group bg-card border border-border rounded-2xl p-6 transition-all hover:border-border/80"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">{item.label}</p>
                  <h2 className="text-3xl font-semibold">
                    {loading ? "..." : item.value}
                  </h2>
                  <p className="text-[10px] text-muted-foreground/60 uppercase mt-1 tracking-tighter">{item.sub}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition">
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

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
          className="bg-muted/20 border border-border rounded-3xl p-8 backdrop-blur"
        >
          {/* header */}
          <div className="flex justify-between items-center mb-10 pb-4 border-b border-border/20">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Server className="h-4 w-4" />
              <h2 className="text-md font-bold uppercase tracking-widest italic">
                Cluster Monitor
              </h2>
            </div>

            <div className="flex items-center gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <Stat label="Workers" value={executorInfo.active_worker} icon={Activity} />
              <Stat label="Tasks" value={executorInfo.total_tasks} icon={Code} />
              <Stat label="Avg Time" value={`${executorInfo.average_time_to_execute_task_inSec.toFixed(2)}s`} icon={Clock} />
              <Stat label="Total Time" value={`${executorInfo.total_time_to_execute_task_inSec.toFixed(2)}s`} icon={Clock} />
              <Stat label="Cluster Uptime" value={executorInfo.total_active_time} icon={Activity} />
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
            <DialogDescription className="text-center text-zinc-400">
              Worker Auto-Scaling is currently in <b className="text-amber-500/80">Beta</b>. It relies on a 10-second polling window to spawn or stop workers based on traffic volume.
              <br /><br />
              Using this in production may lead to unstable worker counts. Do you wish to proceed?
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
function Stat({ label, value, icon: Icon }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition">
      <div className="flex justify-between items-center mb-3">
        <p className="text-zinc-500 text-xs uppercase tracking-wider">
          {label}
        </p>
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <h3 className="text-xl font-semibold">{value}</h3>
    </div>
  );
}