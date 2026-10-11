"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { Loader2, User, Trophy, Play, XCircle, Swords, Zap, Shield, Target, AlertTriangle, Video } from "lucide-react";
import { playBattleJoinSound } from "@/lib/utils";

interface BattleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialOpponent?: string;
  initialMode?: "private" | "arena";
}

export const BattleModal: React.FC<BattleModalProps> = ({
  open,
  onOpenChange,
  initialOpponent = "",
  initialMode = "arena"
}) => {
  const router = useRouter();
  const { data: session } = useSession();

  const [mode, setMode] = useState<"private" | "arena">(initialMode);
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [demoVideoOpen, setDemoVideoOpen] = useState(false);

  // States
  const [opponentUsername, setOpponentUsername] = useState(initialOpponent);
  const [status, setStatus] = useState<"idle" | "sending" | "waiting" | "searching" | "found" | "accepted" | "starting">("idle");
  const [timeLeft, setTimeLeft] = useState(45);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sseToken, setSseToken] = useState<string | null>(null);

  // Arena Mode State
  const [searchTime, setSearchTime] = useState(0);
  const [arenaOpponent, setArenaOpponent] = useState<{ username: string; rating: number; image?: string | null } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [poolSize, setPoolSize] = useState<number>(0);

  // Sync initial state and reset on close
  useEffect(() => {
    if (open) {
      if (initialOpponent) {
        setOpponentUsername(initialOpponent);
        setMode("private");
      } else {
        setMode(initialMode);
      }
    } else {
      setStatus("idle");
      setInviteId(null);
    }
  }, [open, initialOpponent, initialMode]);

  // Private: Send Invite - Disabled while backend VM is offline
  const handleSendInvite = async () => {
    toast.error("Battle invite service is offline. The backend VM is down due to Google Cloud credit limits.");
  };

  // Arena: Search - Disabled while backend VM is offline
  const startArenaSearch = async () => {
    toast.error("Matchmaking is currently offline. The backend VM is down due to Google Cloud credit limits.");
  };

  const stopArenaSearch = () => {
    setStatus("idle");
    setSearchTime(0);
    setPoolSize(0);
  };

  const handleArenaAccept = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: "accept" }));
      setStatus("accepted");
    }
  };

  const handleArenaReject = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: "reject" }));
      stopArenaSearch();
      onOpenChange(false);
      toast.info("Match rejected.");
    }
  };

  // Timers
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "waiting") {
      interval = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (status === "searching") {
      interval = setInterval(() => setSearchTime(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status === "waiting" && timeLeft <= 0) setStatus("idle");
  }, [status, timeLeft]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && status === "waiting") {
      toast.error("You cannot close the invite modal until the timer expires.");
      return;
    }
    if (!newOpen && (status === "searching" || status === "found" || status === "accepted")) {
      if (!confirm("Exit this battle setup?")) return;
    }
    if (!newOpen) {
      stopArenaSearch();
      setStatus("idle");
    }
    onOpenChange(newOpen);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false} className="sm:max-w-md bg-zinc-950 text-white border-zinc-800 p-6 rounded-3xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Swords className="w-5 h-5 text-green-500" />
            {(status === "idle" || status === "sending") ? "Start Battle" : status === "searching" ? "Searching Arena" : "Matchmaking"}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            {(status === "idle" || status === "sending") && "Choose your mode and difficulty to begin."}
            {status === "searching" && "Looking for a worthy opponent..."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector */}
        {(status === "idle" || status === "sending") && (
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 mb-6">
            <button
              onClick={() => setMode("arena")}
              disabled={status === "sending"}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === "arena" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"} ${status === "sending" ? "opacity-50" : ""}`}
            >
              Arena
            </button>
            <button
              onClick={() => setMode("private")}
              disabled={status === "sending"}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === "private" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"} ${status === "sending" ? "opacity-50" : ""}`}
            >
              Private (Invite)
            </button>
          </div>
        )}

        {/* Offline Notice Banner */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col gap-2.5">
          <div className="flex items-center gap-2 font-semibold text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            Backend VM Currently Offline
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            We apologize for the inconvenience. Our backend is offline as we don't have funds to continue our GCP subscription, and our distributed architecture requires dedicated VMs. Real-time matchmaking and battle invites are paused.
          </p>
          <Button
            onClick={() => setDemoVideoOpen(true)}
            size="sm"
            className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Watch Video Demo
          </Button>
        </div>

        <div className="space-y-6">
          {(status === "idle" || status === "sending") && (
            <>
              {/* Difficulty Row */}
              <div className="flex flex-col gap-3">
                <Label className="text-xs font-bold text-zinc-500">Difficulty</Label>
                <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 gap-1">
                  {['easy', 'medium', 'hard'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${difficulty === d
                          ? "bg-green-600/20 text-green-500 border border-green-500/30"
                          : "text-zinc-500 hover:text-zinc-400"
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "private" ? (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-zinc-500">Friend's Username</Label>
                    <Input
                      placeholder="e.g. coder_pro"
                      className="bg-zinc-900 border-zinc-800 h-10 rounded-xl"
                      value={opponentUsername}
                      onChange={(e) => setOpponentUsername(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleSendInvite}
                    disabled={true}
                    className="w-full bg-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold h-12 rounded-xl cursor-not-allowed"
                  >
                    Invite Service Offline
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={startArenaSearch}
                  disabled={true}
                  className="w-full bg-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold h-12 rounded-xl mt-4 cursor-not-allowed"
                >
                  Matchmaking Offline
                </Button>
              )}
            </>
          )}

          {status === "searching" && (
            <div className="flex flex-col items-center py-6 gap-6">
              <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
              <div className="text-center">
                <p className="text-2xl font-mono font-bold text-white">{formatTime(searchTime)}</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Searching... ({difficulty})</p>
                {poolSize > 0 && (
                  <p className="text-xs text-green-500 mt-2 font-bold ">
                    {poolSize} {poolSize === 1 ? "player" : "players"} in matchmaking pool
                  </p>
                )}
              </div>
              <Button variant="ghost" onClick={stopArenaSearch} className="text-zinc-600 hover:text-red-500 uppercase text-[10px] font-bold">
                Cancel
              </Button>
            </div>
          )}

          {status === "waiting" && (
            <div className="flex flex-col items-center py-6 gap-6">
              <Loader2 className="w-10 h-10 text-zinc-500 animate-spin" />
              <div className="text-center">
                <p className="text-2xl font-mono font-bold text-white">{formatTime(timeLeft)}</p>
                <p className="text-xs text-zinc-500 mt-1">Waiting for {opponentUsername}...</p>
              </div>
            </div>
          )}

          {(status === "found" || status === "accepted") && arenaOpponent && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {arenaOpponent.image ? (
                      <img
                        src={arenaOpponent.image}
                        alt={`${arenaOpponent.username} profile`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{arenaOpponent.username}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <Trophy className="w-3 h-3 text-green-500" />
                      {arenaOpponent.rating} Rating
                    </div>
                  </div>
                </div>
                <div className="text-xs font-black italic text-zinc-700">FOUND</div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleArenaAccept}
                  disabled={status === "accepted"}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-12 rounded-xl"
                >
                  {status === "accepted" ? "Ready..." : "Accept Match"}
                </Button>
                {status === "found" && (
                  <Button variant="ghost" onClick={handleArenaReject} className="text-zinc-600 hover:text-red-500 text-xs font-bold">
                    Reject
                  </Button>
                )}
              </div>
            </div>
          )}

          {status === "starting" && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
              <p className="text-sm font-bold uppercase tracking-widest text-green-500">Connecting...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={demoVideoOpen} onOpenChange={setDemoVideoOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-zinc-950 border-zinc-800 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-zinc-100">
              <Video className="w-4 h-4 text-amber-400" />
              CodeArena Platform & Battle Demo
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 mt-0.5">
              Live algorithmic battle walkthrough and system architecture overview.
            </DialogDescription>
          </div>
        </div>

        <div className="relative bg-black w-full aspect-video flex items-center justify-center">
          {demoVideoOpen && (
            <video
              controls
              autoPlay
              playsInline
              className="w-full h-full max-h-[75vh] object-contain rounded-b-2xl"
            >
              <source src="/codeareanvid.mov" type="video/mp4" />
              <source src="/codeareanvid.mov" type="video/quicktime" />
              <source src="/codeareanvid.mov" />
              Your browser does not support playing this video.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
