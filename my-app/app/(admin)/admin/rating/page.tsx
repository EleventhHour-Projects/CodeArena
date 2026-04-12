'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Search, User, Trophy, Swords,
  Clock, Zap, Target, ArrowUp, ArrowDown, Send, X, Check,
  Star, Flame, Award, LucideIcon, Camera, ShieldAlert, ShieldCheck, History,
  Ban, Calendar, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Image from 'next/image';

// ─── Types ───
interface UserResult {
  _id: string;
  username: string;
  image?: string;
}

interface UserDetails {
  _id: string;
  username: string;
  name: string;
  email: string;
  image?: string;
  rating: number;
  battlesPlayed: number;
  battlesWon: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
  lastActive: string;
  fastestVictory: { hours: number; minutes: number; seconds: number };
  averageWinningTime: { hours: number; minutes: number; seconds: number };
  totalTimeSpentInBattles: { hours: number; minutes: number; seconds: number };
  totalProblemsSolved: { easy: number; medium: number; hard: number };
  isBanned?: boolean;
  banExpires?: string | null;
}

// ─── Helpers ───
const formatTime = (t: { hours: number; minutes: number; seconds: number } | null | undefined) => {
  if (!t || (!t.hours && !t.minutes && !t.seconds)) return '—';
  const parts = [];
  if (t.hours) parts.push(`${t.hours}h`);
  if (t.minutes) parts.push(`${t.minutes}m`);
  if (t.seconds) parts.push(`${t.seconds}s`);
  return parts.join(' ');
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border/60 p-4 rounded-2xl flex items-start gap-4">
      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const getRank = (rating: number) => {
  if (rating >= 2000) return { label: 'Grandmaster', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
  if (rating >= 1600) return { label: 'Master', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  if (rating >= 1200) return { label: 'Expert', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' };
  if (rating >= 800) return { label: 'Specialist', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
  if (rating >= 400) return { label: 'Apprentice', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
  return { label: 'Newbie', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' };
};

// ─── Template Reasons ───
const REASON_TEMPLATES = [
  'Rating correction for recent battle',
  'Compensation for technical issue',
  'Penalty for unsportsmanlike conduct',
  'Manual adjustment by admin',
  'Bug compensation',
  'Event reward',
];

// ─── Page ───
export default function RatingPage() {
  // Search
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Selected user
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Rating form
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ban management
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<'perm' | '1d' | '7d' | '30d'>('1d');
  const [banSubmitting, setBanSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(value)}&limit=8`);
        const data = await res.json();
        setSuggestions(data.users || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  }, []);

  // Select a user from suggestions
  const selectUser = async (username: string) => {
    setShowSuggestions(false);
    setQuery(username);
    setLoadingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${username}`);
      const data = await res.json();
      if (data.user) {
        setSelectedUser(data.user);
      } else {
        toast.error('User not found');
        setSelectedUser(null);
      }
    } catch {
      toast.error('Failed to load user');
      setSelectedUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  // Submit rating adjustment
  const handleSubmit = async () => {
    if (!selectedUser || !amount) return;
    const amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid positive number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUser.username,
          amount: amt,
          reason,
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Rating ${action === 'add' ? 'added' : 'removed'}: ${data.previousRating} → ${data.newRating}`
        );
        // Update displayed rating
        setSelectedUser((prev) => prev ? { ...prev, rating: data.newRating } : null);
        setAmount('');
        setReason('');
      } else {
        toast.error(data.error || 'Failed to adjust rating');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch(`/api/admin/users/${selectedUser.username}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Profile photo updated');
          setSelectedUser((prev) => prev ? { ...prev, image: base64 } : null);
        } else {
          toast.error(data.error || 'Failed to update photo');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Ban/Unban
  const handleBanStatus = async (ban: boolean) => {
    if (!selectedUser) return;
    if (ban && !banReason) {
      toast.error('Please provide a reason for the ban');
      return;
    }

    setBanSubmitting(true);
    try {
      let banExpires: Date | null = null;
      if (ban) {
        if (banDuration === '1d') banExpires = new Date(Date.now() + 86400000);
        else if (banDuration === '7d') banExpires = new Date(Date.now() + 604800000);
        else if (banDuration === '30d') banExpires = new Date(Date.now() + 2592000000);
      }

      const res = await fetch(`/api/admin/users/${selectedUser.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBanned: ban,
          banExpires,
          banReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(ban ? 'User banned successfully' : 'User unbanned successfully');
        setSelectedUser((prev) => prev ? { ...prev, isBanned: ban, banExpires: banExpires?.toISOString() || null } : null);
        setBanReason('');
      } else {
        toast.error(data.error || 'Failed to update ban status');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBanSubmitting(false);
    }
  };

  const previewRating = selectedUser
    ? Math.max(0, selectedUser.rating + (action === 'add' ? 1 : -1) * (parseInt(amount) || 0))
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-6 sm:py-10 selection:bg-primary/30 transition-colors overflow-x-hidden">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Rating Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Adjust user ratings with notification delivery
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div ref={searchRef} className="relative mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search user by username..."
              className="w-full pl-11 pr-4 py-3.5 bg-card/30 border border-border/60 rounded-2xl text-sm font-medium
                placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40
                transition-all"
            />
            {searchLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-50 w-full mt-2 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
              >
                {suggestions.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => selectUser(user.username)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                  >
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.username}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted/30 flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                    <span className="text-sm font-semibold">{user.username}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Loading State */}
        {loadingUser && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading user details...</span>
            </div>
          </div>
        )}

        {/* User Details + Rating Form */}
        <AnimatePresence mode="wait">
          {selectedUser && !loadingUser && (
            <motion.div
              key={selectedUser._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* User Profile Card */}
              <div className="bg-card/30 border border-border/60 rounded-3xl p-6 backdrop-blur-sm">
                <div className="flex items-start gap-5">
                  {/* Avatar with Upload */}
                  <div className="relative group shrink-0">
                    {selectedUser.image ? (
                      <Image
                        src={selectedUser.image}
                        alt={selectedUser.username}
                        width={72}
                        height={72}
                        className={`h-[72px] w-[72px] rounded-2xl object-cover border border-border/40 transition-opacity ${uploadingImage ? 'opacity-50' : ''}`}
                      />
                    ) : (
                      <div className="h-[72px] w-[72px] rounded-2xl bg-muted/20 flex items-center justify-center border border-border/40">
                        <User className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    
                    {/* Ban Overlay */}
                    {selectedUser.isBanned && (
                      <div className="absolute inset-0 bg-red-950/40 rounded-2xl flex items-center justify-center pointer-events-none border border-red-500/50 backdrop-blur-[1px]">
                        <span className="text-white font-black text-[10px] uppercase tracking-widest px-2 py-1 bg-red-600 rounded-lg shadow-lg">BAN</span>
                      </div>
                    )}

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      {uploadingImage ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold tracking-tight">{selectedUser.username}</h2>
                      {(() => {
                        const rank = getRank(selectedUser.rating);
                        return (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${rank.bg} ${rank.color}`}>
                            {rank.label}
                          </span>
                        );
                      })()}
                      {selectedUser.isBanned && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-widest flex items-center gap-1">
                          <Ban className="h-2 w-2" /> Banned
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedUser.name} • {selectedUser.email}</p>
                    {selectedUser.isBanned && selectedUser.banExpires && (
                      <p className="text-[10px] text-red-400 font-bold mt-1">
                        BANNED UNTIL: {new Date(selectedUser.banExpires).toLocaleString()}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 font-mono mt-1">
                      Joined {new Date(selectedUser.createdAt).toLocaleDateString()} • Last active {new Date(selectedUser.lastActive).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Current Rating */}
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black tabular-nums tracking-tight">{selectedUser.rating}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rating</div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
                  <StatCard icon={Swords} label="Battles" value={selectedUser.battlesPlayed} />
                  <StatCard icon={Trophy} label="Wins" value={selectedUser.battlesWon} />
                  <StatCard
                    icon={Target}
                    label="Win Rate"
                    value={selectedUser.battlesPlayed > 0
                      ? `${Math.round((selectedUser.battlesWon / selectedUser.battlesPlayed) * 100)}%`
                      : '—'
                    }
                  />
                  <StatCard icon={Flame} label="Streak" value={selectedUser.currentStreak} sub={`Best: ${selectedUser.longestStreak}`} />
                  <StatCard icon={Zap} label="Fastest Win" value={formatTime(selectedUser.fastestVictory)} />
                  <StatCard icon={Clock} label="Avg Win" value={formatTime(selectedUser.averageWinningTime)} />
                </div>

                {/* Problems Solved */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Problems Solved</span>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Easy: {selectedUser.totalProblemsSolved.easy}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded border bg-amber-500/10 text-amber-500 border-amber-500/20">
                      Medium: {selectedUser.totalProblemsSolved.medium}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded border bg-red-500/10 text-red-500 border-red-500/20">
                      Hard: {selectedUser.totalProblemsSolved.hard}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground/60 ml-auto">
                    Total battle time: {formatTime(selectedUser.totalTimeSpentInBattles)}
                  </span>
                </div>
              </div>

              {/* Rating Adjustment Card */}
              <div className="bg-card/30 border border-border/60 rounded-3xl p-6 backdrop-blur-sm">
                <h3 className="text-sm font-bold tracking-tight mb-5 flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  Adjust Rating
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Action Toggle */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Action</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAction('add')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all ${
                          action === 'add'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-muted/10 border-border/40 text-muted-foreground hover:bg-muted/20'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4" />
                        Add Rating
                      </button>
                      <button
                        onClick={() => setAction('remove')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all ${
                          action === 'remove'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-muted/10 border-border/40 text-muted-foreground hover:bg-muted/20'
                        }`}
                      >
                        <TrendingDown className="h-4 w-4" />
                        Remove Rating
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter rating points..."
                        className="w-full pl-4 pr-20 py-3 bg-muted/10 border border-border/40 rounded-xl text-sm font-mono font-bold
                          placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                      />
                      {amount && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${action === 'add' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {action === 'add' ? '+' : '-'}{amount}
                          </span>
                          <ArrowDown className={`h-3 w-3 ${action === 'add' ? 'text-emerald-500 rotate-180' : 'text-red-500'}`} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating Preview */}
                {amount && parseInt(amount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 rounded-xl bg-muted/10 border border-border/30 flex items-center justify-center gap-4"
                  >
                    <span className="text-sm font-mono text-muted-foreground">{selectedUser.rating}</span>
                    <span className={`text-lg font-black ${action === 'add' ? 'text-emerald-400' : 'text-red-400'}`}>
                      →
                    </span>
                    <span className="text-lg font-black tabular-nums">{previewRating}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      action === 'add'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {action === 'add' ? '+' : '-'}{amount}
                    </span>
                  </motion.div>
                )}

                {/* Reason */}
                <div className="mt-5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Reason (sent in notification)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for rating adjustment..."
                    rows={2}
                    className="w-full px-4 py-3 bg-muted/10 border border-border/40 rounded-xl text-sm font-medium
                      placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40
                      transition-all resize-none"
                  />
                  {/* Quick Templates */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {REASON_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl}
                        onClick={() => setReason(tmpl)}
                        className="text-[10px] font-medium px-2 py-1 rounded-lg bg-muted/10 border border-border/30
                          text-muted-foreground/60 hover:text-foreground hover:bg-muted/20 hover:border-border/50 transition-all"
                      >
                        {tmpl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="mt-6 flex items-center gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !amount || parseInt(amount) <= 0}
                    className={`gap-2 font-bold ${
                      action === 'add'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {action === 'add' ? 'Add' : 'Remove'} {amount || '0'} Rating
                  </Button>
                  <span className="text-[10px] text-muted-foreground/50">
                    A notification will be sent to {selectedUser.username}
                  </span>
                </div>
              </div>

              {/* Ban Management Card */}
              <div className="bg-card/30 border border-red-500/20 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <ShieldAlert className="h-32 w-32 rotate-12" />
                </div>

                <h3 className="text-sm font-bold tracking-tight mb-5 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-400" />
                  Ban Management
                </h3>

                {selectedUser.isBanned ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                      <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-400">Account Currently Banned</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedUser.banExpires
                            ? `This suspension expires on ${new Date(selectedUser.banExpires).toLocaleString()}`
                            : 'This is a permanent account suspension.'}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleBanStatus(false)}
                        disabled={banSubmitting}
                        className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                      >
                        {banSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        Unban User
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Ban Duration</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: '1d', label: '24 Hours' },
                            { id: '7d', label: '7 Days' },
                            { id: '30d', label: '30 Days' },
                            { id: 'perm', label: 'Permanent' },
                          ].map((d) => (
                            <button
                              key={d.id}
                              onClick={() => setBanDuration(d.id as any)}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                                banDuration === d.id
                                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                  : 'bg-muted/10 border-border/40 text-muted-foreground hover:bg-muted/20'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Reason for Ban</label>
                        <textarea
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder="Provide a detailed reason for the ban..."
                          rows={3}
                          className="w-full px-4 py-3 bg-muted/10 border border-border/40 rounded-xl text-sm font-medium
                            placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/40
                            transition-all resize-none"
                        />
                      </div>
                      <Button
                        onClick={() => handleBanStatus(true)}
                        disabled={banSubmitting || !banReason}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
                      >
                        {banSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ShieldAlert className="h-4 w-4" />
                        )}
                        Ban {selectedUser.username}
                      </Button>
                    </div>

                    <div className="bg-muted/5 rounded-2xl p-4 border border-border/30 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                          <History className="h-3 w-3" />
                          Ban Consequences
                        </h4>
                        <ul className="space-y-2.5">
                          {[
                            'User cannot join new battles',
                            'Profile marked with ban status',
                            'Automated notification delivered',
                            'Public leaderboard removal',
                          ].map((text, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground font-medium">
                              <div className="h-1.5 w-1.5 rounded-full bg-red-500/40 mt-1" />
                              {text}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[10px] text-muted-foreground/40 mt-4 leading-relaxed italic">
                        All bans are logged and can be reviewed by super-admins. Ensure compliance with community guidelines.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!selectedUser && !loadingUser && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Search className="h-12 w-12 opacity-15 mb-4" />
            <p className="text-sm font-medium">Search for a user to get started</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Type a username above to find and manage their rating</p>
          </div>
        )}
      </div>
    </div>
  );
}

