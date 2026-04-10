"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, RefreshCcw, Activity, CheckSquare, Flame, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type LeaderboardType = "global" | "mostActive" | "problemSolved" | "winStreak";

interface UserData {
  id: string;
  username: string;
  name?: string;
  rating?: number;
  battlesPlayed?: number;
  battlesWon?: number;
  totalSolved?: number;
  longestStreak?: number;
  image?: string;
}

const LEADERBOARDS = [
  { id: "global", label: "Global Rating", icon: Globe, api: "/api/leaderboard/global", color: "text-blue-500", metricKey: "rating" },
  { id: "mostActive", label: "Most Active", icon: Activity, api: "/api/leaderboard/mostAcive", color: "text-green-500", metricKey: "battlesPlayed" },
  { id: "problemSolved", label: "Problems Solved", icon: CheckSquare, api: "/api/leaderboard/problemSolved", color: "text-purple-500", metricKey: "totalSolved" },
  { id: "winStreak", label: "Longest Win Streak", icon: Flame, api: "/api/leaderboard/winStreak", color: "text-orange-500", metricKey: "longestStreak" },
] as const;

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [activeBoard, setActiveBoard] = useState<LeaderboardType>("global");
  const [data, setData] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentBoardConfig = LEADERBOARDS.find((b) => b.id === activeBoard)!;

  const fetchLeaderboard = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch(currentBoardConfig.api);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoard]);

  const getMetricDisplay = (user: UserData) => {
    const value = user[currentBoardConfig.metricKey as keyof UserData] as number || 0;
    if (activeBoard === 'problemSolved') return `${value} Solved`;
    if (activeBoard === 'mostActive') return `${value} Battles`;
    if (activeBoard === 'winStreak') return `${value} Streak`;
    return `${value} Rating`;
  };

  // Split Top 3 and Rest
  const top3 = data.slice(0, 3);
  const restList = data.slice(3);

  // Reorder Top 3 for Podium visualization: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  // Current logged in user info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUsername = (session?.user as any)?.username;
  const currentUserIndex = currentUsername ? data.findIndex(u => u.username === currentUsername) : -1;
  const currentUserData = currentUserIndex !== -1 ? data[currentUserIndex] : null;

  return (
    <div className="container max-w-5xl py-8 px-4 mx-auto min-h-screen">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Leaderboards</h1>
          <p className="text-muted-foreground">Rankings across different categories.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <Select value={activeBoard} onValueChange={(val) => setActiveBoard(val as LeaderboardType)}>
            <SelectTrigger className="w-full md:w-[240px] h-12 text-md">
              <SelectValue placeholder="Select Leaderboard" />
            </SelectTrigger>
            <SelectContent position="popper">
              {LEADERBOARDS.map((board) => (
                <SelectItem key={board.id} value={board.id} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <board.icon className={`w-4 h-4 ${board.color}`} />
                    {board.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 shrink-0" 
            onClick={() => fetchLeaderboard(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading && !isRefreshing ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCcw className="w-10 h-10 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-16">
          
          {/* Podium for Top 3 */}
          {top3.length > 0 && (
            <div className="flex justify-center items-end gap-2 sm:gap-6 mt-10 h-[280px]">
              <AnimatePresence mode="popLayout">
                {podiumOrder.map((user, i) => {
                  if (!user) return null;
                  
                  // Visual logic for 1st, 2nd, 3rd (because array is mapped 2nd, 1st, 3rd)
                  const isFirst = user === top3[0];
                  const borderColors = isFirst ? 'border-yellow-400 shadow-yellow-500/20' 
                                      : user === top3[1] ? 'border-slate-300 shadow-slate-300/20' 
                                      : 'border-orange-600 shadow-orange-600/20';
                  
                  const bgColors = isFirst ? 'bg-gradient-to-t from-yellow-500/10 to-transparent' 
                                      : user === top3[1] ? 'bg-gradient-to-t from-slate-300/10 to-transparent' 
                                      : 'bg-gradient-to-t from-orange-600/10 to-transparent';

                  const height = isFirst ? 'h-[220px]' : user === top3[1] ? 'h-[180px]' : 'h-[150px]';
                  const rankNum = isFirst ? 1 : user === top3[1] ? 2 : 3;

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                      className={`relative flex flex-col items-center justify-end w-[100px] sm:w-[140px] rounded-t-xl border-t-4 ${borderColors} ${bgColors} ${height} px-2 pb-4 pt-12 text-center`}
                    >
                      {/* Avatar & Floating Badge */}
                      <div className="absolute -top-10 sm:-top-12 flex flex-col items-center">
                        <div className="relative">
                          <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-background shadow-lg">
                            <AvatarImage src={user.image} alt={user.username} />
                            <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-3 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-2 border-background shadow-md ${isFirst ? 'bg-yellow-400' : rankNum === 2 ? 'bg-slate-300' : 'bg-orange-500'}`}>
                            {isFirst ? <Trophy className="w-4 h-4 text-yellow-900" /> : <Medal className={`w-4 h-4 ${rankNum === 2 ? 'text-slate-700' : 'text-orange-100'}`} />}
                          </div>
                        </div>
                      </div>

                      <div className="font-bold text-lg max-w-full truncate">{user.username}</div>
                      <div className="text-sm font-medium text-muted-foreground mt-1">
                        {getMetricDisplay(user)}
                      </div>
                      
                      <div className="absolute font-black text-6xl text-muted/10 -z-10 bottom-2 select-none">
                        {rankNum}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

           {/* Current User Static Highlight */}
           {session?.user && (
             <div className="w-full max-w-3xl mx-auto mb-2 mt-4 px-2">
               <div className="flex items-center justify-between p-4 rounded-xl border-2 border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)] backdrop-blur-sm">
                 <div className="flex items-center gap-4">
                   <div className="w-8 text-center font-black text-indigo-400 text-xl">
                     {currentUserIndex !== -1 ? currentUserIndex + 1 : '100+'}
                   </div>
                   <Avatar className="w-10 h-10 border border-indigo-500/50 shadow-inner">
                     <AvatarImage src={session.user.image || ''} alt={currentUsername || 'You'} />
                     <AvatarFallback className="bg-indigo-500/20 text-indigo-400 font-bold text-xs ring-1 ring-inset ring-indigo-500/50">
                        {(currentUsername || 'U').slice(0, 2).toUpperCase()}
                     </AvatarFallback>
                   </Avatar>
                   <div>
                     <div className="font-bold text-indigo-100 flex items-center gap-2">
                       {currentUsername || session.user.name} 
                       <span className="text-[9px] uppercase font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full tracking-widest shadow-sm">You</span>
                     </div>
                     {currentUserData?.name && <div className="text-xs text-indigo-300/70">{currentUserData.name}</div>}
                   </div>
                 </div>
                 
                 <div className="font-bold tabular-nums text-indigo-200">
                   {currentUserData ? getMetricDisplay(currentUserData) : 'Unranked'}
                 </div>
               </div>
               
               {/* Divider between current user and the rest list */}
               {restList.length > 0 && <div className="h-px w-full bg-white/5 mt-8 mb-2 rounded-full"></div>}
             </div>
           )}

           {/* The Rest of the List (4th onwards) */}
          {restList.length > 0 && (
            <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto">
              {restList.map((user, index) => {
                const globalRank = index + 4;
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.3 }}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center font-bold text-muted-foreground text-lg">
                        {globalRank}
                      </div>
                      <Avatar className="w-10 h-10 border border-muted">
                        <AvatarImage src={user.image} alt={user.username} />
                        <AvatarFallback className="bg-muted font-medium text-xs">
                           {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{user.username}</div>
                        {user.name && <div className="text-xs text-muted-foreground">{user.name}</div>}
                      </div>
                    </div>
                    
                    <div className="font-bold tabular-nums">
                      {getMetricDisplay(user)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {data.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              No data available for this leaderboard.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
