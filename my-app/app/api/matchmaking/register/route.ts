import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { difficulty } = await req.json();
        const userId = session.user.id;

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
