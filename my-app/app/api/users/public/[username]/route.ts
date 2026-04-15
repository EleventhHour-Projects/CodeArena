import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await dbConnect();
    const { username } = await params;

    const user = await UserModel.findOne({
      username: decodeURIComponent(username).trim(),
    })
      .select("image")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      image: user.image ?? null,
    });
  } catch (error) {
    console.error("Error fetching public user profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
