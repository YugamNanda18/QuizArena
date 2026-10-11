import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IQuestion extends Document {
  quizId: Types.ObjectId;
  text: string;
  type: 'mcq';
  options: string[];
  correctOptionIndex: number;
  points: number;
  negativeMarks: number;
  explanation: string;
  order: number;
  imageUrl?: string;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: ['mcq'], default: 'mcq' },
    options: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length >= 2, 'A question must have at least 2 options'],
    },
    correctOptionIndex: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, default: 100, min: 0 },
    negativeMarks: { type: Number, default: 0, min: 0 },
    explanation: { type: String, default: '' },
    order: { type: Number, default: 1 },
    imageUrl: { type: String },
    isRequired: { type: Boolean, default: true },
  },
  { timestamps: true }
);

QuestionSchema.index({ quizId: 1, order: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
