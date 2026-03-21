"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, ChevronRight, ChevronLeft } from "lucide-react";
import { CodeBackground } from "@/components/code-background";
import { BattleModal } from "@/components/battle-modal";
import { ActivityDashboard } from "@/components/activity-dashboard";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { FriendsList } from "@/components/friends-list";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [challengeUsername, setChallengeUsername] = useState("");

  // Open modal pre-filled when navigated with ?challenge=username
  useEffect(() => {
    const c = searchParams.get("challenge");
    if (c) {
      setChallengeUsername(c);
      setModalOpen(true);
      // Clean up URL
      router.replace("/");
    }
  }, [searchParams, router]);

  const handleBattleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/active-battle");
      const data = await res.json();
      if (data.success && data.battleId) {
        toast.info("You are already in a battle. Redirecting...");
        router.push(`/battle/${data.battleId}`);
      } else {
        setModalOpen(true);
      }
    } catch (err) {
      console.error("Error checking battle status", err);
      toast.error("Failed to check battle status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#050505] overflow-hidden text-white font-sans">
      {/* ─── LEFT PANEL (Main) ─── */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-8 lg:p-16 border-r border-zinc-800/60 w-full">
        {/* Toggle Button for Desktop */}
        <button
          onClick={() => setIsRightPanelOpen((prev) => !prev)}
          className="hidden lg:flex absolute top-6 -right-4 z-50 bg-[#0a0a0a] border border-[#00ff41]/30 p-1.5 rounded-full text-zinc-400 hover:text-[#00ff41] hover:border-[#00ff41]/60 transition-colors shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          {isRightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <CodeBackground />

        {/* Radial glow behind content */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(34,197,94,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Foreground content */}
        <div className="z-10 flex flex-col items-center justify-center text-center gap-8 max-w-3xl">
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Real-time 1v1 Coding Battles
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05]"
          >
            <span
              style={{
                color: "#f4f4f5", // zinc-100
                filter: "drop-shadow(0 0 24px rgba(244,244,245,0.15))",
              }}
            >
              Code.
            </span>{" "}
            <span
              style={{
                color: "#6ee7b7", // emerald-300
                filter: "drop-shadow(0 0 24px rgba(110,231,183,0.3))",
              }}
            >
              Compete.
            </span>{" "}
            <span
              style={{
                color: "#22c55e", // green-500
                filter: "drop-shadow(0 0 24px rgba(34,197,94,0.45))",
              }}
            >
              Conquer.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 font-medium max-w-xl leading-relaxed"
          >
            Challenge friends to solve algorithmic problems in real time.
            Prove your skills, climb the ranks, dominate the arena.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-2 group relative"
          >
            <GlowingEffect
              blur={0}
              spread={30}
              glow={true}
              disabled={false}
              proximity={80}
              inactiveZone={0.01}
              borderWidth={2}
              className="rounded-2xl duration-300 transition-opacity"
            />
            <button
              onClick={handleBattleClick}
              disabled={loading}
              className="relative flex items-center gap-3 text-lg px-12 py-5 bg-gradient-to-br from-zinc-900 to-zinc-950 hover:from-zinc-800 hover:to-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-2xl text-white font-bold transition-all shadow-2xl active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <Swords className="w-5 h-5 text-green-400" />
              {loading ? "Checking Active Battles..." : "Start Battle"}
            </button>
          </motion.div>

          {/* Friends list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="w-full flex justify-center mt-2"
          >
            <FriendsList />
          </motion.div>
        </div>
      </main>

      {/* ─── RIGHT PANEL (Collapsible) ─── */}
      <AnimatePresence initial={false}>
        {isRightPanelOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "350px", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="hidden lg:flex flex-col z-10 relative bg-[#0a0a0a] border-l border-white/[0.05] shrink-0"
          >
            {/* Neon glow gradient */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,255,65,0.15),_transparent_60%)]" />

            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ff41]/30 to-transparent shadow-[0_0_10px_rgba(0,255,65,0.2)]" />

            <div className="relative flex flex-col gap-6 h-full p-8 overflow-hidden w-[350px]">
              {/* Panel header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse shadow-[0_0_8px_rgba(0,255,65,0.8)]" />
                  <h2 className="text-lg font-bold tracking-tight text-zinc-100">
                    Activity Dashboard
                  </h2>
                </div>
                <span className="text-[10px] tracking-widest text-[#00ff41]/70 font-bold uppercase">Live</span>
              </div>

              {/* Dashboard content */}
              <ActivityDashboard />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <BattleModal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) setChallengeUsername(""); }}
        initialOpponent={challengeUsername}
      />
    </div>
  );
}
