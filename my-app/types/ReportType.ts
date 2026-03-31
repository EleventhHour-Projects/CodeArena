import mongoose from "mongoose";

export type ReportCategory = "Cheating" | "Bug" | "Suggestion/Feedback" | "Other";
export type ReportStatus = "Pending" | "Accepted" | "Rejected";

export interface Report {
    reporter: mongoose.Types.ObjectId;
    reported?: mongoose.Types.ObjectId;
    battleId?: mongoose.Types.ObjectId;
    reason: string;
    category: ReportCategory;
    status: ReportStatus;
    adminReply?: string;
    createdAt: Date;
}
