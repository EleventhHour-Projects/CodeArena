import { Types } from "mongoose";

export type UserRole = "EndUser" | "Admin";

export interface User{
    // Personal Info
    _id: Types.ObjectId;
    username?: string;
    usernameChangeCount: number;
    name: string; // fetch from google auth
    email: string; // fetch from google auth
    createdAt: Date;
    lastActive: Date;
    role: UserRole;
    currentBattleId: Types.ObjectId | null;

    // Battle Stats - by deafult all will be 0
    battlesPlayed: number;
    battlesWon: number;
    currentStreak: number;
    longestStreak: number;
    rating: number;
    fastestVictory: {
        hours: number;
        minutes: number;
        seconds: number;
    }
    averageWinningTime: {
        hours: number;
        minutes: number;
        seconds: number;
    }
    totalTimeSpentInBattles: {
        hours: number;
        minutes: number;
        seconds: number;
    }
    totalProblemsSolved: {
        easy: number;
        medium: number;
        hard: number;
    }
}