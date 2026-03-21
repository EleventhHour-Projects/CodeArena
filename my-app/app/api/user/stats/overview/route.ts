import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";

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

        // Calculate Rank (1-indexed based on rating)
        const higherRatedCount = await UserModel.countDocuments({ rating: { $gt: user.rating } });
        const rank = higherRatedCount + 1;

        // Win Rate Calculation
        const winRate = user.battlesPlayed > 0 
            ? Math.round((user.battlesWon / user.battlesPlayed) * 100) 
            : 0;

        // Total Problems Solved
        const totalProblems = user.totalProblemsSolved?.easy + 
                              user.totalProblemsSolved?.medium + 
                              user.totalProblemsSolved?.hard || 0;

        return NextResponse.json({
            success: true,
            overview: {
                username: user.username,
                rating: user.rating,
                rank,
                battlesPlayed: user.battlesPlayed,
                battlesWon: user.battlesWon,
                winRate,
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                totalProblems,
                problemsByDifficulty: user.totalProblemsSolved || { easy: 0, medium: 0, hard: 0 },
                fastestVictory: user.fastestVictory,
                averageWinningTime: user.averageWinningTime
            }
        });

    } catch (error) {
        console.error("Error fetching overview stats:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
