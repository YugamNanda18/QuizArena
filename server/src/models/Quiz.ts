import mongoose, { Document, Schema, Types } from 'mongoose';

export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'WAITING' | 'LIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface IScoringSettings {
  defaultPoints: number;
  negativeMarkingEnabled: boolean;
  negativeMarks: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
}

export interface IRegistrationSettings {
  requireStudentId: boolean;
  allowLateJoin: boolean;
}

export interface IFeedbackPolicy {
  showScoreImmediately: boolean;
  showCorrectAnswersAfterQuiz: boolean;
}

export interface IQuiz extends Document {
  title: string;
  slug: string;
  description: string;
  instructions: string;
  roomCode: string;
  creator: Types.ObjectId;
  status: QuizStatus;
  durationMinutes: number;
  totalQuestions: number;
  maxScore: number;
  scheduledStartTime?: Date;
  actualStartTime?: Date;
  deadline?: Date;
  pausedAt?: Date;
  pauseRemainingSeconds?: number;
  completedAt?: Date;
  scoringSettings: IScoringSettings;
  registrationSettings: IRegistrationSettings;
  feedbackPolicy: IFeedbackPolicy;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    instructions: { type: String, default: '' },
    roomCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'WAITING', 'LIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    durationMinutes: { type: Number, required: true, default: 15 },
    totalQuestions: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    scheduledStartTime: { type: Date },
    actualStartTime: { type: Date },
    deadline: { type: Date },
    pausedAt: { type: Date },
    pauseRemainingSeconds: { type: Number },
    completedAt: { type: Date },
    scoringSettings: {
      defaultPoints: { type: Number, default: 100 },
      negativeMarkingEnabled: { type: Boolean, default: false },
      negativeMarks: { type: Number, default: 25 },
      speedBonusEnabled: { type: Boolean, default: false },
      maxSpeedBonus: { type: Number, default: 20 },
    },
    registrationSettings: {
      requireStudentId: { type: Boolean, default: false },
      allowLateJoin: { type: Boolean, default: false },
    },
    feedbackPolicy: {
      showScoreImmediately: { type: Boolean, default: true },
      showCorrectAnswersAfterQuiz: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// RoomCode unique constraint and status index already configured on schema properties
export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
