"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface StatusContextType {
  onlineSet: Set<string>;
  battleMap: Map<string, string>;
  userId: string | null;
  inviteCount: number;
  refreshSignal: number;
  triggerRefresh: () => void;
  isFriendsSseLoaded: boolean;
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
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [isFriendsSseLoaded, setIsFriendsSseLoaded] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshSignal(prev => prev + 1);
  }, []);

  // Fetch initial userId from session
  useEffect(() => {
    if ((session?.user as any)?.id) {
        setUserId((session?.user as any).id);
    }
  }, [session]);

  // Backend VM is offline: skip SSE connections and mark friends loaded immediately
  useEffect(() => {
    setIsFriendsSseLoaded(true);
  }, []);

  return (
    <StatusContext.Provider value={{
      onlineSet,
      battleMap,
      userId,
      inviteCount,
      refreshSignal,
      triggerRefresh,
      isFriendsSseLoaded
    }}>
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
