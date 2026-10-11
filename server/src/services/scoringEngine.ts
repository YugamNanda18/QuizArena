import { IQuestion } from '../models/Question';
import { IQuiz } from '../models/Quiz';
import { IParticipant } from '../models/Participant';

export interface EvaluationResult {
  isCorrect: boolean;
  basePoints: number;
  speedBonus: number;
  pointsAwarded: number;
  responseTimeMs: number;
}

export class ScoringEngine {
  /**
   * Authoritatively evaluates a student's answer submission on the server.
   */
  public static evaluateAnswer(
    quiz: IQuiz,
    question: IQuestion,
    selectedOptionIndex: number,
    serverReceivedAt: Date,
    questionAvailableAt: Date
  ): EvaluationResult {
    const isCorrect = question.correctOptionIndex === selectedOptionIndex;

    // Response time measured from server question availability or quiz start to server receive time
    const responseTimeMs = Math.max(0, serverReceivedAt.getTime() - questionAvailableAt.getTime());

    let basePoints = 0;
    let speedBonus = 0;

    if (isCorrect) {
      basePoints = question.points ?? 100;

      // Optional Speed Bonus calculation if enabled by Administrator
      if (quiz.scoringSettings?.speedBonusEnabled && quiz.deadline) {
        const totalDurationMs = quiz.durationMinutes * 60 * 1000;
        const remainingMs = Math.max(0, quiz.deadline.getTime() - serverReceivedAt.getTime());
        const speedRatio = Math.min(1, Math.max(0, remainingMs / totalDurationMs));
        const maxBonus = quiz.scoringSettings.maxSpeedBonus || 20;
        // Faster correct answers receive up to maxSpeedBonus
        speedBonus = Math.round(maxBonus * speedRatio);
      }
    } else {
      // Incorrect answer
      if (quiz.scoringSettings?.negativeMarkingEnabled) {
        // Negative marking applied
        const penalty = question.negativeMarks || quiz.scoringSettings.negativeMarks || 0;
        basePoints = -Math.abs(penalty);
      } else {
        basePoints = 0;
      }
      speedBonus = 0; // Incorrect answers NEVER receive speed bonuses
    }

    const pointsAwarded = basePoints + speedBonus;

    return {
      isCorrect,
      basePoints,
      speedBonus,
      pointsAwarded,
      responseTimeMs,
    };
  }

  /**
   * Sorts participants using authoritative rules:
   * 1. Higher total points rank first (descending)
   * 2. Lower cumulative response time on correct answers ranks higher (ascending)
   * 3. More correct answers ranks higher (descending)
   * 4. Deterministic final tie-breaker (registeredAt ascending)
   *
   * Computes Standard Competition Ranking: 1, 2, 2, 4.
   */
  public static computeLeaderboardRanks(participants: IParticipant[]): Array<{
    participant: IParticipant;
    rank: number;
    prevRank: number;
  }> {
    const sorted = [...participants].sort((a, b) => {
      // 1. Total score (descending)
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      // 2. Cumulative response time (ascending - faster wins)
      if (a.cumulativeResponseTimeMs !== b.cumulativeResponseTimeMs) {
        return a.cumulativeResponseTimeMs - b.cumulativeResponseTimeMs;
      }

      // 3. Number of correct answers (descending)
      if (b.correctCount !== a.correctCount) {
        return b.correctCount - a.correctCount;
      }

      // 4. Deterministic server timestamp (earliest registration wins)
      const aTime = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const bTime = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return aTime - bTime;
    });

    const results: Array<{ participant: IParticipant; rank: number; prevRank: number }> = [];

    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (i > 0) {
        const prev = sorted[i - 1];
        const isTied =
          p.totalScore === prev.totalScore &&
          p.cumulativeResponseTimeMs === prev.cumulativeResponseTimeMs &&
          p.correctCount === prev.correctCount;

        if (!isTied) {
          currentRank = i + 1; // Competition ranking jump (e.g., 1, 2, 2, 4)
        }
      } else {
        currentRank = 1;
      }

      results.push({
        participant: p,
        rank: currentRank,
        prevRank: p.rank || currentRank,
      });
    }

    return results;
  }
}
