import { Participant, IParticipant } from '../models/Participant';
import { ScoringEngine } from './scoringEngine';
import { Server as SocketIOServer } from 'socket.io';

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

export class LeaderboardService {
  /**
   * Recalculates authoritative ranks, persists changes, and returns clean sanitized leaderboard snapshot.
   */
  public static async getAndRecomputeLeaderboard(quizId: string): Promise<LeaderboardEntry[]> {
    const participants = await Participant.find({ quizId }).exec();
    if (!participants || participants.length === 0) {
      return [];
    }

    const ranked = ScoringEngine.computeLeaderboardRanks(participants);

    // Bulk persist ranks if any changed
    const bulkOps = ranked.map(({ participant, rank }) => ({
      updateOne: {
        filter: { _id: participant._id },
        update: { $set: { rank } },
      },
    }));

    if (bulkOps.length > 0) {
      await Participant.bulkWrite(bulkOps);
    }

    return ranked.map(({ participant, rank, prevRank }) => {
      let movement: 'up' | 'down' | 'same' | 'new' = 'same';
      if (!prevRank || prevRank === 0) {
        movement = 'new';
      } else if (rank < prevRank) {
        movement = 'up'; // Rank improved (e.g. from 3 to 1)
      } else if (rank > prevRank) {
        movement = 'down'; // Rank dropped
      }

      const totalAnswered = participant.correctCount + participant.incorrectCount;
      const accuracy = totalAnswered > 0 ? Math.round((participant.correctCount / totalAnswered) * 100) : 0;

      return {
        id: participant._id.toString(),
        name: participant.name,
        rank,
        prevRank,
        movement,
        totalScore: participant.totalScore,
        baseScore: participant.baseScore,
        bonusScore: participant.bonusScore,
        correctCount: participant.correctCount,
        incorrectCount: participant.incorrectCount,
        unansweredCount: participant.unansweredCount,
        accuracy,
        cumulativeResponseTimeMs: participant.cumulativeResponseTimeMs,
        status: participant.status,
      };
    });
  }

  /**
   * Broadcasts updated leaderboard to all sockets subscribed to the quiz room.
   */
  public static async broadcastLeaderboard(io: SocketIOServer, quizId: string): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getAndRecomputeLeaderboard(quizId);
    io.to(`quiz:${quizId}`).emit('leaderboard:updated', {
      quizId,
      timestamp: Date.now(),
      leaderboard,
    });
    return leaderboard;
  }
}
