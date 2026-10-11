"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Play, X, Video, AlertCircle } from "lucide-react";

export function AnnouncementBanner() {
  const pathname = usePathname();
  const [videoOpen, setVideoOpen] = useState(false);

  if (pathname !== "/") {
    return null;
  }

  return (
    <>
      {/* Announcement Bar — same layout structure as original */}
      <div className="w-full bg-amber-500/10 border-b border-amber-500/25 text-foreground py-2.5 pl-12 pr-4 sm:pl-14 sm:pr-8 flex flex-col md:flex-row items-center justify-center gap-2.5 md:gap-4 text-xs sm:text-sm z-40 relative shrink-0">
        <div className="flex items-center gap-2 text-center md:text-left">
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <span className="font-semibold text-amber-300 tracking-wide uppercase text-[11px] sm:text-xs shrink-0">
            Notice:
          </span>
          <span className="text-muted-foreground leading-snug">
            We apologize for the inconvenience. CodeArena backend is currently down as we don&apos;t have funds to continue our GCP subscription, and our distributed architecture requires a dedicated VM.
          </span>
        </div>

        {/* Watch Demo button */}
        <button
          onClick={() => setVideoOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-all duration-150 active:scale-95 shrink-0 cursor-pointer whitespace-nowrap"
        >
          <Play className="w-3 h-3 fill-current" />
          Watch Demo
        </button>
      </div>

      {/* Large video modal */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVideoOpen(false);
          }}
        >
          <div
            className="relative w-[96vw] max-w-[1400px] bg-zinc-950 rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-zinc-800/60 flex flex-col"
            style={{ height: "90vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/70 shrink-0 bg-zinc-950/80 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25">
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-100 leading-tight">
                    CodeArena — Architecture &amp; Battle Demo
                  </h2>
                  <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                    Distributed microservices · VM execution · 1v1 algorithmic arena
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVideoOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video — fills remaining height */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0">
              <video
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              >
                <source src="/codeareanvid.mov" type="video/mp4" />
                <source src="/codeareanvid.mov" type="video/quicktime" />
                <source src="/codeareanvid.mov" />
                Your browser does not support playing this video.
              </video>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-t border-zinc-800/70 shrink-0 bg-zinc-950/60">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
              <span className="text-[11px] text-zinc-500">
                The backend will be restored once we secure VM infrastructure funding. Thank you for your patience.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
