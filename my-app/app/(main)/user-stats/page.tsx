"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Swords, Flame, Target, Activity, BrainCircuit, Clock } from "lucide-react";
import { CodeBackground } from "@/components/code-background";
import { RatingChart } from "@/components/charts/rating-chart";
import { DifficultyChart } from "@/components/charts/difficulty-chart";
import { ActivityCalendar } from 'react-activity-calendar';
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OverviewStats {
  username?: string;
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
  const { data: session } = useSession();
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

      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 md:py-4 flex flex-col gap-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
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
            {/* Top Profile & Heatmap Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

              {/* Profile Sidebar */}
              <div className="lg:col-span-1 flex flex-col items-center text-center p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] gap-4">
                <Avatar className="w-24 h-24 border-2 border-zinc-800">
                  <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                  <AvatarFallback className="text-3xl font-bold bg-zinc-900 text-zinc-100">{session?.user?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col mb-2">
                  <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">{session?.user?.name || "Player"}</h2>
                  <p className="text-zinc-400 font-medium pb-2">@{stats?.username || "user"}</p>

                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-semibold text-yellow-500 ring-1 ring-inset ring-yellow-400/20">
                      Rating: {stats.rating}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
                      Rank: #{stats.rank}
                    </span>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-800/60 my-2" />

                {/* Battles Won/Played Circle */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-32 h-32 rounded-full flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="58" fill="none" className="stroke-zinc-800" strokeWidth="6" />
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        fill="none"
                        className="stroke-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                        strokeWidth="6"
                        strokeDasharray={`${((stats.battlesWon / Math.max(stats.battlesPlayed, 1)) * 364.4)} 364.4`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="flex flex-col items-center text-center z-10 w-full px-2">
                      <span className="text-2xl font-black text-white">{stats.battlesWon}<span className="text-sm text-zinc-500 font-bold">/{stats.battlesPlayed}</span></span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Battle Won / Played</span>
                </div>
              </div>

              {/* Main Column: Stats List & Heatmap */}
              <div className="lg:col-span-3 flex flex-col gap-8">

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                  <div className="flex flex-col justify-center bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl gap-2 hover:bg-white/[0.04] transition-colors">
                    <span className="text-zinc-400 font-medium">Total Question solved</span>
                    <span className="text-3xl font-bold text-white mt-1">{stats.totalProblems}</span>
                  </div>
                  <div className="flex flex-col justify-center bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl gap-2 hover:bg-white/[0.04] transition-colors">
                    <span className="text-zinc-400 font-medium">Won streak</span>
                    <span className="text-3xl font-bold text-orange-400 mt-1">{stats.currentStreak} 🔥</span>
                  </div>
                  <div className="flex flex-col justify-center bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl gap-2 hover:bg-white/[0.04] transition-colors">
                    <span className="text-zinc-400 font-medium">Other info (Win Rate)</span>
                    <span className="text-3xl font-bold text-white mt-1">{stats.winRate}%</span>
                  </div>
                </div>

                {/* Activity Heatmap */}
                <div className="flex flex-col gap-4 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex flex-col gap-1 mb-2 items-center text-center">
                    <h3 className="text-xl font-bold text-zinc-100">HeatMap</h3>
                    <p className="text-sm text-zinc-400">Your daily battle activity over the past year.</p>
                  </div>
                  <div className="flex-1 w-full overflow-hidden flex justify-center pb-2">
                    {history?.activityHeatmap ? (
                      <ActivityCalendar
                        data={history.activityHeatmap}
                        theme={{
                          light: ['#18181b', '#064e3b', '#047857', '#10b981', '#34d399'],
                          dark: ['#18181b', '#064e3b', '#047857', '#10b981', '#34d399']
                        }}
                        colorScheme="dark"
                        blockSize={10}
                        blockMargin={3}
                        fontSize={12}
                        labels={{
                          legend: {
                            less: "Less",
                            more: "More",
                          },
                          months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                          totalCount: "{{count}} battles in the last year",
                        }}
                      />
                    ) : (
                      <div className="animate-pulse w-full max-w-4xl h-32 bg-white/[0.02] rounded-lg" />
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Section: Graph & Problems */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-[400px] flex flex-col gap-4 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex flex-col gap-1 items-center">
                  <h3 className="text-xl font-bold text-zinc-100">Rating graph</h3>
                </div>
                <div className="flex-1 w-full relative -ml-4 mt-4">
                  {history ? <RatingChart data={history.ratingTimeline} /> : <div className="animate-pulse w-full h-full bg-white/[0.02] rounded-lg" />}
                </div>
              </div>

              <div className="h-[400px] flex flex-col gap-4 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex flex-col gap-1 items-center">
                  <h3 className="text-xl font-bold text-zinc-100">Problem by difficulty</h3>
                </div>
                <div className="flex-1 w-full relative mt-4">
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
