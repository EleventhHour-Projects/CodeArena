'use client';

import { use, useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Clock, Handshake, Flag, ChevronLeft, ChevronRight, Play, Upload, CheckCircle2, Activity, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ReportModal } from "@/components/modals/ReportModal";
import { Button } from "@/components/ui/button";

// Minimal synthesized sound effects
const playTone = (freq: number, type: OscillatorType, duration: number) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};
const playRunSound = () => playTone(150, "sawtooth", 0.3); // Low engine hum
const playSuccessSound = () => {
  playTone(500, "sine", 0.1);
  setTimeout(() => playTone(800, "sine", 0.3), 100);
};

interface PageProps {
  params: Promise<{
    battleID: string;
  }>;
}

interface TestCase {
  id: number;
  input: string;
  output?: string;
}

interface Problem {
  id?: number;
  slug?: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  tags?: string[];
  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testcases: Array<{
    input: string;
    output: string;
  }>;
}

export default function BattlePage({ params }: PageProps) {
  const { data: session } = useSession();
  const resolvedParams = use(params);
  const battleID = resolvedParams.battleID;

  // Real-time WebSocket State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [opponentSolvedProblems, setOpponentSolvedProblems] = useState<Set<number>>(new Set());
  const [mySolvedProblems, setMySolvedProblems] = useState<Set<number>>(new Set());
  const [crackLevel, setCrackLevel] = useState(0);
  const [showHeartbeat, setShowHeartbeat] = useState(false);
  const [floatingMsg, setFloatingMsg] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [drawOffer, setDrawOffer] = useState<{ fromUserId: string } | null>(null);
  const [isSurrenderOpen, setIsSurrenderOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [drawsSent, setDrawsSent] = useState(0);
  const battleFinishedRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // WebSocket Connection and Event Handling
  useEffect(() => {
    if (!session?.user || !battleID) return;
    const currentUserId = (session.user as any).id;
    
    // Connect to backend server running Socket.IO (on port 3000 locally)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.emit("JOIN_BATTLE", { battleId: battleID, userId: currentUserId });

    newSocket.on("event", (event: any) => {
      const isOpponent = event.userId !== currentUserId;
      
      switch (event.type) {
        case "USER_RUN":
          if (isOpponent) {
            setShowHeartbeat(true);
            setTimeout(() => setShowHeartbeat(false), 2000);
            setFloatingMsg("Opponent is executing code...");
            setTimeout(() => setFloatingMsg(""), 3000);
            if (soundEnabledRef.current) playRunSound();
          }
          break;
        case "USER_RESULT":
          if (isOpponent) {
            if (event.data?.status === "WA") {
              setFloatingMsg("Opponent failed a testcase ❌");
            } else if (event.data?.status === "AC") {
              setFloatingMsg("Opponent passed all tests ✅");
            }
            setTimeout(() => setFloatingMsg(""), 3000);
          }
          break;
        case "USER_SOLVED":
          if (isOpponent) {
            setOpponentSolvedProblems(prev => new Set(prev).add(event.problemId));
            setCrackLevel(prev => Math.min(prev + 1, 3));
            setFloatingMsg("Opponent solved a problem ⚡");
            setTimeout(() => setFloatingMsg(""), 3000);
            if (soundEnabledRef.current) playSuccessSound();
          } else {
            setMySolvedProblems(prev => new Set(prev).add(event.problemId));
            setFloatingMsg("You solved a problem 🚀");
            setTimeout(() => setFloatingMsg(""), 3000);
            if (soundEnabledRef.current) playSuccessSound();
          }
          break;
        case "MATCH_COMPLETE":
          setCrackLevel(4);
          setFloatingMsg("Battle completed!");
          setTimeout(() => setFloatingMsg(""), 3000);
          break;
        case "USER_SURRENDER":
          if (isOpponent) {
            toast.success("Opponent has surrendered! You win! 🏆");
            const winnerResult = isMePlayer1 ? "player1" : "player2";
            handleBattleComplete(battleDetails, winnerResult);
          }
          break;
        case "DRAW_REQUEST":
          if (isOpponent) {
            setDrawOffer({ fromUserId: event.userId });
            toast.info("Opponent has offered a draw.");
          }
          break;
        case "DRAW_RESPONSE":
          if (isOpponent) {
            if (event.data?.accepted) {
              toast.success("Opponent accepted the draw offer.");
              handleBattleComplete(battleDetails, "draw");
            } else {
              toast.error("Opponent declined the draw offer.");
            }
          }
          break;
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [session, battleID]);

  const [battleDetails, setBattleDetails] = useState<any>(null);

  // Problem State
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const problem = problems[currentQuestion - 1]; // Active problem

  const [timeLeft, setTimeLeft] = useState(0);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [battleStats, setBattleStats] = useState<any>(null);
  
  const [code, setCode] = useState<string>("// Loading code...");
  const [executionResult, setExecutionResult] = useState<any>(null);
  const lastProblemIdRef = useRef<number | null>(null);

  // Persistence: Restore code on problem change
  useEffect(() => {
    if (battleID && problem?.id) {
       // Only restore if the problem ID actually changed to avoid cycles
       if (lastProblemIdRef.current !== problem.id) {
         const saved = localStorage.getItem(`code_${battleID}_${problem.id}`);
         if (saved) {
           setCode(saved);
         } else {
           setCode("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // Write your code here\n    return 0;\n}");
         }
         lastProblemIdRef.current = problem.id;
       }
    }
  }, [battleID, problem?.id]);

  // Persistence: Save code on change
  useEffect(() => {
    if (battleID && problem?.id && code && code !== "// Loading code...") {
      // Only save if the code matches the currently active problem ID ref
      if (lastProblemIdRef.current === problem.id) {
        localStorage.setItem(`code_${battleID}_${problem.id}`, code);
      }
    }
  }, [code, battleID, problem?.id]);

  useEffect(() => {
    async function fetchBattle() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/battle/${battleID}`);
        if (!res.ok) throw new Error('Failed to fetch battle context');
        const data = await res.json();
        const battle = data.battle;
        setBattleDetails(battle);

        if (session?.user) {
          const currentUserId = (session.user as any).id;
          const isP1 = String(battle.player1) === String(currentUserId);
          setDrawsSent(isP1 ? (battle.drawOffersA || 0) : (battle.drawOffersB || 0));
        }

        if (battle.status === "Completed") {
            setIsBattleOver(true);
            const statsRes = await fetch('/api/battle/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ battleId: battleID })
            });
            const statsData = await statsRes.json();
            setBattleStats(statsData);
        }

        if (battle.startTime || battle.createdAt) {
          const startTimestamp = new Date(battle.startTime || battle.createdAt).getTime();

           // Compute duration based on problems: Easy=10m, Medium=15m, Hard=35m
           let durationSeconds = (battle.problems || []).reduce((acc: number, p: any) => {
                  const diff = (p.difficulty || "").toLowerCase();
                  if (diff === "easy") return acc + (10 * 60);
                  if (diff === "hard") return acc + (35 * 60);
                  return acc + (15 * 60); // Default to 15m
              }, 0);

           if (durationSeconds === 0) durationSeconds = 5400; // fallback
          
          const endTimestamp = startTimestamp + (durationSeconds * 1000);
          setTargetEndTime(endTimestamp);
          
          const tL = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));
          setTimeLeft(tL);
        }
        
        // Fetch specific problems
        if (battle.problems && battle.problems.length > 0) {
            const problemIds = battle.problems.map((p: any) => p.id).join(',');
            const probRes = await fetch(`/api/battle/questions?ids=${problemIds}`);
            const probData = await probRes.json();
            setProblems(probData.problems || []);
        } else {
            toast.error("Critical Error: No problems assigned to this battle.");
            setProblems([]);
        }

      } catch (err) {
        console.error("Error fetching battle context:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBattle();
  }, [battleID, session]);

  const handleBattleComplete = async (currentBattle: any, resultOverride?: string) => {
    if (isBattleOver) return;
    setIsBattleOver(true);
    toast.info("Battle has ended! Computing final results...", { id: "battle_end" });
    try {
      // Clear localStorage for this battle
      if (currentBattle?.problems) {
        currentBattle.problems.forEach((p: any) => {
           localStorage.removeItem(`code_${battleID}_${p.id}`);
        });
      }

      const res = await fetch('/api/battle/complete', {
         method: 'POST', 
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ battleId: battleID, resultOverride }) 
      });
      const data = await res.json();
      setBattleStats(data);
    } catch (e) {
      toast.error("Failed to compute battle results.");
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (targetEndTime) {
          const now = Date.now();
          const tL = Math.max(0, Math.floor((targetEndTime - now) / 1000));
          setTimeLeft(tL);
          
          if (tL <= 0 && battleDetails && !isBattleOver) {
              handleBattleComplete(battleDetails);
              clearInterval(timer);
          }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetEndTime, battleDetails, isBattleOver]);

  // Editor and Panel State
  const [testcases, setTestcases] = useState<TestCase[]>([
    { id: 1, input: "" },
  ]);

  useEffect(() => {
    if (problem && problem.testcases) {
      const rawTestcases = Array.isArray(problem.testcases) 
          ? problem.testcases 
          : (problem.testcases as any)?.run || [];

      const mapped = rawTestcases.map((tc: any, index: number) => ({
        id: index + 1,
        input: tc.input,
        output: tc.output
      }));
      setTestcases(mapped);
      setActiveTestCaseId(1);
    } else {
      setTestcases([{ id: 1, input: "" }]);
    }
  }, [problem]);

  const [activeTestCaseId, setActiveTestCaseId] = useState(1);
  const [panelTab, setPanelTab] = useState("testcases"); // testcases, result
  const [language, setLanguage] = useState("cpp");
  const [activeTab, setActiveTab] = useState("description"); // description, submissions
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionType, setExecutionType] = useState<"Run" | "Submit" | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const fetchSubmissions = async () => {
    if (!session?.user || !problem?.id) return;
    try {
      const res = await fetch(`/api/submissions?battleId=${battleID}&problemId=${problem.id}&userId=${(session.user as any).id}`);
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab, currentQuestion, problem?.id]);

  const fetchBattleProgress = async () => {
    if (!battleID || !session?.user || !battleDetails) return;
    try {
      const res = await fetch(`/api/battle/${battleID}/progress`);
      const data = await res.json();
      if (data.success) {
        const currentUserId = (session.user as any).id;
        const isMeP1 = String(battleDetails.player1) === String(currentUserId);
        const myIds = isMeP1 ? data.player1Solved : data.player2Solved;
        const opIds = isMeP1 ? data.player2Solved : data.player1Solved;
        
        setMySolvedProblems(new Set(myIds.map(Number)));
        setOpponentSolvedProblems(new Set(opIds.map(Number)));
      }
    } catch (error) {
      console.error("Failed to fetch battle progress:", error);
    }
  };

  useEffect(() => {
    if (battleID && session?.user && battleDetails) {
      fetchBattleProgress();
    }
  }, [battleID, session, battleDetails, currentQuestion]);

  const pollSubmissionStatus = async (execId: string, type: "Run" | "Submit", toastId: string | number) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/submission-status/${execId}`);
        const data = await res.json();
        
        if (data.status !== "PENDING") {
           clearInterval(pollInterval);
           setIsExecuting(false);
           setExecutionResult(data);
           
           if (type === "Submit") {
             fetchSubmissions(); // Refresh submissions list
             if (data.status === "Accepted") {
                toast.success("Submission Accepted! 🎉", { id: toastId });
             } else {
                toast.error(`Submission Failed: ${data.status}`, { id: toastId });
             }
           } else {
               toast.info(`Run Completed: ${data.status}`, { id: toastId });
           }
        }
      } catch (e) {
         clearInterval(pollInterval);
         setIsExecuting(false);
         toast.error("Error checking submission status", { id: toastId });
      }
    }, 1500);
  };

  const handleExecute = async (type: "Run" | "Submit") => {
    if (!session?.user) {
      toast.error("Please log in to execute code");
      return;
    }
    if (!problem || !problem.id) {
      toast.error("Problem not loaded properly.");
      return;
    }

    setIsExecuting(true);
    setExecutionType(type);
    setPanelTab("result");
    setExecutionResult(null); // Clear previous results
    
    // Create a loading toast and capture its ID
    const toastId = "submission_status";
    toast.loading(`${type} initiated. Polling for results...`, { id: toastId });
    
    try {
      const response = await fetch('/api/battle/exec-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          userId: (session.user as { id: string }).id,
          battleId: battleID,
          difficulty: problem.difficulty.toLowerCase(),
          problemId: problem.id,
          type,
          testcases: type === "Run" ? testcases.map(t => ({ input: t.input, output: t.output })) : undefined
        }),
      });

      const data = await response.json();
      if (data.success) {
        pollSubmissionStatus(data.executionCode._id || data.executionCode.id || data.executionCode, type, toastId);
      } else {
        setIsExecuting(false);
        toast.error(data.error || `Failed to ${type} code`, { id: toastId });
      }
    } catch (err) {
      console.error(`Error during ${type}:`, err);
      setIsExecuting(false);
      toast.error(`A network error occurred during ${type}`, { id: toastId });
    }
  };

  const handleSurrender = () => {
    if (isBattleOver) return;
    setIsSurrenderOpen(true);
  };


  const confirmSurrender = () => {
    if (!socket || !session?.user || isBattleOver) return;
    const currentUserId = (session.user as any).id;
    
    socket.emit("event", {
      type: "USER_SURRENDER",
      battleId: battleID,
      userId: currentUserId,
      timestamp: Date.now()
    });
    
    const loserResult = isMePlayer1 ? "player2" : "player1";
    handleBattleComplete(battleDetails, loserResult);
    toast.error("You have surrendered the battle.");
    setIsSurrenderOpen(false);
  };

  const handleDrawRequest = async () => {
    if (!socket || !session?.user || isBattleOver) return;
    
    const currentUserId = (session.user as any).id;
    
    try {
      const res = await fetch('/api/battle/draw-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId: battleID, userId: currentUserId })
      });
      
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Failed to send draw offer.");
        return;
      }
      
      socket.emit("event", {
        type: "DRAW_REQUEST",
        battleId: battleID,
        userId: currentUserId,
        timestamp: Date.now()
      });
      
      setDrawsSent(data.count);
      toast.success(`Draw request sent (${data.count}/2).`);
    } catch (error) {
      console.error("Error sending draw offer:", error);
      toast.error("Failed to send draw offer due to a network error.");
    }
  };

  const handleDrawResponse = (accepted: boolean) => {
    if (!socket || !session?.user || !drawOffer) return;
    const currentUserId = (session.user as any).id;
    
    socket.emit("event", {
      type: "DRAW_RESPONSE",
      battleId: battleID,
      userId: currentUserId,
      data: { accepted },
      timestamp: Date.now()
    });
    
    setDrawOffer(null);
    if (accepted) {
      handleBattleComplete(battleDetails, "draw");
    } else {
      toast.info("You declined the draw offer.");
    }
  };

  const formatSolveTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return "Not Solved";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // Resizable Panes State
  const [leftWidth, setLeftWidth] = useState(45);
  const [topHeight, setTopHeight] = useState(70);
  const [isResizingHz, setIsResizingHz] = useState(false);
  const [isResizingVt, setIsResizingVt] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingHz && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
        // Clamp between 25% and 75% for safety
        if (newWidth >= 25 && newWidth <= 75) setLeftWidth(newWidth);
      } else if (isResizingVt && rightPaneRef.current) {
        const rect = rightPaneRef.current.getBoundingClientRect();
        const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
        // Clamp between 30% and 70% to prevent panels from vanishing
        if (newHeight >= 30 && newHeight <= 70) setTopHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingHz(false);
      setIsResizingVt(false);
      document.body.style.userSelect = 'auto';
    };

    if (isResizingHz || isResizingVt) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHz, isResizingVt]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const scrollbarClasses = "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700/50 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full";

  const isMePlayer1 = session?.user && battleDetails?.player1 && String(battleDetails.player1) === String((session.user as any).id);

  // Auto-complete battle when a player solves all problems
  useEffect(() => {
    if (isBattleOver || battleFinishedRef.current || !battleDetails || !problems || problems.length === 0) return;

    if (mySolvedProblems.size === problems.length) {
      battleFinishedRef.current = true;
      toast.dismiss("battle_end");
      toast.dismiss("submission_status");
      toast.success("Woah! You solved all problems! 🔥🏆", { id: "battle_finish_msg" });
      const winnerResult = isMePlayer1 ? "player1" : "player2";
      handleBattleComplete(battleDetails, winnerResult);
    } else if (opponentSolvedProblems.size === problems.length) {
      battleFinishedRef.current = true;
      toast.dismiss("battle_end");
      toast.dismiss("submission_status");
      toast.error("Oops... opponent solved all problems 😭⚡", { id: "battle_finish_msg" });
      const winnerResult = isMePlayer1 ? "player2" : "player1";
      handleBattleComplete(battleDetails, winnerResult);
    }
  }, [mySolvedProblems.size, opponentSolvedProblems.size, problems.length, battleDetails, isBattleOver, isMePlayer1]);
  const myStats = isMePlayer1 ? battleStats?.player1 : battleStats?.player2;
  const opponentStats = isMePlayer1 ? battleStats?.player2 : battleStats?.player1;
  const myScore = isMePlayer1 ? battleStats?.scoreA : battleStats?.scoreB;
  const opponentScore = isMePlayer1 ? battleStats?.scoreB : battleStats?.scoreA;

  let resultStatus = "DRAW";
  if (battleStats) {
      if (battleStats.result === "draw") resultStatus = "DRAW";
      else if (battleStats.result === "player1") resultStatus = isMePlayer1 ? "VICTORY" : "DEFEAT";
      else if (battleStats.result === "player2") resultStatus = isMePlayer1 ? "DEFEAT" : "VICTORY";
  }

  return (
    <div className="h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* Real-time Event Floating Msg */}
      {floatingMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#121214]/90 border border-white/10 px-6 py-2.5 rounded-full shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
           <span className="text-white text-xs font-bold tracking-wide">{floatingMsg}</span>
        </div>
      )}

      {/* Opponent Progress Crack Animation UI */}
      {crackLevel > 0 && crackLevel < 4 && (
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden mix-blend-overlay opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
             <defs>
               <filter id="crack-glow" x="-20%" y="-20%" width="140%" height="140%">
                 <feGaussianBlur stdDeviation="3" result="blur" />
                 <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
             </defs>
             {crackLevel >= 1 && (
               <path d="M 0 50 Q 150 100 200 250 T 350 400" stroke="white" strokeWidth="2" fill="none" filter="url(#crack-glow)" className="animate-in fade-in duration-700" />
             )}
             {crackLevel >= 2 && (
               <path d="M 100 0 Q 300 200 250 400 T 500 800" stroke="white" strokeWidth="3" fill="none" filter="url(#crack-glow)" className="animate-in fade-in duration-700 delay-300" />
             )}
             {crackLevel >= 3 && (
               <path d="M 800 0 Q 600 300 700 600 T 900 1000" stroke="white" strokeWidth="4" fill="none" filter="url(#crack-glow)" className="animate-in fade-in duration-700 delay-500" />
             )}
          </svg>
        </div>
      )}

      {/* Final Collapse UI Overlay */}
      {crackLevel >= 4 && !isBattleOver && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-red-500/10 animate-pulse mix-blend-screen transition-opacity duration-1000"></div>
      )}

      {/* Draw Offer Dialog */}
      <Dialog open={!!drawOffer} onOpenChange={(open) => !open && setDrawOffer(null)}>
        <DialogContent className="bg-[#121214] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-400">
              <Handshake className="w-5 h-5" />
              Draw Offered
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Your opponent has offered a draw. Would you like to accept?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleDrawResponse(false)}
              className="border-white/10 hover:bg-zinc-800 text-white"
            >
              Decline
            </Button>
            <Button
              onClick={() => handleDrawResponse(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Surrender Confirmation Dialog */}
      <Dialog open={isSurrenderOpen} onOpenChange={setIsSurrenderOpen}>
        <DialogContent className="bg-[#121214] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <span className="w-5 h-5 flex items-center justify-center">☠</span>
              Surrender Battle?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to surrender? This will record a loss and affect your rating.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSurrenderOpen(false)}
              className="border-white/10 hover:bg-zinc-800 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSurrender}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Surrender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        battleId={battleID}
        reportedUserId={isMePlayer1 ? battleDetails?.player2 : battleDetails?.player1}
        mode="battle"
      />

      {/* End of Battle Overlay */}
      {isBattleOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="max-w-2xl w-full bg-[#121214]/80 border border-white/10 rounded-2xl p-1 shadow-2xl overflow-hidden">
             {!battleStats ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute top-0 w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Computing Battle Results</h2>
                    <p className="text-zinc-400 text-sm max-w-[280px]">Hang tight! We're verifying submissions and calculating your new rating.</p>
                  </div>
                </div>
             ) : (
                <div className="flex flex-col w-full h-full max-h-[90vh]">
                  {/* Result Header */}
                  <div className={`p-8 text-center space-y-2 border-b border-white/5 ${
                    resultStatus === "VICTORY" ? "bg-emerald-500/10" : 
                    resultStatus === "DEFEAT" ? "bg-red-500/10" : "bg-blue-500/10"
                  }`}>
                    <div className={`text-[12px] font-black uppercase tracking-[0.3em] mb-2 ${
                        resultStatus === "VICTORY" ? "text-emerald-500" : 
                        resultStatus === "DEFEAT" ? "text-red-500" : "text-blue-500"
                    }`}>
                      Battle Summary
                    </div>
                    <h2 className={`text-5xl font-black italic tracking-tighter ${
                        resultStatus === "VICTORY" ? "text-emerald-400" : 
                        resultStatus === "DEFEAT" ? "text-red-400" : "text-blue-400"
                    }`}>
                      {resultStatus}
                    </h2>
                    <p className="text-zinc-400 text-sm font-medium">
                      {resultStatus === "VICTORY" ? "Incredible performance! You dominated the arena." : 
                       resultStatus === "DEFEAT" ? "A tough loss, but failure is the best teacher." : 
                       "A perfectly balanced match. You both stood your ground."}
                    </p>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar">
                    {/* Scoreboard */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex flex-col items-center gap-1 shadow-inner relative overflow-hidden group">
                          <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest z-10">Your Score</span>
                          <span className="text-3xl font-black text-white z-10 font-mono tracking-tighter">{Math.round(myScore || 0)}</span>
                          <span className="text-[11px] text-zinc-400 z-10 bg-zinc-800 px-2 py-0.5 rounded-full border border-white/5">
                            {myStats?.solvedCount || 0} Solved
                          </span>
                       </div>
                       <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex flex-col items-center gap-1 shadow-inner relative overflow-hidden group">
                          <div className="absolute inset-0 bg-red-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest z-10">Opponent Score</span>
                          <span className="text-3xl font-black text-white z-10 font-mono tracking-tighter">{Math.round(opponentScore || 0)}</span>
                          <span className="text-[11px] text-zinc-400 z-10 bg-zinc-800 px-2 py-0.5 rounded-full border border-white/5">
                            {opponentStats?.solvedCount || 0} Solved
                          </span>
                       </div>
                    </div>

                    {/* Problem Breakdown */}
                    <div className="space-y-3 mb-8">
                       <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-4 flex items-center gap-2">
                         <div className="w-4 h-px bg-zinc-800"></div>
                         Problem Analysis
                         <div className="flex-1 h-px bg-zinc-800"></div>
                       </h3>
                       {battleStats.problemResults && battleStats.problemResults.map((pr: any, i: number) => {
                          const p1Time = pr.player1SolveTime;
                          const p2Time = pr.player2SolveTime;
                          const myTime = isMePlayer1 ? p1Time : p2Time;
                          const opTime = isMePlayer1 ? p2Time : p1Time;

                          return (
                            <div key={i} className="flex items-center justify-between p-4 bg-[#18181b] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                               <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Problem {i + 1}</span>
                                  <span className="text-sm font-bold text-zinc-200">
                                    {problems.find(p => p.id === pr.problem.id)?.title || `Problem ID: ${pr.problem.id}`}
                                  </span>
                                  <span className={`text-[9px] font-black w-fit px-1.5 py-0.5 rounded border ${
                                    pr.problem.difficulty.toLowerCase() === 'easy' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                    pr.problem.difficulty.toLowerCase() === 'medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                  }`}>
                                    {pr.problem.difficulty.toUpperCase()}
                                  </span>
                               </div>
                               <div className="flex items-center gap-6 text-right">
                                  <div className="flex flex-col gap-0.5">
                                     <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">You</span>
                                     <span className={`text-xs font-mono font-bold ${myTime > 0 ? "text-emerald-400" : "text-zinc-700"}`}>
                                       {formatSolveTime(myTime)}
                                     </span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                     <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Opponent</span>
                                     <span className={`text-xs font-mono font-bold ${opTime > 0 ? "text-amber-400" : "text-zinc-700"}`}>
                                       {formatSolveTime(opTime)}
                                     </span>
                                  </div>
                               </div>
                            </div>
                          )
                       })}
                    </div>

                    {/* Rating Update */}
                    <div className="flex items-center justify-between p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
                       <div className="flex flex-col gap-1 z-10">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Global Ranking</span>
                        <div className="flex flex-col items-center gap-1 z-10">
                           <span className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Rating Update</span>
                           <div className="flex flex-col items-center">
                              <span className={`text-6xl font-black font-mono tracking-tighter drop-shadow-sm ${
                                  (isMePlayer1 ? battleStats.ratingChangeA : battleStats.ratingChangeB) >= 0 ? "text-emerald-400" : "text-red-500"
                              }`}>
                                {(isMePlayer1 ? battleStats.ratingChangeA : battleStats.ratingChangeB) >= 0 ? "+" : ""}{isMePlayer1 ? battleStats.ratingChangeA : battleStats.ratingChangeB}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-sm font-bold text-zinc-400">
                                   NEW RATING: <span className="text-white">{isMePlayer1 ? battleStats.newRa : battleStats.newRb}</span>
                                 </span>
                              </div>
                           </div>
                        </div>
                       </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-8 pt-0 flex gap-3">
                    <button 
                      onClick={() => window.location.href='/leaderboard'} 
                      className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-white/5 uppercase tracking-widest text-xs"
                    >
                      View Rankings
                    </button>
                    <button 
                      onClick={() => window.location.href='/'} 
                      className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700 font-bold py-4 rounded-xl transition-all active:scale-[0.98] border border-white/5 uppercase tracking-widest text-xs"
                    >
                      Find New Battle
                    </button>
                  </div>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#09090b] shadow-sm z-10 w-full shrink-0 relative">
        <div className="flex items-center gap-8">
          <div className="flex flex-col min-w-[120px]">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-200">
              CodeArena Battle
            </h1>
            <p className="text-[11px] text-zinc-500 font-mono">
              ID: {battleID.slice(0, 8)}
            </p>
          </div>

          {/* New WebSocket Progress Bar - Top Left */}
          <div className="flex flex-col gap-2.5 min-w-[280px] w-full max-w-[350px]">
             {/* My Progress Line */}
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest w-16 shrink-0 text-right">
                  You ({mySolvedProblems.size}/{problems.length || 3})
                </span>
                <div className="relative flex-1 h-1.5 bg-zinc-800/80 rounded-full shadow-inner mt-0.5">
                   {/* Track width */}
                   <div style={{ width: `${(Math.min(mySolvedProblems.size, problems.length || 3) / Math.max(problems.length || 3, 1)) * 100}%` }} className="absolute left-0 top-0 h-full bg-emerald-500 border border-emerald-400/50 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(16,185,129,0.8)]">
                       <span className="absolute -top-[14px] -right-2 text-lg drop-shadow-md z-20">🏃</span>
                   </div>
                   <span className="absolute -top-[15px] -right-3 text-lg drop-shadow-sm opacity-90 z-10 w-6 text-right">🏁</span>
                </div>
             </div>

             {/* Opponent Progress Line */}
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest w-16 shrink-0 text-right flex items-center justify-end gap-1 relative">
                  {showHeartbeat && <Activity className="absolute -left-4 w-3.5 h-3.5 text-red-500 animate-[pulse_0.8s_ease-in-out_infinite] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                  Opp ({opponentSolvedProblems.size}/{problems.length || 3})
                </span>
                <div className="relative flex-1 h-1.5 bg-zinc-800/80 rounded-full shadow-inner mt-0.5">
                   <div style={{ width: `${(Math.min(opponentSolvedProblems.size, problems.length || 3) / Math.max(problems.length || 3, 1)) * 100}%` }} className="absolute left-0 top-0 h-full bg-amber-500 border border-amber-400/50 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(245,158,11,0.8)]">
                       <span className="absolute -top-[14px] -right-2 text-lg drop-shadow-md z-20">🏃</span>
                   </div>
                   <span className="absolute -top-[15px] -right-3 text-lg drop-shadow-sm opacity-90 z-10 w-6 text-right">🏁</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex-1"></div> {/* Spacer to push right content */}

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/5 shadow-inner">
            <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
            <span className={`text-sm font-mono tracking-wider font-semibold ${timeLeft < 300 ? 'text-red-400' : 'text-zinc-300'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-[#18181b] border border-white/5 rounded-md px-1 py-1 mr-2 shadow-inner">
              <button
                className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                disabled={currentQuestion === 1}
                onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-semibold text-zinc-300 px-2.5 select-none tracking-wider">
                {currentQuestion}/{problems.length > 0 ? problems.length : 3}
              </span>
              <button
                className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                disabled={problems.length > 0 ? currentQuestion === problems.length : currentQuestion === 3}
                onClick={() => setCurrentQuestion(prev => Math.min(problems.length || 3, prev + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={handleDrawRequest} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-blue-400 font-medium hover:bg-blue-500/10 transition-colors border border-transparent hover:border-blue-500/20">
              <Handshake className="w-3.5 h-3.5" />
              Draw
            </button>
            <button onClick={handleSurrender} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-red-400 font-medium hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20">
              <span className="w-4 h-4 text-red-400 flex items-center justify-center">☠</span>
              Surrender
            </button>
            <button onClick={() => setIsReportOpen(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-amber-500 font-medium hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/20">
              <Flag className="w-3.5 h-3.5" />
              Report
            </button>
            <div className="w-px h-5 bg-white/10 mx-1"></div>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 transition-colors" title={soundEnabled ? "Mute Sounds" : "Enable Sounds"}>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-hidden p-3 min-h-0">
        <div ref={containerRef} className="flex h-full rounded-xl border border-white/5 overflow-hidden shadow-xl bg-[#09090b]">

          {/* Left Panel: Problem Context */}
          <div style={{ width: `${leftWidth}%` }} className="h-full flex flex-col bg-[#121214] shrink-0 min-w-[300px] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/5 px-2 bg-[#18181b]/50 shrink-0">
              <button
                onClick={() => setActiveTab('description')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'description' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'submissions' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
              >
                Submissions
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto p-6 ${scrollbarClasses}`}>
              {activeTab === 'description' && (
                <div className="space-y-6 h-fit">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-zinc-400 font-mono animate-pulse">Loading problems...</div>
                    </div>
                  ) : problem ? (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold tracking-tight text-white">{problem.title}</h2>
                          <span className={`px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded-xl border ${problem.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              problem.difficulty === "Medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                "bg-red-500/10 text-red-500 border-red-500/20"
                            }`}>
                            {problem.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{problem.description?.trim()}</div>

                      {(problem as any).input_format && (
                        <div className="space-y-1.5 mt-4">
                          <h3 className="text-sm font-semibold text-zinc-200">Input Format:</h3>
                          <div className="p-3 bg-zinc-900 border border-white/5 rounded-md text-sm text-zinc-400 font-mono whitespace-pre-wrap">
                            {(problem as any).input_format}
                          </div>
                        </div>
                      )}

                      {(problem as any).output_format && (
                        <div className="space-y-1.5 mt-4">
                          <h3 className="text-sm font-semibold text-zinc-200">Output Format:</h3>
                          <div className="p-3 bg-zinc-900 border border-white/5 rounded-md text-sm text-zinc-400 font-mono whitespace-pre-wrap">
                            {(problem as any).output_format}
                          </div>
                        </div>
                      )}

                      {(problem as any).constraints && (
                        <div className="space-y-1.5 mt-4">
                          <h3 className="text-sm font-semibold text-zinc-200">Constraints:</h3>
                          <div className="p-3 bg-zinc-900 border border-white/5 rounded-md text-sm text-zinc-400 font-mono whitespace-pre-wrap">
                            {(problem as any).constraints}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const examplesToRender = problem.examples || (problem as any).testcases?.run;
                        if (!examplesToRender || examplesToRender.length === 0) return null;
                        
                        return (
                          <div className="space-y-6 mt-8">
                            <h3 className="text-lg font-bold text-white mb-2 pb-2 border-b border-white/5">Examples</h3>
                            {examplesToRender.map((ex: any, i: number) => (
                              <div key={i} className="space-y-3">
                                <p className="text-sm font-semibold text-zinc-200">Example {i + 1}:</p>
                                <div className="p-4 rounded-lg bg-[#09090b] border border-white/5 font-mono text-sm space-y-2.5 shadow-inner">
                                  <div>
                                    <span className="text-zinc-500 select-none">Input:</span><br/>
                                    <span className="text-zinc-300 whitespace-pre-wrap">{ex.input}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 select-none">Output:</span><br/>
                                    <span className="text-emerald-400 whitespace-pre-wrap">{ex.output}</span>
                                  </div>
                                  {ex.explanation && (
                                    <div className="pt-2 mt-2 border-t border-white/5 text-zinc-400 font-sans text-[13px] leading-relaxed">
                                      <span className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider mr-1">Explanation:</span>
                                      {ex.explanation}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-red-400 font-mono">Failed to load problem.</div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'submissions' && (
                <div className="flex flex-col gap-3 p-4">
                  {submissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                      <span className="text-sm">No recent submissions found.</span>
                    </div>
                  ) : (
                    submissions.map((sub, idx) => (
                      <div key={sub._id || sub.id || idx} className="flex flex-col gap-2 p-3 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-800/50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${sub.status === "Accepted" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                            {sub.status}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(sub.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-mono px-1">
                           <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-600" />
                              <span>{sub.result?.runTimeMs || 0} ms</span>
                           </div>
                           <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                              <span>{sub.result?.memoryUsedMB || 0} MB</span>
                           </div>
                           <div className="ml-auto text-zinc-600 font-bold uppercase tracking-widest text-[9px]">{sub.language}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Vertical Resize Handle */}
          <div
            onMouseDown={() => setIsResizingHz(true)}
            className="w-2.5 bg-[#09090b] flex items-center justify-center group outline-none hover:bg-zinc-800/80 transition-colors active:bg-zinc-800 cursor-col-resize shrink-0 z-10"
          >
            <div className={`w-1 h-8 rounded-full transition-colors ${isResizingHz ? 'bg-indigo-500' : 'bg-zinc-700/50 group-hover:bg-zinc-500'}`} />
          </div>

          {/* Right Panel: Editor & Testing */}
          <div ref={rightPaneRef} className="flex-1 flex flex-col bg-[#09090b] min-w-0 overflow-hidden">
            {/* Coding Area */}
            <div style={{ height: `${topHeight}%` }} className="flex flex-col bg-[#121214] shrink-0 min-h-[200px] overflow-hidden">
              {/* Editor Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#18181b]/80 border-b border-white/5 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-[#09090b] text-sm text-zinc-300 pl-3 pr-8 py-1.5 rounded-lg border border-white/10 outline-none focus:border-indigo-500/50 hover:border-white/20 transition-colors appearance-none cursor-pointer font-medium"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a1a1aa\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                  >
                    <option value="cpp">C++ (GCC 11)</option>
                    <option value="python" disabled className="text-zinc-600">Python 3.10</option>
                    <option value="java" disabled className="text-zinc-600">Java 17</option>
                    <option value="javascript" disabled className="text-zinc-600">JavaScript (Node.js)</option>
                    <option value="typescript" disabled className="text-zinc-600">TypeScript</option>
                    <option value="go" disabled className="text-zinc-600">Go 1.19</option>
                    <option value="rust" disabled className="text-zinc-600">Rust 1.66</option>
                  </select>
                </div>

                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => handleExecute("Run")}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 bg-zinc-800 text-zinc-200 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:text-white transition-all border border-white/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-pulse text-yellow-500' : ''}`} />
                    Run
                  </button>
                  <button 
                    onClick={() => handleExecute("Submit")}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-500/20 border border-emerald-500/20 transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] hover:-translate-y-[0.5px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Upload className={`w-3.5 h-3.5 ${isExecuting ? 'animate-bounce' : ''}`} />
                    Submit
                  </button>
                </div>
              </div>

              <div className="flex-1 relative bg-[#09090b]">
                <Editor
                  height="100%"
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => {
                    setCode(value || "");
                    if (socket && session?.user && battleID) {
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      typingTimeoutRef.current = setTimeout(() => {
                        socket.emit("event", { type: "USER_TYPING", battleId: battleID, userId: (session.user as any).id });
                      }, 1000);
                    }
                  }}
                  loading={
                    <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-sm">
                      Loading editor...
                    </div>
                  }
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 24,
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",
                    scrollbar: {
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    },
                  }}
                />
              </div>
            </div>

            {/* Horizontal Resize Handle */}
            <div
              onMouseDown={() => setIsResizingVt(true)}
              className="h-2.5 bg-[#09090b] flex items-center justify-center group outline-none hover:bg-zinc-800/80 transition-colors active:bg-zinc-800 cursor-row-resize shrink-0 z-10 w-full"
            >
              <div className={`h-1 w-8 rounded-full transition-colors ${isResizingVt ? 'bg-indigo-500' : 'bg-zinc-700/50 group-hover:bg-zinc-500'}`} />
            </div>

            {/* Testcases Area */}
            <div className="flex-1 flex flex-col bg-[#121214] min-h-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 bg-[#18181b]/50 px-2 shrink-0">
                <div className="flex">
                  <button
                    onClick={() => setPanelTab('testcases')}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-[2px] transition-colors ${panelTab === 'testcases' ? 'border-zinc-500 text-zinc-300' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
                    Testcases
                  </button>
                  <button
                    onClick={() => setPanelTab('result')}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-[2px] transition-colors ${panelTab === 'result' ? 'border-zinc-500 text-zinc-300' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
                    Test Result
                  </button>
                </div>
              </div>

              <div className={`flex-1 p-4 bg-[#09090b] overflow-y-auto ${scrollbarClasses}`}>
                {panelTab === 'testcases' && (
                  <div className="flex flex-col h-full gap-3">
                    <div className="flex gap-2">
                      {testcases.map((tc, idx) => (
                        <button
                          key={tc.id}
                          onClick={() => setActiveTestCaseId(tc.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTestCaseId === tc.id ? 'bg-white/10 text-white' : 'bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'} ${executionResult && (executionResult.failed_test_case === tc.input || executionResult.failed_test_case === String(tc.id)) ? 'border border-red-500/50' : ''}`}
                        >
                          Case {tc.id} {executionResult && (executionResult.failed_test_case === tc.input || executionResult.failed_test_case === String(tc.id)) && <span className="text-red-500 ml-1">✖</span>}
                        </button>
                      ))}
                    </div>

                    {testcases.map(tc => tc.id === activeTestCaseId && (
                      <div key={tc.id} className="flex-1 flex flex-col gap-2">
                        <div className="text-xs font-semibold text-zinc-500 ml-1">Input:</div>
                        <textarea
                          value={tc.input}
                          onChange={(e) => {
                            const newTestcases = [...testcases];
                            const index = newTestcases.findIndex(t => t.id === tc.id);
                            newTestcases[index].input = e.target.value;
                            setTestcases(newTestcases);
                          }}
                          className={`w-full flex-1 bg-[#18181b] border border-white/5 rounded-lg p-3 text-sm font-mono text-zinc-300 outline-none focus:border-indigo-500/50 resize-none transition-colors whitespace-pre-wrap ${scrollbarClasses}`}
                          spellCheck={false}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {panelTab === 'result' && (
                  <div className="flex flex-col h-full bg-[#09090b] text-zinc-300">
                    {!executionResult ? (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                        {isExecuting ? (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium animate-pulse">Running Code...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                             <Play className="w-10 h-10 opacity-20" />
                             <p className="text-sm">Run your code to see results here.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${executionResult.status === "Accepted" ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" : "bg-red-500/20 text-red-500 border border-red-500/30"}`}>
                                 {executionResult.status}
                              </span>
                              {(executionResult.exec_time !== undefined || executionResult.memory !== undefined) && (
                                <div className="flex gap-4 text-xs font-mono text-zinc-500 bg-[#121214] px-3 py-1 rounded-full border border-white/5">
                                   {executionResult.exec_time !== undefined && <span>{executionResult.exec_time} ms</span>}
                                   {executionResult.memory !== undefined && <span>{executionResult.memory} MB</span>}
                                </div>
                              )}
                           </div>
                        </div>

                        {executionResult.status !== "Accepted" && (
                          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                             {executionType === "Submit" ? (
                                <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-xl text-center space-y-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]">
                                  <div className="absolute inset-0 bg-red-500/5 blur-xl"></div>
                                  <AlertCircle className="w-10 h-10 text-red-500/80 mb-2 relative z-10" />
                                  <h4 className="text-lg font-bold text-red-500 relative z-10">Submission Rejected</h4>
                                  <p className="text-sm text-zinc-400 relative z-10 font-medium">Failed on a hidden testcase</p>
                                </div>
                             ) : (
                               <>
                                 {executionResult.errorMsg && (
                                   <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-xl shadow-inner w-full overflow-x-auto">
                                     <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 opacity-80">System Error Log</h4>
                                     <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">{executionResult.errorMsg}</pre>
                                   </div>
                                 )}

                                 {executionResult.failed_test_case && (
                                   <div className="space-y-4">
                                      <div className="flex items-center gap-2">
                                         <div className="h-px flex-1 bg-red-500/20"></div>
                                         <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">Failed Testcase (Case {executionResult.failed_test_case})</span>
                                         <div className="h-px flex-1 bg-red-500/20"></div>
                                      </div>

                                      <div className="grid grid-cols-1 gap-4">
                                         <div className="space-y-2">
                                            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Input</div>
                                            <div className="bg-[#121214] rounded-lg p-3 border border-white/5 font-mono text-xs whitespace-pre-wrap text-zinc-300">
                                              {executionResult.failed_test_case || "Input data unavailable"}
                                            </div>
                                         </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                               <div className="text-[11px] font-bold text-emerald-500/70 uppercase tracking-wider ml-1">Expected Output</div>
                                               <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10 font-mono text-xs whitespace-pre-wrap text-emerald-100/80">
                                                 {executionResult.expected_output || testcases.find(t => t.input === executionResult.failed_test_case)?.output || "N/A"}
                                               </div>
                                            </div>
                                            <div className="space-y-2">
                                               <div className="text-[11px] font-bold text-red-500/70 uppercase tracking-wider ml-1">Your Output</div>
                                               <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10 font-mono text-xs whitespace-pre-wrap text-red-100/80">
                                                 {executionResult.actual_output || "Empty Output"}
                                               </div>
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                 )}
                               </>
                             )}
                          </div>
                        )}

                        {executionResult.status === "Accepted" && (
                          <div className="flex flex-col items-center justify-center py-10 gap-4 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div className="text-center space-y-1">
                              <h3 className="text-xl font-bold text-emerald-500">Accepted</h3>
                              <p className="text-sm text-zinc-500">Your solution passed all testcases.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
