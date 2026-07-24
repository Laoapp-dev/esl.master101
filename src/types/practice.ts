import type { CEFRLevel } from '@/data/speakingTopics';

export type SubmissionMode = 'writing' | 'speaking';

export interface AIFeedback {
  score: number; // 0-100 overall score
  grammarScore?: number; // 0-100
  vocabularyScore?: number; // 0-100
  fluencyScore?: number; // 0-100 (speaking) / coherence (writing)
  feedback: string; // short paragraph of feedback
  strengths?: string[];
  improvements?: string[];
}

export interface PracticeSubmission {
  id: string;
  topicId: string;
  topicTitle: string;
  level: CEFRLevel;
  area: string;
  mode: SubmissionMode;
  content: string; // typed text OR transcribed text from audio
  audioDurationSeconds?: number; // only for speaking submissions
  submittedAt: string; // ISO date
  aiFeedback: AIFeedback | null; // null while evaluating or if evaluation failed
  status: 'evaluating' | 'done' | 'failed';
}

export const PRACTICE_SUBMISSIONS_PREFIX = 'practice_submissions';
