import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // Strip trailing /api/v1 or trailing slashes to connect to server origin
    return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
  return typeof window !== 'undefined' ? window.location.origin : '/';
}

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = resolveSocketUrl();
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
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
