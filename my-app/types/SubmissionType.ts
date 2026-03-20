import { Types } from "mongoose";

export type SubmissionStatus = "Accepted" | "Rejected"; 

export interface Submission {
    _id: Types.ObjectId;
    code: string;
    language?: string;
    userId: Types.ObjectId;
    battleId: Types.ObjectId;
    problem: {
        difficulty: string;
        id: number;
    };
    execCodeId: Types.ObjectId; // Requires to be unique
    status: SubmissionStatus;
    createdAt: Date;
    result: {
        tle: boolean;
        mle: boolean;
        failedTestCaseNumber: number | null;
        runTimeMs: number;
        memoryUsedMB: number;
        actualOutput?: string;
    }
}