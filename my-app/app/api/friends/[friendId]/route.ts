import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import FriendModel from "@/lib/models/Friend";

// DELETE /api/friends/[friendId] — remove a friend
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ friendId: string }> }
) {
    try {
        const { friendId } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();

        const me = await UserModel.findOne({ email: session.user.email }).select("_id");
        if (!me) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

        const result = await FriendModel.deleteOne({ user: me._id, friend: friendId });

        if (result.deletedCount === 0) {
            return NextResponse.json({ success: false, message: "Friend not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Friend removed" });
    } catch (err) {
        console.error("DELETE /api/friends/[friendId] error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
