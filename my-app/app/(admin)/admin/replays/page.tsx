'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, Play, Pause, SkipBack, SkipForward, Clock, Users,
  Swords, ChevronLeft, ChevronRight, Zap, Eye, X, Maximize2,
  FastForward, Rewind, Flag, Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';

// ─── Types ───
interface Recording {
  _id: string;
  battleId: string;
  player1Username: string;
  player2Username: string;
  duration: number;
  problems: { id: number; title: string; difficulty: string }[];
  createdAt: string;
  report?: {
    reportId: string;
    status: string;
    category: string;
  } | null;
}

interface Snapshot {
  timestamp: number;
  player1: { code: string | null; problemIndex: number; event?: string };
  player2: { code: string | null; problemIndex: number; event?: string };
}

interface FullRecording extends Recording {
  snapshots: Snapshot[];
}

// ─── Helper ───
const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const difficultyColor = (d: string) => {
  const dl = d.toLowerCase();
  if (dl === 'easy') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (dl === 'hard') return 'bg-red-500/10 text-red-500 border-red-500/20';
  return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
};

const eventBadge = (event: string) => {
  const colors: Record<string, string> = {
    run: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    submit: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    accepted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    wrong_answer: 'bg-red-500/20 text-red-400 border-red-500/30',
    solved: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40',
    surrender: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    draw: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
  return colors[event] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
};

// ─── Page ───
export default function ReplaysPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeRecording, setActiveRecording] = useState<FullRecording | null>(null);
  const [loadingReplay, setLoadingReplay] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchRecordings = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/recordings?page=${p}&limit=15`);
      const data = await res.json();
      setRecordings(data.recordings || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings(page);
  }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/recordings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Recording deleted');
        setRecordings((prev) => prev.filter((r) => r._id !== id));
        setTotal((prev) => prev - 1);
      } else {
        toast.error('Failed to delete recording');
      }
    } catch (err) {
      toast.error('Error deleting recording');
    } finally {
      setDeletingId(null);
    }
  };

  const openReplay = async (id: string) => {
    setLoadingReplay(true);
    try {
      const res = await fetch(`/api/admin/recordings/${id}`);
      const data = await res.json();
      setActiveRecording(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReplay(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-6 sm:py-10 selection:bg-primary/30 transition-colors overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Battle Replays</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Watch recorded battles • Auto-deleted after 5 days
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/40">
            <Film className="h-3 w-3" />
            {total} recording{total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Recordings List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/30 border border-border/60 rounded-3xl backdrop-blur-sm overflow-hidden"
        >
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1fr_80px_110px_110px_140px] gap-4 px-6 py-4 border-b border-border/40 bg-muted/10">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Players</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Problems</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duration</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recorded</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Expires</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading recordings...</span>
              </div>
            </div>
          ) : recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Film className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-sm font-medium">No recordings found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Battles will be recorded automatically</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {recordings.map((rec) => {
                const created = new Date(rec.createdAt);
                const expires = new Date(created.getTime() + 5 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const daysLeft = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                return (
                  <motion.div
                    key={rec._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-[1fr_1fr_80px_110px_110px_140px] gap-4 px-6 py-4 items-center hover:bg-muted/10 transition-colors group"
                  >
                    {/* Players */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-sm font-semibold truncate">{rec.player1Username}</span>
                        <span className="text-xs text-muted-foreground/50 italic">vs</span>
                        <span className="text-sm font-semibold truncate">{rec.player2Username}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/40 pl-5.5 truncate">
                        {rec.battleId?.toString().slice(0, 12)}…
                      </span>
                    </div>

                    {/* Problems */}
                    <div className="flex gap-1.5 flex-wrap">
                      {rec.problems?.map((p) => (
                        <span
                          key={p.id}
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${difficultyColor(p.difficulty)}`}
                        >
                          {p.difficulty}
                        </span>
                      )) || <span className="text-xs text-muted-foreground">—</span>}
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-xs font-mono font-medium">{formatDuration(rec.duration)}</span>
                    </div>

                    {/* Recorded Date */}
                    <span className="text-xs text-muted-foreground font-mono">
                      {created.toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Expires */}
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${daysLeft <= 1 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className={`text-xs font-medium ${daysLeft <= 1 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {daysLeft}d remaining
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5">
                      {rec.report && (
                        <button
                          onClick={() => router.push(`/admin/reports`)}
                          title={`Report: ${rec.report.category} (${rec.report.status})`}
                          className={`p-1.5 rounded-lg transition-colors ${
                            rec.report.status === 'Pending'
                              ? 'text-amber-500 hover:bg-amber-500/10 animate-pulse'
                              : rec.report.status === 'Accepted'
                              ? 'text-red-500 hover:bg-red-500/10'
                              : 'text-zinc-500 hover:bg-zinc-500/10'
                          }`}
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReplay(rec._id)}
                        className="h-7 text-xs border-primary/20 text-primary hover:bg-primary/10 gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-3 w-3" />
                        Watch
                      </Button>
                      <button
                        onClick={() => handleDelete(rec._id)}
                        disabled={deletingId === rec._id}
                        title="Delete recording"
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {deletingId === rec._id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4 border-t border-border/30">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-7 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-mono text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="h-7 text-xs"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Replay Viewer Modal */}
      <AnimatePresence>
        {(activeRecording || loadingReplay) && (
          <ReplayViewer
            recording={activeRecording}
            loading={loadingReplay}
            onClose={() => { setActiveRecording(null); setLoadingReplay(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Replay Viewer Component ───
function ReplayViewer({
  recording,
  loading,
  onClose,
}: {
  recording: FullRecording | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reconstruct the code state at a given timestamp
  const getStateAt = useCallback(
    (time: number, player: 'player1' | 'player2') => {
      if (!recording?.snapshots) return { code: '// No data', problemIndex: 0, event: undefined as string | undefined };

      let lastCode = '// Battle started...';
      let lastProblemIndex = 0;
      let currentEvent: string | undefined = undefined;

      // Binary search for the last snapshot at or before `time`
      let lo = 0, hi = recording.snapshots.length - 1;
      let bestIdx = -1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (recording.snapshots[mid].timestamp <= time) {
          bestIdx = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      // Walk from start to bestIdx to reconstruct state (code is diff-compressed)
      for (let i = 0; i <= bestIdx; i++) {
        const snap = recording.snapshots[i];
        const pData = snap[player];
        if (pData.code !== null && pData.code !== undefined) {
          lastCode = pData.code;
        }
        lastProblemIndex = pData.problemIndex;
        // Show event if it's within 0.5s of current time (visible for ~2 frames)
        if (Math.abs(snap.timestamp - time) < 0.5 && pData.event) {
          currentEvent = pData.event;
        }
      }

      return { code: lastCode, problemIndex: lastProblemIndex, event: currentEvent };
    },
    [recording]
  );

  // Get all events for timeline markers
  const getEvents = useCallback(() => {
    if (!recording?.snapshots) return [];
    const events: { timestamp: number; player: string; event: string }[] = [];
    for (const snap of recording.snapshots) {
      if (snap.player1.event) events.push({ timestamp: snap.timestamp, player: 'P1', event: snap.player1.event });
      if (snap.player2.event) events.push({ timestamp: snap.timestamp, player: 'P2', event: snap.player2.event });
    }
    return events;
  }, [recording]);

  // Playback control
  useEffect(() => {
    if (isPlaying && recording) {
      const maxTime = recording.duration || recording.snapshots[recording.snapshots.length - 1]?.timestamp || 0;
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = Math.round((prev + 0.25) * 100) / 100; // advance 0.25s per tick
          if (next >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return next;
        });
      }, 250 / playbackSpeed); // 250ms base interval = 4fps at 1x
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, recording]);

  const maxTime = recording
    ? recording.duration || recording.snapshots[recording.snapshots.length - 1]?.timestamp || 0
    : 0;

  const p1State = getStateAt(currentTime, 'player1');
  const p2State = getStateAt(currentTime, 'player2');
  const events = getEvents();

  const speeds = [0.5, 1, 2, 4];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#09090b] shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {recording ? `${recording.player1Username} vs ${recording.player2Username}` : 'Loading...'}
            </h2>
            <p className="text-[10px] text-zinc-500 font-mono">
              {recording ? `Battle ${recording.battleId.toString().slice(0, 8)}` : ''}
              {recording ? ` • ${new Date(recording.createdAt).toLocaleDateString()}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Speed Control */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${
                  playbackSpeed === s
                    ? 'bg-white text-black shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading || !recording ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading replay data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Editor Split View */}
          <div className="flex-1 flex min-h-0">
            {/* Player 1 */}
            <div className="flex-1 flex flex-col border-r border-white/5 min-w-0">
              <div className="flex items-center justify-between px-4 py-2 bg-[#121214] border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-zinc-300 tracking-tight">
                    {recording.player1Username}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Player 1</span>
                </div>
                <div className="flex items-center gap-2">
                  {p1State.event && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${eventBadge(p1State.event)}`}>
                      {p1State.event.replace('_', ' ')}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-zinc-600">
                    Problem {p1State.problemIndex + 1}
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-[#09090b]">
                <Editor
                  height="100%"
                  language="cpp"
                  theme="vs-dark"
                  value={p1State.code}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineHeight: 22,
                    padding: { top: 12, bottom: 12 },
                    scrollBeyondLastLine: false,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                    renderLineHighlight: 'none',
                    domReadOnly: true,
                  }}
                />
              </div>
            </div>

            {/* Player 2 */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between px-4 py-2 bg-[#121214] border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-zinc-300 tracking-tight">
                    {recording.player2Username}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Player 2</span>
                </div>
                <div className="flex items-center gap-2">
                  {p2State.event && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${eventBadge(p2State.event)}`}>
                      {p2State.event.replace('_', ' ')}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-zinc-600">
                    Problem {p2State.problemIndex + 1}
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-[#09090b]">
                <Editor
                  height="100%"
                  language="cpp"
                  theme="vs-dark"
                  value={p2State.code}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineHeight: 22,
                    padding: { top: 12, bottom: 12 },
                    scrollBeyondLastLine: false,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                    renderLineHighlight: 'none',
                    domReadOnly: true,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Timeline / Controls */}
          <div className="shrink-0 bg-[#09090b] border-t border-white/5 px-5 py-4">
            {/* Event Markers + Timeline Bar */}
            <div className="relative mb-4">
              {/* Event marker dots on the timeline */}
              <div className="absolute inset-x-0 top-0 h-4 z-10 pointer-events-none">
                {events.map((ev, i) => {
                  const pos = maxTime > 0 ? (ev.timestamp / maxTime) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="absolute -translate-x-1/2 group/marker"
                      style={{ left: `${pos}%` }}
                      title={`${ev.player}: ${ev.event} @ ${formatDuration(ev.timestamp)}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full border ${
                          ev.event === 'accepted' || ev.event === 'solved'
                            ? 'bg-emerald-500 border-emerald-400'
                            : ev.event === 'wrong_answer'
                            ? 'bg-red-500 border-red-400'
                            : ev.event === 'surrender'
                            ? 'bg-rose-500 border-rose-400'
                            : 'bg-blue-500 border-blue-400'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Scrubber */}
              <div className="pt-5">
                <input
                  type="range"
                  min={0}
                  max={maxTime}
                  step={0.25}
                  value={currentTime}
                  onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                  className="w-full h-1.5 appearance-none bg-zinc-800 rounded-full cursor-pointer outline-none
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-white/20 [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary/50
                    [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                  style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
                      maxTime > 0 ? (currentTime / maxTime) * 100 : 0
                    }%, #27272a ${maxTime > 0 ? (currentTime / maxTime) * 100 : 0}%, #27272a 100%)`,
                  }}
                />
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Jump back 10s */}
                <button
                  onClick={() => setCurrentTime((prev) => Math.max(0, prev - 10))}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Back 10s"
                >
                  <Rewind className="h-4 w-4" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={() => {
                    if (currentTime >= maxTime) setCurrentTime(0);
                    setIsPlaying(!isPlaying);
                  }}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>

                {/* Jump forward 10s */}
                <button
                  onClick={() => setCurrentTime((prev) => Math.min(maxTime, prev + 10))}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Forward 10s"
                >
                  <FastForward className="h-4 w-4" />
                </button>
              </div>

              {/* Time Display */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-white tabular-nums">
                  {formatDuration(currentTime)}
                </span>
                <span className="text-xs text-zinc-600">/</span>
                <span className="text-sm font-mono text-zinc-500 tabular-nums">
                  {formatDuration(maxTime)}
                </span>
              </div>

              {/* Speed indicator */}
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <Zap className={`h-3 w-3 ${playbackSpeed > 1 ? 'text-amber-500' : ''}`} />
                {playbackSpeed}x Speed
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
