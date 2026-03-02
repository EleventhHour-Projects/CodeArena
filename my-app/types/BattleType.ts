import { Types } from "mongoose";
import { User } from "./UserType";

export type BattleStatus = "Pending" | "Active" | "Completed" | "Cancelled";
export type BattleDifficulty = "Easy" | "Medium" | "Hard";
export type BattleType = "1v1" | "2v2";
export type ProblemRef = { id: number };

export interface Battle {
    _id: Types.ObjectId;
    player1: User;
    player2: User;
    status: BattleStatus;
    createdAt: Date;
    difficulty: BattleDifficulty; 
    type: BattleType; // default 1v1 for MVP

    winner?: User;
    loser?: User;

    // time
    startTime?: Date;
    endTime?: Date;
    duration?: {
        hours: number;
        minutes: number;
        seconds: number;
    }

    // problems stored in an array, each problem has id
    problems: ProblemRef[];
}