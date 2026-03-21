"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Swords, Flame, Target, Activity, BrainCircuit, Clock } from "lucide-react";
import { CodeBackground } from "@/components/code-background";
import { RatingChart } from "@/components/charts/rating-chart";
import { WinLossDonut } from "@/components/charts/win-loss-chart";
import { DifficultyChart } from "@/components/charts/difficulty-chart";

interface OverviewStats {
  rating: number;
  rank: number;
  battlesPlayed: number;
  battlesWon: number;
  winRate: number;
  currentStreak: number;
  longestStreak: number;
  totalProblems: number;
  problemsByDifficulty: { easy: number; medium: number; hard: number };
  fastestVictory: { hours: number; minutes: number; seconds: number };
  averageWinningTime: { hours: number; minutes: number; seconds: number };
}

function StatCard({ title, value, icon: Icon, delay, colorClass, glowClass }: { title: string, value: React.ReactNode, icon: any, delay: number, colorClass: string, glowClass: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6 hover:bg-white/[0.04] transition-colors group`}
    >
      {/* Background Glow */}
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 blur-3xl opacity-10 rounded-full ${glowClass} transition-opacity group-hover:opacity-20`} />
      
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <div className="text-3xl font-bold text-zinc-100 mt-1">{value}</div>
        </div>
        <div className={`p-3 rounded-xl bg-white/[0.03] ${colorClass} border border-white/[0.05]`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

function formatDuration(time: { hours: number; minutes: number; seconds: number } | undefined) {
  if (!time) return "—";
  if (time.hours === 0 && time.minutes === 0 && time.seconds === 0) return "—";
  const parts = [];
  if (time.hours > 0) parts.push(`${time.hours}h`);
  if (time.minutes > 0) parts.push(`${time.minutes}m`);
  parts.push(`${time.seconds}s`);
  return parts.join(" ");
}

export default function UserStatsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [overviewRes, historyRes] = await Promise.all([
           fetch("/api/user/stats/overview"),
           fetch("/api/user/stats/history")
        ]);
        
        const [overviewData, historyData] = await Promise.all([
           overviewRes.json(),
           historyRes.json()
        ]);

        if (overviewData.success) {
          setStats(overviewData.overview);
        }
        if (historyData.success) {
          setHistory(historyData.history);
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-[#050505] overflow-y-auto text-white font-sans relative">
      <CodeBackground />
      
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col gap-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 w-fit">
            <Activity className="w-3.5 h-3.5" />
            Performance Dashboard
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            My Statistics
          </h1>
          <p className="text-zinc-400 mt-2 max-w-2xl text-lg">
            Track your progress, analyze your battle history, and discover your algorithmic strengths.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center p-20">
            <div className="w-10 h-10 border-t-2 border-green-500 rounded-full animate-spin" />
          </div>
        ) : !stats ? (
          <div className="p-10 text-center text-zinc-500 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
            Failed to load statistics. Please try again.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Tier 1 Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Global Rating" 
                value={stats.rating} 
                icon={Trophy} 
                delay={0.1}
                colorClass="text-yellow-400"
                glowClass="bg-yellow-500"
              />
              <StatCard 
                title="Global Rank" 
                value={`#${stats.rank}`} 
                icon={Target} 
                delay={0.2}
                colorClass="text-emerald-400"
                glowClass="bg-emerald-500"
              />
              <StatCard 
                title="Win Rate" 
                value={`${stats.winRate}%`} 
                icon={Activity} 
                delay={0.3}
                colorClass="text-blue-400"
                glowClass="bg-blue-500"
              />
              <StatCard 
                title="Total Battles" 
                value={stats.battlesPlayed} 
                icon={Swords} 
                delay={0.4}
                colorClass="text-zinc-100"
                glowClass="bg-zinc-400"
              />
            </div>

            {/* Tier 2 Deep Dive */}
            <h2 className="text-2xl font-bold mt-4 border-b border-zinc-800 pb-4">Battle Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard 
                title="Current Streak" 
                value={`${stats.currentStreak} 🔥`} 
                icon={Flame} 
                delay={0.5}
                colorClass="text-orange-500"
                glowClass="bg-orange-600"
              />
              <StatCard 
                title="Problems Solved" 
                value={stats.totalProblems} 
                icon={BrainCircuit} 
                delay={0.6}
                colorClass="text-purple-400"
                glowClass="bg-purple-500"
              />
              <StatCard 
                title="Avg Winning Time" 
                value={formatDuration(stats.averageWinningTime)} 
                icon={Clock} 
                delay={0.7}
                colorClass="text-emerald-400"
                glowClass="bg-emerald-500"
              />
            </div>
            
            {/* Phase 2: Core Charts */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
               <div className="lg:col-span-2 h-96 flex flex-col gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                 <div className="flex flex-col gap-1">
                   <h3 className="text-xl font-bold text-zinc-100">Rating Progression</h3>
                   <p className="text-sm text-zinc-400">Your historical rating trend across all battles.</p>
                 </div>
                 <div className="flex-1 min-h-0 w-full relative -ml-4">
                    {history ? <RatingChart data={history.ratingTimeline} /> : <div className="animate-pulse w-full h-full bg-white/[0.02] rounded-lg" />}
                 </div>
               </div>

               <div className="h-96 flex flex-col gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                 <div className="flex flex-col gap-1">
                   <h3 className="text-xl font-bold text-zinc-100">Battle Outcomes</h3>
                   <p className="text-sm text-zinc-400">Wins, losses, and drawn matches.</p>
                 </div>
                 <div className="flex-1 min-h-[200px] w-full relative">
                    {history ? <WinLossDonut data={history.outcomes} /> : <div className="animate-pulse w-full h-full bg-white/[0.02] rounded-lg" />}
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
               <div className="h-80 flex flex-col gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                 <div className="flex flex-col gap-1">
                   <h3 className="text-xl font-bold text-zinc-100">Problems by Difficulty</h3>
                   <p className="text-sm text-zinc-400">Distribution of challenges completed.</p>
                 </div>
                 <div className="flex-1 min-h-[200px] w-full relative">
                    {stats ? <DifficultyChart data={stats.problemsByDifficulty} /> : <div className="animate-pulse w-full h-full bg-white/[0.02] rounded-lg" />}
                 </div>
               </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
