import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  role: 'admin' | 'student';
  studentId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['admin', 'student'], default: 'student' },
    studentId: { type: String, trim: true },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
