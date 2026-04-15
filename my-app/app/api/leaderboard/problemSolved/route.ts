import { NextResponse } from "next/server";
import { UserModel } from "@/lib/models/User";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
    await dbConnect();

    try {
        const botIds = (process.env.BOT_POOL || "69de72c58961bbd5a5c37278")
            .split(",")
            .map(id => id.trim())
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

        const leaderboard = await UserModel.aggregate([
            { $match: { _id: { $nin: botIds } } },
            {
                $addFields: {
                    totalSolved: {
                        $add: [
                            { $ifNull: ["$totalProblemsSolved.easy", 0] },
                            { $ifNull: ["$totalProblemsSolved.medium", 0] },
                            { $ifNull: ["$totalProblemsSolved.hard", 0] }
                        ]
                    }
                }
            },
            {
                $sort: { totalSolved: -1, rating: -1, battlesWon: -1 }
            },
            { $limit: 100 },
            {
                $project: {
                    _id: 0,
                    id: "$_id",
                    username: 1,
                    name: 1,
                    totalSolved: 1,
                    totalProblemsSolved: 1,
                    rating: 1,
                    image: 1
                }
            }
        ]);

        return NextResponse.json({ success: true, data: leaderboard }, { status: 200 });
    } catch (error: unknown) {
        console.error("Problem solving leaderboard error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to fetch problem solving leaderboard" },
            { status: 500 }
        );
    }
}
