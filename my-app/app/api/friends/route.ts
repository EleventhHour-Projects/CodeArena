import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import FriendModel from "@/lib/models/Friend";

// GET /api/friends — list current user's friends
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();

        const me = await UserModel.findOne({ email: session.user.email }).select("_id");
        if (!me) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

        const friendDocs = await FriendModel.find({ user: me._id })
            .populate("friend", "username name rating image lastActive currentBattleId")
            .sort({ createdAt: -1 });

        const friends = friendDocs.map((f) => f.friend);

        return NextResponse.json({ success: true, friends });
    } catch (err) {
        console.error("GET /api/friends error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

// POST /api/friends — add a friend by username
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
        }

        const { username } = await req.json();
        if (!username?.trim()) {
            return NextResponse.json({ success: false, message: "Username is required" }, { status: 400 });
        }

        await dbConnect();

        const me = await UserModel.findOne({ email: session.user.email }).select("_id username");
        if (!me) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

        if (me.username?.toLowerCase() === username.trim().toLowerCase()) {
            return NextResponse.json({ success: false, message: "You can't add yourself" }, { status: 400 });
        }

        const target = await UserModel.findOne({
            username: { $regex: new RegExp(`^${username.trim()}$`, "i") },
        }).select("_id username name rating image");

        if (!target) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        // Check already friends
        const existing = await FriendModel.findOne({ user: me._id, friend: target._id });
        if (existing) {
            return NextResponse.json({ success: false, message: "Already in your friend list" }, { status: 409 });
        }

        await FriendModel.create({ user: me._id, friend: target._id });

        return NextResponse.json({
            success: true,
            message: `${target.username} added to friends`,
            friend: { _id: target._id, username: target.username, name: target.name, rating: target.rating, image: target.image },
        });
    } catch (err) {
        console.error("POST /api/friends error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
