import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IViolation {
  type: 'tab_switch' | 'fullscreen_exit' | 'copy_paste' | 'camera_lost' | 'mic_lost';
  timestamp: Date;
  details?: string;
}

export interface IAnswer {
  problemId: number;
  code: string;
  language: string;
  submittedAt: Date;
  status?: 'Accepted' | 'Rejected' | 'Pending';
  score: number;
  execCodeId?: string;
}

export interface ICandidateInfo {
  name: string;
  email: string;
  rollNumber?: string;
  phone?: string;
}

export interface ITestCandidateAttempt extends Document {
  testId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  candidate: ICandidateInfo;
  status: 'registered' | 'in_progress' | 'submitted' | 'terminated';
  startedAt?: Date;
  submittedAt?: Date;
  tabSwitchCount: number;
  violations: IViolation[];
  answers: IAnswer[];
  totalScore: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const ViolationSchema = new Schema<IViolation>({
  type: { type: String, enum: ['tab_switch', 'fullscreen_exit', 'copy_paste', 'camera_lost', 'mic_lost'], required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
});

const AnswerSchema = new Schema<IAnswer>({
  problemId: { type: Number, required: true },
  code: { type: String, default: '' },
  language: { type: String, default: 'cpp' },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Accepted', 'Rejected', 'Pending'] },
  score: { type: Number, default: 0 },
  execCodeId: { type: String },
});

const CandidateInfoSchema = new Schema<ICandidateInfo>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  rollNumber: { type: String },
  phone: { type: String },
});

const TestCandidateAttemptSchema: Schema<ITestCandidateAttempt> = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: 'TestAssessment', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    candidate: { type: CandidateInfoSchema, required: true },
    status: {
      type: String,
      enum: ['registered', 'in_progress', 'submitted', 'terminated'],
      default: 'registered',
    },
    startedAt: { type: Date },
    submittedAt: { type: Date },
    tabSwitchCount: { type: Number, default: 0 },
    violations: { type: [ViolationSchema], default: [] },
    answers: { type: [AnswerSchema], default: [] },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TestCandidateAttemptSchema.index({ testId: 1 });
TestCandidateAttemptSchema.index({ companyId: 1 });
TestCandidateAttemptSchema.index({ 'candidate.email': 1, testId: 1 });

const TestCandidateAttempt: Model<ITestCandidateAttempt> =
  mongoose.models.TestCandidateAttempt ||
  mongoose.model<ITestCandidateAttempt>('TestCandidateAttempt', TestCandidateAttemptSchema, 'testCandidateAttempts');

export default TestCandidateAttempt;
