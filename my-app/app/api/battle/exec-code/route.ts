import ExecutionCodeModel from "@/lib/models/ExecutionCode";
import dbConnect from "@/lib/dbConnect";
import { redisClientPromise } from "@/lib/redis";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { code, codeType, language, userId, battleId, difficulty, problemId, type, testcases } = body;

        const normalizedCodeType = (codeType || (battleId ? "battle" : "normal")).toLowerCase();
        const normalizedType = type || "Run";

        if (problemId === undefined && (!testcases || testcases.length === 0)) {
             console.error("[ERROR] Missing problemId and testcases in request body");
             return NextResponse.json({ 
                 success: false, 
                 error: "Missing problemId or testcases",
                 received: { difficulty, problemId, type }
             }, { status: 400 });
        }

        const validUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined;
        const validBattleId = battleId && mongoose.Types.ObjectId.isValid(battleId) ? new mongoose.Types.ObjectId(battleId) : undefined;

        const redisClient = await redisClientPromise;
        const executionCode = new ExecutionCodeModel({
            code,
            codeType: normalizedCodeType,
            language: language || "cpp",
            userId: validUserId,
            battleId: validBattleId,
            problem: problemId !== undefined ? { difficulty: difficulty || "medium", id: problemId } : undefined,
            testcases: testcases && testcases.length > 0 ? testcases : undefined,
            status: "Pending",
            type: normalizedType
        });
        await executionCode.save();

        // 1. Store the full record for tracking/polling
        await redisClient.set(`executionCode:${executionCode._id}`, JSON.stringify(executionCode));
        
        // 2. Push to the queue for a worker to process
        await redisClient.rPush('tasks', executionCode._id.toString());

        return NextResponse.json({ success: true, executionCode });
    } catch (error: any) {
        console.error("[ERROR] Couldn't create execution code:", error);
        return NextResponse.json({ success: false, error: error?.message || "Failed to create execution code" }, { status: 500 });
    }
}