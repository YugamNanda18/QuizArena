export type QuizStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'WAITING'
  | 'LIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface IScoringSettings {
  defaultPoints: number;
  negativeMarkingEnabled: boolean;
  negativeMarks: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
  allQuestionsCompulsory?: boolean;
}

export interface IRegistrationSettings {
  requireStudentId: boolean;
  allowLateJoin: boolean;
}

export interface IFeedbackPolicy {
  showScoreImmediately: boolean;
  showCorrectAnswersAfterQuiz: boolean;
}

export interface Quiz {
  _id?: string;
  id?: string;
  title: string;
  slug?: string;
  description: string;
  instructions: string;
  roomCode: string;
  status: QuizStatus;
  durationMinutes: number;
  totalQuestions: number;
  maxScore: number;
  startTime?: string;
  actualStartTime?: string;
  deadline?: string;
  scoringSettings: IScoringSettings;
  registrationSettings: IRegistrationSettings;
  feedbackPolicy: IFeedbackPolicy;
  createdAt?: string;
}

export interface Question {
  _id: string;
  quizId: string;
  text: string;
  type: 'mcq';
  options: string[];
  correctOptionIndex?: number;
  points: number;
  negativeMarks: number;
  explanation?: string;
  order: number;
  imageUrl?: string;
  isRequired?: boolean;
}

export interface Participant {
  id?: string;
  _id?: string;
  quizId?: string;
  name: string;
  email: string;
  studentId?: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISQUALIFIED';
  totalScore: number;
  baseScore?: number;
  bonusScore?: number;
  rank?: number;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  cumulativeResponseTimeMs?: number;
  registeredAt?: string;
  completedAt?: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  rank: number;
  prevRank: number;
  movement: 'up' | 'down' | 'same' | 'new';
  totalScore: number;
  baseScore: number;
  bonusScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  cumulativeResponseTimeMs: number;
  status: string;
}

export interface QuestionBreakdown {
  questionNumber: number;
  questionText: string;
  options: string[];
  points: number;
  selectedOptionIndex: number | null;
  isCorrect: boolean;
  pointsAwarded: number;
  responseTimeMs: number;
  correctOptionIndex?: number;
  explanation?: string;
}

export interface StudentResultResponse {
  participant: Participant & { accuracy: number };
  quiz: Quiz;
  breakdown: QuestionBreakdown[];
}
