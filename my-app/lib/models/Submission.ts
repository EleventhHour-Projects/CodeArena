import { Submission } from "@/types/SubmissionType";
import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema<Submission>({
    code: { type: String, required: true },
    language: { type: String, required: false, default: "cpp" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    battleId: { type: mongoose.Schema.Types.ObjectId, ref: "Battle", required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    status: { type: String, required: true}, // Accepted or Rejected
    createdAt: { type: Date, required: true, default: Date.now },
    result: { 
        tle: { type: Boolean, required: true, default: false },
        mle: { type: Boolean, required: true, default: false },
        failedTestCaseNumber: { type: Number, required: true, default: null },
        runTimeMs: { type: Number, required: true, default: 0 },
        memoryUsedMB: { type: Number, required: true, default: 0 },
    },
})

// add indexes for better performance
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ battleId: 1 });
submissionSchema.index({ problemId: 1 });
submissionSchema.index({ status: 1 });

// set the name of collection to submissions
const SubmissionModel = mongoose.model<Submission>("Submission", submissionSchema, "submissions");

export default SubmissionModel; 