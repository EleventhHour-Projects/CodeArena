import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
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

        const user = await UserModel.findOne({ email: session.user.email }).select(
            "rating battlesPlayed battlesWon currentStreak longestStreak totalProblemsSolved"
        );

        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        const totalSolved =
            (user.totalProblemsSolved?.easy ?? 0) +
            (user.totalProblemsSolved?.medium ?? 0) +
            (user.totalProblemsSolved?.hard ?? 0);

        const winRate =
            user.battlesPlayed > 0
                ? Math.round((user.battlesWon / user.battlesPlayed) * 100)
                : 0;

        return NextResponse.json({
            success: true,
            stats: {
                rating: user.rating ?? 0,
                battlesPlayed: user.battlesPlayed ?? 0,
                battlesWon: user.battlesWon ?? 0,
                winRate,
                currentStreak: user.currentStreak ?? 0,
                longestStreak: user.longestStreak ?? 0,
                totalProblemsSolved: totalSolved,
                problemsSolvedByDifficulty: {
                    easy: user.totalProblemsSolved?.easy ?? 0,
                    medium: user.totalProblemsSolved?.medium ?? 0,
                    hard: user.totalProblemsSolved?.hard ?? 0,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
