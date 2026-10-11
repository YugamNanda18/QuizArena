import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function joinQuizRoom(quizId: string, participantId?: string, role: string = 'student'): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit('quiz:join', { quizId, participantId, role });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
