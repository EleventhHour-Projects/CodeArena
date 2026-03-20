import { NextRequest, NextResponse } from "next/server";
import SubmissionModel from "@/lib/models/Submission";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const battleId = searchParams.get("battleId");
        const problemId = searchParams.get("problemId");
        const userId = searchParams.get("userId");

        if (!battleId || !userId) {
            return NextResponse.json({ success: false, error: "Missing battleId or userId" }, { status: 400 });
        }

        await dbConnect();

        const filter: any = {
            battleId: new mongoose.Types.ObjectId(battleId),
            userId: new mongoose.Types.ObjectId(userId)
        };

        if (problemId) {
            filter["problem.id"] = parseInt(problemId);
        }

        const submissions = await SubmissionModel.find(filter)
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return NextResponse.json({ success: true, submissions });
    } catch (error) {
        console.error("[ERROR] Failed to fetch submissions:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
