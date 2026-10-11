import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Quiz } from '../models/Quiz';
import { Question } from '../models/Question';
import { Participant } from '../models/Participant';
import { Answer } from '../models/Answer';
import { config } from '../config/env';

/**
 * Initializes the database without any fictional quizzes or dummy data.
 * Ensures the administrator account is ready for real usage.
 */
export async function seedDatabase(): Promise<void> {
  try {
    // 1. Remove all fictional dummy demo quizzes and their associated data
    const fictionalQuiz = await Quiz.findOne({ roomCode: 'ARENA1' });
    if (fictionalQuiz) {
      await Question.deleteMany({ quizId: fictionalQuiz._id });
      await Participant.deleteMany({ quizId: fictionalQuiz._id });
      await Answer.deleteMany({ quizId: fictionalQuiz._id });
      await Quiz.deleteOne({ _id: fictionalQuiz._id });
      console.log('[Init] Removed fictional assessment ARENA1 and all sample records.');
    }

    // 2. Ensure Administrator Account
    let admin = await User.findOne({ email: config.ADMIN_EMAIL.toLowerCase() });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(config.ADMIN_PASSWORD, salt);

      admin = await User.create({
        name: 'Administrator',
        email: config.ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'admin',
      });
      console.log(`[Init] Initialized administrator account: ${config.ADMIN_EMAIL}`);
    } else {
      console.log(`[Init] Administrator account active: ${admin.email}`);
    }
  } catch (err: any) {
    console.error('[Init] Error initializing database:', err.message);
  }
}

if (require.main === module) {
  const { connectDB } = require('../config/db');
  connectDB().then(async () => {
    await seedDatabase();
    process.exit(0);
  });
}
