import mongoose from "mongoose";
import { Invitation } from "../../types/Invitation";

const BattleInviteSchema = new mongoose.Schema({
    player1: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, required: true, default: "Pending" },
    createdAt: { type: Date, required: true, default: Date.now() },
    difficulty: { type: String, required: true },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
});

BattleInviteSchema.index({
    player2: 1,
    status: 1,
    expiresAt: 1
});

const BattleInviteModel = mongoose.models.BattleInvite || mongoose.model<Invitation>("BattleInvite", BattleInviteSchema, "battleInvites");

export default BattleInviteModel;