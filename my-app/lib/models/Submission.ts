import { Submission } from "@/types/SubmissionType";
import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema<Submission>({
    code: { type: String, required: true },
    codeType: { type: String, required: false, default: "battle" },
    language: { type: String, required: false, default: "cpp" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    battleId: { type: mongoose.Schema.Types.ObjectId, ref: "Battle", required: false },
    problem: {
        difficulty: { type: String, required: false },
        id: { type: Number, required: false }
    },
    execCodeId: { type: mongoose.Schema.Types.ObjectId, ref: "ExecutionCode", required: true, unique: true },
    status: { type: String, required: true}, // Accepted or Rejected
    createdAt: { type: Date, required: true, default: Date.now },
    result: { 
        tle: { type: Boolean, required: true, default: false },
        mle: { type: Boolean, required: true, default: false },
        failedTestCaseNumber: { type: String, required: false, default: "" },
        runTimeMs: { type: Number, required: true, default: 0 },
        memoryUsedMB: { type: Number, required: true, default: 0 },
        actualOutput: { type: String, required: false },
        expectedOutput: { type: String, required: false },
        errorMsg: { type: String, required: false },
        isHidden: { type: Boolean, required: false, default: false },
    },
})

// add indexes for better performance
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ battleId: 1 });
submissionSchema.index({ "problem.id": 1 });
submissionSchema.index({ status: 1 });

// set the name of collection to submissions
const SubmissionModel = mongoose.models.Submission || mongoose.model<Submission>("Submission", submissionSchema, "submissions");

export default SubmissionModel; 