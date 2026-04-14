"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, ChevronLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function BotManagementPage() {
  const [botDifficulty, setBotDifficulty] = useState<string>("medium");
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [botLogs, setBotLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  const fetchBotLogs = async () => {
    try {
      const res = await fetch("/api/admin/bot/logs");
      if (res.ok) {
        const data = await res.json();
        setBotLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error fetching bot logs:", err);
    }
  };

  useEffect(() => {
    let interval: any;
    if (showLogs) {
      fetchBotLogs();
      interval = setInterval(fetchBotLogs, 2000);
    }
    return () => clearInterval(interval);
  }, [showLogs]);

  const handleSpawnBot = async () => {
    setIsBotLoading(true);
    try {
      const res = await fetch("/api/admin/bot/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: botDifficulty })
      });
      if (res.ok) {
        toast.success("Bot spawn initiated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to spawn bot");
      }
    } catch (err) {
      toast.error("An error occurred while spawning bot");
    } finally {
      setIsBotLoading(false);
    }
  };

  const handleStopBot = async () => {
    setIsBotLoading(true);
    try {
      const res = await fetch("/api/admin/bot/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: "69de72c58961bbd5a5c37278" })
      });
      if (res.ok) {
        toast.success("Bot stop signal sent");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to stop bot");
      }
    } catch (err) {
      toast.error("An error occurred while stopping bot");
    } finally {
      setIsBotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-6 sm:py-10 selection:bg-primary/30 transition-colors overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">Bot Management</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-bold uppercase tracking-widest">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Live Arena Controller
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-6 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Bot className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Configuration</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Bot Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['easy', 'medium', 'hard'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setBotDifficulty(d)}
                        className={`py-2 text-[10px] font-bold uppercase rounded-xl transition-all border ${
                          botDifficulty === d 
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                            : "bg-muted/30 text-muted-foreground border-border/40 hover:border-primary/50"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    onClick={handleSpawnBot} 
                    disabled={isBotLoading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-2xl shadow-lg shadow-primary/10"
                  >
                    {isBotLoading ? "Processing..." : "Spawn Arena Bot"}
                  </Button>
                  <Button 
                    onClick={handleStopBot} 
                    disabled={isBotLoading}
                    variant="outline"
                    className="w-full border-zinc-800 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/50 font-bold h-12 rounded-2xl"
                  >
                    {isBotLoading ? "Processing..." : "Stop All Bots"}
                  </Button>
                </div>
              </div>
            </motion.div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4 text-indigo-400">
                <Zap className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest">System Intelligence</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bots are programmed with realistic solving curves. They participate in matchmaking, join battles, and solve problems based on their difficulty level.
              </p>
            </div>
          </div>

          {/* Console Panel */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Bot Console</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Connected</span>
                  </div>
                  <Button 
                    onClick={() => setShowLogs(!showLogs)} 
                    variant="ghost" 
                    size="sm"
                    className="h-8 text-[10px] font-bold hover:bg-zinc-900"
                  >
                    {showLogs ? "Pause Stream" : "Resume Stream"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-6 font-mono text-[12px] leading-relaxed overflow-hidden">
                <div className="h-[500px] overflow-y-auto space-y-1 custom-scrollbar scroll-smooth pr-2">
                  {botLogs.length > 0 ? (
                    botLogs.map((log, i) => (
                      <div key={i} className="flex gap-4 group hover:bg-zinc-900/50 rounded-lg px-2 py-1 transition-colors">
                        <span className="opacity-20 select-none w-8 text-right shrink-0">{i + 1}</span>
                        <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors break-all">
                          {log.replace(/\n$/, "")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic">
                      <Bot className="h-12 w-12 mb-4 opacity-10" />
                      <p>No activity detected... Bot is idle.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between text-[10px] uppercase font-bold text-zinc-500">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Status
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
