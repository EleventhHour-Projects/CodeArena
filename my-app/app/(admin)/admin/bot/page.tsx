"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronLeft,
  CircleStop,
  Clock,
  Layers,
  Server,
  Swords,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BattleInstance {
  instance_id: number;
  bot_id: string;
  difficulty: string;
  started_at: string;
  elapsed_seconds: number;
  opponent_id?: string;
  opponent_name?: string;
}

interface LogEntry {
  instance_id: number;
  message: string;
  timestamp: string;
}

interface BotStatus {
  total_active_battles: number;
  instances: BattleInstance[];
}

interface PoolEntry {
  bot_id: string;
  active_battles: number;
  available: boolean;
}

interface PoolStatus {
  pool: PoolEntry[];
  total_bots: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const DIFF_STYLE: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  hard: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BotManagementPage() {
  const [difficulty, setDifficulty] = useState("medium");
  const [autoSpawnEasy, setAutoSpawnEasy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [botLogs, setBotLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<number | null>(null); // null = All/System
  const [status, setStatus] = useState<BotStatus>({ total_active_battles: 0, instances: [] });
  const [pool, setPool] = useState<PoolStatus>({ pool: [], total_bots: 0 });
  const [, setTick] = useState(0);
  const cancellingRef = useRef<Set<number>>(new Set());
  const [cancelling, setCancelling] = useState<Set<number>>(new Set());

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchLogs = async () => {
    try {
      const url = selectedInstance !== null 
        ? `/api/admin/bot/logs?instance_id=${selectedInstance}`
        : "/api/admin/bot/logs";
      const r = await fetch(url);
      if (r.ok) setBotLogs((await r.json()).logs ?? []);
    } catch {}
  };

  const fetchAutoSpawn = async () => {
    try {
      const r = await fetch("/api/admin/bot/auto-spawn");
      if (r.ok) setAutoSpawnEasy((await r.json()).auto_spawn_easy ?? false);
    } catch {}
  };

  const fetchStatus = async () => {
    try {
      const r = await fetch("/api/admin/bot/status");
      if (r.ok) {
        const d = await r.json();
        setStatus({ total_active_battles: d.total_active_battles ?? 0, instances: d.instances ?? [] });
      }
    } catch {}
  };

  const fetchPool = async () => {
    try {
      const r = await fetch("/api/admin/bot/pool");
      if (r.ok) setPool(await r.json());
    } catch {}
  };

  const refresh = () => { fetchStatus(); fetchPool(); fetchAutoSpawn(); };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!showLogs) return;
    fetchLogs();
    const id = setInterval(fetchLogs, 2000);
    return () => clearInterval(id);
  }, [showLogs]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSpawn = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/bot/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(`Battle #${d.instance_id} spawned on bot …${d.bot_id?.slice(-6)} · ${d.active_battles} active`);
        refresh();
      } else toast.error(d.error || "Failed to spawn bot");
    } catch { toast.error("Error spawning bot"); }
    finally { setLoading(false); }
  };

  const handleToggleAutoSpawn = async () => {
    const newState = !autoSpawnEasy;
    setAutoSpawnEasy(newState); // optimistic update
    try {
      const r = await fetch("/api/admin/bot/auto-spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_spawn_easy: newState }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.error || "Failed to update configuration");
        setAutoSpawnEasy(!newState); // revert
      } else {
        toast.success(newState ? "Auto-Spawn enabled for Easy matchmaking" : "Auto-Spawn disabled");
      }
    } catch {
      toast.error("Error updating configuration");
      setAutoSpawnEasy(!newState);
    }
  };

  const handleStopAll = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/bot/stop-all", { method: "POST" });
      const d = await r.json();
      if (r.ok) { toast.success(`Stopped ${d.battles_cancelled ?? 0} battle(s)`); refresh(); }
      else toast.error(d.error || "Failed to stop all");
    } catch { toast.error("Error stopping all battles"); }
    finally { setLoading(false); }
  };

  const handleStopInstance = async (inst: BattleInstance) => {
    cancellingRef.current.add(inst.instance_id);
    setCancelling(new Set(cancellingRef.current));
    try {
      const r = await fetch("/api/admin/bot/stop-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: inst.bot_id, instance_id: inst.instance_id }),
      });
      const d = await r.json();
      if (r.ok) { toast.success(`Battle #${inst.instance_id} cancelled`); refresh(); }
      else toast.error(d.error || "Failed to cancel");
    } catch { toast.error("Error cancelling instance"); }
    finally {
      cancellingRef.current.delete(inst.instance_id);
      setCancelling(new Set(cancellingRef.current));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-6 sm:py-10 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full space-y-8">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="rounded-full"><ChevronLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Bot Management</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Spawn, monitor, and cancel individual battles in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
              status.total_active_battles > 0
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-zinc-800/40 border-zinc-700/30 text-zinc-500"
            }`}>
              <Layers className="h-3 w-3" />
              {status.total_active_battles} Active {status.total_active_battles === 1 ? "Battle" : "Battles"}
              {status.total_active_battles > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-bold uppercase tracking-widest">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Live Arena Controller
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-1 space-y-5">

            {/* Spawn Controls */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400"><Bot className="h-5 w-5" /></div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Configuration</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Battle Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as const).map((d) => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className={`py-2 text-[10px] font-bold uppercase rounded-xl transition-all border ${
                          difficulty === d
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                            : "bg-muted/30 text-muted-foreground border-border/40 hover:border-primary/50"
                        }`}>{d}</button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button onClick={handleSpawn} disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 font-bold h-12 rounded-2xl shadow-lg shadow-primary/10">
                    <Swords className="h-4 w-4 mr-2" />
                    {loading ? "Processing..." : "Spawn Arena Bot"}
                  </Button>
                  <Button onClick={handleStopAll} disabled={loading} variant="outline"
                    className="w-full border-zinc-800 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/50 font-bold h-12 rounded-2xl">
                    <CircleStop className="h-4 w-4 mr-2" />
                    {loading ? "Processing..." : "Stop All Battles"}
                  </Button>
                </div>

                <div className="pt-4 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Auto-Spawn bot
                      </label>
                      <p className="text-[9px] text-zinc-500 leading-tight mt-0.5">
                        Trigger an easy bot if queue equals 1 for 30s.
                      </p>
                    </div>
                    <button
                      onClick={handleToggleAutoSpawn}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        autoSpawnEasy ? "bg-emerald-500" : "bg-zinc-800"
                      }`}
                      role="switch"
                      aria-checked={autoSpawnEasy}
                    >
                      <span className="sr-only">Use setting</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute left-0 inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoSpawnEasy ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bot Pool Status */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="bg-card/50 border border-border rounded-3xl p-5 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400"><Server className="h-4 w-4" /></div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">Bot Pool</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{pool.total_bots} account{pool.total_bots !== 1 ? "s" : ""} configured</p>
                </div>
              </div>

              <div className="space-y-2">
                {pool.pool.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">Loading pool…</p>
                ) : pool.pool.map((entry) => (
                  <div key={entry.bot_id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
                      entry.available
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-amber-500/5 border-amber-500/20"
                    }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.available
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                      <span className="text-[11px] font-mono text-zinc-400 truncate">
                        …{entry.bot_id.slice(-10)}
                      </span>
                    </div>
                    <div className="shrink-0 ml-2">
                      {entry.available ? (
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Free</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: Math.min(entry.active_battles, 5) }).map((_, i) => (
                            <span key={i} className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"
                              style={{ animationDelay: `${i * 120}ms` }} />
                          ))}
                          <span className="text-[10px] font-bold text-amber-500 ml-1">
                            {entry.active_battles}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                Add more bot accounts via{" "}
                <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">BOT_POOL</code>{" "}
                env var (comma-separated user IDs) to enable more simultaneous battles.
              </p>
            </motion.div>

            {/* Info */}
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3 text-indigo-400">
                <Zap className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Concurrent Engine</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Each spawn assigns a <strong>free bot account</strong> from the pool, enters
                matchmaking, and fights independently. Adding more bot accounts to the pool
                unlocks unlimited concurrent battles.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active Battle Instances */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Active Battle Instances</h3>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {status.total_active_battles} running
                </span>
              </div>

              <div className="p-4 min-h-[160px]">
                <AnimatePresence mode="popLayout">
                  {status.instances.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Bot className="h-10 w-10 opacity-10 mb-3" />
                      <p className="text-xs italic">No active battles — spawn a bot to get started</p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {status.instances.map((inst) => {
                        const liveElapsed = (Date.now() - new Date(inst.started_at).getTime()) / 1000;
                        const isCancelling = cancelling.has(inst.instance_id);
                        const diffStyle = DIFF_STYLE[inst.difficulty.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";

                        return (
                          <motion.div key={inst.instance_id} layout
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}
                            className="relative flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">

                            {/* Live pulse */}
                            <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />

                            {/* Badges */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-lg">
                                #{inst.instance_id}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${diffStyle}`}>
                                {inst.difficulty}
                              </span>
                            </div>

                            {/* Bot ID */}
                            <div className="flex items-center gap-2">
                              <Bot className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                              <span className="text-[11px] font-mono text-zinc-400 truncate">
                                …{inst.bot_id.slice(-12)}
                              </span>
                            </div>

                            {/* Opponent */}
                            <div className="flex items-center gap-2">
                              <Swords className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                              <span className="text-[11px] font-bold text-zinc-300">
                                {inst.opponent_name ? `vs ${inst.opponent_name}` : "Waiting for opponent..."}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-1">
                              <button onClick={() => setSelectedInstance(inst.instance_id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                  selectedInstance === inst.instance_id
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                                }`}>
                                <Activity className="h-3 w-3" />
                                Console
                              </button>
                              <button onClick={() => handleStopInstance(inst)} disabled={isCancelling}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                <CircleStop className="h-3 w-3" />
                                {isCancelling ? "Stop" : "Stop"}
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Bot Console */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                    {selectedInstance !== null ? `Instance #${selectedInstance} Console` : "Global Bot Console"}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  {selectedInstance !== null && (
                    <Button onClick={() => setSelectedInstance(null)} variant="outline" size="sm"
                      className="h-8 text-[10px] font-bold border-zinc-700 hover:bg-zinc-900">
                      View All Logs
                    </Button>
                  )}
                  <Button onClick={() => setShowLogs((v) => !v)} variant="ghost" size="sm"
                    className="h-8 text-[10px] font-bold hover:bg-zinc-900">
                    {showLogs ? "Pause Stream" : "Resume Stream"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-5 font-mono text-[12px] leading-relaxed overflow-hidden">
                <div className="h-[320px] overflow-y-auto space-y-0.5 scroll-smooth pr-2">
                  {botLogs.length > 0 ? botLogs.map((entry, i) => (
                    <div key={i} className="flex gap-4 group hover:bg-zinc-900/50 rounded-lg px-2 py-0.5 transition-colors">
                      <span className="opacity-20 select-none w-16 text-[10px] shrink-0 font-mono">{entry.timestamp}</span>
                      {selectedInstance === null && (
                        <span className={`w-12 text-center shrink-0 text-[10px] font-bold rounded px-1 ${
                          entry.instance_id === -1 ? "text-zinc-500 bg-zinc-800" : "text-primary bg-primary/10"
                        }`}>
                          {entry.instance_id === -1 ? "SYS" : `#${entry.instance_id}`}
                        </span>
                      )}
                      <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors break-all">
                        {entry.message.replace(/\n$/, "")}
                      </span>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic">
                      <Bot className="h-10 w-10 mb-3 opacity-10" />
                      <p>No activity detected — bot is idle</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between text-[10px] uppercase font-bold text-zinc-500">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </div>
                <span>Buffered Lines: {botLogs.length}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
