import { Submission } from "@/types/SubmissionType";
import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema<Submission>({
    code: { type: String, required: true },
    language: { type: String, required: false, default: "cpp" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    battleId: { type: mongoose.Schema.Types.ObjectId, ref: "Battle", required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    type: { type: String, required: true},
    status: { type: String, required: true, default: "Pending" },
    createdAt: { type: Date, required: true, default: new Date() },
    result: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
})

// set the name of collection to submissions
const SubmissionModel = mongoose.model<Submission>("Submission", submissionSchema, "submissions");

export default SubmissionModel; 