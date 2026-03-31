import mongoose from "mongoose";
import { Report } from "@/types/ReportType";

const reportSchema = new mongoose.Schema<Report>({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reported: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    battleId: { type: mongoose.Schema.Types.ObjectId, ref: "Battle" },
    reason: { type: String, required: true },
    category: { type: String, enum: ["Cheating", "Bug", "Suggestion/Feedback", "Other"], default: "Other" },
    status: { type: String, enum: ["Pending", "Accepted", "Rejected"], default: "Pending" },
    createdAt: { type: Date, required: true, default: Date.now },
});

// Create indexes for efficient querying
reportSchema.index({ status: 1 });
reportSchema.index({ reported: 1 });
reportSchema.index({ battleId: 1 });

const ReportModel = mongoose.models.Report || mongoose.model<Report>("Report", reportSchema, "reports");

export default ReportModel;
