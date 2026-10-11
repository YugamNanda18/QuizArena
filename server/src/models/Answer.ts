import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAnswer extends Document {
  quizId: Types.ObjectId;
  participantId: Types.ObjectId;
  questionId: Types.ObjectId;
  selectedOptionIndex: number;
  isCorrect: boolean;
  basePoints: number;
  speedBonus: number;
  pointsAwarded: number;
  serverReceivedAt: Date;
  responseTimeMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'Participant', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    selectedOptionIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    basePoints: { type: Number, required: true, default: 0 },
    speedBonus: { type: Number, default: 0 },
    pointsAwarded: { type: Number, required: true, default: 0 },
    serverReceivedAt: { type: Date, default: Date.now },
    responseTimeMs: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Strict unique compound index: Exactly one recorded answer per participant per question
AnswerSchema.index({ quizId: 1, participantId: 1, questionId: 1 }, { unique: true });

export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);
