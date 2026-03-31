"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flag, Loader2, ChevronDown } from "lucide-react";
import { ReportCategory } from "@/types/ReportType";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

interface BattleRecord {
  id: string;
  createdAt: string;
  opponent: {
    id: string;
    username: string;
  };
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  battleId?: string;
  reportedUserId?: string;
  mode: "battle" | "global";
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  battleId,
  reportedUserId,
  mode,
}) => {
  const [category, setCategory] = useState<ReportCategory>("Other");
  const [reason, setReason] = useState("");
  const [selectedBattleId, setSelectedBattleId] = useState<string | undefined>(battleId);
  const [selectedReportedUserId, setSelectedReportedUserId] = useState<string | undefined>(reportedUserId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Battle history for global mode
  const [battles, setBattles] = useState<BattleRecord[]>([]);
  const [battlePage, setBattlePage] = useState(1);
  const [hasMoreBattles, setHasMoreBattles] = useState(true);
  const [isLoadingBattles, setIsLoadingBattles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state if needed, though we might want to keep it if they just closed and reopened
      if (mode === "battle") {
        setSelectedBattleId(battleId);
        setSelectedReportedUserId(reportedUserId);
      }
    }
  }, [isOpen, mode, battleId, reportedUserId]);

  const fetchBattles = useCallback(async (page: number) => {
    if (isLoadingBattles || !hasMoreBattles) return;
    setIsLoadingBattles(true);
    try {
      const res = await fetch(`/api/user/battles?page=${page}&limit=5`);
      const data = await res.json();
      if (data.success) {
        setBattles((prev) => (page === 1 ? data.battles : [...prev, ...data.battles]));
        setHasMoreBattles(data.pagination.currentPage < data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch battles", error);
    } finally {
      setIsLoadingBattles(false);
    }
  }, [hasMoreBattles, isLoadingBattles]);

  useEffect(() => {
    if (isOpen && mode === "global" && category === "Cheating" && battles.length === 0) {
      fetchBattles(1);
    }
  }, [isOpen, mode, category, battles.length, fetchBattles]);

  const handleCategoryChange = (val: string) => {
    setCategory(val as ReportCategory);
    if (val !== "Cheating" && mode === "global") {
      setSelectedBattleId(undefined);
      setSelectedReportedUserId(undefined);
    }
  };

  const handleBattleSelect = (bId: string) => {
    setSelectedBattleId(bId);
    // Find the opponent ID for this battle
    const battle = battles.find(b => b.id === bId);
    if (battle) {
        setSelectedReportedUserId(battle.opponent.id);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the report");
      return;
    }

    if (category === "Cheating" && !selectedBattleId) {
      toast.error("Please select the battle where cheating occurred");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/battle/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedId: selectedReportedUserId, // Might be undefined but API will handle it
          battleId: selectedBattleId,
          reason,
          category,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Report submitted successfully");
        setReason("");
        onClose();
      } else {
        toast.error(data.message || "Failed to submit report");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadMoreBattles = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextPage = battlePage + 1;
    setBattlePage(nextPage);
    fetchBattles(nextPage);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md w-[95%] rounded-2xl p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Flag className={`w-5 h-5 ${category === "Cheating" ? "text-rose-500" : "text-amber-500"}`} />
              {mode === "battle" ? "Report Opponent" : "Report an Issue"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 mt-1">
              Help us keep CodeArena safe and bug-free.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Category selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Category</label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full bg-[#09090b] border-white/10 text-zinc-300 h-11 focus:ring-amber-500/20">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c1f] border-white/10 text-zinc-300">
                  <SelectItem value="Cheating">Cheating</SelectItem>
                  <SelectItem value="Bug">Bug Report</SelectItem>
                  <SelectItem value="Suggestion/Feedback">Feedback</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Battle selection for global cheating reports */}
            {mode === "global" && category === "Cheating" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Select Battle</label>
                <Select value={selectedBattleId} onValueChange={handleBattleSelect}>
                  <SelectTrigger className="w-full bg-[#09090b] border-white/10 text-zinc-300 h-11">
                    <SelectValue placeholder={battles.length === 0 && !isLoadingBattles ? "No recent battles" : "Choose a battle"} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1c1f] border-white/10 text-zinc-300 max-h-[200px]">
                    {battles.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        vs {b.opponent.username} ({new Date(b.createdAt).toLocaleDateString()})
                      </SelectItem>
                    ))}
                    {hasMoreBattles && (
                      <button
                        onClick={loadMoreBattles}
                        className="w-full py-2 text-xs text-amber-500 hover:bg-white/5 transition-colors font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                      >
                        {isLoadingBattles ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
                        Load More
                      </button>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Details</label>
              <textarea
                className="w-full bg-[#09090b] border border-white/10 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-amber-500/50 resize-none h-32 transition-colors placeholder:text-zinc-600"
                placeholder={category === "Bug" ? "Describe the bug and how to reproduce it..." : "Provide as much detail as possible..."}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-8 gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/5 bg-zinc-500/50 hover:bg-zinc-100 text-zinc-100 dark:text-zinc-100 font-bold uppercase tracking-widest text-[10px] h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 font-bold uppercase tracking-widest text-zinc-300 hover:text-white dark:text-zinc-700 text-[10px] h-11 cursor-pointer ${
                category === "Cheating" ? "bg-rose-600 hover:bg-rose-500" : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
