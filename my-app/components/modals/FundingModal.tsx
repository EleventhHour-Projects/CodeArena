"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, X, ExternalLink, Heart } from "lucide-react";
import type { FundingResponse } from "@/app/api/funding/route";

export const OPEN_FUNDING_MODAL_EVENT = "open-codearena-funding-modal";

export function openFundingModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_FUNDING_MODAL_EVENT));
  }
}

interface FundingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function FundingModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: FundingModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FundingResponse | null>(null);

  useEffect(() => {
    const handleOpen = () => setInternalIsOpen(true);
    window.addEventListener(OPEN_FUNDING_MODAL_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_FUNDING_MODAL_EVENT, handleOpen);
  }, []);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const fetchFundingData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/funding");
      if (res.ok) {
        const json: FundingResponse = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Funding fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFundingData();
    }
  }, [isOpen, fetchFundingData]);

  const monthlyGoal = data?.monthlySpendGoal || 5;
  const currentMonthly = data?.monthlyAmount || 0;
  const totalCollection = data?.totalAmount || 0;
  
  // This month progress percentage
  const monthPercent = Math.min(
    100,
    Math.round((currentMonthly / monthlyGoal) * 100)
  );

  // Total collection progress relative to monthly goal (or 100% if >= monthly goal)
  const totalPercent = Math.min(
    100,
    Math.round((totalCollection / monthlyGoal) * 100)
  );

  const sponsors = data?.sponsors || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[95vw] sm:max-w-3xl md:max-w-4xl bg-zinc-950 text-zinc-100 border border-zinc-800 p-8 sm:p-12 rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden [&>button]:hidden"
        aria-describedby="funding-modal-desc"
      >
        <DialogDescription id="funding-modal-desc" className="sr-only">
          Support CodeArena by sponsoring on GitHub
        </DialogDescription>
        {/* Custom Clean Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col space-y-7">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 text-emerald-400 fill-emerald-500/20" />
              <span>Support CodeArena</span>
            </DialogTitle>
            <p className="text-emerald-400 font-medium text-sm sm:text-base">
              CodeArena required ${monthlyGoal} per month to keep servers running...
            </p>
          </div>

          {/* Progress Bars Section */}
          <div className="space-y-5 pt-1">
            {/* 1. Total Collection Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm sm:text-base font-semibold">
                <span className="text-emerald-400">
                  Total Collection:{" "}
                  <span className="text-white">${totalCollection.toFixed(0)}</span>
                </span>
                <span className="text-emerald-400">${monthlyGoal}</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(totalPercent, totalCollection > 0 ? 5 : 0)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* 2. This Month Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm sm:text-base font-semibold">
                <span className="text-emerald-400">
                  This Month &mdash;{" "}
                  <span className="text-white">${currentMonthly.toFixed(0)}</span>
                </span>
                <span className="text-emerald-400 text-xs sm:text-sm font-medium">
                  {monthPercent}% of ${monthlyGoal} goal
                </span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(monthPercent, currentMonthly > 0 ? 5 : 0)
                    )}%`,
                  }}
                />
              </div>
              {data && data.runwayMonths > 0 && (
                <div className="text-right text-xs text-zinc-400">
                  Runway: <span className="text-emerald-300 font-medium">{data.runwayMonths} months</span>
                </div>
              )}
            </div>
          </div>

          {/* Our Contributors Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-zinc-300">
              Our Contributors
            </h3>

            {sponsors.length === 0 ? (
              <div className="py-7 text-center rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800/80">
                <p className="text-sm text-zinc-400">
                  No sponsors yet.{" "}
                  <span className="text-emerald-400 font-semibold">
                    Be the first one!
                  </span>
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 py-2 max-h-52 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {sponsors.map((sponsor, idx) => {
                  const isAnon = sponsor.is_anonymous || !sponsor.login;
                  const displayName = isAnon
                    ? sponsor.name || "Anonymous"
                    : sponsor.name || sponsor.login;

                  return (
                    <div
                      key={sponsor.login || `anon-${idx}`}
                      className="flex flex-col items-center text-center w-16 sm:w-20"
                    >
                      <a
                        href={sponsor.profile_url}
                        target="_blank"
                        rel="noreferrer"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        title={isAnon ? "Anonymous Supporter" : `@${sponsor.login}`}
                      >
                        <Avatar className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-zinc-700 bg-zinc-900">
                          {!isAnon && sponsor.avatar_url ? (
                            <AvatarImage src={sponsor.avatar_url} alt={displayName} />
                          ) : null}
                          <AvatarFallback className="bg-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center">
                            {isAnon ? (
                              <User className="w-5 h-5 text-zinc-400" />
                            ) : (
                              displayName.slice(0, 2).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>
                      </a>
                      <span className="text-xs text-zinc-300 mt-2 truncate w-full font-medium">
                        {displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Centered Buttons */}
          <div className="pt-3 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <a
                href={data?.sponsorUrl || "https://github.com/sponsors/antfu"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 justify-center px-8 py-3 rounded-xl text-sm font-semibold border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer shadow-sm"
              >
                <Heart className="w-4 h-4" style={{ color: "#db61a2", fill: "none", stroke: "#db61a2" }} />
                Sponsor
              </a>
              <a
                href="/meet-developers"
                className="inline-flex items-center gap-2 justify-center px-8 py-3 rounded-xl text-sm font-semibold border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shadow-sm"
              >
                Meet the Developers
              </a>
            </div>

            {/* Thank You Footer */}
            <p className="text-sm text-zinc-400 font-medium pt-1">
              Thank You ❤️
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
