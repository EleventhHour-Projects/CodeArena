import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import BattleModel from "@/lib/models/Battle";
import { UserModel } from "@/lib/models/User";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        await dbConnect();

        const user = await UserModel.findOne({ email: session.user.email }).select("_id");
        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        // Fetch completed battles for the user
        const battles = await BattleModel.find({
            $or: [{ player1: user._id }, { player2: user._id }],
            status: "Completed"
        })
        .populate("player1", "name username image")
        .populate("player2", "name username image")
        .sort({ createdAt: -1 })
        .lean();

        // Transform battles to identify the opponent
        const transformedBattles = battles.map((battle: any) => {
            const isPlayer1 = battle.player1._id.toString() === user._id.toString();
            const opponent = isPlayer1 ? battle.player2 : battle.player1;
            
            // Determine result for the current user using ObjectId comparison
            let result: "win" | "loss" | "draw" = "draw";
            if (!battle.winner) {
                result = "draw";
            } else {
                const winnerId = battle.winner.toString();
                const currentUserId = user._id.toString();
                result = winnerId === currentUserId ? "win" : "loss";
            }

            return {
                id: battle._id,
                status: battle.status,
                createdAt: battle.createdAt,
                difficulty: battle.difficulty,
                type: battle.type,
                opponent: {
                    name: opponent.name,
                    username: opponent.username,
                    image: opponent.image
                },
                result,
                ratingChange: isPlayer1 ? battle.ratingChangeA : battle.ratingChangeB,
                newRating: isPlayer1 ? battle.newRatingA : battle.newRatingB
            };
        });

        return NextResponse.json({
            success: true,
            battles: transformedBattles
        });

    } catch (error) {
        console.error("Error fetching battle history:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
