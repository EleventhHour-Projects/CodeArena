import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import { NotificationModel } from "@/lib/models/Notification";

// GET /api/admin/users/[username] — get full user details by username
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await dbConnect();
    const { username } = await params;

    const user = await UserModel.findOne(
      { username: username.trim() }
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Error fetching user:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[username] — update user info (image, ban status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await dbConnect();
    const { username } = await params;
    const { image, isBanned, banExpires, banReason } = await request.json();

    const user = await UserModel.findOne({ username: username.trim() });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: any = {};
    if (image !== undefined) updates.image = image;
    if (isBanned !== undefined) updates.isBanned = isBanned;
    if (banExpires !== undefined) updates.banExpires = banExpires;

    const updatedUser = await UserModel.findOneAndUpdate(
      { username: username.trim() },
      { $set: updates },
      { new: true }
    );

    // If banned, send a notification
    if (isBanned) {
      await NotificationModel.create({
        userId: user._id,
        message: `You have been ${banExpires ? "temporarily" : "permanently"} banned. Reason: ${banReason || "No reason provided."}${banExpires ? ` Expires: ${new Date(banExpires).toLocaleString()}` : ""}`,
        type: "system",
      });
    } else if (isBanned === false && user.isBanned) {
      // If unbanned
      await NotificationModel.create({
        userId: user._id,
        message: "Your account has been unbanned.",
        type: "system",
      });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Error updating user:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
