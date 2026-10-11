import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        success: true,
        easy: 0,
        medium: 0,
        hard: 0,
        offline: true,
        message: "Matchmaking backend is currently offline"
    });
}
