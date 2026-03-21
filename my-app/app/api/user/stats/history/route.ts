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

        // Build Rating History
        const ratingHistory = [];
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
        }

        return NextResponse.json({
            success: true,
            history: {
                ratingTimeline: ratingHistory,
                outcomes: { wins, losses, draws }
            }
        });

    } catch (error) {
        console.error("Error fetching history stats:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
