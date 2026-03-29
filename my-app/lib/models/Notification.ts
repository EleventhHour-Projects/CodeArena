import mongoose from "mongoose";
import { Notification } from "@/types/NotificationType";

const notificationSchema = new mongoose.Schema<Notification>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["system", "report_accepted"], default: "system" },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, isRead: 1 });

export const NotificationModel = mongoose.models.Notification || mongoose.model<Notification>("Notification", notificationSchema, "notifications");
