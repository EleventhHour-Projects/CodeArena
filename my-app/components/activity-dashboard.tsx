"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Invitation {
  _id: string;
  difficulty: string;
  player1: {
    _id: string;
    username: string;
    name: string;
    rating: number;
    image?: string;
  };
}

export const ActivityDashboard = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const fetchDashboardData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // 1. Check for active battle
      const activeRes = await fetch("/api/user/active-battle");
      const activeData = await activeRes.json();

      if (activeData.success && activeData.battleId) {
        setActiveBattleId(activeData.battleId);
        if (isInitial) setLoading(false);
        return; // Skip fetching invites if already in a battle
      }

      // 2. Fetch pending invitations
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

    const intervalId = setInterval(() => {
      fetchDashboardData(false);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  const handleRejoin = () => {
    if (activeBattleId) {
      router.push(`/battle/${activeBattleId}`);
    }
  };

  const handleInviteAction = async (inviteId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/battle/invite/${inviteId}/${action}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Invitation ${action}ed`);
        if (action === "accept" && data.battleId) {
          router.push(`/battle/${data.battleId}`);
        } else {
          // Remove from list
          setInvitations((prev) => prev.filter((inv) => inv._id !== inviteId));
        }
      } else {
        toast.error(data.message || `Failed to ${action} invitation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing invite`, error);
      toast.error(`Something went wrong. Please try again.`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 font-medium h-full min-h-[200px]">
        <span>Loading activity...</span>
      </div>
    );
  }

  // State 1: Active Battle
  if (activeBattleId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 h-full min-h-[200px]">
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
          You are already in a battle
        </h3>
        <Button
          onClick={handleRejoin}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-6 rounded-lg shadow-lg transition-all"
        >
          Rejoin Battle
        </Button>
      </div>
    );
  }

  // State 2: Invitations List
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {invitations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-600 font-medium text-center px-4">
          <p>Your recent invites and battle activity will appear here.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 pt-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
          {invitations.map((invite) => (
            <div
              key={invite._id}
              className="flex flex-col gap-3 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700">
                  {invite.player1?.username || "Unknown Player"}
                </span>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Invites you for - 1v1 ({(invite.difficulty || "standard").charAt(0).toUpperCase() + (invite.difficulty || "standard").slice(1)})
                </span>
              </div>
              
              <div className="flex gap-4 mt-2">
                <Button
                  onClick={() => handleInviteAction(invite._id, "accept")}
                  className="flex-1 bg-green-500 hover:bg-green-600 active:scale-95 cursor-pointer transition-transform text-white font-bold h-12 shadow"
                >
                  Accept
                </Button>
                <Button
                  onClick={() => handleInviteAction(invite._id, "reject")}
                  className="flex-1 bg-red-500 hover:bg-red-600 active:scale-95 cursor-pointer transition-transform text-white font-bold h-12 shadow"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
