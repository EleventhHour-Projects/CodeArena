'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ChevronRight, 
  Search, 
  Terminal, 
  Code2, 
  Info,
  Bug,
  LayoutDashboard
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  testcases: Array<{
    input: string;
    output: string;
  }>;
  verified?: boolean;
}

const BOILERPLATES: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Test your solution here\n    return 0;\n}`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Test your solution here\n    return 0;\n}`,
  python: `# Test your solution here\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Test your solution here\n    }\n}`,
  go: `package main\n\nimport (\n    "fmt"\n)\n\nfunc main() {\n    // Test your solution here\n}`,
};

export default function AdminTestProblem() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState('cpp');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('description');

  const lastProblemIdRef = useRef<number | null>(null);
  const lastLanguageRef = useRef<string>("cpp");

  useEffect(() => {
    if (selectedProblem?.id) {
      if (lastProblemIdRef.current !== selectedProblem.id || lastLanguageRef.current !== language) {
        let saved = localStorage.getItem(`admin_code_${selectedProblem.id}_${language}`);
        if (!saved && language === 'cpp') {
          saved = localStorage.getItem(`admin_code_${selectedProblem.id}`);
        }
        if (saved) {
          setCode(saved);
        } else {
          setCode(BOILERPLATES[language] || BOILERPLATES.cpp);
        }
        lastProblemIdRef.current = selectedProblem.id;
        lastLanguageRef.current = language;
      }
    }
  }, [selectedProblem?.id, language]);

  useEffect(() => {
    fetchProblems();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredProblems(
        problems.filter(p => 
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          p.id.toString().includes(searchQuery)
        )
      );
    } else {
      setFilteredProblems(problems);
    }
  }, [searchQuery, problems]);

  const fetchProblems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/questions');
      const data = await res.json();
      if (data.problems) {
        setProblems(data.problems);
        setFilteredProblems(data.problems);
      }
    } catch (error) {
      toast.error('Failed to fetch problems');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProblem = (problem: Problem) => {
    setSelectedProblem(problem);
    setResult(null);
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined && selectedProblem) {
      setCode(value);
      localStorage.setItem(`admin_code_${selectedProblem.id}_${language}`, value);
      if (language === 'cpp') {
        localStorage.setItem(`admin_code_${selectedProblem.id}`, value);
      }
    }
  };

  const pollStatus = async (execId: string) => {
    let attempts = 0;
    const maxAttempts = 100;
    const check = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/submission-status/${execId}`);
        const data = await res.json();
        if (data.status && data.status !== 'PENDING') {
          setResult(data);
          setIsExecuting(false);
          if (data.status === 'Accepted') {
            toast.success('All test cases passed! 🎉');
          } else {
            toast.error(`Execution failed: ${data.status}`);
          }
          return;
        }
        if (attempts >= maxAttempts) {
          setIsExecuting(false);
          toast.error('Execution timed out');
          return;
        }
        const delay = attempts <= 10 ? 80 : 200;
        setTimeout(check, delay);
      } catch (error) {
        setIsExecuting(false);
        toast.error('Error polling status');
      }
    };
    setTimeout(check, 50);
  };

  const handleRun = async () => {
    if (!selectedProblem) return;
    setIsExecuting(true);
    setResult(null);
    const toastId = toast.loading('Initiating execution...');

    try {
      const res = await fetch('/api/admin/verify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          problemId: selectedProblem.id,
          difficulty: selectedProblem.difficulty.toLowerCase(),
          testcases: selectedProblem.testcases
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.info('Execution started, polling for results...', { id: toastId });
        pollStatus(data.execId);
      } else {
        setIsExecuting(false);
        toast.error(data.error || 'Failed to start execution', { id: toastId });
      }
    } catch (error) {
      setIsExecuting(false);
      toast.error('Network error', { id: toastId });
    }
  };

  const handleVerifyProblem = async () => {
    if (!selectedProblem) return;
    const isVerifying = !selectedProblem.verified;
    const toastId = toast.loading(`${isVerifying ? 'Verifying' : 'Unverifying'} problem...`);

    try {
      const res = await fetch('/api/admin/questions/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          difficulty: selectedProblem.difficulty,
          verified: isVerifying
        })
      });

      const data = await res.json();
      if (data.success) {
        // Update local state
        const updatedProblems = problems.map(p => 
          p.id === selectedProblem.id ? { ...p, verified: isVerifying } : p
        );
        setProblems(updatedProblems);
        setSelectedProblem({ ...selectedProblem, verified: isVerifying });
        toast.success(`Problem ${isVerifying ? 'marked as verified' : 'unverified'}!`, { id: toastId });
      } else {
        toast.error(data.error || 'Failed to update problem', { id: toastId });
      }
    } catch (error) {
      toast.error('Network error', { id: toastId });
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar - Problem List */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-[#0c0c0e]">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard className="w-5 h-5 text-indigo-500" />
            <h1 className="font-bold text-lg tracking-tight">Admin Tester</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search problems..." 
              className="pl-9 bg-zinc-900/50 border-white/5 focus-visible:ring-indigo-500/50 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              <p className="text-xs text-zinc-500">Loading problems...</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredProblems.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProblem(p)}
                  className={`w-full text-left p-3 rounded-lg transition-all group relative overflow-hidden ${
                    selectedProblem?.id === p.id 
                      ? 'bg-indigo-500/10 border border-indigo-500/20' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-500">#{p.id}</span>
                        {p.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <span className={`text-sm font-semibold transition-colors ${selectedProblem?.id === p.id ? 'text-indigo-400' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
                        {p.title}
                      </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border capitalize font-medium ${
                      p.difficulty.toLowerCase() === 'easy' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                      p.difficulty.toLowerCase() === 'medium' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' :
                      'text-red-500 border-red-500/20 bg-red-500/5'
                    }`}>
                      {p.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedProblem ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center border border-white/5">
              <Code2 className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm">Select a problem to start testing</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0c0c0e]/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      {selectedProblem.title}
                      {selectedProblem.verified && (
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Verified</span>
                        </div>
                      )}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 font-mono">ID: {selectedProblem.id}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        selectedProblem.difficulty.toLowerCase() === 'easy' ? 'text-emerald-500' :
                        selectedProblem.difficulty.toLowerCase() === 'medium' ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {selectedProblem.difficulty}
                      </span>
                    </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-zinc-900 border border-white/10 rounded-md text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-white cursor-pointer"
                >
                  <option value="cpp">C++ (GCC 13)</option>
                  <option value="c">C (GCC 11)</option>
                  <option value="python">Python 3</option>
                  <option value="java">Java 17</option>
                  <option value="go">Go 1.19</option>
                </select>
                <Button 
                  onClick={handleRun} 
                  disabled={isExecuting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 px-6 shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)]"
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-current text-white" />
                  )}
                  {isExecuting ? 'Executing...' : 'Run Test'}
                </Button>
              </div>
            </div>
 
            {/* Content Area */}
            <div className="flex-1 flex min-h-0">
              {/* Left Side - Editor & Results */}
              <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
                <div className="flex-1 relative">
                  <Editor
                    height="100%"
                    defaultLanguage="cpp"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={handleCodeChange}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineHeight: 22,
                      fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                      padding: { top: 20 },
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                      cursorSmoothCaretAnimation: "on",
                      bracketPairColorization: { enabled: true },
                      formatOnPaste: true,
                      suggestOnTriggerCharacters: true,
                      automaticLayout: true,
                    }}
                  />
                </div>

                {/* Status Bar / Preview */}
                <div className="h-10 border-t border-white/5 bg-[#0c0c0e] px-4 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse"></div>
                      Connected to Executor
                    </span>
                    <span className="flex items-center gap-1.5 grayscale opacity-50">
                      <Terminal className="w-3 h-3" />
                      v1.2.0-stable
                    </span>
                  </div>
                  <div>
                    {code.length} characters
                  </div>
                </div>
              </div>

              {/* Right Side - Info & Result Panels */}
              <div className="w-[450px] flex flex-col bg-[#0c0c0e]">
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 pt-4">
                    <div className="flex w-full bg-zinc-900/50 p-1 border border-white/5 rounded-lg">
                      <button 
                        onClick={() => setActiveTab('description')}
                        className={`flex-1 flex items-center justify-center gap-2 text-xs py-1.5 rounded-md transition-all ${activeTab === 'description' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <Info className="w-3.5 h-3.5" />
                        Details
                      </button>
                      <button 
                        onClick={() => setActiveTab('testcases')}
                        className={`flex-1 flex items-center justify-center gap-2 text-xs py-1.5 rounded-md transition-all ${activeTab === 'testcases' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <Bug className="w-3.5 h-3.5" />
                        Testcases ({selectedProblem.testcases?.length || 0})
                      </button>
                      <button 
                        onClick={() => setActiveTab('result')}
                        className={`flex-1 flex items-center justify-center gap-2 text-xs py-1.5 rounded-md transition-all ${activeTab === 'result' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        Result
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {activeTab === 'description' && (
                      <div className="mt-0 space-y-8 animate-in fade-in duration-300">
                        {/* Description Section */}
                        <div className="prose prose-invert prose-sm max-w-none">
                          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Problem Description</h3>
                          <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm bg-zinc-900/30 p-4 rounded-xl border border-white/5 shadow-inner">
                            {selectedProblem.description}
                          </div>
                        </div>

                        {/* I/O Formats */}
                        <div className="grid grid-cols-1 gap-6">
                           {selectedProblem.input_format && (
                             <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Input Format</h3>
                                <div className="text-zinc-300 text-sm leading-relaxed bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 whitespace-pre-wrap">
                                  {selectedProblem.input_format}
                                </div>
                             </div>
                           )}

                           {selectedProblem.output_format && (
                             <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Output Format</h3>
                                <div className="text-zinc-300 text-sm leading-relaxed bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 whitespace-pre-wrap">
                                  {selectedProblem.output_format}
                                </div>
                             </div>
                           )}
                        </div>

                        {/* Constraints Section */}
                        {selectedProblem.constraints && (
                          <div className="space-y-3">
                            <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em]">Constraints</h3>
                            <div className="text-zinc-400 text-sm leading-relaxed bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 font-mono whitespace-pre-wrap">
                              {selectedProblem.constraints}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'testcases' && (
                      <div className="mt-0 space-y-4 animate-in fade-in duration-300">
                         <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Verification Cases</h3>
                         {selectedProblem.testcases?.map((tc, i) => (
                           <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Test Case #{i + 1}</span>
                              </div>
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 font-bold uppercase">Input</span>
                                  <pre className="text-[11px] bg-black/40 p-2 rounded border border-white/5 text-zinc-300 overflow-x-auto font-mono">
                                    {tc.input || "No input"}
                                  </pre>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-500 font-bold uppercase">Expected Output</span>
                                  <pre className="text-[11px] bg-black/40 p-2 rounded border border-white/5 text-zinc-400 italic font-mono">
                                    {tc.output || "No output"}
                                  </pre>
                                </div>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {activeTab === 'result' && (
                      <div className="mt-0">
                        <AnimatePresence mode="wait">
                          {!result && !isExecuting ? (
                            <motion.div 
                              key="no-result"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-3"
                            >
                              <Terminal className="w-10 h-10 opacity-20" />
                              <p className="text-xs">No execution history</p>
                            </motion.div>
                          ) : isExecuting ? (
                            <motion.div 
                              key="executing"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col items-center justify-center py-20 gap-4"
                            >
                              <div className="relative">
                                <div className="w-12 h-12 border-2 border-indigo-500/20 rounded-full"></div>
                                <div className="absolute top-0 w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-white">Execution in Progress</p>
                                <p className="text-[10px] text-zinc-500 mt-1">Worker is running your code against testcases...</p>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="result"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-6 pb-8"
                            >
                              <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                                result.status === 'Accepted' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20' 
                                  : 'bg-red-500/10 border-red-500/20'
                              }`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  result.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {result.status === 'Accepted' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className={`text-lg font-black italic tracking-tight ${
                                    result.status === 'Accepted' ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {result.status.toUpperCase()}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-medium font-mono">
                                    Processed in {result.exec_time}ms • {result.memory}MB
                                  </span>
                                </div>
                              </div>

                              {result.status !== 'Accepted' && (
                                <div className="space-y-4">
                                  {result.failed_test_case && (
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                      <span className="text-[10px] font-bold text-red-400 uppercase mb-2 block tracking-wider">Failed Test Case</span>
                                      <p className="text-xs text-zinc-300 font-mono">{result.failed_test_case}</p>
                                    </div>
                                  )}
                                  
                                  {result.actual_output && (
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Actual Output</span>
                                      <pre className="text-[11px] bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-red-200 overflow-x-auto font-mono">
                                        {result.actual_output}
                                      </pre>
                                    </div>
                                  )}

                                  {result.errorMsg && (
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Error Details</span>
                                      <pre className="text-[11px] bg-zinc-950 p-3 rounded-lg border border-white/5 text-amber-500/80 overflow-x-auto font-mono whitespace-pre-wrap">
                                        {result.errorMsg}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}

                              {result.status === 'Accepted' && (
                                <div className="py-8 text-center space-y-3">
                                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                  </div>
                                  <h4 className="text-sm font-bold text-zinc-200">Validation Successful</h4>
                                  <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[280px] mx-auto">
                                    Successfully verified this problem against all defined test cases. This problem is ready for production use.
                                  </p>
                                  <Button 
                                    onClick={handleVerifyProblem}
                                    className={`mt-4 ${selectedProblem.verified ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'}`}
                                  >
                                    {selectedProblem.verified ? (
                                      <>Unverify Problem</>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Mark as Verified
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
