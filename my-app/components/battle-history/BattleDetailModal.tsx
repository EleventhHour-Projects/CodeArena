"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Loader2, Code2, Clock, CheckCircle2, XCircle, AlertCircle, Trophy } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

// Custom Badge component since it's missing from UI
const CustomBadge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
    {children}
  </span>
);

interface BattleDetailModalProps {
  battleId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BattleDetailModal({ battleId, isOpen, onClose }: BattleDetailModalProps) {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedProblemIndex, setSelectedProblemIndex] = useState(0);

  useEffect(() => {
    if (isOpen && battleId) {
      setLoading(true);
      fetch(`/api/user/battles/${battleId}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success) {
            setData(resData);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, battleId]);

  if (!isOpen) return null;

  const battle = data?.battle;
  const submissions = data?.submissions || [];
  const currentProblem = battle?.problems?.[selectedProblemIndex];
  const submissionForProblem = submissions.find(
    (s: any) => s.problem.id === currentProblem?.id
  );

  // Determine user's result for display
  const isPlayer1 = session?.user?.email === battle?.player1?.email;
  const userResult = !battle?.winner ? 'draw' : 
                    (battle.winner.toString() === (isPlayer1 ? battle.player1._id.toString() : battle.player2._id.toString()) ? 'win' : 'loss');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto bg-card border-border p-0 gap-0">
        <DialogTitle className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: '0' }}>
          Battle Details
        </DialogTitle>
        <DialogDescription className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: '0' }}>
          Overview of battle results, problems, and submissions.
        </DialogDescription>
        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !battle ? (
          <div className="p-8 text-center text-muted-foreground">
            Failed to load battle details.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header Section */}
            <DialogHeader className="p-6 bg-muted/20 border-b border-border space-y-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-primary/20">
                      <AvatarImage src={isPlayer1 ? battle.player1.image : battle.player2.image} />
                      <AvatarFallback className="bg-muted text-foreground font-bold">VS</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                      Battle Against {isPlayer1 ? battle.player2.username : battle.player1.username}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(battle.createdAt), "PPP p")}
                    </p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1.5">
                  <CustomBadge className={
                    userResult === 'win' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                    userResult === 'loss' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }>
                    {userResult === 'draw' ? "DRAW" : 
                     (userResult === 'win' ? "VICTORY" : "DEFEAT")}
                  </CustomBadge>
                  <p className="text-xs font-mono text-muted-foreground mt-1">ID: {battle._id.substring(0, 8)}...</p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
              {/* Problem Sidebar */}
              <div className="w-full lg:w-72 border-r border-border p-4 bg-muted/5 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Problems</h3>
                {battle.problems.map((prob: any, idx: number) => {
                  const result = battle.problemResults.find((r: any) => r.problem.id === prob.id);
                  const isSolved = isPlayer1 ? (result?.player1SolveTime > 0) : (result?.player2SolveTime > 0);
                  return (
                    <button
                      key={prob.id}
                      onClick={() => setSelectedProblemIndex(idx)}
                      className={`flex flex-col p-3 rounded-xl text-left transition-all border ${
                        selectedProblemIndex === idx
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase ${
                          prob.difficulty?.toLowerCase() === 'easy' ? 'text-emerald-500' :
                          prob.difficulty?.toLowerCase() === 'medium' ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {prob.difficulty}
                        </span>
                        {isSolved ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-muted-foreground/30" />
                        )}
                      </div>
                      <span className="text-sm font-semibold truncate text-foreground">{prob.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Main Detail Area */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Problem Results
                  </h3>
                  {(() => {
                    const result = battle.problemResults.find((r: any) => r.problem.id === currentProblem?.id);
                    const yourTime = isPlayer1 ? result?.player1SolveTime : result?.player2SolveTime;
                    const opponentTime = isPlayer1 ? result?.player2SolveTime : result?.player1SolveTime;

                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Your Time</p>
                          <p className="text-xl font-bold text-foreground">
                            {yourTime > 0 ? `${Math.round(yourTime)}s` : "—"}
                          </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Opponent Time</p>
                          <p className="text-xl font-bold text-foreground">
                            {opponentTime > 0 ? `${Math.round(opponentTime)}s` : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex-1 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-primary" />
                      Your Submission
                    </h3>
                    {submissionForProblem ? (
                      <CustomBadge className={
                        submissionForProblem.status === 'Accepted' 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }>
                        {submissionForProblem.status}
                      </CustomBadge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No submission found</span>
                    )}
                  </div>

                  {submissionForProblem ? (
                    <div className="flex-1 rounded-2xl overflow-hidden border border-border bg-black/5 dark:bg-black/20">
                      <Editor
                        height="400px"
                        language={submissionForProblem.language || "cpp"}
                        value={submissionForProblem.code}
                        theme={resolvedTheme === 'dark' ? "vs-dark" : "light"}
                        loading={<Loader2 className="w-6 h-6 animate-spin" />}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 16, bottom: 16 }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                      <AlertCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
                      <p className="text-muted-foreground">You didn't submit code for this problem in this battle.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
