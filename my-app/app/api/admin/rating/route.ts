import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import { NotificationModel } from "@/lib/models/Notification";

// POST /api/admin/rating
// Body: { username, amount, reason, action: "add" | "remove" }
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { username, amount, reason, action } = await req.json();

    if (!username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    if (!action || !["add", "remove"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'add' or 'remove'" }, { status: 400 });
    }

    const user = await UserModel.findOne({ username: username.trim() });
    if (!user) {
      return NextResponse.json({ error: `User "${username}" not found` }, { status: 404 });
    }

    const delta = action === "add" ? amount : -amount;
    const newRating = Math.max(0, user.rating + delta); // prevent negative rating

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { rating: newRating } }
    );

    // Send notification to the user
    const sign = action === "add" ? "+" : "-";
    const emoji = action === "add" ? "⬆️" : "⬇️";
    const notifMessage = reason?.trim()
      ? `${emoji} Your rating has been adjusted by ${sign}${amount} (${newRating} total). Reason: ${reason.trim()}`
      : `${emoji} Your rating has been adjusted by ${sign}${amount} (${newRating} total).`;

    await NotificationModel.create({
      userId: user._id,
      message: notifMessage,
      type: "system",
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      previousRating: user.rating,
      newRating,
      delta,
      username: user.username,
    });
  } catch (err: any) {
    console.error("Rating adjustment error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
