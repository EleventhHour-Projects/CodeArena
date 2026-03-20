'use client';

import { use, useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Clock, Handshake, Flag, ChevronLeft, ChevronRight, Play, Upload, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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

  const [battleDetails, setBattleDetails] = useState<any>(null);

  // Problem State
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const problem = problems[currentQuestion - 1]; // Active problem

  const [timeLeft, setTimeLeft] = useState(5400); // default 90 min fallback
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [battleStats, setBattleStats] = useState<any>(null);
  
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    async function fetchBattle() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/battle/${battleID}`);
        if (!res.ok) throw new Error('Failed to fetch battle context');
        const data = await res.json();
        const battle = data.battle;
        setBattleDetails(battle);

        if (battle.createdAt || battle.startTime) {
          const startTimestamp = new Date(battle.startTime || battle.createdAt).getTime();

          // Compute duration based on problems: easy=10m, medium=20m, hard=40m
          let durationSeconds = 5400; // default 90m
          if (battle.problems && battle.problems.length > 0) {
             durationSeconds = battle.problems.reduce((acc: number, p: any) => {
                 const diff = (p.difficulty || "").toLowerCase();
                 if (diff === "easy") return acc + (10 * 60);
                 if (diff === "medium") return acc + (20 * 60);
                 if (diff === "hard") return acc + (40 * 60);
                 return acc + (10 * 60); // default
             }, 0);
          }
          
          const endTimestamp = startTimestamp + (durationSeconds * 1000);
          const tL = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));
          
          setTimeLeft(tL);
          if (tL === 0) {
              handleBattleComplete(battle);
          }
        }
        
        // Fetch specific problems
        if (battle.problems && battle.problems.length > 0) {
            const problemIds = battle.problems.map((p: any) => p.id).join(',');
            const probRes = await fetch(`/api/battle/questions?ids=${problemIds}`);
            const probData = await probRes.json();
            setProblems(probData.problems || []);
        } else {
            toast.error("Critial Error: No problems assigned to this battle in the database.");
            setProblems([]);
        }

      } catch (err) {
        console.error("Error fetching battle context:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBattle();
  }, [battleID]);

  const handleBattleComplete = async (battle: any) => {
    if (isBattleOver) return;
    setIsBattleOver(true);
    toast.info("Battle has ended! Computing final results...");
    try {
      const res = await fetch('/api/battle/complete', {
         method: 'POST', 
         headers: { 'Content-Type': 'application/json' },
         // We pass empty problemResults for now unless tracked specifically per player in context
         body: JSON.stringify({ battleId: battleID, problemResults: [] }) 
      });
      const data = await res.json();
      setBattleStats(data);
    } catch (e) {
      toast.error("Failed to compute battle results.");
    }
  };

  useEffect(() => {
    if (timeLeft <= 0 && battleDetails && !isBattleOver) {
        handleBattleComplete(battleDetails);
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, battleDetails, isBattleOver]);

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
  const [code, setCode] = useState("#include<bits/stdc++.h>\nusing namespace std;\nint main() {\n    // Write your code here\n    return 0;\n}");
  const [language, setLanguage] = useState("cpp");
  const [activeTab, setActiveTab] = useState("description"); // description, submissions
  const [isExecuting, setIsExecuting] = useState(false);

  const pollSubmissionStatus = async (execId: string, type: "Run" | "Submit") => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/submission-status/${execId}`);
        const data = await res.json();
        
        if (data.status !== "PENDING") {
           clearInterval(pollInterval);
           setIsExecuting(false);
           setExecutionResult(data);
           
           if (type === "Submit") {
             if (data.status === "Accepted") {
                toast.success("Submission Accepted! 🎉");
             } else {
                toast.error(`Submission Failed: ${data.status}`);
             }
           } else {
               toast.info(`Run Completed: ${data.status}`);
           }
        }
      } catch (e) {
         clearInterval(pollInterval);
         setIsExecuting(false);
         toast.error("Error checking submission status");
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
    setPanelTab("result");
    setExecutionResult(null); // Clear previous results
    
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
        toast.loading(`${type} initiated. Polling for results...`, { duration: 3000 });
        pollSubmissionStatus(data.executionCode._id || data.executionCode.id || data.executionCode, type);
      } else {
        setIsExecuting(false);
        toast.error(data.error || `Failed to ${type} code`);
      }
    } catch (err) {
      console.error(`Error during ${type}:`, err);
      setIsExecuting(false);
      toast.error(`A network error occurred during ${type}`);
    }
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

  return (
    <div className="h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* End of Battle Overlay */}
      {isBattleOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="max-w-md w-full bg-[#121214] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
             {!battleStats ? (
               <div className="flex flex-col items-center gap-4">
                 <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                 <h2 className="text-xl font-bold text-white">Computing Results...</h2>
                 <p className="text-zinc-400 text-sm text-center">Please wait while we finalize the battle scores and update ratings.</p>
               </div>
             ) : (
               <div className="flex flex-col items-center gap-4 w-full">
                 <h2 className="text-2xl font-bold text-white mb-2">Battle Complete!</h2>
                 <div className="w-full bg-[#18181b] p-4 rounded-xl border border-white/5 space-y-3 mb-4">
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-zinc-400">Winner</span>
                     <span className="font-semibold text-emerald-400">{battleStats.result === "draw" || !battleStats.result ? "Draw / N/A" : battleStats.result}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
                     <span className="text-zinc-400">New Rating Approximation</span>
                     <span className="font-bold text-indigo-400 flex items-center gap-1">
                       {battleStats.newRa || "N/A"}
                     </span>
                   </div>
                 </div>
                 <button onClick={() => window.location.href='/leaderboard'} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2.5 rounded-lg transition-colors">
                   View Leaderboard
                 </button>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#09090b] shadow-sm z-10 w-full shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-200">
              CodeArena Battle
            </h1>
            <p className="text-[11px] text-zinc-500 font-mono">
              ID: {battleID.slice(0, 8)}
            </p>
          </div>
        </div>

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
            <button onClick={() => toast.success("Draw request sent to the opponent.")} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-blue-400 font-medium hover:bg-blue-500/10 transition-colors border border-transparent hover:border-blue-500/20">
              <Handshake className="w-3.5 h-3.5" />
              Draw
            </button>
            <button onClick={() => toast.error("You have surrendered the battle.")} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-red-400 font-medium hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20">
              <span className="w-4 h-4 text-red-400 flex items-center justify-center">☠</span>
              Surrender
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
                className={`px-4 py-2.5 text-sm font-medium border-b-[2px] transition-colors ${activeTab === 'description' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-2.5 text-sm font-medium border-b-[2px] transition-colors ${activeTab === 'submissions' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
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
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                  <span className="text-sm">No recent submissions found.</span>
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
                  onChange={(value) => setCode(value || "")}
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
                                             {testcases.find(t => t.input === executionResult.failed_test_case)?.output || "N/A"}
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
