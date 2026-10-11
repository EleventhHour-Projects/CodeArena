import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();

        const me = await UserModel.findOne({ email: session.user.email }).select("_id");
        if (!me) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

        // Backend VM is offline
        return NextResponse.json(
            { success: false, message: "Invite notification service is currently offline" },
            { status: 503 }
        );

    } catch (err) {
        console.error("GET /api/battle/invitations/sse-token error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
