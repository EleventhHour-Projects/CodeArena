"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/app/providers/ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
