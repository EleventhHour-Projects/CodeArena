import mongoose from "mongoose";

export interface Report {
    reporter: mongoose.Types.ObjectId;
    reported: mongoose.Types.ObjectId;
    battleId: mongoose.Types.ObjectId;
    reason: string;
    status: "Pending" | "Accepted" | "Rejected";
    createdAt: Date;
}
