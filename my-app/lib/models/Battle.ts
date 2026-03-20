import mongoose from "mongoose";
import { Battle } from "@/types/BattleType";

const battleSchema = new mongoose.Schema<Battle>({
    player1: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, required: true, default: "Active" },
    createdAt: { type: Date, required: true, default: Date.now },
    difficulty: { type: String, required: true },
    type: { type: String, required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    loser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Object },
    problems: { 
        type: [{ 
            difficulty: { type: String, required: true }, 
            id: { type: Number, required: true } 
        }], 
        default: [] 
    },
    problemResults: { 
        type: [{ 
            problem: { 
                difficulty: { type: String, required: true }, 
                id: { type: Number, required: true } 
            }, 
            player1SolveTime: { type: Number, default: 0 }, 
            player2SolveTime: { type: Number, default: 0 } 
        }], 
        default: [] 
    },
    ratingChangeA: { type: Number },
    ratingChangeB: { type: Number },
    newRatingA: { type: Number },
    newRatingB: { type: Number },
})

// set the name of collection to battles
const BattleModel = mongoose.models.Battle || mongoose.model<Battle>("Battle", battleSchema, "battles");

export default BattleModel;