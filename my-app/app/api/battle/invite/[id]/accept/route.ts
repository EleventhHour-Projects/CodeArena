import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import BattleInviteModel from "@/lib/models/BattleInvite";
import BattleModel from "@/lib/models/Battle";
import { assignBattleProblems } from "@/lib/problems/assignBattleProblems";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: inviteId } = await params;

        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        if (!inviteId) {
            return NextResponse.json(
                { success: false, message: "Invite ID is required" },
                { status: 400 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            body = {};
        }

        await dbConnect();

        // Check if invite exists
        const invite = await BattleInviteModel.findById(inviteId);
        
        if (!invite || invite.expiresAt < new Date()) {
            return NextResponse.json(
                { success: false, message: "Invite missing or already expired" },
                { status: 404 }
            );
        }

        const difficulty = body?.difficulty || invite.difficulty;
        const player1Id = body?.player1Id || invite.player1.toString();

        // Get current user (player2) using the email from session
        const curUser = await UserModel.findOne({ email: session.user.email });
        if (!curUser) {
            return NextResponse.json(
                { success: false, message: "Current user not found" },
                { status: 404 }
            );
        }

        // Verify current user is actually player2 (the invitee)
        if (invite.player2.toString() !== curUser._id.toString()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized to accept this invite" },
                { status: 403 }
            );
        }
        
        // Ensure status is currently pending
        if (invite.status !== "Pending") {
             return NextResponse.json(
                { success: false, message: "Invite is no longer pending" },
                { status: 400 }
            );
        }

        // verify player1.currentBattleId == null
        const player1 = await UserModel.findById(player1Id);
        if (!player1) {
            return NextResponse.json(
                { success: false, message: "Player 1 not found" },
                { status: 404 }
            );
        }

        if (player1.currentBattleId) {
            return NextResponse.json(
                { success: false, message: "Player 1 is already in a battle" },
                { status: 400 }
            );
        }

        // Also a good practice to verify player2.currentBattleId == null
        if (curUser.currentBattleId) {
             return NextResponse.json(
                { success: false, message: "You are already in a battle" },
                { status: 400 }
            );
        }

        // Assign problems using assignBattleProblems
        let problems: { difficulty: "easy" | "medium" | "hard"; id: number }[] = [];
        try {
            problems = assignBattleProblems(difficulty);
            console.log("Assigned Problems for battle:", problems);
        } catch (error) {
            console.error("Error formatting battle problems:", error);
            return NextResponse.json(
                { success: false, message: "Failed to assign problems for the given difficulty" },
                { status: 500 }
            );
        }

        // create Battle document
        const battle = new BattleModel({
            player1: player1._id,
            player2: curUser._id,
            status: "Active",
            difficulty: difficulty,
            type: "1v1",
            problems: problems,
            createdAt: new Date(),
            startTime: new Date()
        });
        
        console.log("Creating Battle with problems count:", battle.problems?.length);
        await battle.save();

        // set currentBattleId for both users to the id of mongoDB Document created
        player1.currentBattleId = battle._id;
        await player1.save();
        
        curUser.currentBattleId = battle._id;
        await curUser.save();

        // set invite status = Accepted
        invite.status = "Accepted";
        await invite.save();

        return NextResponse.json(
            { success: true, message: "Battle accepted successfully", battleId: battle._id },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error accepting battle invite:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
