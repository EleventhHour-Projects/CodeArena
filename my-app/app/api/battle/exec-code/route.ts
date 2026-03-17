import ExecutionCodeModel from "@/lib/models/ExecutionCode";
import { redisClientPromise } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("Exec-code request body:", body);
        const { code, language, userId, battleId, difficulty, problemId, type } = body;

        if (!difficulty || problemId === undefined) {
             console.error("[ERROR] Missing difficulty or problemId in request body");
             return NextResponse.json({ 
                 success: false, 
                 error: "Missing difficulty or problemId",
                 received: { difficulty, problemId }
             }, { status: 400 });
        }

        const redisClient = await redisClientPromise;
        const executionCode = new ExecutionCodeModel({
            code,
            language,
            userId,
            battleId,
            problem: { difficulty, id: problemId },
            status: "Pending",
            type: type || "Run"
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