"use client";

import { usePathname } from "next/navigation";
import { Info } from "lucide-react";

export function AnnouncementBanner() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <div className="w-full bg-primary/10 border-b border-primary/20 text-foreground py-3 px-16 flex items-center justify-center text-sm z-40 relative shrink-0 min-h-[64px]">
      <Info className="w-4 h-4 mr-2 text-primary shrink-0 lg:w-4 lg:h-4" />
      <span className="text-center font-medium leading-snug">
        Easy mode was attacked by bots, so if you don't find a match within 30 seconds, a bot will join the arena to play against you.
      </span>
    </div>
  );
}
