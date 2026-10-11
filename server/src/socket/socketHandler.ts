import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Participant } from '../models/Participant';
import { LeaderboardService } from '../services/leaderboardService';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  ioInstance.on('connection', (socket: Socket) => {
    // console.log(`[Socket] Connected: ${socket.id}`);

    // Join Quiz Room
    socket.on('quiz:join', async (data: { quizId: string; participantId?: string; role?: string }) => {
      try {
        const { quizId, participantId } = data;
        if (!quizId) return;

        const room = `quiz:${quizId}`;
        socket.join(room);

        if (participantId) {
          await Participant.findByIdAndUpdate(participantId, {
            isConnected: true,
            socketId: socket.id,
          });
        }

        // Broadcast updated participant count
        const connectedCount = await Participant.countDocuments({ quizId, isConnected: true });
        ioInstance?.to(room).emit('participant:count', {
          quizId,
          count: connectedCount,
        });

        // Send current server time for accurate client sync
        socket.emit('server:time', { timestamp: Date.now() });
      } catch (err) {
        console.error('[Socket] Join error:', err);
      }
    });

    // Request immediate leaderboard snapshot
    socket.on('leaderboard:request', async (data: { quizId: string }) => {
      try {
        if (!data.quizId) return;
        const leaderboard = await LeaderboardService.getAndRecomputeLeaderboard(data.quizId);
        socket.emit('leaderboard:updated', {
          quizId: data.quizId,
          timestamp: Date.now(),
          leaderboard,
        });
      } catch (err) {
        console.error('[Socket] Leaderboard request error:', err);
      }
    });

    // Real-Time Room Code Broadcast by Admin to all candidate sessions
    socket.on('room:broadcast', (data: { roomCode: string; title: string; quizId: string }) => {
      try {
        if (!data.roomCode) return;
        ioInstance?.emit('room:announced', {
          roomCode: data.roomCode,
          title: data.title,
          quizId: data.quizId,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[Socket] Room broadcast error:', err);
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async () => {
      try {
        const participant = await Participant.findOneAndUpdate(
          { socketId: socket.id },
          { isConnected: false }
        );

        if (participant) {
          const room = `quiz:${participant.quizId}`;
          const count = await Participant.countDocuments({ quizId: participant.quizId, isConnected: true });
          ioInstance?.to(room).emit('participant:count', {
            quizId: participant.quizId,
            count,
          });
        }
      } catch (err) {
        console.error('[Socket] Disconnect cleanup error:', err);
      }
    });
  });

  return ioInstance;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
