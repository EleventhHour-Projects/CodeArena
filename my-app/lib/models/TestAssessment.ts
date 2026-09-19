import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITestQuestion {
  problemId: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface IProctoringConfig {
  requireCamera: boolean;
  requireMic: boolean;
  preventTabSwitch: boolean;
  maxTabSwitches: number;
  requireFullScreen: boolean;
  disableCopyPaste: boolean;
}

export interface ITestAssessment extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  instructions?: string;
  testLink: string;
  durationMinutes: number;
  validFrom?: Date;
  validUntil?: Date;
  questions: ITestQuestion[];
  proctoring: IProctoringConfig;
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const TestQuestionSchema = new Schema<ITestQuestion>({
  problemId: { type: Number, required: true },
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  points: { type: Number, required: true, default: 10 },
});

const ProctoringConfigSchema = new Schema<IProctoringConfig>({
  requireCamera: { type: Boolean, default: false },
  requireMic: { type: Boolean, default: false },
  preventTabSwitch: { type: Boolean, default: false },
  maxTabSwitches: { type: Number, default: 3 },
  requireFullScreen: { type: Boolean, default: false },
  disableCopyPaste: { type: Boolean, default: false },
});

const TestAssessmentSchema: Schema<ITestAssessment> = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    instructions: { type: String, default: '' },
    testLink: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    durationMinutes: { type: Number, required: true, default: 60 },
    validFrom: { type: Date },
    validUntil: { type: Date },
    questions: { type: [TestQuestionSchema], default: [] },
    proctoring: { type: ProctoringConfigSchema, default: () => ({}) },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  },
  { timestamps: true }
);

TestAssessmentSchema.index({ companyId: 1 });
TestAssessmentSchema.index({ testLink: 1 });

const TestAssessment: Model<ITestAssessment> =
  mongoose.models.TestAssessment ||
  mongoose.model<ITestAssessment>('TestAssessment', TestAssessmentSchema, 'testAssessments');

export default TestAssessment;
