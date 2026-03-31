"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Send, User, CheckCircle2, Clock, Search, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

type Target = "user" | "all";

type SentNotification = {
  _id: string;
  message: string;
  createdAt: string;
  userId?: { username?: string };
};

type UserSuggestion = {
  _id: string;
  username: string;
  image?: string;
};

export default function AdminNotifyPage() {
  const [target, setTarget] = useState<Target>("user");
  const [username, setUsername] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState<SentNotification[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [confirmBroadcast, setConfirmBroadcast] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced fetch
  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.users || []);
          setShowSuggestions(true);
          setSuggestionIdx(-1);
        }
      } catch {} finally {
        setLoadingSuggestions(false);
      }
    }, 200);
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    fetchSuggestions(val);
  };

  const selectUser = (u: UserSuggestion) => {
    setUsername(u.username);
    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && suggestionIdx >= 0) {
      e.preventDefault();
      selectUser(suggestions[suggestionIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await fetch("/api/admin/notify");
      if (res.ok) {
        const data = await res.json();
        setRecent(data.notifications || []);
      }
    } catch {
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => { fetchRecent(); }, []);

  const handleSend = async () => {
    if (!message.trim()) { toast.error("Message cannot be empty"); return; }
    if (target === "user" && !username.trim()) { toast.error("Enter a username"); return; }
    if (target === "all" && !confirmBroadcast) { setConfirmBroadcast(true); return; }

    setSending(true);
    setConfirmBroadcast(false);
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, username: username.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(
        target === "all"
          ? `Broadcast sent to ${data.sent} users`
          : `Notification sent to @${username}`
      );
      setMessage("");
      setUsername("");
      fetchRecent();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const charLimit = 280;

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 selection:bg-primary/30">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest mb-2">
            <Bell className="h-3.5 w-3.5" />
            Admin · Notifications
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Send Notification</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Push a system message directly to a specific user or broadcast to everyone.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── COMPOSE PANEL ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-3 space-y-5"
          >
            {/* Target selector */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-3">
                Send to
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(["user", "all"] as Target[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTarget(t); setConfirmBroadcast(false); }}
                    className={`
                      flex items-center gap-3 rounded-xl p-4 border transition-all text-left
                      ${target === t
                        ? t === "all"
                          ? "border-amber-500/50 bg-amber-500/8 text-foreground"
                          : "border-indigo-500/50 bg-indigo-500/8 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-border/80 hover:text-foreground"}
                    `}
                  >
                    {t === "user"
                      ? <User className={`h-5 w-5 shrink-0 ${target === "user" ? "text-indigo-400" : ""}`} />
                      : <Megaphone className={`h-5 w-5 shrink-0 ${target === "all" ? "text-amber-400" : ""}`} />
                    }
                    <div>
                      <p className="font-semibold text-sm capitalize">{t === "all" ? "Everyone" : "Single User"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t === "all" ? "Broadcast to all users" : "Send to one account"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Username input (single user only) */}
            <AnimatePresence>
              {target === "user" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border rounded-2xl p-5 overflow-visible"
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-3">
                    Username
                  </p>
                  <div className="relative">
                    {/* Input */}
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    {loadingSuggestions && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin z-10" />
                    )}
                    <input
                      ref={inputRef}
                      value={username}
                      onChange={handleUsernameChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => username && suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Start typing a username…"
                      autoComplete="off"
                      className="w-full pl-9 pr-9 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition"
                    />

                    {/* Dropdown */}
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                          ref={dropdownRef}
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
                        >
                          {suggestions.map((u, idx) => (
                            <button
                              key={u._id}
                              onMouseDown={(e) => { e.preventDefault(); selectUser(u); }}
                              onMouseEnter={() => setSuggestionIdx(idx)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                idx === suggestionIdx
                                  ? "bg-indigo-500/10 text-foreground"
                                  : "hover:bg-muted/60 text-foreground"
                              }`}
                            >
                              {/* Avatar */}
                              <div className="h-7 w-7 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                                {u.image ? (
                                  <Image src={u.image} alt={u.username} width={28} height={28} className="object-cover" />
                                ) : (
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{u.username}</p>
                              </div>
                              {idx === suggestionIdx && (
                                <span className="ml-auto text-[10px] text-indigo-400 shrink-0">↵ select</span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message composer */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Message</p>
                <span className={`text-[11px] font-mono ${message.length > charLimit ? "text-rose-400" : "text-muted-foreground"}`}>
                  {message.length}/{charLimit}
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your notification message here..."
                rows={5}
                className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition"
              />
            </div>

            {/* Broadcast confirm warning */}
            <AnimatePresence>
              {confirmBroadcast && target === "all" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-amber-500/8 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3"
                >
                  <Megaphone className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-400">Broadcast to all users?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This will send a notification to every registered user. Click Send again to confirm.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={sending || message.length > charLimit}
              className={`w-full h-11 font-semibold flex items-center gap-2 transition-all ${
                target === "all"
                  ? "bg-amber-500 hover:bg-amber-400 text-black"
                  : "bg-indigo-500 hover:bg-indigo-400 text-white"
              }`}
            >
              {sending ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending
                ? "Sending..."
                : confirmBroadcast && target === "all"
                ? "Confirm Broadcast"
                : target === "all"
                ? "Broadcast to Everyone"
                : "Send to User"}
            </Button>
          </motion.div>

          {/* ── RECENT PANEL ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-card border border-border rounded-2xl overflow-hidden h-full flex flex-col">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Recent Sent
                </h3>
                <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                  Last 50
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[520px]">
                {loadingRecent ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
                ) : recent.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center gap-3 text-muted-foreground">
                    <Bell className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No notifications sent yet</p>
                  </div>
                ) : (
                  recent.map((n, i) => (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 border-b border-border/40 hover:bg-muted/20 transition-colors last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          {n.userId?.username && (
                            <p className="text-[10px] text-indigo-400 font-semibold mb-1">
                              @{n.userId.username}
                            </p>
                          )}
                          <p className="text-xs text-foreground break-words leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
