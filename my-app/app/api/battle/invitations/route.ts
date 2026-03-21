import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import BattleInviteModel from "@/lib/models/BattleInvite";

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

        // Get current user using the email from session
        const curUser = await UserModel.findOne({ email: session.user.email });
        if (!curUser) {
            return NextResponse.json(
                { success: false, message: "Current user not found" },
                { status: 404 }
            );
        }

        // Update lastActive time
        await UserModel.updateOne(
            { _id: curUser._id },
            { $set: { lastActive: new Date() } }
        );

        // Check if the current user is already in a battle
        if (curUser.currentBattleId !== null) {
            return NextResponse.json(
                { success: false, message: "You are already in a battle" },
                { status: 400 }
            );
        }

        // Find all pending invitations where the current user is player2 and the invite hasn't expired
        const pendingInvites = await BattleInviteModel.find({
            player2: curUser._id,
            status: "Pending",
            expiresAt: { $gt: Date.now() }
        })
        .select("player1 difficulty _id expiresAt timeLimitMinutes")
        .populate("player1", "username name rating image"); // Optionally populate player1 details if needed by frontend

        return NextResponse.json(
            { success: true, invitations: pendingInvites },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error fetching battle invitations:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
