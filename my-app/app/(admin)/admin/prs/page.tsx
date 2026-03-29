"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, GitPullRequest, GitMerge, RefreshCw, ArrowLeft, ExternalLink, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

type PullRequest = {
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
  labels: {
    name: string;
    color: string;
  }[];
  html_url: string;
  created_at: string;
};

export default function AdminPRs() {
  const router = useRouter();
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<number | null>(null);

  const fetchPRs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prs");
      if (!res.ok) throw new Error("Failed to fetch PRs");
      const data = await res.json();
      setPrs(data || []);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while fetching PRs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, []);

  const handleMerge = async (prNumber: number) => {
    if (!confirm(`Are you sure you want to merge PR #${prNumber}?`)) return;
    
    setMerging(prNumber);
    try {
      const res = await fetch("/api/admin/prs/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pr_number: prNumber })
      });
      
      if (res.ok) {
        toast.success(`PR #${prNumber} merged successfully`);
        // Refresh the list after successful merge
        fetchPRs();
      } else {
        const data = await res.json();
        toast.error(`Failed to merge PR: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error("An error occurred while merging the PR");
    } finally {
      setMerging(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 selection:bg-primary/30 transition-colors">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest mb-2">
              <Shield className="h-4 w-4" />
              Admin Control / Pull Requests
            </div>
            <h1 className="text-3xl font-semibold tracking-tight inline-flex items-center gap-3">
              <GitPullRequest className="h-8 w-8 text-primary" />
              Pull Requests
            </h1>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => router.push("/admin")}
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={fetchPRs}
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground flex gap-2 font-medium"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* PR LIST */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          {loading && prs.length === 0 ? (
            <div className="flex justify-center items-center py-20 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : prs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground italic tracking-tight">
              <GitPullRequest className="h-12 w-12 mx-auto mb-4 text-border" />
              No open pull requests found.
            </div>
          ) : (
            <div className="divide-y divide-border overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Pull Request</th>
                    <th className="px-6 py-4 font-semibold">Author</th>
                    <th className="px-6 py-4 font-semibold">Branch</th>
                    <th className="px-6 py-4 font-semibold">Created</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {prs.map((pr) => (
                    <motion.tr 
                      key={pr.number}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-start gap-3">
                          <span className="text-emerald-500 mt-1"><GitPullRequest className="h-5 w-5" /></span>
                          <div>
                            <div className="font-semibold text-base mb-1 flex items-center gap-2">
                              {pr.title}
                              <span className="text-muted-foreground text-sm font-normal">#{pr.number}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {pr.labels.map(label => (
                                <span 
                                  key={label.name} 
                                  className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md border"
                                  style={{ borderColor: `#${label.color}40`, color: `#${label.color}` }}
                                >
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-center gap-3">
                          <img src={pr.user.avatar_url} alt={pr.user.login} className="w-8 h-8 rounded-full border border-border" />
                          <span className="font-medium text-sm">{pr.user.login}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded inline-flex">
                          <GitBranch className="h-3 w-3" />
                          <span>{pr.head.ref}</span>
                          <span className="mx-1">→</span>
                          <span>{pr.base.ref}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top text-sm text-muted-foreground">
                        {new Date(pr.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 align-top text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={pr.html_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" className="h-8">
                              <ExternalLink className="h-4 w-4 mr-1.5" />
                              View on GitHub
                            </Button>
                          </a>
                          <Button 
                            size="sm" 
                            onClick={() => handleMerge(pr.number)}
                            disabled={merging === pr.number}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white border-none h-8 shadow-md"
                          >
                            {merging === pr.number ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                            ) : (
                              <GitMerge className="h-4 w-4 mr-1.5" />
                            )}
                            {merging === pr.number ? "Merging..." : "Merge"}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
