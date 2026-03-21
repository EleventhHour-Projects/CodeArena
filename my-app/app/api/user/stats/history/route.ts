import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import BattleModel from "@/lib/models/Battle";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();

        const user = await UserModel.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const userId = user._id;

        // Fetch all completed battles for the user
        const completedBattles = await BattleModel.find({
            $or: [{ player1: userId }, { player2: userId }],
            status: "Completed"
        }).sort({ createdAt: 1 });

        // Build Rating History and Heatmap Data
        const ratingHistory = [];
        const dailyActivity: Record<string, number> = {};
        
        let wins = 0;
        let losses = 0;
        let draws = 0;

        for (const battle of completedBattles) {
            // Determine outcome
            if (battle.winner?.toString() === userId.toString()) {
                wins++;
            } else if (battle.loser?.toString() === userId.toString()) {
                losses++;
            } else {
                draws++; // Both null or neither is winner/loser usually means draw in this schema
            }

            // Determine historical rating at this point in time
            const isUserA = battle.player1.toString() === userId.toString();
            const ratingAfterBattle = isUserA ? battle.newRatingA : battle.newRatingB;
            
            if (ratingAfterBattle !== undefined && ratingAfterBattle !== null) {
                ratingHistory.push({
                    date: battle.createdAt,
                    rating: ratingAfterBattle
                });
            }

            // Record daily activity for heatmap
            const dateStr = battle.createdAt.toISOString().split("T")[0];
            dailyActivity[dateStr] = (dailyActivity[dateStr] || 0) + 1;
        }

        // Build 365 days of data so the calendar is properly filled out
        const activityHeatmap = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            const count = dailyActivity[dateStr] || 0;
            
            let level = 0;
            if (count > 0 && count <= 2) level = 1;
            else if (count >= 3 && count <= 5) level = 2;
            else if (count >= 6 && count <= 9) level = 3;
            else if (count >= 10) level = 4;
            
            activityHeatmap.push({ date: dateStr, count, level });
        }

        return NextResponse.json({
            success: true,
            history: {
                ratingTimeline: ratingHistory,
                outcomes: { wins, losses, draws },
                activityHeatmap
            }
        });

    } catch (error) {
        console.error("Error fetching history stats:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
