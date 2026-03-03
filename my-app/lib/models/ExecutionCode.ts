import { ExecutionCode } from "@/types/executionCode";
import mongoose from "mongoose";

const executionCodeSchema = new mongoose.Schema<ExecutionCode>({
    code: { type: String, required: true },
    language: { type: String, required: false, default: "cpp" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    battleId: { type: mongoose.Schema.Types.ObjectId, ref: "Battle", required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    status: { type: String, required: true, default: "Pending" },
    createdAt: { type: Date, required: true, default: Date.now }
})

// add indexes for better performance
executionCodeSchema.index({ userId: 1, createdAt: -1 });
executionCodeSchema.index({ battleId: 1 });
executionCodeSchema.index({ problemId: 1 });
executionCodeSchema.index({ status: 1 });

// set the name of collection to executionCodes
const ExecutionCodeModel = mongoose.models.ExecutionCode || mongoose.model<ExecutionCode>("ExecutionCode", executionCodeSchema, "executionCodes");

export default ExecutionCodeModel; 