"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function Heartbeat() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    // Send initial heartbeat
    fetch("/api/user/heartbeat", { method: "POST" }).catch(console.error);

    // Set up periodic heartbeat every 2 minutes
    const interval = setInterval(() => {
      fetch("/api/user/heartbeat", { method: "POST" }).catch(console.error);
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  return null;
}
