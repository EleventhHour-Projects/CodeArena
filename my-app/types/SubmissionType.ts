import { Types } from "mongoose";

export type SubmissionStatus = "Pending" | "Accepted" | "Rejected" | "Executing"; 
export type SubmissionType = "Run" | "Submit";
// Pending means given to worker
// Executing means picked by worker and code is running 

export interface Submission {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    battleId: Types.ObjectId;
    problemId: Types.ObjectId;
    type: SubmissionType;
    status: SubmissionStatus;
    createdAt: Date;
    result: null | Types.ObjectId; // result of the submission
}