"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Link as LinkIcon, Save, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Testcase = {
  input: string;
  output: string;
};

export default function AdminProblemPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");

  const [runTestcases, setRunTestcases] = useState<Testcase[]>([]);
  const [submitTestcases, setSubmitTestcases] = useState<Testcase[]>([]);

  const [activeTab, setActiveTab] = useState<"run" | "submit">("run");
  const [isRunSmartOpen, setIsRunSmartOpen] = useState(false);
  const [isSubmitSmartOpen, setIsSubmitSmartOpen] = useState(false);

  const [runSmartInput, setRunSmartInput] = useState("");
  const [runSmartOutput, setRunSmartOutput] = useState("");
  const [submitSmartInput, setSubmitSmartInput] = useState("");
  const [submitSmartOutput, setSubmitSmartOutput] = useState("");

  const handleFetch = async () => {
    if (!url) {
      toast.error("Please enter a valid LeetCode URL");
      return;
    }
    
    setLoading(true);

    try {
      const res = await fetch("/api/admin/fetch-leetcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      setTitle(data.title || "");
      setSlug(data.slug || "");
      
      const d = data.difficulty || "Easy";
      setDifficulty(d);
      
      setTags(data.tags ? data.tags.join(", ") : "");
      setDescription(data.description || "");

      toast.success("Problem data successfully fetched!");

    } catch (err: any) {
      toast.error(err.message || "Failed to fetch problem data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title) {
      toast.error("Title is required before saving.");
      return;
    }

    setSaving(true);
    
    const loadingToast = toast.loading("Saving problem to the system...");

    try {
      const payload = {
        title,
        slug,
        difficulty,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        description,
        testcases: {
          run: runTestcases,
          submit: submitTestcases
        }
      };

      const res = await fetch("/api/admin/save-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save problem");
      }

      toast.success(`Problem saved successfully! ID: ${data.id}`, { id: loadingToast });
      
      // Clear all fields
      setUrl("");
      setTitle("");
      setSlug("");
      setDifficulty("Easy");
      setTags("");
      setDescription("");
      setRunTestcases([]);
      setSubmitTestcases([]);

    } catch (err: any) {
      toast.error(err.message || "Failed to save problem", { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const addTestcase = (type: "run" | "submit") => {
    if (type === "run") {
      setRunTestcases([...runTestcases, { input: "", output: "" }]);
    } else {
      setSubmitTestcases([...submitTestcases, { input: "", output: "" }]);
    }
  };

  const updateTestcase = (type: "run" | "submit", index: number, field: "input" | "output", value: string) => {
    if (type === "run") {
      const newTc = [...runTestcases];
      newTc[index][field] = value;
      setRunTestcases(newTc);
    } else {
      const newTc = [...submitTestcases];
      newTc[index][field] = value;
      setSubmitTestcases(newTc);
    }
  };

  const removeTestcase = (type: "run" | "submit", index: number) => {
    if (type === "run") {
      setRunTestcases(runTestcases.filter((_, i) => i !== index));
    } else {
      setSubmitTestcases(submitTestcases.filter((_, i) => i !== index));
    }
  };

  const formatInputVal = (val: string) => {
    val = val.trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) {
          if (arr.length > 0 && Array.isArray(arr[0])) {
            return `${arr.length} ${arr[0].length}\n` + arr.map(row => row.join(" ")).join("\n");
          }
          return `${arr.length}\n${arr.join(" ")}`;
        }
      } catch (e) {}
    } else if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1);
    }
    return val;
  };

  const formatOutputVal = (val: string) => {
    val = val.trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) {
          if (arr.length > 0 && Array.isArray(arr[0])) {
            return arr.map(row => row.join(" ")).join("\n");
          }
          return arr.join(" ");
        }
      } catch (e) {}
    } else if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1);
    }
    return val;
  };

  const parseInputText = (inputStr: string) => {
    let currentVal = "";
    let inArray = 0;
    let inString = false;
    let parts = [];
    
    for (let i = 0; i < inputStr.length; i++) {
       let char = inputStr[i];
       if (char === '"') inString = !inString;
       if (char === '[') inArray++;
       if (char === ']') inArray--;
       
       if ((char === ',' || char === '\n') && inArray === 0 && !inString) {
          if (currentVal.trim()) {
            parts.push(currentVal.trim());
          }
          currentVal = "";
       } else {
          currentVal += char;
       }
    }
    if (currentVal.trim()) parts.push(currentVal.trim());
    
    let formattedParts = [];
    for (const part of parts) {
       const eqIdx = part.indexOf('=');
       if (eqIdx !== -1) {
          const val = part.substring(eqIdx + 1).trim();
          formattedParts.push(formatInputVal(val));
       } else {
          formattedParts.push(formatInputVal(part));
       }
    }
    return formattedParts.join("\n");
  };

  const handleSmartAdd = (type: "run" | "submit") => {
    if (type === "run") {
      if (!runSmartInput && !runSmartOutput) return toast.error("Please provide input or output to parse.");
      const inStr = runSmartInput ? parseInputText(runSmartInput) : "";
      const outStr = runSmartOutput ? formatOutputVal(runSmartOutput) : "";
      
      setRunTestcases(prev => [...prev, { input: inStr, output: outStr }]);
      setRunSmartInput("");
      setRunSmartOutput("");
      toast.success("Parsed and added public run testcase.");
    } else {
      if (!submitSmartInput && !submitSmartOutput) return toast.error("Please provide input or output to parse.");
      const inStr = submitSmartInput ? parseInputText(submitSmartInput) : "";
      const outStr = submitSmartOutput ? formatOutputVal(submitSmartOutput) : "";
      
      setSubmitTestcases(prev => [...prev, { input: inStr, output: outStr }]);
      setSubmitSmartInput("");
      setSubmitSmartOutput("");
      toast.success("Parsed and added hidden submit testcase.");
    }
  };


  return (
    <div className="flex-1 w-full flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-5xl space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col gap-2 border-b pb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight">Add Problem Statement</h1>
          </div>
          <p className="text-muted-foreground text-lg ml-14">
            Import problems directly from LeetCode into the Code Executor service or manually add them.
          </p>
        </div>

        {/* LeetCode Fetcher Card */}
        <div className="bg-card border text-card-foreground rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Source URL
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a valid LeetCode problem URL to auto-populate the metadata and description.
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input 
                  placeholder="https://leetcode.com/problems/two-sum/" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 text-md transition-all focus-visible:ring-primary inline-flex font-mono"
                />
              </div>
              <Button onClick={handleFetch} disabled={loading} className="h-12 px-8">
                {loading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : "Fetch Data"}
              </Button>
            </div>
          </div>
        </div>

        {/* Two Column Layout for Large Screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start pb-20">
          
          {/* Left Column: Problem Details */}
          <div className="space-y-6">
            <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="text-xl font-semibold pb-2 border-b">Basic Information</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Two Sum" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder="two-sum" className="font-mono" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <select 
                      id="difficulty"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={difficulty} 
                      onChange={e => setDifficulty(e.target.value)}
                    >
                      <option value="Easy">Standard / Easy</option>
                      <option value="Medium">Intermediate / Medium</option>
                      <option value="Hard">Advanced / Hard</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="Array, Hash Table" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl shadow-sm p-6 flex flex-col">
              <h2 className="text-xl font-semibold pb-2 border-b mb-4">Problem Description</h2>
              <textarea 
                className="flex-1 w-full rounded-md border border-input bg-background p-4 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 resize-none leading-relaxed min-h-[500px] font-mono whitespace-pre-wrap"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Given an array of integers nums and an integer target..."
              />
            </div>
          </div>

          {/* Right Column: Testcases Configuration */}
          <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6 flex flex-col h-full min-h-[600px]">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <h2 className="text-xl font-semibold">Testcases Configuration</h2>
                <p className="text-sm text-muted-foreground mt-1">Easily paste LeetCode examples or manually add them below.</p>
              </div>
            </div>

            {/* Custom Tab Switcher */}
            <div className="flex bg-muted/50 p-1.5 rounded-xl w-full border mt-2">
              <button 
                onClick={() => setActiveTab("run")} 
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === "run" ? "bg-background shadow-md text-blue-600 dark:text-blue-400 border border-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                Public "Run" ({runTestcases.length})
              </button>
              <button 
                onClick={() => setActiveTab("submit")}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === "submit" ? "bg-background shadow-md text-emerald-600 dark:text-emerald-400 border border-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                Hidden "Submit" ({submitTestcases.length})
              </button>
            </div>
            
            <div className="flex-1 space-y-4">
              {activeTab === "run" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 text-sm font-bold shadow-sm">{runTestcases.length}</span>
                      <div>
                        <h3 className="font-semibold text-sm">Public Testcases</h3>
                        <p className="text-xs text-muted-foreground">Visible to users during matches</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4 sm:mt-0 items-center">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="smart-paste-run" 
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={isRunSmartOpen}
                          onChange={(e) => setIsRunSmartOpen(e.target.checked)} 
                        />
                        <Label htmlFor="smart-paste-run" className="text-sm cursor-pointer whitespace-nowrap">Smart Parse</Label>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addTestcase("run")}>
                        <Plus className="h-4 w-4 mr-1" /> Add Blank
                      </Button>
                    </div>
                  </div>

                  {isRunSmartOpen && (
                    <div className="w-full transition-all border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 rounded-xl p-4 shadow-sm mb-4 animate-in slide-in-from-top-2">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 w-full">
                          <textarea 
                            className="w-full border rounded-lg p-3 text-sm bg-background hover:bg-muted/50 focus:bg-background focus-visible:outline-none focus:border-blue-400 transition-colors resize-none placeholder:text-muted-foreground/50 h-24 font-mono shadow-inner"
                            placeholder="Raw Input (e.g. nums=[1,2])"
                            value={runSmartInput}
                            onChange={e => setRunSmartInput(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 w-full">
                          <textarea 
                            className="w-full border rounded-lg p-3 text-sm bg-background hover:bg-muted/50 focus:bg-background focus-visible:outline-none focus:border-blue-400 transition-colors resize-none placeholder:text-muted-foreground/50 h-24 font-mono text-blue-600 dark:text-blue-400 shadow-inner"
                            placeholder="Raw Expected Output (e.g. [0,1])"
                            value={runSmartOutput}
                            onChange={e => setRunSmartOutput(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button size="sm" onClick={() => handleSmartAdd("run")} disabled={!runSmartInput && !runSmartOutput} className="bg-blue-600 hover:bg-blue-700 text-white">
                          Parse & Add
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 pb-2">
                    {runTestcases.map((tc, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 items-start border rounded-lg p-3 bg-card hover:border-blue-200 dark:hover:border-blue-800 focus-within:border-blue-400 transition-colors group relative shadow-sm">
                        <div className="flex-1 w-full">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-semibold px-1">Input {idx + 1}</Label>
                          <textarea 
                            className="w-full bg-muted/20 border border-transparent hover:border-border rounded p-2 resize-y focus:outline-none focus:border-blue-400 font-mono text-xs leading-relaxed min-h-[50px] transition-colors"
                            rows={Math.max(2, tc.input.split('\n').length)}
                            value={tc.input} 
                            placeholder="nums = [2,7,11,15]\ntarget = 9"
                            onChange={e => updateTestcase("run", idx, "input", e.target.value)} 
                          />
                        </div>
                        <Separator orientation="vertical" className="hidden md:block h-auto mx-1" />
                        <Separator className="md:hidden my-1" />
                        <div className="flex-1 w-full">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-semibold px-1">Output</Label>
                          <textarea 
                            className="w-full bg-muted/20 border border-transparent hover:border-border rounded p-2 resize-y focus:outline-none focus:border-blue-400 font-mono text-xs leading-relaxed text-blue-600 dark:text-blue-400 min-h-[50px] transition-colors"
                            rows={Math.max(2, tc.output.split('\n').length)}
                            value={tc.output} 
                            placeholder="[0,1]"
                            onChange={e => updateTestcase("run", idx, "output", e.target.value)} 
                          />
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 md:relative md:top-auto md:right-auto md:self-center h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-950 opacity-40 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeTestcase("run", idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {runTestcases.length === 0 && (
                      <div className="text-center py-8 border border-dashed rounded-xl bg-muted/5 text-muted-foreground text-sm flex flex-col items-center justify-center min-h-[150px]">
                        No public testcases defined. 
                        <span className="mt-1 text-xs">Toggle "Smart Parse" to paste from Leetcode, or add manually.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "submit" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400 text-sm font-bold shadow-sm">{submitTestcases.length}</span>
                      <div>
                        <h3 className="font-semibold text-sm">Hidden Testcases</h3>
                        <p className="text-xs text-muted-foreground">Used exclusively for final evaluation scoring</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4 sm:mt-0 items-center">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="smart-paste-submit" 
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={isSubmitSmartOpen}
                          onChange={(e) => setIsSubmitSmartOpen(e.target.checked)} 
                        />
                        <Label htmlFor="smart-paste-submit" className="text-sm cursor-pointer whitespace-nowrap">Smart Parse</Label>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addTestcase("submit")}>
                        <Plus className="h-4 w-4 mr-1" /> Add Blank
                      </Button>
                    </div>
                  </div>

                  {isSubmitSmartOpen && (
                    <div className="w-full transition-all border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl p-4 shadow-sm mb-4 animate-in slide-in-from-top-2">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 w-full">
                          <textarea 
                            className="w-full border rounded-lg p-3 text-sm bg-background hover:bg-muted/50 focus:bg-background focus-visible:outline-none focus:border-emerald-400 transition-colors resize-none placeholder:text-muted-foreground/50 h-24 font-mono shadow-inner"
                            placeholder="Raw Input (e.g. nums=[1,2])"
                            value={submitSmartInput}
                            onChange={e => setSubmitSmartInput(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 w-full">
                          <textarea 
                            className="w-full border rounded-lg p-3 text-sm bg-background hover:bg-muted/50 focus:bg-background focus-visible:outline-none focus:border-emerald-400 transition-colors resize-none placeholder:text-muted-foreground/50 h-24 font-mono text-emerald-600 dark:text-emerald-400 shadow-inner"
                            placeholder="Raw Expected Output"
                            value={submitSmartOutput}
                            onChange={e => setSubmitSmartOutput(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button size="sm" onClick={() => handleSmartAdd("submit")} disabled={!submitSmartInput && !submitSmartOutput} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          Parse & Add
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 pb-2">
                    {submitTestcases.map((tc, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 items-start border rounded-lg p-3 bg-card hover:border-emerald-200 dark:hover:border-emerald-800 focus-within:border-emerald-400 transition-colors group relative shadow-sm">
                        <div className="flex-1 w-full">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-semibold px-1">Input {idx + 1}</Label>
                          <textarea 
                            className="w-full bg-muted/20 border border-transparent hover:border-border rounded p-2 resize-y focus:outline-none focus:border-emerald-400 font-mono text-xs leading-relaxed min-h-[50px] transition-colors"
                            rows={Math.max(2, tc.input.split('\n').length)}
                            value={tc.input} 
                            placeholder="nums = [3,2,4]\ntarget = 6"
                            onChange={e => updateTestcase("submit", idx, "input", e.target.value)} 
                          />
                        </div>
                        <Separator orientation="vertical" className="hidden md:block h-auto mx-1" />
                        <Separator className="md:hidden my-1" />
                        <div className="flex-1 w-full">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-semibold px-1">Output</Label>
                          <textarea 
                            className="w-full bg-muted/20 border border-transparent hover:border-border rounded p-2 resize-y focus:outline-none focus:border-emerald-400 font-mono text-xs leading-relaxed text-emerald-600 dark:text-emerald-400 min-h-[50px] transition-colors"
                            rows={Math.max(2, tc.output.split('\n').length)}
                            value={tc.output} 
                            placeholder="[1,2]"
                            onChange={e => updateTestcase("submit", idx, "output", e.target.value)} 
                          />
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 md:relative md:top-auto md:right-auto md:self-center h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-950 opacity-40 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeTestcase("submit", idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {submitTestcases.length === 0 && (
                      <div className="text-center py-8 border border-dashed rounded-xl bg-muted/5 text-muted-foreground text-sm flex flex-col items-center justify-center min-h-[150px]">
                        No hidden testcases defined.
                        <span className="mt-1 text-xs">These will not be visible to users but will determine final score.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="sticky bottom-8 z-10 flex justify-end">
          <div className="bg-background/80 backdrop-blur-lg border shadow-lg rounded-full p-2 pr-4 flex items-center gap-4">
            <span className="text-sm text-muted-foreground ml-4 hidden sm:inline-block">
              {title ? `Ready to save: ${title}` : "Fill out the problem details"}
            </span>
            <Button 
              size="lg" 
              className="rounded-full shadow-md font-semibold"
              onClick={handleSave} 
              disabled={saving || !title}
            >
              {saving ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Publish Problem
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
