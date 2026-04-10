"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface StatusContextType {
  onlineSet: Set<string>;
  battleMap: Map<string, string>;
  userId: string | null;
  inviteCount: number;
  triggerRefresh: () => void;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [sseToken, setSseToken] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const [battleMap, setBattleMap] = useState<Map<string, string>>(new Map());
  const [inviteCount, setInviteCount] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Fetch initial userId from session
  useEffect(() => {
    if ((session?.user as any)?.id) {
        setUserId((session?.user as any).id);
    }
  }, [session]);

  const fetchTokens = useCallback(async () => {
    try {
      // Fetch Friends SSE Token
      const resF = await fetch("/api/friends/sse-token");
      const dataF = await resF.json();
      if (dataF.success) {
        setSseToken(dataF.sseToken);
        if (dataF.userId && !userId) setUserId(dataF.userId);
      }

      // Fetch Invite SSE Token
      const resI = await fetch("/api/battle/invitations/sse-token");
      const dataI = await resI.json();
      if (dataI.success) {
        setInviteToken(dataI.sseToken);
      }
    } catch (err) {
      console.error("Failed to fetch SSE tokens:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (session) {
      fetchTokens();
      const id = setInterval(fetchTokens, 9 * 60 * 1000);
      return () => clearInterval(id);
    }
  }, [session, fetchTokens]);

  // SSE Presence Connection (Friends)
  useEffect(() => {
    if (!userId || !sseToken) return;

    const sseUrl = `https://matchmake.codearena.pro/sse/friends?userId=${userId}&token=${sseToken}`;
    const source = new EventSource(sseUrl);

    source.addEventListener("friends_update", (e) => {
      try {
        const rawData = JSON.parse(e.data);
        const newOnline = new Set<string>();
        const newBattles = new Map<string, string>();

        if (Array.isArray(rawData)) {
          rawData.forEach((item: any) => {
            if (typeof item === "string") {
              // Backward compatibility for old string array format
              newOnline.add(item);
            } else if (item && typeof item === "object" && item.id) {
              // New object array format with battle status
              newOnline.add(item.id);
              if (item.bid) newBattles.set(item.id, item.bid);
            }
          });
        }

        setOnlineSet(newOnline);
        setBattleMap(newBattles);
      } catch (err) {
        console.error("Error parsing friends_update:", err);
      }
    });

    source.onerror = () => source.close();
    return () => source.close();
  }, [userId, sseToken]);

  // SSE Invites Connection
  useEffect(() => {
    if (!userId || !inviteToken) return;

    const sseUrl = `https://matchmake.codearena.pro/sse/invites?userId=${userId}&token=${inviteToken}`;
    const source = new EventSource(sseUrl);

    source.addEventListener("invite_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        setInviteCount(data.count || 0);
        // Trigger a logical refresh in listening components
        triggerRefresh();
      } catch (err) {
        console.error("Error parsing invite_update:", err);
      }
    });

    source.onerror = () => source.close();
    return () => source.close();
  }, [userId, inviteToken, triggerRefresh]);

  return (
    <StatusContext.Provider value={{ onlineSet, battleMap, userId, inviteCount, triggerRefresh }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error("useStatus must be used within a StatusProvider");
  }
  return context;
}
