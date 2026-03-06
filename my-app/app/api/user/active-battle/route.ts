import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import BattleModel from "@/lib/models/Battle";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json(
                { success: false, message: "Not authenticated", battleId: null },
                { status: 401 }
            );
        }

        await dbConnect();

        const curUser = await UserModel.findOne({ email: session.user.email });
        if (!curUser) {
            return NextResponse.json(
                { success: false, message: "Current user not found", battleId: null },
                { status: 404 }
            );
        }

        if (!curUser.currentBattleId) {
            return NextResponse.json(
                { success: true, message: "No active battle", battleId: null },
                { status: 200 }
            );
        }

        const battle = await BattleModel.findById(curUser.currentBattleId);

        if (battle && battle.status === "Active") {
            return NextResponse.json(
                { success: true, message: "Active battle found", battleId: battle._id },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { success: true, message: "No active battle", battleId: null },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error fetching active battle:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", battleId: null },
            { status: 500 }
        );
    }
}
