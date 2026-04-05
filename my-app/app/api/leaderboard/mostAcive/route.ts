import { NextResponse } from "next/server";
import { UserModel } from "@/lib/models/User";
import dbConnect from "@/lib/dbConnect";

export const dynamic = "force-dynamic";

export async function GET() {
    await dbConnect();

    try {
        const leaderboard = await UserModel.aggregate([
            {
                $sort: { battlesPlayed: -1, battlesWon: -1, rating: -1 }
            },
            { $limit: 100 },
            {
                $project: {
                    _id: 0,
                    id: "$_id",
                    username: 1,
                    name: 1,
                    battlesPlayed: 1,
                    battlesWon: 1,
                    rating: 1,
                    image: 1
                }
            }
        ]);

        return NextResponse.json({ success: true, data: leaderboard }, { status: 200 });
    } catch (error: unknown) {
        console.error("Most active leaderboard error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to fetch most active leaderboard" },
            { status: 500 }
        );
    }
}
