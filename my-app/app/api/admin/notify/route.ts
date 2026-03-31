import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { NotificationModel } from "@/lib/models/Notification";
import { UserModel } from "@/lib/models/User";

// POST /api/admin/notify
// Body: { target: "user" | "all", username?: string, message: string }
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { target, username, message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (target === "all") {
      // Broadcast to every user
      const users = await UserModel.find({}, "_id");
      if (users.length === 0) {
        return NextResponse.json({ error: "No users found" }, { status: 404 });
      }

      const docs = users.map((u) => ({
        userId: u._id,
        message: message.trim(),
        type: "system",
        isRead: false,
      }));

      await NotificationModel.insertMany(docs);
      return NextResponse.json({ success: true, sent: users.length });
    }

    if (target === "user") {
      if (!username?.trim()) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
      }
      const user = await UserModel.findOne({ username: username.trim() });
      if (!user) {
        return NextResponse.json({ error: `User "${username}" not found` }, { status: 404 });
      }
      await NotificationModel.create({
        userId: user._id,
        message: message.trim(),
        type: "system",
        isRead: false,
      });
      return NextResponse.json({ success: true, sent: 1 });
    }

    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/admin/notify — fetch recent sent notifications (last 50)
export async function GET() {
  try {
    await dbConnect();
    const recent = await NotificationModel.find({ type: "system" })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "username");
    return NextResponse.json({ success: true, notifications: recent });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
