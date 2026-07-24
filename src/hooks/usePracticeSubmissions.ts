import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { PracticeSubmission, AIFeedback, SubmissionMode } from '@/types/practice';
import type { CEFRLevel } from '@/data/speakingTopics';

function storageKey(prefix?: string) {
  const p = prefix || 'lexicon';
  return `${p}_practice_submissions`;
}

function loadSubmissions(prefix?: string): PracticeSubmission[] {
  try {
    const raw = localStorage.getItem(storageKey(prefix));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSubmissions(prefix: string | undefined, subs: PracticeSubmission[]) {
  try {
    localStorage.setItem(storageKey(prefix), JSON.stringify(subs));
  } catch {
    // Storage full or unavailable — fail silently, user keeps using the app
  }
}

export function usePracticeSubmissions(userDataKeyPrefix?: string) {
  const [submissions, setSubmissions] = useState<PracticeSubmission[]>(() => loadSubmissions(userDataKeyPrefix));

  const persist = useCallback((next: PracticeSubmission[]) => {
    setSubmissions(next);
    saveSubmissions(userDataKeyPrefix, next);
  }, [userDataKeyPrefix]);

  /** Create a new submission in "evaluating" state and return its id */
  const startSubmission = useCallback((params: {
    topicId: string;
    topicTitle: string;
    level: CEFRLevel;
    area: string;
    mode: SubmissionMode;
    content: string;
    audioDurationSeconds?: number;
  }): string => {
    const id = uuidv4();
    const newSub: PracticeSubmission = {
      id,
      topicId: params.topicId,
      topicTitle: params.topicTitle,
      level: params.level,
      area: params.area,
      mode: params.mode,
      content: params.content,
      audioDurationSeconds: params.audioDurationSeconds,
      submittedAt: new Date().toISOString(),
      aiFeedback: null,
      status: 'evaluating',
    };
    const current = loadSubmissions(userDataKeyPrefix);
    persist([newSub, ...current]);
    return id;
  }, [persist, userDataKeyPrefix]);

  /** Attach AI feedback once evaluation finishes */
  const completeSubmission = useCallback((id: string, feedback: AIFeedback) => {
    const current = loadSubmissions(userDataKeyPrefix);
    const next = current.map(s => s.id === id ? { ...s, aiFeedback: feedback, status: 'done' as const } : s);
    persist(next);
  }, [persist, userDataKeyPrefix]);

  /** Mark a submission as failed (e.g. AI call failed) */
  const failSubmission = useCallback((id: string) => {
    const current = loadSubmissions(userDataKeyPrefix);
    const next = current.map(s => s.id === id ? { ...s, status: 'failed' as const } : s);
    persist(next);
  }, [persist, userDataKeyPrefix]);

  const deleteSubmission = useCallback((id: string) => {
    const current = loadSubmissions(userDataKeyPrefix);
    persist(current.filter(s => s.id !== id));
  }, [persist, userDataKeyPrefix]);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  // ── Derived stats for Dashboard ──────────────────────────────────────────
  const stats = useMemo(() => {
    const completed = submissions.filter(s => s.status === 'done' && s.aiFeedback);
    const totalAttempts = submissions.length;
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((acc, s) => acc + (s.aiFeedback?.score || 0), 0) / completed.length)
      : 0;
    const writingCount = submissions.filter(s => s.mode === 'writing').length;
    const speakingCount = submissions.filter(s => s.mode === 'speaking').length;
    const topicsAttempted = new Set(submissions.map(s => s.topicId)).size;

    // Best score per level for a quick level-progress view
    const byLevel: Record<CEFRLevel, { count: number; avgScore: number }> = {
      A1: { count: 0, avgScore: 0 }, A2: { count: 0, avgScore: 0 }, B1: { count: 0, avgScore: 0 },
      B2: { count: 0, avgScore: 0 }, C1: { count: 0, avgScore: 0 },
    };
    (['A1', 'A2', 'B1', 'B2', 'C1'] as CEFRLevel[]).forEach(lvl => {
      const lvlSubs = completed.filter(s => s.level === lvl);
      byLevel[lvl] = {
        count: lvlSubs.length,
        avgScore: lvlSubs.length > 0
          ? Math.round(lvlSubs.reduce((acc, s) => acc + (s.aiFeedback?.score || 0), 0) / lvlSubs.length)
          : 0,
      };
    });

    // Last 7 submissions trend (oldest to newest) for a sparkline-style chart
    const recentTrend = [...completed]
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      .slice(-7)
      .map(s => ({ date: s.submittedAt, score: s.aiFeedback?.score || 0 }));

    return { totalAttempts, avgScore, writingCount, speakingCount, topicsAttempted, byLevel, recentTrend };
  }, [submissions]);

  const getSubmissionsForTopic = useCallback((topicId: string) => {
    return submissions.filter(s => s.topicId === topicId).sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [submissions]);

  return {
    submissions,
    stats,
    startSubmission,
    completeSubmission,
    failSubmission,
    deleteSubmission,
    clearAll,
    getSubmissionsForTopic,
  };
}
