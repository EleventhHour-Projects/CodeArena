import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";

// GET /api/admin/users/search?q=john&limit=8
export async function GET(req: NextRequest) {

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 8), 20);

  try {
    await dbConnect();
    const users = await UserModel.find(
      { username: { $regex: `^${q}`, $options: "i" } },
      "username image"
    )
      .limit(limit)
      .lean();

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
