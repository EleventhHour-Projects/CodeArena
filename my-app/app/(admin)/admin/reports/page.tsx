"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Shield, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Eye, Code, Bell, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import MonacoEditor from "@monaco-editor/react";

export default function AdminReports() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reportDetails, setReportDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (data.success) setReports(data.reports);
      else toast.error("Failed to load reports");
    } catch { toast.error("Error fetching reports"); }
    finally { setLoading(false); }
  };

  const loadReportDetails = async (reportId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/details`);
      const data = await res.json();
      if (data.success) setReportDetails(data);
      else toast.error("Failed to load report details");
    } catch { toast.error("Error fetching report details"); }
    finally { setLoadingDetails(false); }
  };

  const handleAction = async (reportId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Report ${action}ed`);
        setReportDetails(null); setSelectedReport(null); fetchReports();
      } else toast.error(data.message || `Failed to ${action} report`);
    } catch { toast.error("Error processing report"); }
  };

  const handleNotify = async () => {
    if (!notifyMessage.trim() || !selectedReport) return;
    setSendingNotify(true);
    try {
      const res = await fetch(`/api/admin/reports/${selectedReport._id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: notifyMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Notification sent!");
        setNotifyMessage(""); setReportDetails(null); setSelectedReport(null); fetchReports();
      } else toast.error(data.message || "Failed to send notification");
    } catch { toast.error("Error sending notification"); }
    finally { setSendingNotify(false); }
  };

  const TEMPLATES = [
    { label: "Acknowledged", text: "Related - {issue}\n\nHi {username}, thanks for reaching out! We've received your report and our team is looking into it. We appreciate you taking the time to help improve CodeArena." },
    { label: "Bug Noted",    text: "Related - {issue}\n\nHi {username}, thanks for reporting this bug. We've logged it and it will be addressed in an upcoming update. Stay tuned!" },
    { label: "Feature Noted",text: "Related - {issue}\n\nHi {username}, great suggestion! We've added your feedback to our feature backlog. No promises on timelines, but we genuinely consider every idea submitted." },
    { label: "Won't Fix",    text: "Related - {issue}\n\nHi {username}, thanks for the report. After reviewing it, we've decided not to make changes at this time as it falls outside our current scope. We appreciate your feedback nonetheless!" },
    { label: "Already Fixed",text: "Related - {issue}\n\nHi {username}, good news — this issue has already been fixed in our latest update. Please refresh and let us know if you experience anything further." },
  ];

  const LANG_MAP: Record<string, string> = {
    javascript: "javascript", js: "javascript",
    typescript: "typescript", ts: "typescript",
    python: "python", py: "python",
    java: "java", cpp: "cpp", "c++": "cpp", c: "c",
    go: "go", rust: "rust", ruby: "ruby", kotlin: "kotlin", swift: "swift",
  };

  const statusBadge = (s: string) =>
    s === "Pending"  ? "text-amber-500 border-amber-500/20 bg-amber-500/10"  :
    s === "Accepted" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" :
                       "text-zinc-500 border-zinc-500/20 bg-zinc-500/10";

  const diffBadge = (d: string) =>
    d === "Easy"   ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
    d === "Medium" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                     "text-rose-400 border-rose-500/30 bg-rose-500/10";

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto flex flex-col h-[88vh] gap-6">

        {/* HEADER */}
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Admin Control
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">

          {/* ── LEFT: REPORTS LIST ── */}
          <div className="lg:col-span-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> All Reports
              </span>
              <span className="text-xs text-muted-foreground">{reports.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
              {loading ? (
                <p className="p-8 text-center text-muted-foreground text-xs animate-pulse">Loading...</p>
              ) : reports.length === 0 ? (
                <p className="p-8 text-center text-zinc-600 text-xs italic">No reports found.</p>
              ) : reports.map((report) => (
                <div
                  key={report._id}
                  onClick={() => { setSelectedReport(report); loadReportDetails(report._id); setNotifyMessage(""); }}
                  className={`cursor-pointer px-3 py-3 rounded-xl transition-all border ${
                    selectedReport?._id === report._id
                      ? "bg-primary/10 border-primary/30"
                      : "border-transparent hover:bg-muted"
                  }`}
                >
                  {/* title row */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate max-w-[65%]">
                      {report.reported?.username
                        ? report.reported.username
                        : <span className="text-muted-foreground font-normal">{report.category || "Feedback"}</span>}
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${statusBadge(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                  {/* reason */}
                  <p className="text-[11px] text-muted-foreground truncate mb-1.5">"{report.reason}"</p>
                  {/* meta */}
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>{report.reporter?.username}</span>
                    <span>{format(new Date(report.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: DETAIL PANEL ── */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
            {!selectedReport ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Eye className="h-8 w-8 opacity-20" />
                <p className="text-sm">Select a report to view</p>
              </div>
            ) : loadingDetails ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" />
              </div>
            ) : reportDetails ? (
              <div className="flex flex-col h-full">

                {/* ── compact header strip ── */}
                <div className="px-5 py-4 border-b border-border shrink-0 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {selectedReport.reported ? (
                      <p className="text-sm font-semibold">
                        Reported user: <span className="text-rose-500">{selectedReport.reported.username}</span>
                      </p>
                    ) : (
                      <p className="text-sm font-semibold">
                        <span className="text-amber-400">{selectedReport.category || "Feedback"}</span>
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(no user targeted)</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From <span className="font-medium text-foreground">{selectedReport.reporter?.username}</span>
                      {" · "}{format(new Date(selectedReport.createdAt), "MMM d, yyyy · h:mm a")}
                    </p>
                    {/* reason inline */}
                    <p className="text-xs text-muted-foreground mt-2 italic max-w-lg">"{selectedReport.reason}"</p>
                  </div>

                  {/* cheating report actions */}
                  {selectedReport.status === "Pending" && selectedReport.reported && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 text-xs" onClick={() => handleAction(selectedReport._id, "accept")}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs" onClick={() => handleAction(selectedReport._id, "reject")}>
                        <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                      </Button>
                    </div>
                  )}

                  {/* processed badge */}
                  {selectedReport.status !== "Pending" && (
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border shrink-0 ${statusBadge(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                  )}
                </div>

                {/* ── body ── */}
                {selectedReport.battleId ? (

                  /* CHEATING: code submissions */
                  <div className="flex-1 p-5 overflow-y-auto scrollbar-thin space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" /> Submitted code
                    </p>
                    {!reportDetails.submissions || reportDetails.submissions.length === 0 ? (
                      <div className="bg-muted/50 rounded-xl p-8 text-center text-sm text-muted-foreground border border-border">
                        No accepted submissions found for this user in this battle.
                      </div>
                    ) : reportDetails.submissions.map((sub: any, i: number) => {
                      const monacoLang = LANG_MAP[(sub.language || "").toLowerCase()] ?? "plaintext";
                      const lineCount  = (sub.code || "").split("\n").length;
                      const editorH    = Math.min(Math.max(lineCount * 19 + 20, 120), 300);

                      // Find solve time for this problem
                      const battle = reportDetails.report.battleId;
                      const isPlayer1 = battle.player1.toString() === reportDetails.report.reported._id.toString();
                      const problemResult = battle.problemResults?.find((pr: any) => pr.problem.id === sub.problem.id);
                      const solveTimeSec = isPlayer1 ? problemResult?.player1SolveTime : problemResult?.player2SolveTime;
                      
                      const formatTime = (seconds: number) => {
                        if (!seconds || seconds <= 0) return "N/A";
                        const mins = Math.floor(seconds / 60);
                        const secs = seconds % 60;
                        return `${mins}:${secs.toString().padStart(2, '0')}`;
                      };

                      return (
                        <div key={sub._id} className="rounded-xl overflow-hidden border border-zinc-800">
                          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Code className="h-3 w-3 text-zinc-500" />
                              <span className="text-xs text-zinc-300 font-medium">
                                {sub.problem?.title || `Problem #${sub.problem?.id || i + 1}`}
                              </span>
                              {sub.problem?.difficulty && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${diffBadge(sub.problem.difficulty)}`}>
                                  {sub.problem.difficulty}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-500 ml-1 font-mono">
                                Solved in: <span className="text-primary font-bold">{formatTime(solveTimeSec)}</span>
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                              {sub.language}
                            </span>
                          </div>
                          <div style={{ height: editorH }} className="bg-[#1e1e1e]">
                            <MonacoEditor
                              height={editorH}
                              language={monacoLang}
                              value={sub.code || ""}
                              theme="vs-dark"
                              options={{
                                readOnly: true, minimap: { enabled: false },
                                scrollBeyondLastLine: false, fontSize: 12,
                                lineNumbers: "on", glyphMargin: false, folding: false,
                                lineDecorationsWidth: 0, renderLineHighlight: "none",
                                scrollbar: { vertical: "auto", horizontal: "auto" },
                                wordWrap: "off", contextmenu: false, automaticLayout: true,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                ) : (

                  /* FEEDBACK / BUG: reply composer */
                  <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto scrollbar-thin">

                    {selectedReport.status === "Pending" ? (
                      <>
                        {/* templates */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                            <Bell className="h-3 w-3 inline mr-1" />Quick Templates
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {TEMPLATES.map((tpl) => {
                              const resolved = tpl.text
                                .replace(/\{username\}/g, selectedReport.reporter?.username || "there")
                                .replace(/\{issue\}/g,   selectedReport.reason || "your report");
                              return (
                                <button
                                  key={tpl.label}
                                  onClick={() => setNotifyMessage(resolved)}
                                  className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-muted hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all font-medium"
                                >
                                  {tpl.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* textarea */}
                        <Textarea
                          id="notify-message"
                          placeholder="Select a template or write a custom message..."
                          className="flex-1 min-h-[140px] resize-none text-sm bg-muted/50 border-border focus-visible:ring-primary"
                          value={notifyMessage}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotifyMessage(e.target.value)}
                        />

                        <Button
                          id="send-notify-btn"
                          className="self-end gap-2"
                          onClick={handleNotify}
                          disabled={!notifyMessage.trim() || sendingNotify}
                        >
                          <Send className="h-3.5 w-3.5" />
                          {sendingNotify ? "Sending..." : "Send Notification"}
                        </Button>
                      </>
                    ) : (
                      /* already replied */
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Reply sent · Report {selectedReport.status.toLowerCase()}
                        </div>
                        {selectedReport.adminReply ? (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                            <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold mb-2">
                              Message sent to {selectedReport.reporter?.username}
                            </p>
                            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                              {selectedReport.adminReply}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No reply text recorded for this report.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
