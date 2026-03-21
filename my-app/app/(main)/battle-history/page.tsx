"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { 
  History, 
  Trophy, 
  XOctagon, 
  Minus, 
  ChevronRight, 
  Search,
  Filter,
  Calendar,
  Sword,
  Target
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BattleDetailModal } from "@/components/battle-history/BattleDetailModal";
import { useMounted } from "@/hooks/use-mounted";
import { Loader2 } from "lucide-react";

interface BattleRecord {
  id: string;
  createdAt: string;
  difficulty: string;
  type: string;
  opponent: {
    name: string;
    username: string;
    image: string;
  };
  result: "win" | "loss" | "draw";
  ratingChange?: number;
  newRating?: number;
}

export default function BattleHistoryPage() {
  const [battles, setBattles] = useState<BattleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const mounted = useMounted();

  useEffect(() => {
    fetch("/api/user/battles")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBattles(data.battles);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredBattles = battles.filter(b => 
    b.opponent.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.opponent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen w-full bg-background overflow-y-auto font-sans relative">
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <History className="w-10 h-10 text-primary" />
              Battle History
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Relive your most epic battles, analyze your code, and track your ranking progress.
            </p>
          </motion.div>

          {/* Search/Filter Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 bg-card border border-border rounded-2xl p-2 pl-4 shadow-sm"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search opponent..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-48 md:w-64 text-foreground placeholder:text-muted-foreground/50"
            />
            <div className="h-6 w-px bg-border mx-1" />
            <button className="p-2 hover:bg-muted rounded-xl transition-colors">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        </div>

        {/* Stats Summary Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Battles</span>
              <span className="text-3xl font-black text-foreground">{battles.length}</span>
           </div>
           <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-2 overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Trophy className="w-32 h-32" />
              </div>
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Wins</span>
              <span className="text-3xl font-black text-emerald-500">{battles.filter(b => b.result === 'win').length}</span>
           </div>
           <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Win Rate</span>
              <span className="text-3xl font-black text-foreground">
                {battles.length > 0 ? Math.round((battles.filter(b => b.result === 'win').length / battles.length) * 100) : 0}%
              </span>
           </div>
        </div>

        {/* List Content */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">Fetching your glory days...</p>
            </div>
          ) : filteredBattles.length === 0 ? (
            <div className="text-center py-20 bg-muted/10 border border-dashed border-border rounded-3xl flex flex-col items-center gap-4">
              <Sword className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-lg">No battles found.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredBattles.map((battle, idx) => (
                <motion.div
                  key={battle.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedBattleId(battle.id)}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-3xl bg-card border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle Background Accent */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    battle.result === 'win' ? 'bg-emerald-500' : 
                    battle.result === 'loss' ? 'bg-rose-500' : 'bg-amber-500'
                  }`} />

                  <div className="flex items-center gap-5 flex-1">
                    <Avatar className="w-14 h-14 border-2 border-border group-hover:border-primary/20 transition-colors">
                      <AvatarImage src={battle.opponent.image} />
                      <AvatarFallback className="bg-muted text-foreground font-bold">{battle.opponent.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">vs {battle.opponent.username}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          battle.difficulty === 'easy' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                          battle.difficulty === 'medium' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 
                          'text-rose-500 border-rose-500/20 bg-rose-500/5'
                        }`}>
                          {battle.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(battle.createdAt), "MMM d, yyyy")}</span>
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {battle.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-8 mt-4 md:mt-0">
                    <div className="flex flex-col items-center md:items-end gap-1">
                      <span className={`text-sm font-black uppercase tracking-widest ${
                        battle.result === 'win' ? 'text-emerald-500' : 
                        battle.result === 'loss' ? 'text-rose-500' : 'text-amber-500'
                      }`}>
                        {battle.result}
                      </span>
                      {battle.ratingChange !== undefined && (
                        <span className={`text-xs font-bold ${battle.ratingChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {battle.ratingChange >= 0 ? `+${battle.ratingChange}` : battle.ratingChange} RP
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>

      <BattleDetailModal 
        battleId={selectedBattleId} 
        isOpen={!!selectedBattleId} 
        onClose={() => setSelectedBattleId(null)} 
      />
    </div>
  );
}
