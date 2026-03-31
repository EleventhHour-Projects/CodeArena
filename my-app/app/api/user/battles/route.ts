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

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const search = url.searchParams.get("search") || "";
        const skip = (page - 1) * limit;

        // Fetch overall stats (unfiltered)
        const totalBattles = await BattleModel.countDocuments({
            $or: [{ player1: user._id }, { player2: user._id }],
            status: "Completed"
        });

        const totalWins = await BattleModel.countDocuments({
            winner: user._id,
            status: "Completed"
        });

        // Search logic
        let query: any = {
            $or: [{ player1: user._id }, { player2: user._id }],
            status: "Completed"
        };

        if (search) {
            const matchingUsers = await UserModel.find({
                $or: [
                    { username: { $regex: search, $options: "i" } },
                    { name: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const matchingUserIds = matchingUsers.map(u => u._id);

            query = {
                status: "Completed",
                $or: [
                    { player1: user._id, player2: { $in: matchingUserIds } },
                    { player2: user._id, player1: { $in: matchingUserIds } }
                ]
            };
        }

        const filteredCount = await BattleModel.countDocuments(query);
        const totalPages = Math.ceil(filteredCount / limit);

        // Fetch paginated battles
        const battles = await BattleModel.find(query)
            .populate("player1", "name username image")
            .populate("player2", "name username image")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
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
                    id: opponent._id,
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
            battles: transformedBattles,
            pagination: {
                currentPage: page,
                totalPages,
                totalBattles,
                totalWins,
                filteredCount,
                limit
            }
        });

    } catch (error) {
        console.error("Error fetching battle history:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
