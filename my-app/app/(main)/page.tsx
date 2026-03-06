"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CodeBackground } from "@/components/code-background";
import { BattleModal } from "@/components/battle-modal";
import { ActivityDashboard } from "@/components/activity-dashboard";
import { Button } from "@/components/ui/button";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export default function Home() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <div className="flex min-h-screen w-full bg-zinc-50 dark:bg-[#050505] overflow-hidden text-zinc-900 dark:text-white font-sans transition-colors duration-300">
      
      {/* LEFT PANEL (70%) */}
      <main className="relative flex-[7] flex flex-col items-center justify-center p-8 lg:p-16 border-r border-zinc-200 dark:border-zinc-900 transition-colors duration-300">
        <CodeBackground />
        
        {/* Foreground Content */}
        <div className="z-10 flex flex-col items-center justify-center text-center gap-6 max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter">
            <span className="text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">Code.</span>{" "}
            <span className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">Compete.</span>{" "}
            <span className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">Conquer.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 font-medium max-w-2xl mt-2">
            Turn Coding Practice Into Battles. 
            <br />
            Challenge friends to solve algorithmic problems in real time.
          </p>

          <div className="mt-12 group relative rounded-lg">
             <GlowingEffect 
                blur={0}
                spread={20}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={2}
                className="rounded-lg duration-300 transition-opacity"
              />
            <Button
              size="lg"
              className="relative text-xl px-16 py-8 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-950/90 dark:hover:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-white font-bold transition-all shadow-xl dark:shadow-2xl"
              onClick={handleBattleClick}
              disabled={loading}
            >
              {loading ? "Checking Active Battles..." : "Start Battle"}
            </Button>
          </div>
        </div>
      </main>

      {/* RIGHT PANEL (30%) */}
      <aside className="hidden lg:flex flex-[3] bg-white dark:bg-zinc-950 flex-col p-8 z-10 relative border-l border-zinc-200 dark:border-zinc-900 shadow-xl transition-colors duration-300">
        <div className="flex flex-col gap-4 h-full">
          <h2 className="text-2xl font-bold border-b border-zinc-200 dark:border-zinc-800 pb-4 tracking-tight transition-colors duration-300">Activity Dashboard</h2>
          <ActivityDashboard />
        </div>
      </aside>

      <BattleModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
