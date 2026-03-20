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

        // 3. Query Database
        // Use lean() for performance since this is purely a read operation
        const submission = await SubmissionModel.findOne({ execCodeId: exec_id }).lean();

        if (!submission) {
            // No record found means execution is in progress or not persisted yet
            const pendingResponse = { success: true, status: "PENDING" };
            
            // Short cache TTL (e.g., 2 seconds) for PENDING state to prevent DB hammering on high-frequency polling
            await redisClient.setEx(cacheKey, 2, JSON.stringify(pendingResponse));

            return NextResponse.json(pendingResponse, { status: 200 });
        }

        // 4. Record found, prepare full details response
        const responseData = {
            success: true,
            status: submission.status,
            exec_id: submission.execCodeId,
            user_id: submission.userId,
            problem_id: submission.problemId,
            language: submission.language,
            code: submission.code, // include based on privacy rules
            exec_time: submission.result?.runTimeMs,
            memory: submission.result?.memoryUsedMB,
            created_at: submission.createdAt,
            failed_test_case: submission.result?.failedTestCaseNumber,
            mle: submission.result?.mle,
            tle: submission.result?.tle,
            actual_output: (submission.result as any)?.actualOutput,
            errorMsg: (submission.result as any)?.errorMsg,
        };

        // Complete/terminal submissions are largely immutable, cache for longer (e.g., 5 mins)
        await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

        return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
        console.error(`[ERROR] Polling API failure for exec_id:`, error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
