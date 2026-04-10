"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { StatusProvider } from "@/app/providers/StatusProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        <StatusProvider>
          {children}
        </StatusProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
