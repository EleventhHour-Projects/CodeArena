import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import BattleRecordingModel from "@/lib/models/BattleRecording";
import { UserModel } from "@/lib/models/User";

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

    // Resolve actual usernames from User collection
    let p1Name = player1Username || "Player 1";
    let p2Name = player2Username || "Player 2";
    if (
      player1Id &&
      player2Id &&
      (p1Name === "Player 1" || p2Name === "Player 2")
    ) {
      const [u1, u2] = await Promise.all([
        UserModel.findById(player1Id, "username").lean(),
        UserModel.findById(player2Id, "username").lean(),
      ]);
      if (u1?.username) p1Name = u1.username;
      if (u2?.username) p2Name = u2.username;
    }

    // Upsert: create on first chunk, append snapshots on subsequent ones
    const update: any = {
      $push: { snapshots: { $each: snapshots } },
      $setOnInsert: {
        battleId,
        player1Id,
        player2Id,
        player1Username: p1Name,
        player2Username: p2Name,
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
