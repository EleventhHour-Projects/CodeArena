import { Types } from "mongoose";

export type executionStatus = "Pending" | "Executing"; 
export type executionType = "Run" | "Submit";
type BattleProblem = {
    difficulty: "easy" | "medium" | "hard";
    id: number;
};
export interface ExecutionCode {
    _id: Types.ObjectId;
    code: string;
    language?: string;
    userId: Types.ObjectId;
    battleId: Types.ObjectId;
    problem: BattleProblem;
    status: executionStatus;
    type: executionType;
    createdAt: Date;
}