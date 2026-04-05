"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Terminal, 
  Activity, 
  RefreshCw, 
  Play, 
  Settings, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  Trash2,
  Server,
  Cpu,
  ChevronRight,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Types
interface DeploymentStatus {
  status: string;
  start_time: string;
  end_time: string;
}

interface LogEntry {
  id: string;
  text: string;
  timestamp: Date;
}

export default function ConsolePage() {
  // Authentication & Configuration
  const [token, setToken] = useState<string>("");
  const [tempToken, setTempToken] = useState<string>("");
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // States
  const [healthStatus, setHealthStatus] = useState<"ok" | "error" | "loading">("loading");
  const [generalLogs, setGeneralLogs] = useState<LogEntry[]>([]);
  const [containerLogs, setContainerLogs] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("frontend-service");
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Refs for auto-scroll
  const generalLogsEndRef = useRef<HTMLDivElement>(null);
  const containerLogsEndRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    const savedToken = sessionStorage.getItem("x-deploy-token");
    if (savedToken) {
      setToken(savedToken);
      setIsConfigured(true);
    } else {
      setIsTokenModalOpen(true);
    }
  }, []);

  // API Call Helpers
  const fetchFromProxy = useCallback(async (endpoint: string, params: Record<string, string> = {}) => {
    const url = new URL("/api/admin/deploy-proxy", window.location.origin);
    url.searchParams.set("endpoint", endpoint);
    Object.entries(params).forEach(([key, val]) => url.searchParams.set(key, val));

    const headers: Record<string, string> = {};
    if (token) headers["X-Deploy-Token"] = token;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
        if (res.status === 401) {
            toast.error("Invalid Deployment Token");
            setIsConfigured(false);
            setIsTokenModalOpen(true);
        }
        throw new Error(`Failed to fetch ${endpoint}`);
    }
    return res.json();
  }, [token]);

  // Data Fetching
  const refreshHealth = async () => {
    if (!isConfigured) return;
    try {
      const data = await fetchFromProxy("/health");
      setHealthStatus(data.status === "ok" ? "ok" : "error");
    } catch (err) {
      setHealthStatus("error");
    }
  };

  const refreshLogs = async () => {
    if (!isConfigured) return;
    try {
      const data = await fetchFromProxy("/logs");
      if (data.logs) {
        const newLogs = data.logs.map((log: string, idx: number) => ({
          id: `${Date.now()}-${idx}`,
          text: log,
          timestamp: new Date()
        }));
        setGeneralLogs(newLogs);
      }
    } catch (err) {
      console.error("Logs refresh failed", err);
    }
  };

  const refreshContainerLogs = async () => {
    if (!isConfigured) return;
    try {
      const data = await fetchFromProxy("/container-logs", { service: selectedService });
      setContainerLogs(data.logs || "");
    } catch (err) {
      console.error("Container logs refresh failed", err);
    }
  };

  const refreshStatus = async () => {
    if (!isConfigured) return;
    try {
      const data = await fetchFromProxy("/deployment-status");
      setDeploymentStatus(data);
    } catch (err) {
      console.error("Status refresh failed", err);
    }
  };

  const handleDeploy = async () => {
    if (!confirm("Are you sure you want to trigger a new deployment?")) return;
    setIsDeploying(true);
    try {
      const url = new URL("/api/admin/deploy-proxy", window.location.origin);
      url.searchParams.set("endpoint", "/deploy");
      
      const res = await fetch(url.toString(), { 
        method: "POST",
        headers: { "X-Deploy-Token": token }
      });
      
      if (res.ok) {
        toast.success("Deployment process triggered successfully!");
        refreshStatus();
      } else {
        toast.error("Failed to trigger deployment");
      }
    } catch (err) {
      toast.error("Error triggering deployment");
    } finally {
      setIsDeploying(false);
    }
  };

  // Polling Logic
  useEffect(() => {
    if (!isConfigured) return;

    refreshHealth();
    const healthInterval = setInterval(refreshHealth, 30000); // 30s
    
    let logsInterval: NodeJS.Timeout;
    if (autoRefresh) {
      refreshLogs();
      refreshContainerLogs();
      refreshStatus();
      logsInterval = setInterval(() => {
        refreshLogs();
        refreshContainerLogs();
        refreshStatus();
      }, 5000); // 5s
    }

    return () => {
      if (healthInterval) clearInterval(healthInterval);
      if (logsInterval) clearInterval(logsInterval);
    };
  }, [isConfigured, autoRefresh, selectedService]);

  // Auto-scroll logic
  useEffect(() => {
    if (generalLogsEndRef.current) {
      generalLogsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [generalLogs]);

  useEffect(() => {
    if (containerLogsEndRef.current) {
      containerLogsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [containerLogs]);

  const saveToken = () => {
    if (!tempToken.trim()) {
      toast.error("Token cannot be empty");
      return;
    }
    sessionStorage.setItem("x-deploy-token", tempToken);
    setToken(tempToken);
    setIsConfigured(true);
    setIsTokenModalOpen(false);
    toast.success("Deployment token saved for this session");
  };

  const services = [
    { name: "Frontend", id: "frontend-service" },
    { name: "Express Server", id: "express-server" },
    { name: "Executor Service", id: "executor-service" },
    { name: "Redis", id: "redis" },
  ];

  return (
    <div className="flex flex-col h-auto min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] bg-[#050505] text-zinc-300 font-sans md:overflow-hidden">
      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 sm:px-6 py-4 gap-4 border-b border-white/5 bg-black/40 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className={`h-2 w-2 rounded-full ${
              healthStatus === "ok" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : 
              healthStatus === "error" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : 
              "bg-zinc-500 animate-pulse"
            }`} />
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                {healthStatus === "ok" ? "System Healthy" : healthStatus === "error" ? "System Offline" : "Checking Status"}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="h-5 w-5 text-indigo-400" />
            Deployment Console
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`gap-2 ${autoRefresh ? "text-emerald-400" : "text-zinc-500"}`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh && !isDeploying ? "animate-spin-slow" : ""}`} />
            {autoRefresh ? "Auto-refreshing" : "Paused"}
          </Button>
          
          <Button 
            variant={isConfigured ? "outline" : "default"} 
            size="sm" 
            onClick={() => setIsTokenModalOpen(true)}
            className="gap-2 border-white/10 hover:bg-white/5"
          >
            <Settings className="h-4 w-4" />
            Config
          </Button>
          
          <Button 
            variant="default"
            size="sm"
            onClick={handleDeploy}
            disabled={isDeploying || !isConfigured}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-6 gap-2"
          >
            {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            Deploy Now
          </Button>
        </div>
      </header>

      {/* --- DASHBOARD STATS --- */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 sm:p-6 bg-black/20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Last Deployment</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {deploymentStatus?.status === "success" ? "Successful" : deploymentStatus ? "Failed" : "Unknown"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {deploymentStatus?.end_time ? new Date(deploymentStatus.end_time).toLocaleString() : "Never"}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <RefreshCw className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Duration</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {deploymentStatus?.start_time && deploymentStatus?.end_time ? 
               `${Math.round((new Date(deploymentStatus.end_time).getTime() - new Date(deploymentStatus.start_time).getTime()) / 1000)}s` : 
               "0s"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Build & cleanup time</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Cpu className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Active Services</span>
          </div>
          <p className="text-2xl font-bold text-white">4 / 4</p>
          <p className="text-xs text-zinc-500 mt-1">Connected to deploy engine</p>
        </motion.div>
      </section>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6 p-4 sm:p-6 overflow-y-auto lg:overflow-hidden min-h-[600px] lg:min-h-0">
        {/* GENERAL LOGS */}
        <div className="flex flex-col h-[400px] lg:h-full bg-black/40 border border-white/5 rounded-2xl overflow-hidden group">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Deployment Server Logs</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setGeneralLogs([])}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
            {generalLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 italic">
                    Waiting for logs...
                </div>
            ) : (
                generalLogs.map((log) => (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group/line"
                    >
                        <span className="text-zinc-600 shrink-0 select-none">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className={`break-words ${
                            log.text.includes("error") || log.text.includes("Failed") ? "text-rose-400" : 
                            log.text.includes("success") ? "text-emerald-400" : 
                            "text-zinc-300"
                        }`}>
                            {log.text}
                        </span>
                    </motion.div>
                ))
            )}
            <div ref={generalLogsEndRef} />
          </div>
        </div>

        {/* CONTAINER LOGS */}
        <div className="flex flex-col h-[400px] lg:h-full bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Container Logs</span>
              </div>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="w-[180px] h-8 bg-white/5 border-white/10 text-xs focus:ring-0">
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs focus:bg-white/10">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setContainerLogs("")}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-zinc-400 scrollbar-thin scrollbar-thumb-white/10">
             {containerLogs || "No logs available for this service."}
             <div ref={containerLogsEndRef} />
          </div>
        </div>
      </main>

      {/* --- TOKEN MODAL --- */}
      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-zinc-300 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                Auth Configuration
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Enter your deployment server token. This is used for authentication and will only be stored for this browser session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium text-zinc-400">X-Deploy-Token</label>
              <div className="relative">
                <Input
                  id="token"
                  type="password"
                  placeholder="Enter deployment token..."
                  value={tempToken}
                  onChange={(e) => setTempToken(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-indigo-500/50 pr-10 h-11"
                  onKeyDown={(e) => e.key === 'Enter' && saveToken()}
                />
                <div className="absolute right-3 top-3.5 text-zinc-600">
                    <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setIsTokenModalOpen(false)}>Cancel</Button>
            <Button onClick={saveToken} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
