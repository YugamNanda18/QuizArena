import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '../services/scoringEngine';
import { IQuestion } from '../models/Question';
import { IQuiz } from '../models/Quiz';
import { IParticipant } from '../models/Participant';
import mongoose from 'mongoose';

describe('QuizArena Enterprise ScoringEngine', () => {
  const dummyQuiz = {
    _id: new mongoose.Types.ObjectId(),
    durationMinutes: 10,
    deadline: new Date(Date.now() + 10 * 60 * 1000),
    actualStartTime: new Date(),
    scoringSettings: {
      defaultPoints: 100,
      negativeMarkingEnabled: true,
      negativeMarks: 25,
      speedBonusEnabled: true,
      maxSpeedBonus: 20,
    },
  } as unknown as IQuiz;

  it('correctly awards dynamic points configured on individual questions', () => {
    const q10 = {
      _id: new mongoose.Types.ObjectId(),
      correctOptionIndex: 1,
      points: 10,
      negativeMarks: 5,
    } as unknown as IQuestion;

    const q500 = {
      _id: new mongoose.Types.ObjectId(),
      correctOptionIndex: 3,
      points: 500,
      negativeMarks: 50,
    } as unknown as IQuestion;

    const now = new Date();
    const result10 = ScoringEngine.evaluateAnswer(dummyQuiz, q10, 1, now, now);
    const result500 = ScoringEngine.evaluateAnswer(dummyQuiz, q500, 3, now, now);

    expect(result10.isCorrect).toBe(true);
    expect(result10.basePoints).toBe(10);

    expect(result500.isCorrect).toBe(true);
    expect(result500.basePoints).toBe(500);
  });

  it('applies negative marking penalty when configured and answer is wrong', () => {
    const q100 = {
      _id: new mongoose.Types.ObjectId(),
      correctOptionIndex: 0,
      points: 100,
      negativeMarks: 25,
    } as unknown as IQuestion;

    const now = new Date();
    const resultWrong = ScoringEngine.evaluateAnswer(dummyQuiz, q100, 2, now, now);

    expect(resultWrong.isCorrect).toBe(false);
    expect(resultWrong.basePoints).toBe(-25);
    expect(resultWrong.speedBonus).toBe(0);
    expect(resultWrong.pointsAwarded).toBe(-25);
  });

  it('awards zero points for wrong answer when negative marking is disabled', () => {
    const quizNoNegative = {
      ...dummyQuiz,
      scoringSettings: {
        ...dummyQuiz.scoringSettings,
        negativeMarkingEnabled: false,
      },
    } as unknown as IQuiz;

    const q100 = {
      _id: new mongoose.Types.ObjectId(),
      correctOptionIndex: 0,
      points: 100,
      negativeMarks: 25,
    } as unknown as IQuestion;

    const now = new Date();
    const result = ScoringEngine.evaluateAnswer(quizNoNegative, q100, 2, now, now);

    expect(result.isCorrect).toBe(false);
    expect(result.basePoints).toBe(0);
    expect(result.pointsAwarded).toBe(0);
  });

  it('breaks ties using speed (lower cumulative response time ranks higher)', () => {
    const studentFast = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Alice Fast',
      totalScore: 500,
      cumulativeResponseTimeMs: 12000, // 12 seconds
      correctCount: 4,
      registeredAt: new Date(1000),
      rank: 0,
    } as unknown as IParticipant;

    const studentSlow = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Bob Slow',
      totalScore: 500,
      cumulativeResponseTimeMs: 25000, // 25 seconds
      correctCount: 4,
      registeredAt: new Date(2000),
      rank: 0,
    } as unknown as IParticipant;

    const leaderboard = ScoringEngine.computeLeaderboardRanks([studentSlow, studentFast]);

    expect(leaderboard[0].participant.name).toBe('Alice Fast');
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].participant.name).toBe('Bob Slow');
    expect(leaderboard[1].rank).toBe(2);
  });

  it('guarantees that higher total score always beats lower score regardless of speed', () => {
    const studentHigh = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Charlie Brain',
      totalScore: 600,
      cumulativeResponseTimeMs: 40000, // slower
      correctCount: 5,
      registeredAt: new Date(1000),
      rank: 0,
    } as unknown as IParticipant;

    const studentLowFast = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Dan Speed',
      totalScore: 400,
      cumulativeResponseTimeMs: 5000, // super fast but lower score
      correctCount: 3,
      registeredAt: new Date(2000),
      rank: 0,
    } as unknown as IParticipant;

    const leaderboard = ScoringEngine.computeLeaderboardRanks([studentLowFast, studentHigh]);

    expect(leaderboard[0].participant.name).toBe('Charlie Brain');
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].participant.name).toBe('Dan Speed');
    expect(leaderboard[1].rank).toBe(2);
  });

  it('implements standard competition ranking (1, 2, 2, 4)', () => {
    const p1 = {
      _id: new mongoose.Types.ObjectId(),
      name: 'P1 First',
      totalScore: 800,
      cumulativeResponseTimeMs: 10000,
      correctCount: 5,
      registeredAt: new Date(1000),
      rank: 0,
    } as unknown as IParticipant;

    const p2 = {
      _id: new mongoose.Types.ObjectId(),
      name: 'P2 Tied',
      totalScore: 600,
      cumulativeResponseTimeMs: 15000,
      correctCount: 4,
      registeredAt: new Date(2000),
      rank: 0,
    } as unknown as IParticipant;

    const p3 = {
      _id: new mongoose.Types.ObjectId(),
      name: 'P3 Tied',
      totalScore: 600,
      cumulativeResponseTimeMs: 15000,
      correctCount: 4,
      registeredAt: new Date(2000),
      rank: 0,
    } as unknown as IParticipant;

    const p4 = {
      _id: new mongoose.Types.ObjectId(),
      name: 'P4 Fourth',
      totalScore: 300,
      cumulativeResponseTimeMs: 18000,
      correctCount: 2,
      registeredAt: new Date(4000),
      rank: 0,
    } as unknown as IParticipant;

    const leaderboard = ScoringEngine.computeLeaderboardRanks([p1, p2, p3, p4]);

    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[2].rank).toBe(2);
    expect(leaderboard[3].rank).toBe(4); // Competition ranking skips to 4!
  });
});
