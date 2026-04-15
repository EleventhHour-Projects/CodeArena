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
import { Loader2, User, Trophy, Play, XCircle, Swords, Zap, Shield, Target } from "lucide-react";

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
      fetchSseToken();
    } else {
      // RESET ALL POLLING/SSE STATES WHEN CLOSED
      setStatus("idle");
      setInviteId(null);
    }
  }, [open, initialOpponent, initialMode]);

  const fetchSseToken = async () => {
    try {
      const res = await fetch("/api/battle/invitations/sse-token");
      const data = await res.json();
      if (data.success) {
        setSseToken(data.sseToken);
        if (data.userId) setUserId(data.userId);
      }
    } catch (err) {
      console.error("Failed to fetch invite SSE token:", err);
    }
  };

  // Private: Send Invite
  const handleSendInvite = async () => {
    if (!opponentUsername.trim()) {
      toast.error("Enter a username.");
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
        toast.error(data.message || "Invite failed.");
        setStatus("idle");
        return;
      }
      toast.success("Invite sent.");
      setInviteId(data.inviteId);
      setStatus("waiting");
      setTimeLeft(45);
    } catch (err) {
      toast.error("Error sending invite.");
      setStatus("idle");
    }
  };

  // Private: SSE + Polling Status Check
  useEffect(() => {
    if (mode !== "private" || status !== "waiting" || !inviteId || !userId || !sseToken) return;

    const sseUrl = `https://matchmake.codearena.pro/sse/invites?userId=${userId}&token=${sseToken}`;
    const source = new EventSource(sseUrl);

    // Shared check function
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/battle/invite/${inviteId}`);
        const data = await res.json();
        
        if (data.success) {
          if (data.status === "Accepted" && data.battleId) {
            router.push(`/battle/${data.battleId}`);
            onOpenChange(false);
            return true;
          } else if (data.status === "Rejected") {
            toast.error("Invite rejected by opponent.");
            setStatus("idle");
            return true;
          } else if (data.status === "Expired") {
            toast.error("Invite expired.");
            setStatus("idle");
            return true;
          }
        } else if (res.status === 404) {
          setStatus("idle");
          return true;
        }
      } catch (err) {
        console.error("Error checking invite status:", err);
      }
      return false;
    };

    // SSE Signal Trigger
    source.addEventListener("invite_update", () => {
      checkStatus();
    });

    // Backup Polling (every 2 seconds)
    const pollInterval = setInterval(async () => {
      const shouldStop = await checkStatus();
      if (shouldStop) {
        clearInterval(pollInterval);
        source.close();
      }
    }, 2000);

    source.onerror = () => {
      source.close();
      fetchSseToken();
    };

    return () => {
      source.close();
      clearInterval(pollInterval);
    };
  }, [mode, status, inviteId, userId, sseToken, router, onOpenChange]);

  // Arena: Pool Size Polling
  useEffect(() => {
    if (status !== "searching") return;
    const fetchPoolSize = async () => {
      try {
        const res = await fetch("/api/matchmaking/poolsize");
        const data = await res.json();
        if (data.success) {
          setPoolSize(data[difficulty] || 0);
        }
      } catch (err) { }
    };

    fetchPoolSize();
    const interval = setInterval(fetchPoolSize, 3000);
    return () => clearInterval(interval);
  }, [status, difficulty]);

  // Arena: Search
  const fetchOpponentPhoto = async (username: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/users/public/${encodeURIComponent(username)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.success) return null;
      return data.image ?? null;
    } catch {
      return null;
    }
  };

  const startArenaSearch = async () => {
    if (!session?.user) {
      toast.error("Login to play.");
      return;
    }
    setStatus("searching");
    try {
      const resp = await fetch("/api/matchmaking/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const data = await resp.json();
      if (!data.success) {
        toast.error(data.error || "Matchmaking error.");
        setStatus("idle");
        return;
      }

      const wsUrl = `wss://matchmake.codearena.pro/wss/matchmaking?token=${data.token}&username=${(session.user as any).username || session.user.name}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.user && msg.rating !== undefined) {
          const imageFromWs = msg.image ?? msg.avatar ?? msg.profilePhoto ?? null;
          const imageFromDb = imageFromWs ? null : await fetchOpponentPhoto(msg.user);

          setArenaOpponent({
            username: msg.user,
            rating: msg.rating,
            image: imageFromWs ?? imageFromDb,
          });
          setStatus("found");
        } else if (msg.action === "battle_begin") {
          setStatus("starting");
          router.push(`/battle/${msg.battleId}`);
          onOpenChange(false);
        } else if (msg.action === "match_rejected") {
          toast.info("Match rejected.");
          setStatus("searching");
        }
      };

      socket.onclose = () => {
        setStatus((prev) => {
          if (prev === "searching" || prev === "found") {
            toast.error("Matchmaking connection closed.");
            return "idle";
          }
          return prev;
        });
        setSearchTime(0);
        setPoolSize(0);
      };

    } catch (err) {
      setStatus("idle");
    }
  };

  const stopArenaSearch = () => {
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
    }
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
                    disabled={status === "sending" || !opponentUsername}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-12 rounded-xl"
                  >
                    {status === "sending" ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={startArenaSearch}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-12 rounded-xl mt-4"
                >
                  Enter Arena
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
  );
};
