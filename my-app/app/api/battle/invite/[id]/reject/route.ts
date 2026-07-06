import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import BattleInviteModel from "@/lib/models/BattleInvite";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.email) {
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

        // Get current user using the email from session
        const curUser = await UserModel.findOne({ email: session.user.email });
        if (!curUser) {
            return NextResponse.json(
                { success: false, message: "Current user not found" },
                { status: 404 }
            );
        }

        // Check if invite exists
        const invite = await BattleInviteModel.findById(inviteId);
        
        if (!invite) {
            return NextResponse.json(
                { success: false, message: "Invite missing or already expired" },
                { status: 404 }
            );
        }

        // Verify current user is actually player2 (the invitee)
        if (invite.player2.toString() !== curUser._id.toString()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized to reject this invite" },
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

        // Set status to Rejected
        invite.status = "Rejected";
        await invite.save();

        // Notify Go backend to remove from SSE store immediately
        try {
            await fetch("http://34.131.239.188:6969/api/invites/delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Internal-Key": process.env.INTERNAL_KEY || "",
                },
                body: JSON.stringify({ userId: curUser._id.toString(), removeId: inviteId }),
            });
        } catch (err) {
            console.error("Failed to notify Go backend of invite rejection:", err);
        }

        return NextResponse.json(
            { success: true, message: "Invite rejected successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error rejecting battle invite:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
