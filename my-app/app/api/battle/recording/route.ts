import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import BattleRecordingModel from "@/lib/models/BattleRecording";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      battleId,
      player1Id,
      player2Id,
      player1Username,
      player2Username,
      problems,
      snapshots,
      final,
      duration,
    } = body;

    if (!battleId || !snapshots || !Array.isArray(snapshots)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert: create on first chunk, append snapshots on subsequent ones
    const update: any = {
      $push: { snapshots: { $each: snapshots } },
      $setOnInsert: {
        battleId,
        player1Id,
        player2Id,
        player1Username: player1Username || "Player 1",
        player2Username: player2Username || "Player 2",
        problems: problems || [],
        createdAt: new Date(),
      },
    };

    // Set duration on final flush
    if (final && duration !== undefined) {
      update.$set = { duration };
    }

    await BattleRecordingModel.findOneAndUpdate({ battleId }, update, {
      upsert: true,
      new: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving battle recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
