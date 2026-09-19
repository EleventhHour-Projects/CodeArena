import ExecutionCodeModel from "@/lib/models/ExecutionCode";
import { redisClientPromise } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("Exec-code request body:", body);
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

        const redisClient = await redisClientPromise;
        const executionCode = new ExecutionCodeModel({
            code,
            codeType: normalizedCodeType,
            language,
            userId,
            battleId: battleId || undefined,
            problem: problemId !== undefined ? { difficulty: difficulty || "medium", id: problemId } : undefined,
            testcases: testcases && testcases.length > 0 ? testcases : undefined,
            status: "Pending",
            type: normalizedType
        });
        await executionCode.save();
        console.log("Execution Code document created in DB:", executionCode._id);

        // 1. Store the full record for tracking/polling
        await redisClient.set(`executionCode:${executionCode._id}`, JSON.stringify(executionCode));
        
        // 2. Push to the queue for a worker to process
        await redisClient.rPush('tasks', executionCode._id.toString());

        return NextResponse.json({ success: true, executionCode });
    } catch (error) {
        console.error("[ERROR] Couldn't create execution code:", error);
        return NextResponse.json({ success: false, error: "Failed to create execution code" }, { status: 500 });
    }
}