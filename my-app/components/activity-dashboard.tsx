"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Clock, Swords } from "lucide-react";
import { useStatus } from "@/app/providers/StatusProvider";
import { playBattleJoinSound } from "@/lib/utils";

interface Invitation {
  _id: string;
  difficulty: "easy" | "medium" | "hard" | string;
  expiresAt?: string;
  timeLimitMinutes?: number;
  player1: {
    _id: string;
    username: string;
    name: string;
    rating: number;
    image?: string;
  };
}

function formatExpiry(expiresAt?: string): string {
  if (!expiresAt) return "";
  const date = new Date(expiresAt);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getDifficultyConfig(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return { color: "text-green-400", border: "border-green-400/20", bg: "bg-green-400/10" };
    case "medium":
      return { color: "text-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/10" };
    case "hard":
      return { color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/10" };
    default:
      return { color: "text-zinc-400", border: "border-zinc-400/20", bg: "bg-zinc-400/10" };
  }
}

function getRatingTier(rating: number) {
  if (rating >= 2000) return { label: "Master", color: "text-yellow-400" };
  if (rating >= 1500) return { label: "Expert", color: "text-sky-400" };
  if (rating >= 1000) return { label: "Rated", color: "text-violet-400" };
  return { label: "Beginner", color: "text-zinc-500" };
}

export const ActivityDashboard = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const { refreshSignal } = useStatus();

  const fetchDashboardData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const activeRes = await fetch("/api/user/active-battle");
      const activeData = await activeRes.json();

      if (activeData.success && activeData.battleId) {
        setActiveBattleId(activeData.battleId);
        if (isInitial) setLoading(false);
        return;
      }

      const invitesRes = await fetch("/api/battle/invitations");
      const invitesData = await invitesRes.json();

      if (invitesData.success) {
        setInvitations(invitesData.invitations || []);
      }
    } catch (error) {
      console.error("Error fetching activity dashboard data:", error);
      if (isInitial) toast.error("Failed to load dashboard activities.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  // Sync with global invitations update trigger
  useEffect(() => {
    fetchDashboardData(false);
  }, [refreshSignal]);

  const handleRejoin = () => {
    if (activeBattleId) router.push(`/battle/${activeBattleId}`);
  };

  const handleInviteAction = async (inviteId: string, action: "accept" | "reject") => {
    setActingOn(inviteId);
    try {
      const res = await fetch(`/api/battle/invite/${inviteId}/${action}`, { method: "POST" });
      const data = await res.json();

      if (data.success) {
        toast.success(`Invitation ${action}ed`);
        if (action === "accept" && data.battleId) {
          playBattleJoinSound();
          router.push(`/battle/${data.battleId}`);
        } else {
          setInvitations((prev) => prev.filter((inv) => inv._id !== inviteId));
        }
      } else {
        toast.error(data.message || `Failed to ${action} invitation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing invite`, error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setActingOn(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-3 h-full pt-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }

  if (activeBattleId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 h-full p-6 bg-muted/20 rounded-2xl border border-border/30 transition-colors">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-2">
          <Swords className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground text-center">
          Battle in Progress
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-2">
          You have an active battle session. Let's finish what you started.
        </p>
        <button
          onClick={handleRejoin}
          className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold px-6 py-3 rounded-xl transition-all shadow-lg"
        >
          Rejoin Battle
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {invitations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-[#00ff41]/5 flex items-center justify-center border border-[#00ff41]/10 shadow-[0_0_15px_rgba(0,255,65,0.05)]">
            <Bell className="w-6 h-6 text-[#00ff41]/50" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-zinc-300 font-bold">No Pending Activity</h3>
            <p className="text-sm text-zinc-500 font-medium max-w-[220px]">
              You're all caught up! Challenge a friend to start your next coding battle.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 pt-2 pb-4 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/30 transition-colors">
          {invitations.map((invite) => {
            const diffConfig = getDifficultyConfig(invite.difficulty);
            const tier = getRatingTier(invite.player1?.rating ?? 0);
            const isActing = actingOn === invite._id;

            return (
              <div
                key={invite._id}
                className="group relative flex flex-col p-4 bg-card border border-border rounded-2xl transition-all hover:bg-muted/10 hover:border-border/60 overflow-hidden"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-green-500/10 border border-green-500/20">
                      <Bell className="w-3.5 h-3.5 text-green-400" />
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">
                      Battle Invite
                    </span>
                  </div>
                  {invite.timeLimitMinutes && (
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium bg-white/[0.03] px-2 py-1 rounded-md">
                      <Clock className="w-3 h-3" />
                      {invite.timeLimitMinutes}m
                    </div>
                  )}
                </div>

                {/* Player Profile */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative shrink-0 ring-2 ring-border/40 rounded-full">
                    {invite.player1?.image ? (
                      <img
                        src={invite.player1.image}
                        alt={invite.player1.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                        {(invite.player1?.username?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-foreground truncate">
                        {invite.player1?.username}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-border/40 bg-muted/20 ${tier.color}`}>
                        {invite.player1?.rating ?? "—"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
                      Invited you to a battle
                    </p>
                    <div className="flex items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${diffConfig.bg} ${diffConfig.color} ${diffConfig.border} border`}>
                        {invite.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 relative z-10">
                  <button
                    onClick={() => handleInviteAction(invite._id, "accept")}
                    disabled={isActing}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm py-2.5 rounded-xl transition-all shadow-md"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleInviteAction(invite._id, "reject")}
                    disabled={isActing}
                    className="flex-1 bg-transparent border border-border text-foreground/80 hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm py-2.5 rounded-xl transition-all"
                  >
                    Decline
                  </button>
                </div>

                {/* Auto-expire footer */}
                {invite.expiresAt && (
                  <p className="mt-3 text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground relative z-10">
                    Auto-expires at {formatExpiry(invite.expiresAt)}
                  </p>
                )}

                {/* Background ambient glow based on difficulty */}
                <div 
                  className={`absolute -bottom-6 -right-6 w-24 h-24 blur-3xl opacity-20 pointer-events-none rounded-full ${diffConfig.bg.replace('/10', '')}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
