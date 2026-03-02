import { Types } from "mongoose";

export type executionStatus = "Pending" | "Executing"; 

export interface ExecutionCode {
    _id: Types.ObjectId;
    code: string;
    language?: string;
    userId: Types.ObjectId;
    battleId: Types.ObjectId;
    problemId: Types.ObjectId;
    status: executionStatus;
    createdAt: Date;
}