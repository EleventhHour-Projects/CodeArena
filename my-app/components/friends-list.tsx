"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Search,
  Swords,
  UserMinus,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

/* ─── types ──────────────────────────────────────────────── */
interface Friend {
  _id: string;
  username: string;
  name: string;
  rating: number;
  image?: string;
  lastActive?: string; // ISO string
  currentBattleId?: string | null;
}

/* ─── helpers ────────────────────────────────────────────── */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

function getStatus(friend: Friend, onlineSet?: Set<string>): "in-battle" | "online" | "offline" {
  if (friend.currentBattleId) return "in-battle";

  // If we have an onlineSet from SSE, it is the authoritative source
  if (onlineSet) {
    return onlineSet.has(friend._id) ? "online" : "offline";
  }

  // Fallback for initial load or guest mode
  if (!friend.lastActive) return "offline";
  return Date.now() - new Date(friend.lastActive).getTime() < ONLINE_THRESHOLD_MS
    ? "online"
    : "offline";
}

const STATUS_CONFIG = {
  "in-battle": {
    dot: "bg-red-500",
    ring: "ring-red-500/30",
    label: "In Battle",
    labelClass: "text-red-400",
  },
  online: {
    dot: "bg-green-400",
    ring: "ring-green-400/20",
    label: "Online",
    labelClass: "text-green-400",
  },
  offline: {
    dot: "bg-zinc-600",
    ring: "ring-zinc-700/30",
    label: "Offline",
    labelClass: "text-zinc-600",
  },
};

function getRatingTier(rating: number) {
  if (rating >= 2000) return { label: "Master", color: "text-yellow-400" };
  if (rating >= 1500) return { label: "Expert", color: "text-sky-400" };
  if (rating >= 1000) return { label: "Rated", color: "text-violet-400" };
  return { label: "Beginner", color: "text-zinc-500" };
}

/* ─── sub-components ─────────────────────────────────────── */
const Avatar = ({
  friend,
  status,
}: {
  friend: Friend;
  status: "in-battle" | "online" | "offline";
}) => (
  <div className={`relative shrink-0 ring-2 rounded-full ${STATUS_CONFIG[status].ring}`}>
    {friend.image ? (
      <img
        src={friend.image}
        alt={friend.username}
        className="w-10 h-10 rounded-full object-cover"
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
        {friend.username?.[0]?.toUpperCase() ?? "?"}
      </div>
    )}
    {/* Status dot */}
    <span
      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${STATUS_CONFIG[status].dot} ${status === "online" ? "animate-pulse" : ""
        }`}
    />
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 border border-border/40 transition-colors">
    <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
    <div className="flex-1 flex flex-col gap-2">
      <div className="h-3 w-28 rounded bg-muted animate-pulse" />
      <div className="h-2.5 w-16 rounded bg-muted/60 animate-pulse" />
    </div>
  </div>
);

/* ─── main component ─────────────────────────────────────── */
export const FriendsList: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [filter, setFilter] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sseToken, setSseToken] = useState<string | null>(null);
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  // add-friend state
  const [addOpen, setAddOpen] = useState(false);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // remove state
  const [removing, setRemoving] = useState<string | null>(null);

  /* fetch */
  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (data.success) {
        setFriends(data.friends);
        if (data.userId) setUserId(data.userId);
      }
      else if (res.status === 401) setIsGuest(true);
    } catch {
      setIsGuest(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
    // Poll every 30s to refresh lastActive / currentBattleId
    const id = setInterval(fetchFriends, 30_000);
    return () => clearInterval(id);
  }, [fetchFriends]);

  /* SSE Token Fetching */
  const fetchSseToken = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/sse-token");
      const data = await res.json();
      if (data.success) {
        setSseToken(data.sseToken);
        if (data.userId) setUserId(data.userId);
      }
    } catch (err) {
      console.error("Failed to fetch SSE token:", err);
    }
  }, []);

  useEffect(() => {
    fetchSseToken();
    // Refresh token every 9 minutes (tokens expire in 10m)
    const id = setInterval(fetchSseToken, 9 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchSseToken]);

  // SSE Effect
  useEffect(() => {
    if (!userId || !sseToken) return;
    const sseUrl = `https://matchmake.codearena.pro/sse/friends?userId=${userId}&token=${sseToken}`;
    const source = new EventSource(sseUrl);

    source.addEventListener("friends_update", (e) => {
      try {
        const onlineIds: string[] = JSON.parse(e.data);
        setOnlineSet(new Set(onlineIds || []));
      } catch (err) { }
    });

    source.onerror = () => {
      // If the connection fails, it might be due to an expired token
      // Triggering fetchSseToken will update sseToken and restart the effect
      fetchSseToken();
    };

    return () => {
      source.close();
    };
  }, [userId, sseToken]);

  useEffect(() => {
    if (addOpen) setTimeout(() => inputRef.current?.focus(), 80);
    else setInput("");
  }, [addOpen]);

  /* handlers */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = input.trim();
    if (!username) return;
    setAdding(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.friend.username} added!`);
        setFriends((prev) => [data.friend, ...prev]);
        setInput("");
        setAddOpen(false);
      } else {
        toast.error(data.message || "Failed to add friend");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (friendId: string) => {
    setRemoving(friendId);
    try {
      const res = await fetch(`/api/friends/${friendId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFriends((prev) => prev.filter((f) => f._id !== friendId));
        toast.success("Friend removed");
      } else {
        toast.error(data.message || "Failed to remove");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setRemoving(null);
    }
  };

  const handleInvite = (username: string) => {
    // Navigate to home with ?challenge= to pre-fill the battle modal
    window.location.href = `/?challenge=${encodeURIComponent(username)}`;
  };

  /* derived */
  const filtered = friends.filter((f) =>
    f.username.toLowerCase().includes(filter.toLowerCase())
  );

  // Sort: in-battle → online → offline
  const sorted = [...filtered].sort((a, b) => {
    const order = { "in-battle": 0, online: 1, offline: 2 };
    return order[getStatus(a, onlineSet)] - order[getStatus(b, onlineSet)];
  });

  const onlineCount = friends.filter((f) => getStatus(f, onlineSet) !== "offline").length;

  /* ── loading ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-2xl">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  /* ── guest ────────────────────────────────────────────── */
  if (isGuest) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted/30 border border-border/40 text-sm text-muted-foreground w-full max-w-2xl transition-colors">
        <WifiOff className="w-4 h-4 shrink-0" />
        Log in to see your friends list.
      </div>
    );
  }

  /* ── main ─────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium transition-colors">
          <Users className="w-4 h-4" />
          <span>Friends</span>
          {onlineCount > 0 && (
            <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/20 text-zinc-900 dark:text-zinc-100">
              {onlineCount} Active
            </span>
          )}
          {friends.length > 0 && (
            <span className="text-[12px] text-zinc-900 dark:text-zinc-100">/ {friends.length}</span>
          )}
        </div>

        <button
          onClick={() => setAddOpen((o) => !o)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-all ${addOpen
              ? "bg-primary text-primary-foreground"
              : "bg-muted/40 border border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* ── Add friend form ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.form
            key="add-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            onSubmit={handleAdd}
            className="overflow-hidden"
            style={{ willChange: "height, opacity" }}
          >
            <div className="flex gap-2 pb-1 pt-0.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Username…"
                disabled={adding}
                className="flex-1 bg-muted/50 border border-border focus:border-primary/50 focus:outline-none text-sm text-foreground placeholder-muted-foreground px-3 py-2 rounded-xl transition-colors"
              />
              <button
                type="submit"
                disabled={adding || !input.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-900 font-bold text-sm transition-colors cursor-pointer"
              >
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ── Search (only if enough friends) ── */}
      {friends.length >= 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search friends…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      )}

      {/* ── List ── */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-zinc-700">
          <Users className="w-8 h-8 opacity-40" />
          <span className="text-sm">
            {friends.length === 0
              ? "No friends yet — add someone to get started"
              : "No results"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {sorted.map((friend, i) => {
              const status = getStatus(friend, onlineSet);
              const cfg = STATUS_CONFIG[status];
              const tier = getRatingTier(friend.rating);

              return (
                <motion.div
                  key={friend._id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18, delay: i * 0.03 }}
                  style={{ willChange: "transform, opacity" }}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${status === "in-battle"
                      ? "bg-red-500/5 border-red-500/15 hover:border-red-500/25"
                      : status === "online"
                        ? "bg-primary/5 border-primary/10 hover:border-primary/20"
                        : "bg-muted/20 border-border/40 hover:border-border/60"
                    }`}
                >
                  <Avatar friend={friend} status={status} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {friend.username}
                      </span>
                      <span className={`text-[10px] font-semibold ${tier.color}`}>
                        {friend.rating}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {status === "in-battle" ? (
                        <>
                          <Swords className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="text-[11px] text-red-400 font-medium">In battle</span>
                        </>
                      ) : status === "online" ? (
                        <>
                          <Wifi className="w-3 h-3 text-green-400 shrink-0" />
                          <span className="text-[11px] text-green-400 font-medium">Online</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-zinc-600">Offline</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Invite button — only when NOT in battle */}
                    {status !== "in-battle" && (
                      <button
                        onClick={() => handleInvite(friend.username)}
                        title="Challenge to battle"
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:border-green-500/40 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <Swords className="w-3 h-3" />
                        Invite
                      </button>
                    )}

                    {/* In-battle badge — static, always visible */}
                    {status === "in-battle" && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                        ⚔ Playing
                      </span>
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(friend._id)}
                      disabled={removing === friend._id}
                      title="Remove friend"
                      className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer disabled:opacity-40 opacity-0 group-hover:opacity-100"
                    >
                      {removing === friend._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserMinus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
