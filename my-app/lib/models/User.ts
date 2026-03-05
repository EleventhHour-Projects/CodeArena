import { User } from "@/types/UserType";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema<User>({
    username: { type: String, required: true, unique: true, default: "" },
    usernameChangeCount: { type: Number, required: true, default: 0 },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, required: true, default: Date.now },
    lastActive: { type: Date, required: true, default: Date.now },
    role: { type: String, required: true, default: "EndUser" },
    currentBattleId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Battle Stats
    battlesPlayed: { type: Number, required: true, default: 0 },
    battlesWon: { type: Number, required: true, default: 0 },
    currentStreak: { type: Number, required: true, default: 0 },
    longestStreak: { type: Number, required: true, default: 0 },
    rating: { type: Number, required: true, default: 0 },
    fastestVictory: { type: Object, required: true, default: { hours: 0, minutes: 0, seconds: 0 } },
    averageWinningTime: { type: Object, required: true, default: { hours: 0, minutes: 0, seconds: 0 } },
    totalTimeSpentInBattles: { type: Object, required: true, default: { hours: 0, minutes: 0, seconds: 0 } },
    totalProblemsSolved: { type: Object, required: true, default: { easy: 0, medium: 0, hard: 0 } },
})

// set the name of collection to users
export const UserModel = mongoose.models.User || mongoose.model<User>("User", userSchema, "users");