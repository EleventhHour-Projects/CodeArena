"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import Heartbeat from "@/components/heartbeat";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        {children}
        <Heartbeat />
      </SessionProvider>
    </ThemeProvider>
  );
}
