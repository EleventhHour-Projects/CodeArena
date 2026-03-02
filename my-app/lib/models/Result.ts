import { Result } from "@/types/ResultType";
import mongoose from "mongoose";

const resultSchema = new mongoose.Schema<Result>({
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", required: true },
    status: { type: String, required: true },
    tle: { type: Boolean, required: true, default: false },
    mle: { type: Boolean, required: true, default: false },
    failedTestCaseNumber: { type: Number, required: true, default: null },
})

// set the name of collection to results
const ResultModel = mongoose.model<Result>("Result", resultSchema, "results");

export default ResultModel; 