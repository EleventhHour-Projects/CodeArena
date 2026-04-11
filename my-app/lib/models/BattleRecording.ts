import mongoose from "mongoose";

export interface ISnapshot {
  timestamp: number; // seconds from battle start
  player1: {
    code: string | null; // null means unchanged from previous
    problemIndex: number;
    event?: string; // run, submit, accepted, wrong_answer, solved, surrender, draw
  };
  player2: {
    code: string | null;
    problemIndex: number;
    event?: string;
  };
}

export interface IBattleRecording {
  battleId: mongoose.Types.ObjectId;
  player1Id: mongoose.Types.ObjectId;
  player2Id: mongoose.Types.ObjectId;
  player1Username: string;
  player2Username: string;
  duration: number;
  problems: Array<{ id: number; title: string; difficulty: string }>;
  snapshots: ISnapshot[];
  createdAt: Date;
}

const snapshotPlayerSchema = new mongoose.Schema(
  {
    code: { type: String, default: null },
    problemIndex: { type: Number, default: 0 },
    event: { type: String, default: undefined },
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema(
  {
    timestamp: { type: Number, required: true },
    player1: { type: snapshotPlayerSchema, required: true },
    player2: { type: snapshotPlayerSchema, required: true },
  },
  { _id: false }
);

const battleRecordingSchema = new mongoose.Schema<IBattleRecording>({
  battleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Battle",
    required: true,
    index: true,
  },
  player1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  player2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  player1Username: { type: String, required: true },
  player2Username: { type: String, required: true },
  duration: { type: Number, default: 0 },
  problems: {
    type: [
      {
        id: { type: Number, required: true },
        title: { type: String, default: "" },
        difficulty: { type: String, required: true },
      },
    ],
    default: [],
  },
  snapshots: { type: [snapshotSchema], default: [] },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 432000, // 5 days TTL (5 * 24 * 60 * 60)
  },
});

const BattleRecordingModel =
  mongoose.models.BattleRecording ||
  mongoose.model<IBattleRecording>(
    "BattleRecording",
    battleRecordingSchema,
    "battlerecordings"
  );

export default BattleRecordingModel;
