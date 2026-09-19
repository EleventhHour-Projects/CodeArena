import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import SubmissionModel from "@/lib/models/Submission";
import dbConnect from "@/lib/dbConnect";
import { redisClientPromise } from "@/lib/redis";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ exec_id: string }> }
) {
    try {
        const params = await context.params;
        const { exec_id } = params;

        // 1. Validate ID format
        if (!exec_id || !mongoose.Types.ObjectId.isValid(exec_id)) {
            return NextResponse.json({ success: false, error: "Invalid exec_id format" }, { status: 400 });
        }

        const redisClient = await redisClientPromise;
        const cacheKey = `submission-status:${exec_id}`;

        // 2. Check Redis Cache
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return NextResponse.json(JSON.parse(cached), { status: 200 });
        }

        // Ensure database connection
        await dbConnect();

        // Check if a Submission record exists (for "Submit" type)
        const submission = await SubmissionModel.findOne({ execCodeId: exec_id }).lean();

        if (!submission) {
            // If there's no Submission record, check if completed in the ExecutionCode model (for Run, Custom, NonHidden, Verify, etc.)
            const ExecutionCodeModel = mongoose.models.ExecutionCode || require("@/lib/models/ExecutionCode").default;
            const execCode = await ExecutionCodeModel.findById(exec_id).lean();

            if (execCode && execCode.status !== "Pending") {
                const responseData = {
                    success: true,
                    status: execCode.status, // "Accepted" or "Rejected"
                    code_type: execCode.codeType || "battle",
                    exec_id: execCode._id,
                    user_id: execCode.userId,
                    problem_id: execCode.problem?.id,
                    language: execCode.language,
                    created_at: execCode.createdAt,
                    exec_time: execCode.result?.runTimeMs,
                    memory: execCode.result?.memoryUsedMB,
                    failed_test_case: execCode.result?.failedTestCaseNumber,
                    mle: execCode.result?.mle,
                    tle: execCode.result?.tle,
                    actual_output: execCode.result?.actualOutput,
                    errorMsg: execCode.result?.errorMsg,
                    expected_output: execCode.result?.expectedOutput,
                    is_hidden: execCode.result?.isHidden,
                };
                
                await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));
                return NextResponse.json(responseData, { status: 200 });
            }

            // No record found means execution is in progress or not persisted yet
            // Return PENDING without caching in Redis so subsequent polls immediately see completed status
            return NextResponse.json({ success: true, status: "PENDING" }, { status: 200 });
        }

        // 4. Record found, prepare full details response
        const responseData = {
            success: true,
            status: submission.status,
            code_type: submission.codeType || "battle",
            exec_id: submission.execCodeId,
            user_id: submission.userId,
            problem_id: submission.problemId || submission.problem?.id,
            language: submission.language,
            code: submission.code, // include based on privacy rules
            exec_time: submission.result?.runTimeMs,
            memory: submission.result?.memoryUsedMB,
            created_at: submission.createdAt,
            failed_test_case: submission.result?.failedTestCaseNumber,
            mle: submission.result?.mle,
            tle: submission.result?.tle,
            actual_output: submission.result?.actualOutput,
            errorMsg: submission.result?.errorMsg,
            expected_output: submission.result?.expectedOutput,
            is_hidden: submission.result?.isHidden,
        };

        // Complete/terminal submissions are largely immutable, cache for longer (e.g., 5 mins)
        await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

        return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
        console.error(`[ERROR] Polling API failure for exec_id:`, error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
