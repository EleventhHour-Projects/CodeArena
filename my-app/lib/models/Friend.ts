import mongoose from "mongoose";
import { Friend } from "@/types/FriendType";

const FriendSchema = new mongoose.Schema<Friend>({
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    friend:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
});

// Prevent duplicate friendships
FriendSchema.index({ user: 1, friend: 1 }, { unique: true });

const FriendModel =
    mongoose.models.Friend ||
    mongoose.model<Friend>("Friend", FriendSchema, "friends");

export default FriendModel;
