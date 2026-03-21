import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();

        const result = await UserModel.updateOne(
            { email: session.user.email },
            { $set: { lastActive: new Date() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("POST /api/user/heartbeat error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
