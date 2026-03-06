import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import BattleInviteModel from "@/lib/models/BattleInvite";

import { UserModel } from "@/lib/models/User";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        const { id: inviteId } = await params;

        if (!inviteId) {
            return NextResponse.json(
                { success: false, message: "Invite ID is required" },
                { status: 400 }
            );
        }

        await dbConnect();

        const invite = await BattleInviteModel.findById(inviteId);
        
        if (!invite) {
            return NextResponse.json(
                { success: false, message: "Invite not found" },
                { status: 404 }
            );
        }

        let battleId = null;
        if (invite.status === "Accepted") {
            // Get player1's current active battle
            const p1 = await UserModel.findById(invite.player1);
            battleId = p1?.currentBattleId;
        }

        return NextResponse.json(
            { success: true, status: invite.status, battleId },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error fetching battle invite:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
