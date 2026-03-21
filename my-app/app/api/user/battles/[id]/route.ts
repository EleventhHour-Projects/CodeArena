import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import BattleModel from "@/lib/models/Battle";
import { UserModel } from "@/lib/models/User";
import SubmissionModel from "@/lib/models/Submission";
import fs from "fs/promises";
import path from "path";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
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
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const battle = await BattleModel.findById(id)
            .populate("player1", "name username image")
            .populate("player2", "name username image")
            .lean();

        if (!battle) {
            return NextResponse.json({ success: false, message: "Battle not found" }, { status: 404 });
        }

        // Fetch submissions for this battle and user
        const submissions = await SubmissionModel.find({
            battleId: id,
            userId: user._id
        }).sort({ createdAt: -1 }).lean();

        console.log(`Found ${submissions.length} submissions for battle ${id}. Statuses:`, submissions.map(s => s.status));

        // Fetch problem details from local JSON files
        const problemsData = await Promise.all(
            battle.problems.map(async (probRef: any) => {
                const questionsDir = path.join(process.cwd(), "..", "questions");
                const filePath = path.join(questionsDir, probRef.difficulty, `${probRef.id}.json`);
                try {
                    const content = await fs.readFile(filePath, "utf-8");
                    const data = JSON.parse(content);
                    return {
                        id: probRef.id,
                        difficulty: probRef.difficulty,
                        title: data.title,
                        description: data.description
                    };
                } catch (e) {
                    return { id: probRef.id, difficulty: probRef.difficulty, title: "Unknown Problem" };
                }
            })
        );

        return NextResponse.json({
            success: true,
            battle: {
                ...battle,
                problems: problemsData
            },
            submissions
        });

    } catch (error) {
        console.error("Error fetching battle details:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
