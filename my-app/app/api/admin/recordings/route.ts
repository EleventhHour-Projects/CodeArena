import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import BattleRecordingModel from "@/lib/models/BattleRecording";
import ReportModel from "@/lib/models/Report";
import { UserModel } from "@/lib/models/User";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [recordings, total] = await Promise.all([
      BattleRecordingModel.find(
        {},
        {
          // Exclude snapshots from listing for performance
          snapshots: 0,
        }
      )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BattleRecordingModel.countDocuments(),
    ]);

    // Collect all unique player IDs to resolve usernames
    const playerIds = new Set<string>();
    for (const rec of recordings as any[]) {
      if (rec.player1Id) playerIds.add(rec.player1Id.toString());
      if (rec.player2Id) playerIds.add(rec.player2Id.toString());
    }

    // Batch-fetch all usernames in one query
    const users = await UserModel.find(
      { _id: { $in: Array.from(playerIds) } },
      { username: 1 }
    ).lean();
    const usernameMap = new Map<string, string>();
    for (const u of users) {
      usernameMap.set(u._id.toString(), u.username);
    }

    // Cross-check which battles have reports
    const battleIds = (recordings as any[]).map((r) => r.battleId).filter(Boolean);
    const reports = await ReportModel.find(
      { battleId: { $in: battleIds } },
      { battleId: 1, _id: 1, status: 1, category: 1 }
    ).lean();

    const reportMap = new Map<string, any>();
    for (const report of reports) {
      if (report.battleId) {
        reportMap.set(report.battleId.toString(), {
          reportId: report._id.toString(),
          status: report.status,
          category: report.category,
        });
      }
    }

    // Enrich recordings with resolved usernames and report info
    const enrichedRecordings = (recordings as any[]).map((rec) => ({
      ...rec,
      player1Username:
        (rec.player1Id && usernameMap.get(rec.player1Id.toString())) ||
        rec.player1Username ||
        "Player 1",
      player2Username:
        (rec.player2Id && usernameMap.get(rec.player2Id.toString())) ||
        rec.player2Username ||
        "Player 2",
      report: rec.battleId
        ? reportMap.get(rec.battleId.toString()) || null
        : null,
    }));

    return NextResponse.json({
      recordings: enrichedRecordings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
