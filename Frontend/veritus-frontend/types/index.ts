export interface Domain {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Question {
  id: number;
  text: string;
  format: 'MCQ' | 'DESCRIPTIVE';
  options: string[] | null;
}

export interface QuestionResponse {
  sessionId: number;
  questionIndex: number;
  totalQuestions: number;
  question: Question;
  forceTerminate?: boolean;
}

export interface SubmitAnswerResponse {
  message: string;
  nextQuestionIndex?: number;
  totalQuestions?: number;
  nextQuestion?: Question;
  forceTerminate?: boolean;
}

export interface StartSessionResponse {
  sessionId: number;
  message: string;
}

export interface ResponseItem {
  questionId: number;
  questionText: string;
  questionFormat: 'MCQ' | 'DESCRIPTIVE';
  yourAnswerIndex?: number;
  yourAnswer: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  score: number | null;
  feedback: string | null;
  evaluationStatus: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface SessionResult {
  sessionId: number;
  status: string;
  testType: string;
  difficulty: string;
  totalQuestions: number;
  answered: number;
  unanswered: number;
  pendingEvaluations: number;
  failedEvaluations: number;
  averageScore: number | null;
  totalScore: number;
  totalPossibleScore: number;
  percentage: number;
  startedAt: string;
  endedAt: string | null;
  responses: ResponseItem[];
}

export interface SessionHistory {
  id: number;
  status: string;
  test_type: string;
  difficulty: string;
  started_at: string;
  ended_at: string | null;
  domain: string | null;
}

export type TestType = 'APTITUDE' | 'CORE_CS' | 'CODING_DSA' | 'TECHNICAL' | 'HR';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
