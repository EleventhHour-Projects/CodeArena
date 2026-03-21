"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Swords, TrendingUp, BookOpen } from "lucide-react";

interface Stats {
  rating: number;
  battlesPlayed: number;
  winRate: number;
  currentStreak: number;
  totalProblemsSolved: number;
}

const Skeleton = () => (
  <div className="h-full w-full rounded-xl bg-zinc-800/50 animate-pulse" />
);

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string; // tailwind color class for icon
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, sub, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-colors group"
  >
    <div className={`p-2 rounded-lg bg-zinc-800 group-hover:bg-zinc-750 transition-colors ${accent}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex flex-col leading-tight">
      <span className="text-[11px] text-zinc-500 font-medium tracking-wide uppercase">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-zinc-100 tabular-nums">{value}</span>
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </div>
    </div>
  </motion.div>
);

export const UserStatsBar: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    fetch("/api/user/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
        } else {
          setIsGuest(true);
        }
      })
      .catch(() => setIsGuest(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl">
            <Skeleton />
          </div>
        ))}
      </div>
    );
  }

  // Guest: show enticing placeholder cards instead of user data
  if (isGuest || !stats) {
    const guestCards = [
      { icon: TrendingUp, label: "Rating", value: "—", sub: "log in", accent: "text-sky-400" },
      { icon: Swords,    label: "Battles",  value: "—", sub: "log in", accent: "text-violet-400" },
      { icon: Flame,     label: "Streak",   value: "—", sub: "log in", accent: "text-orange-400" },
      { icon: BookOpen,  label: "Solved",   value: "—", sub: "log in", accent: "text-green-400" },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
        {guestCards.map((c, i) => (
          <StatCard key={i} {...c} delay={i * 0.06} />
        ))}
      </div>
    );
  }

  const cards: StatCardProps[] = [
    {
      icon: TrendingUp,
      label: "Rating",
      value: stats.rating,
      accent: "text-sky-400",
      delay: 0,
    },
    {
      icon: Swords,
      label: "Battles",
      value: stats.battlesPlayed,
      sub: `${stats.winRate}% WR`,
      accent: "text-violet-400",
      delay: 0.06,
    },
    {
      icon: Flame,
      label: "Streak",
      value: stats.currentStreak,
      sub: stats.currentStreak === 1 ? "win" : "wins",
      accent: "text-orange-400",
      delay: 0.12,
    },
    {
      icon: BookOpen,
      label: "Solved",
      value: stats.totalProblemsSolved,
      sub: "problems",
      accent: "text-green-400",
      delay: 0.18,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
      {cards.map((c, i) => (
        <StatCard key={i} {...c} />
      ))}
    </div>
  );
};
