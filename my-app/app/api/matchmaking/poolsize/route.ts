import { NextResponse } from "next/server";
import { EXECUTOR_SERVICE_URL } from "@/lib/config";

export async function GET() {
    try {
        const response = await fetch(`${EXECUTOR_SERVICE_URL}/api/poolsize`, {
            method: "GET",
        });

        if (!response.ok) {
            return NextResponse.json({ success: false, error: "Failed to fetch pool size" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ success: true, ...data });

    } catch (error) {
        console.error("Matchmaking pool size fetch error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
