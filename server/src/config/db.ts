import mongoose from 'mongoose';
import { config } from './env';

export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.MONGO_URI);
    console.log(`[Database] MongoDB connected successfully to ${config.MONGO_URI}`);
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
