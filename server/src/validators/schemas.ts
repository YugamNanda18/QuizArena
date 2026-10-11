import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const studentRegistrationSchema = z.object({
  quizId: z.string().optional(),
  roomCode: z.string().optional(),
  name: z.string().min(2, 'Full name is required (min 2 characters)'),
  email: z.string().email('Valid email address is required'),
  studentId: z.string().optional(),
});

export const createQuizSchema = z.object({
  title: z.string().min(3, 'Quiz title must be at least 3 characters'),
  description: z.string().optional().default(''),
  instructions: z.string().optional().default(''),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(300),
  scoringSettings: z
    .object({
      defaultPoints: z.number().min(0).default(100),
      negativeMarkingEnabled: z.boolean().default(false),
      negativeMarks: z.number().min(0).default(25),
      speedBonusEnabled: z.boolean().default(false),
      maxSpeedBonus: z.number().min(0).default(20),
      allQuestionsCompulsory: z.boolean().optional().default(false),
    })
    .default({}),
  registrationSettings: z
    .object({
      requireStudentId: z.boolean().default(false),
      allowLateJoin: z.boolean().default(false),
    })
    .default({}),
  feedbackPolicy: z
    .object({
      showScoreImmediately: z.boolean().default(true),
      showCorrectAnswersAfterQuiz: z.boolean().default(true),
    })
    .default({}),
});

export const updateQuizSchema = createQuizSchema.partial();

export const createQuestionSchema = z.object({
  text: z.string().min(3, 'Question text is required'),
  type: z.literal('mcq').default('mcq'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options are required'),
  correctOptionIndex: z.number().int().min(0, 'Correct option index must be valid non-negative integer'),
  points: z.number().min(0, 'Points must be non-negative (can be 0 or higher)').default(100),
  negativeMarks: z.number().min(0).default(0),
  explanation: z.string().optional().default(''),
  order: z.number().int().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isRequired: z.boolean().optional().default(true),
});

export const bulkUpdatePointsSchema = z.object({
  updates: z.array(
    z.object({
      questionId: z.string(),
      points: z.number().min(0),
    })
  ),
});

export const submitAnswerSchema = z.object({
  quizId: z.string().min(1, 'Quiz ID is required'),
  participantId: z.string().min(1, 'Participant ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  selectedOptionIndex: z.number().int().min(0, 'Selected option must be valid non-negative index'),
});
