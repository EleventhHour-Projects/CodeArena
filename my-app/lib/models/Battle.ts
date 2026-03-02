import mongoose from "mongoose";
import { Battle } from "@/types/BattleType";

const battleSchema = new mongoose.Schema<Battle>({
    player1: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, required: true, default: "Pending" },
    createdAt: { type: Date, required: true, default: new Date() },
    difficulty: { type: String, required: true },
    type: { type: String, required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    loser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Object },
    problems: { type: [{ id: { type: Number, required: true } }], required: true },
})

// set the name of collection to battles
const BattleModel = mongoose.model<Battle>("Battle", battleSchema, "battles");

export default BattleModel;