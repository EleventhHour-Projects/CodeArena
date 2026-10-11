"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Play, X, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AnnouncementBanner() {
  const pathname = usePathname();
  const [videoOpen, setVideoOpen] = useState(false);

  if (pathname !== "/") {
    return null;
  }

  return (
    <>
      <div className="w-full bg-amber-500/10 border-b border-amber-500/25 text-foreground py-2.5 px-4 sm:px-8 flex flex-col md:flex-row items-center justify-center gap-2.5 md:gap-4 text-xs sm:text-sm z-40 relative shrink-0">
        <div className="flex items-center gap-2 text-center md:text-left">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="font-semibold text-amber-300 tracking-wide uppercase text-[11px] sm:text-xs">
            Notice:
          </span>
          <span className="text-muted-foreground leading-snug">
            We apologize for the inconvenience. CodeArena backend is currently down as we don't have funds to continue our GCP subscription, and our distributed architecture requires a dedicated VM.
          </span>
        </div>

        <Button
          onClick={() => setVideoOpen(true)}
          size="sm"
          className="h-7 px-3 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Play Video
        </Button>
      </div>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-zinc-950 border-zinc-800 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-zinc-100">
                <Video className="w-4 h-4 text-amber-400" />
                CodeArena Architecture & Battle Demo
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Overview of our distributed microservices, VM execution environment, and 1v1 algorithmic arena.
              </DialogDescription>
            </div>
          </div>

          <div className="relative bg-black w-full aspect-video flex items-center justify-center">
            {videoOpen && (
              <video
                controls
                autoPlay
                playsInline
                className="w-full h-full max-h-[75vh] object-contain rounded-b-2xl"
              >
                <source src="/codeareanvid.mov" type="video/mp4" />
                <source src="/codeareanvid.mov" type="video/quicktime" />
                <source src="/codeareanvid.mov" />
                Your browser does not support playing this video.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
