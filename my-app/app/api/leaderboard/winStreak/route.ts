import { NextResponse } from "next/server";
import { UserModel } from "@/lib/models/User";
import dbConnect from "@/lib/dbConnect";

export const dynamic = "force-dynamic";

export async function GET() {
    await dbConnect();

    try {
        const leaderboard = await UserModel.aggregate([
            { $match: { battlesPlayed: { $gte: 5 } } },
            {
                $sort: { longestStreak: -1, battlesWon: -1, rating: -1 }
            },
            { $limit: 100 },
            {
                $project: {
                    _id: 0,
                    id: "$_id",
                    username: 1,
                    name: 1,
                    longestStreak: 1,
                    currentStreak: 1,
                    rating: 1,
                    battlesPlayed: 1,
                    battlesWon: 1
                }
            }
        ]);

        return NextResponse.json({ success: true, data: leaderboard }, { status: 200 });
    } catch (error: unknown) {
        console.error("Win streak leaderboard error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to fetch win streak leaderboard" },
            { status: 500 }
        );
    }
}
