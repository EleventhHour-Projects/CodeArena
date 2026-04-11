import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import BattleRecordingModel from "@/lib/models/BattleRecording";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const recording = await BattleRecordingModel.findById(id).lean();

    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(recording);
  } catch (error) {
    console.error("Error fetching recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const result = await BattleRecordingModel.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
