import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import BattleRecordingModel from "@/lib/models/BattleRecording";
import ReportModel from "@/lib/models/Report";

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

    // Cross-check which battles have reports
    const battleIds = recordings.map((r: any) => r.battleId).filter(Boolean);
    const reports = await ReportModel.find(
      { battleId: { $in: battleIds } },
      { battleId: 1, _id: 1, status: 1, category: 1 }
    ).lean();

    // Build a map: battleId -> report info
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

    // Attach report info to recordings
    const enrichedRecordings = recordings.map((rec: any) => ({
      ...rec,
      report: rec.battleId ? reportMap.get(rec.battleId.toString()) || null : null,
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
