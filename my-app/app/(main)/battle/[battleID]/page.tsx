'use client';

import { use, useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Clock, Handshake, Flag, ChevronLeft, ChevronRight } from "lucide-react";

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
  const resolvedParams = use(params);
  const battleID = resolvedParams.battleID;

  // Problem State
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const problem = problems[currentQuestion - 1]; // Active problem

  useEffect(() => {
    async function fetchProblems() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/battle/questions?count=3');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setProblems(data.problems || []);
      } catch (err) {
        console.error("Error fetching problems:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProblems();
  }, [battleID]);

  // Editor and Panel State
  const [testcases, setTestcases] = useState<TestCase[]>([
    { id: 1, input: "" },
  ]);

  useEffect(() => {
    if (problem && problem.testcases) {
      const mapped = problem.testcases.map((tc, index) => ({
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

  // Resizable Panes State
  const [leftWidth, setLeftWidth] = useState(45); // percentage
  const [topHeight, setTopHeight] = useState(70); // percentage
  const [isResizingHz, setIsResizingHz] = useState(false);
  const [isResizingVt, setIsResizingVt] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingHz && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
        if (newWidth > 20 && newWidth < 80) { // arbitrary min/max bounds
          setLeftWidth(newWidth);
        }
      } else if (isResizingVt && rightPaneRef.current) {
        const rect = rightPaneRef.current.getBoundingClientRect();
        const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
        if (newHeight > 20 && newHeight < 80) {
          setTopHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingHz(false);
      setIsResizingVt(false);
      document.body.style.userSelect = 'auto'; // restore text selection
    };

    if (isResizingHz || isResizingVt) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // prevent text selection while dragging
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHz, isResizingVt]);

  // Timer state (e.g., 90 minutes = 5400 seconds)
  const [timeLeft, setTimeLeft] = useState(5400);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Scrollbar style utility classes
  const scrollbarClasses = "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700/50 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#09090b] shadow-sm z-10 w-full">
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
                {currentQuestion}/3
              </span>
              <button
                className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                disabled={currentQuestion === 3}
                onClick={() => setCurrentQuestion(prev => Math.min(3, prev + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-blue-400 font-medium hover:bg-blue-500/10 transition-colors border border-transparent hover:border-blue-500/20">
              <Handshake className="w-3.5 h-3.5" />
              Offer Draw
            </button>
            <button className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-red-400 font-medium hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20">
              <Flag className="w-3.5 h-3.5" />
              Surrender
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-hidden p-3 contain-strict">
        <div ref={containerRef} className="flex h-full rounded-xl border border-white/5 overflow-hidden shadow-xl bg-[#09090b]">

          {/* Left Panel: Problem Context */}
          <div style={{ width: `${leftWidth}%` }} className="flex flex-col bg-[#121214] shrink-0 min-w-[300px]">
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
                <div className="space-y-6">
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

                      <div className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {problem.description}
                      </div>

                      {problem.tags && problem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {problem.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-800/50 rounded-md border border-white/5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-6 mt-8">
                        {problem.examples?.map((ex, i) => (
                          <div key={i} className="space-y-3">
                            <p className="text-sm font-semibold text-zinc-200">Example {i + 1}:</p>
                            <div className="p-4 rounded-lg bg-[#09090b] border border-white/5 font-mono text-sm space-y-2.5 shadow-inner">
                              <div>
                                <span className="text-zinc-500 select-none">Input: </span>
                                <span className="text-zinc-300">{ex.input}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 select-none">Output: </span>
                                <span className="text-emerald-400">{ex.output}</span>
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
                  <svg width="32" height="32" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                  <p className="text-sm">No recent submissions found.</p>
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
                    <option value="python">Python 3.10</option>
                    <option value="go">Go 1.19</option>
                    <option value="rust">Rust 1.66</option>
                  </select>
                  <div className="w-px h-5 bg-white/10 mx-1"></div>
                  <button className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-white/5 transition-colors" title="Settings">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 3.04999C11.5 2.4977 11.0523 2.04999 10.5 2.04999H4.5C3.94772 2.04999 3.5 2.4977 3.5 3.04999V11.95C3.5 12.5023 3.94772 12.95 4.5 12.95H10.5C11.0523 12.95 11.5 12.5023 11.5 11.95V3.04999ZM10.5 1.04999C11.6046 1.04999 12.5 1.94542 12.5 3.04999V11.95C12.5 13.0546 11.6046 13.95 10.5 13.95H4.5C3.39543 13.95 2.5 13.0546 2.5 11.95V3.04999C2.5 1.94542 3.39543 1.04999 4.5 1.04999H10.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button className="flex items-center gap-1.5 bg-zinc-800 text-zinc-200 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:text-white transition-all border border-white/5 active:scale-95">
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.24182 2.32181C3.3919 2.23132 3.5784 2.22601 3.73338 2.30781L12.7334 7.04468C12.8935 7.12902 12.9934 7.29544 12.9934 7.47672C12.9934 7.658 12.8935 7.82442 12.7334 7.90875L3.73338 12.6456C3.5784 12.7274 3.3919 12.7221 3.24182 12.6316C3.09175 12.5411 3 12.3769 3 12.2001V2.7533C3 2.5765 3.09175 2.41224 3.24182 2.32181ZM4 3.58231V11.3711L11.3853 7.47672L4 3.58231Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                    Run
                  </button>
                  <button className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-500/20 border border-emerald-500/20 transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] hover:-translate-y-[0.5px] active:scale-95">
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
                      {testcases.map(tc => (
                        <button
                          key={tc.id}
                          onClick={() => setActiveTestCaseId(tc.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTestCaseId === tc.id ? 'bg-white/10 text-white' : 'bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                        >
                          Case {tc.id}
                        </button>
                      ))}
                      <button
                        onClick={() => setTestcases([...testcases, { id: testcases.length + 1, input: "" }])}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors flex items-center gap-1"
                        title="Add New Case"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.75C8 2.47386 7.77614 2.25 7.5 2.25C7.22386 2.25 7 2.47386 7 2.75V7H2.75C2.47386 7 2.25 7.22386 2.25 7.5C2.25 7.77614 2.47386 8 2.75 8H7V12.25C7 12.5261 7.22386 12.75 7.5 12.75C7.77614 12.75 8 12.5261 8 12.25V8H12.25C12.5261 8 12.75 7.77614 12.75 7.5C12.75 7.22386 12.5261 7 12.25 7H8V2.75Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                      </button>
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
                          className={`w-full flex-1 bg-[#18181b] border border-white/5 rounded-lg p-3 text-sm font-mono text-zinc-300 outline-none focus:border-indigo-500/50 resize-none transition-colors ${scrollbarClasses}`}
                          spellCheck={false}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {panelTab === 'result' && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                    <svg width="24" height="24" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                    <p className="text-sm">Run your code to see results here.</p>
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
