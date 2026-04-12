import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import { isUserBanned } from "@/lib/auth/userStatus";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { difficulty } = await req.json();
        const userId = session.user.id;

        await dbConnect();
        const user = await UserModel.findById(userId);
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Check if user is banned
        const banStatus = isUserBanned(user);
        if (banStatus.banned) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `You are banned from joining the arena. ${banStatus.expires ? `Expires: ${banStatus.expires.toLocaleString()}` : 'This is a permanent ban.'}` 
                },
                { status: 403 }
            );
        }

        // Lazy cleanup if ban has expired
        if (banStatus.needsCleanup) {
            await UserModel.updateOne(
                { _id: user._id },
                { $set: { isBanned: false, banExpires: null } }
            );
        }

        // Call the Go matchmaking service
        const response = await fetch("http://34.126.214.18:6969/api/matchmaking/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_id: userId, difficulty: difficulty || "medium" }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            return NextResponse.json({ success: false, error: errorData || "Failed to register for matchmaking" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ success: true, ...data });

    } catch (error) {
        console.error("Matchmaking registration error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
