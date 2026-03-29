import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import BattleInviteModel from "@/lib/models/BattleInvite";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { opponentUsername, difficulty } = body;

        if (!opponentUsername || !difficulty) {
            return NextResponse.json(
                { success: false, message: "opponent username and difficulty are required" },
                { status: 400 }
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

        // Check if opponent exists
        const opponentUser = await UserModel.findOne({ username: opponentUsername });
        if (!opponentUser) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        // Check if either user is already in a battle
        if (curUser.currentBattleId !== null) {
            return NextResponse.json(
                { success: false, message: "You are already in a battle" },
                { status: 400 }
            );
        }

        if (opponentUser.currentBattleId !== null) {
            return NextResponse.json(
                { success: false, message: "Opponent is already in a battle" },
                { status: 400 }
            );
        }

        if(opponentUser.username === curUser.username){
            return NextResponse.json(
                { success: false, message: "OOPS! You cannot battle with yourself" },
                { status: 400 }
            );
        }

        // Create a document in BattleInvite with expiration date (Date.now() + 60 seconds)
        const expiresAt = new Date(Date.now() + 60 * 1000);

        // if a document already exists with player1Id = curUserId and player2Id = opponentUserId and has not expired
        const existingInvite = await BattleInviteModel.findOne({
            $or: [
                { player1: curUser._id, player2: opponentUser._id },
                { player1: opponentUser._id, player2: curUser._id }
            ],
            status: "Pending",
            expiresAt: { $gt: Date.now() }
        });

        if (existingInvite) {
            return NextResponse.json(
                { success: false, message: "Invite already sent" },
                { status: 400 }
            );
        }

        const newInvite = await BattleInviteModel.create({
            player1: curUser._id,
            player2: opponentUser._id,
            status: "Pending",
            difficulty: difficulty,
            createdAt: Date.now(),
            expiresAt: expiresAt
        });

        // send BattleInvite id in response
        return NextResponse.json(
            { success: true, message: "Invite sent successfully", inviteId: newInvite._id },
            { status: 201 }
        );

    } catch (error) {
        console.error("Error creating battle invite:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
