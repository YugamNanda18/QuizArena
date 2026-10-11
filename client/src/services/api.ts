import { Quiz, Question, Participant, LeaderboardEntry, StudentResultResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('qa_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ success: boolean; token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    me: () => request<{ success: boolean; user: any }>('/auth/me'),
  },

  // Quizzes
  quiz: {
    list: () => request<{ success: boolean; quizzes: Quiz[] }>('/quizzes'),
    get: (id: string) => request<{ success: boolean; quiz: Quiz }>(`/quizzes/${id}`),
    getByRoomCode: (roomCode: string) =>
      request<{ success: boolean; quiz: Quiz }>(`/quizzes/room/${roomCode}`),
    create: (payload: Partial<Quiz>) =>
      request<{ success: boolean; quiz: Quiz }>('/quizzes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Quiz>) =>
      request<{ success: boolean; quiz: Quiz }>(`/quizzes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updateStatus: (id: string, status: string) =>
      request<{ success: boolean; quiz: Quiz }>(`/quizzes/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    duplicate: (id: string) =>
      request<{ success: boolean; quiz: Quiz }>(`/quizzes/${id}/duplicate`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/quizzes/${id}`, {
        method: 'DELETE',
      }),
  },

  // Questions
  question: {
    list: (quizId: string) =>
      request<{ success: boolean; questions: Question[] }>(`/questions/quiz/${quizId}`),
    create: (quizId: string, payload: Partial<Question>) =>
      request<{ success: boolean; question: Question }>(`/questions/quiz/${quizId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (questionId: string, payload: Partial<Question>) =>
      request<{ success: boolean; question: Question }>(`/questions/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    bulkUpdatePoints: (quizId: string, updates: Array<{ questionId: string; points: number }>) =>
      request<{ success: boolean; questions: Question[] }>(`/questions/quiz/${quizId}/bulk-points`, {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      }),
    delete: (questionId: string) =>
      request<{ success: boolean; message: string }>(`/questions/${questionId}`, {
        method: 'DELETE',
      }),
  },

  // Student Registration & Room
  registration: {
    register: (payload: { roomCode?: string; quizId?: string; name: string; email: string; studentId?: string }) =>
      request<{ success: boolean; participant: Participant; quiz: Quiz; reconnected?: boolean }>('/registration', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getStatus: (participantId: string) =>
      request<{ success: boolean; participant: Participant; quiz: Quiz }>(`/registration/participant/${participantId}`),
    listForQuiz: (quizId: string) =>
      request<{ success: boolean; participants: Participant[] }>(`/registration/quiz/${quizId}`),
  },

  // Live Answers
  answer: {
    submit: (payload: { quizId: string; participantId: string; questionId: string; selectedOptionIndex: number }) =>
      request<{
        success: boolean;
        pointsAwarded: number;
        basePoints: number;
        speedBonus: number;
        isCorrect?: boolean;
        currentScore: number;
        currentRank: number;
        isCompleted?: boolean;
        idempotent?: boolean;
      }>('/answers/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getSubmitted: (quizId: string, participantId: string) =>
      request<{ success: boolean; answers: any[] }>(`/answers/quiz/${quizId}/participant/${participantId}`),
  },

  // Leaderboard & Results
  leaderboard: {
    get: (quizId: string) =>
      request<{ success: boolean; leaderboard: LeaderboardEntry[] }>(`/leaderboard/quiz/${quizId}`),
    getResult: (quizId: string, participantId: string) =>
      request<StudentResultResponse>(`/leaderboard/quiz/${quizId}/participant/${participantId}`),
  },

  // Analytics
  analytics: {
    getOverview: () => request<{ success: boolean; stats: any; recentQuizzes: Quiz[] }>('/analytics/overview'),
    getQuiz: (quizId: string) => request<{ success: boolean; analytics: any }>(`/analytics/quiz/${quizId}`),
    getAuditLogs: () => request<{ success: boolean; logs: any[] }>('/analytics/audit-logs'),
  },

  // Downloads & Report URLs
  export: {
    studentPDFUrl: (quizId: string, participantId: string) =>
      `${BASE_URL}/export/quiz/${quizId}/participant/${participantId}/pdf`,
    consolidatedPDFUrl: (quizId: string) =>
      `${BASE_URL}/export/quiz/${quizId}/consolidated/pdf`,
    csvUrl: (quizId: string) =>
      `${BASE_URL}/export/quiz/${quizId}/csv`,
    excelUrl: (quizId: string) =>
      `${BASE_URL}/export/quiz/${quizId}/excel`,
  },
};
