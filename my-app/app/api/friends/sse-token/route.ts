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

        // Fetch SSE Token from executor service
        const tokenRes = await fetch("http://34.126.214.18:6969/api/friends/sse-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Key": process.env.INTERNAL_KEY || "",
            },
            body: JSON.stringify({ userId: me._id.toString() }),
        });

        if (!tokenRes.ok) {
            const errorData = await tokenRes.text();
            return NextResponse.json({ success: false, message: errorData || "Failed to fetch SSE token" }, { status: tokenRes.status });
        }

        const tokenData = await tokenRes.json();
        return NextResponse.json({ success: true, sseToken: tokenData.token, userId: me._id.toString() });

    } catch (err) {
        console.error("GET /api/friends/sse-token error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
