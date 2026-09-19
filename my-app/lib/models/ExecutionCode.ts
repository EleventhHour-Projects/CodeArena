import { ExecutionCode } from "@/types/executionCode";
import mongoose from "mongoose";

const executionCodeSchema = new mongoose.Schema<ExecutionCode>({
    code: { type: String, required: true },
    codeType: { type: String, required: false, default: "battle", enum: ["normal", "battle", "test"] },
    language: { type: String, required: false, default: "cpp" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    battleId: { type: mongoose.Schema.Types.ObjectId, ref: "Battle", required: false },
    problem: {
        difficulty: { type: String, required: false },
        id: { type: Number, required: false }
    },
    testcases: { type: [{ input: String, output: String, is_hidden: Boolean }], required: false },
    status: { type: String, required: true, default: "Pending" },
    type: { type: String, required: true, default: "Run" },
    result: { type: mongoose.Schema.Types.Mixed, required: false },
    createdAt: { type: Date, required: true, default: Date.now }
})

// add indexes for better performance
executionCodeSchema.index({ userId: 1, createdAt: -1 });
executionCodeSchema.index({ battleId: 1 });
executionCodeSchema.index({ "problem.id": 1 });
executionCodeSchema.index({ status: 1 });
executionCodeSchema.index({ "createdAt": 1 }, { expireAfterSeconds: 5400 }); //delete documents after 1.5 hours

// set the name of collection to executionCodes
if (process.env.NODE_ENV === "development") {
    delete mongoose.models.ExecutionCode;
}
const ExecutionCodeModel = mongoose.models.ExecutionCode || mongoose.model<ExecutionCode>("ExecutionCode", executionCodeSchema, "executionCodes");

export default ExecutionCodeModel; 