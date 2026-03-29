import { Types } from "mongoose";

export type NotificationTypeEnum = "system" | "report_accepted";

export interface Notification {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    message: string;
    type: NotificationTypeEnum;
    isRead: boolean;
    createdAt: Date;
}
