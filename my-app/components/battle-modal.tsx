"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BattleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BattleModal: React.FC<BattleModalProps> = ({ open, onOpenChange }) => {
  const router = useRouter();
  
  const [opponentUsername, setOpponentUsername] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "sending" | "waiting">("idle");
  const [timeLeft, setTimeLeft] = useState(180);
  const [inviteId, setInviteId] = useState<string | null>(null);

  // Send Invitation Request
  const handleSendInvite = async () => {
    if (!opponentUsername.trim()) {
      toast.error("Opponent's Username is required.");
      return;
    }
    if (!difficulty) {
      toast.error("Please select a difficulty level.");
      return;
    }

    setStatus("sending");

    try {
      const res = await fetch("/api/battle/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponentUsername: opponentUsername.trim(),
          difficulty,
          type: "1v1"
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.message || "Failed to send invitation");
        setStatus("idle");
        return;
      }

      toast.success("Invitation sent successfully!");
      setInviteId(data.inviteId);
      setStatus("waiting");
      setTimeLeft(180);

    } catch (err) {
      console.error(err);
      toast.error("An error occurred while sending the invitation.");
      setStatus("idle");
    }
  };

  // Timer Effect
  useEffect(() => {
    if (status !== "waiting") return;

    if (timeLeft <= 0) {
      const timeoutId = setTimeout(() => {
        toast.error("Invitation expired.");
        setStatus("idle");
        onOpenChange(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [status, timeLeft, onOpenChange]);

  // Polling Effect
  useEffect(() => {
    if (status !== "waiting" || !inviteId) return;

    const pollId = setInterval(async () => {
      try {
        const res = await fetch(`/api/battle/invite/${inviteId}`);
        const data = await res.json();
        
        if (data.success) {
          if (data.status === "Accepted" && data.battleId) {
            toast.success("Battle Accepted!");
            router.push(`/battle/${data.battleId}`);
          } else if (data.status === "Rejected") {
            toast.error("Invitation rejected by opponent.");
            setStatus("idle");
            setInviteId(null);
            onOpenChange(false);
          } else if (data.status === "Expired") {
             toast.error("Invitation expired.");
             setStatus("idle");
             setInviteId(null);
             onOpenChange(false);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(pollId);
  }, [status, inviteId, router, onOpenChange]);

  // Handle modal close
  const handleOpenChange = (newOpen: boolean) => {
    // Prevent accidental closing while waiting
    if (!newOpen && status === "waiting") {
        toast.error("You are currently waiting for an opponent. If you wish to cancel, let the timer expire.");
        return;
    }
    onOpenChange(newOpen);
  };

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      // Use a timeout to reset state asynchronously.
      // This fixes the React warning and allows the modal close animation to finish smoothly.
      const resetTimer = setTimeout(() => {
        setStatus("idle");
        setOpponentUsername("");
        setDifficulty("");
        setInviteId(null);
      }, 300);
      
      return () => clearTimeout(resetTimer);
    }
  }, [open]);

  // Format time (ex: 03:00)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-center">
            Battle Selection
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            {status === "idle" ? "Challenge a friend to a coding battle." : "Waiting for opponent..."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {status === "idle" || status === "sending" ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="opponent">Opponent Username</Label>
                <Input
                  id="opponent"
                  placeholder="Enter username"
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-green-500"
                  value={opponentUsername}
                  onChange={(e) => setOpponentUsername(e.target.value)}
                  disabled={status === "sending"}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="difficulty">Battle Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={setDifficulty}
                  disabled={status === "sending"}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 focus:ring-green-500">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white border-zinc-800">
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Battle Type</Label>
                <Select defaultValue="1v1" disabled>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 opacity-70">
                    <SelectValue placeholder="1v1" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1v1">1v1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSendInvite}
                disabled={status === "sending" || !opponentUsername || !difficulty}
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-2 transition-colors relative"
              >
                {status === "sending" ? "Sending..." : "Send Invitation"}
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-green-500 animate-spin mb-2"></div>
                <div className="text-4xl font-mono text-green-500 tracking-widest font-bold">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-sm text-zinc-400">
                  Invitation Expires In
                </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
