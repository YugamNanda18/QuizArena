import mongoose, { Document, Schema, Types } from 'mongoose';

export type ParticipantStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISQUALIFIED';

export interface IParticipant extends Document {
  quizId: Types.ObjectId;
  name: string;
  email: string;
  studentId?: string;
  socketId?: string;
  isConnected: boolean;
  registeredAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalScore: number;
  baseScore: number;
  bonusScore: number;
  rank: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  cumulativeResponseTimeMs: number;
  status: ParticipantStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    studentId: { type: String, trim: true },
    socketId: { type: String },
    isConnected: { type: Boolean, default: false },
    registeredAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    totalScore: { type: Number, default: 0, index: true },
    baseScore: { type: Number, default: 0 },
    bonusScore: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    cumulativeResponseTimeMs: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'DISQUALIFIED'],
      default: 'WAITING',
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index to guarantee one registration per email per quiz
ParticipantSchema.index({ quizId: 1, email: 1 }, { unique: true });
ParticipantSchema.index({ quizId: 1, totalScore: -1, cumulativeResponseTimeMs: 1 });

export const Participant = mongoose.model<IParticipant>('Participant', ParticipantSchema);
