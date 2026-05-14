import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty, TestType } from '@/types';

interface InterviewState {
  userId: number;
  sessionId: number | null;
  track: 'GENERAL' | 'DOMAIN' | null;
  domainId: number | null;
  domainName: string | null;
  testType: TestType | null;
  difficulty: Difficulty | null;
  currentQuestionIndex: number;
  totalQuestions: number;

  setUserId: (id: number) => void;
  setSessionId: (id: number) => void;
  setTrack: (track: 'GENERAL' | 'DOMAIN') => void;
  setDomain: (id: number | null, name: string) => void;
  setTestType: (type: TestType) => void;
  setDifficulty: (diff: Difficulty) => void;
  setCurrentQuestionIndex: (idx: number) => void;
  setTotalQuestions: (n: number) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set) => ({
      userId: 1,
      sessionId: null,
      track: null,
      domainId: null,
      domainName: null,
      testType: null,
      difficulty: null,
      currentQuestionIndex: 0,
      totalQuestions: 10,

      setUserId: (id) => set({ userId: id }),
      setSessionId: (id) => set({ sessionId: id }),
      setTrack: (track) => set({ track }),
      setDomain: (id, name) => set({ domainId: id, domainName: name }),
      setTestType: (type) => set({ testType: type }),
      setDifficulty: (diff) => set({ difficulty: diff }),
      setCurrentQuestionIndex: (idx) => set({ currentQuestionIndex: idx }),
      setTotalQuestions: (n) => set({ totalQuestions: n }),
      reset: () =>
        set({
          sessionId: null,
          track: null,
          domainId: null,
          domainName: null,
          testType: null,
          difficulty: null,
          currentQuestionIndex: 0,
          totalQuestions: 10,
        }),
    }),
    { name: 'veritus-interview' }
  )
);
