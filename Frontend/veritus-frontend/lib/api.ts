import axios from 'axios';
import type {
  StartSessionResponse,
  QuestionResponse,
  SubmitAnswerResponse,
  SessionResult,
  SessionHistory,
} from '@/types';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const sessionAPI = {
  start: (body: {
    userId: number;
    domainId: number | null;
    testType: string;
    difficulty: string;
  }) => api.post<StartSessionResponse>('/session/start', body),

  getQuestion: (sessionId: number) =>
    api.get<QuestionResponse>(`/session/${sessionId}/question`),

  submitAnswer: (body: {
    sessionId: number;
    questionId: number;
    answer: string;
  }) => api.post<SubmitAnswerResponse>('/session/answer', body),

  getResult: (sessionId: number) =>
    api.get<SessionResult>(`/session/${sessionId}/result`),

  getUserSessions: (userId: number) =>
    api.get<SessionHistory[]>(`/users/${userId}/sessions`),
};
