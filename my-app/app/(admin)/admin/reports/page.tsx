"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Shield, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Eye, ArrowRight, Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminReports() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reportDetails, setReportDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
      } else {
        toast.error("Failed to load reports");
      }
    } catch (err) {
      toast.error("Error fetching reports");
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetails = async (reportId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/details`);
      const data = await res.json();
      if (data.success) {
        setReportDetails(data);
      } else {
        toast.error("Failed to load report details");
      }
    } catch (err) {
      toast.error("Error fetching report details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAction = async (reportId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Report ${action}ed`);
        setReportDetails(null);
        setSelectedReport(null);
        fetchReports();
      } else {
        toast.error(data.message || `Failed to ${action} report`);
      }
    } catch (err) {
      toast.error(`Error processing report`);
    }
  };

  return (
    <div className="min-h-[100vh] bg-background text-foreground px-6 py-10 selection:bg-primary/30 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col h-[85vh] gap-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest mb-2">
              <Shield className="h-4 w-4" />
              Admin Control
            </div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              Player Reports
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* REPORTS LIST */}
          <div className="lg:col-span-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border font-semibold flex items-center gap-2 text-sm tracking-tight text-primary shrink-0">
              <AlertTriangle className="h-4 w-4" /> ALL REPORTS
            </div>
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-xs animate-pulse">Loading reports...</div>
              ) : reports.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 text-xs italic">No reports found.</div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report._id}
                    onClick={() => {
                      setSelectedReport(report);
                      loadReportDetails(report._id);
                    }}
                    className={`cursor-pointer p-4 mb-2 rounded-xl transition-all border ${selectedReport?._id === report._id ? "bg-primary/10 border-primary/30" : "bg-transparent border-transparent hover:bg-muted"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold">{report.reported?.username || 'Unknown'}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${report.status === 'Pending' ? 'text-amber-500 border-amber-500/20 bg-amber-500/10' : report.status === 'Accepted' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-zinc-500 border-zinc-500/20 bg-zinc-500/10'}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">"{report.reason}"</p>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>By: {report.reporter?.username}</span>
                      <span>{format(new Date(report.createdAt), "MMM d, h:mm a")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* REPORT DETAILS */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
            {!selectedReport ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10">
                <Eye className="h-10 w-10 mb-4 opacity-20" />
                <p>Select a report to view details</p>
              </div>
            ) : loadingDetails ? (
              <div className="flex-1 flex items-center justify-center p-10">
                <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" />
              </div>
            ) : reportDetails ? (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-border shrink-0">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        Reported: <span className="text-rose-500">{selectedReport.reported?.username}</span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">Reporter: {selectedReport.reporter?.username}</p>
                    </div>
                    {selectedReport.status === "Pending" && (
                      <div className="flex gap-2">
                        <Button variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleAction(selectedReport._id, "accept")}>
                          <CheckCircle className="h-4 w-4 mr-2" /> Accept & Reset Rating
                        </Button>
                        <Button variant="outline" className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10" onClick={() => handleAction(selectedReport._id, "reject")}>
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Reason</h3>
                    <p className="text-sm">{selectedReport.reason}</p>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-primary">
                    <Code className="h-4 w-4" /> Code Written in Battle ({selectedReport.battleId})
                  </h3>
                  {reportDetails.submissions?.length === 0 ? (
                    <div className="bg-muted/50 rounded-xl p-8 text-center text-sm text-muted-foreground border border-border">
                      No accepted submissions found for this user in this battle.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {reportDetails.submissions?.map((sub: any, i: number) => (
                        <div key={sub._id} className="border border-border rounded-xl flex flex-col min-h-0 bg-black">
                          <div className="px-4 py-2 border-b border-zinc-800 flex justify-between items-center text-[10px] font-mono shrink-0">
                            <span className="text-zinc-400">Problem ID: {sub.problem?.id} ({sub.problem?.difficulty})</span>
                            <span className="text-amber-400 font-bold">{sub.language}</span>
                          </div>
                          <div className="p-4 overflow-auto max-h-[300px]">
                            <pre className="text-xs font-mono text-zinc-300">
                              {sub.code}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
