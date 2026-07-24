import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { VocabularyWord, CEFRLevel, StudySession, UserProfile, AppSettings, FilterLevel, SortOption, Achievement } from '@/types/vocabulary';

function makeStorageKeys(prefix?: string) {
  const p = prefix || 'lexicon';
  return {
    words: `${p}_words`,
    sessions: `${p}_sessions`,
    profile: `${p}_profile`,
    settings: `${p}_settings`,
    achievements: `${p}_achievements`,
  };
}

const DEFAULT_PROFILE: UserProfile = {
  username: 'Learner',
  email: '',
  cefrLevel: 'A2',
  dailyGoal: 10,
  joinDate: new Date().toISOString(),
  currentStreak: 0,
  longestStreak: 0,
};

const DEFAULT_SETTINGS: AppSettings = {
  showTranslations: true,
  autoPlayPronunciation: false,
  shuffleCards: true,
  showHints: true,
  theme: 'light',
  fontSize: 'medium',
};

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_word', name: 'First Word', description: 'Add your first word', icon: 'badge-first-word', isUnlocked: true, unlockedDate: new Date().toISOString(), condition: 'word_count', threshold: 1 },
  { id: 'word_collector_10', name: 'Word Collector', description: 'Add 10 words', icon: 'badge-word-collector', isUnlocked: true, unlockedDate: new Date().toISOString(), condition: 'word_count', threshold: 10 },
  { id: 'word_collector_50', name: 'Vocabulary Builder', description: 'Add 50 words', icon: 'badge-vocab-builder', isUnlocked: false, condition: 'word_count', threshold: 50 },
  { id: 'word_collector_100', name: 'Word Master', description: 'Add 100 words', icon: 'badge-master-100', isUnlocked: false, condition: 'word_count', threshold: 100 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Study 7 days in a row', icon: 'badge-streak-7', isUnlocked: false, condition: 'streak', threshold: 7 },
  { id: 'streak_30', name: 'Month Master', description: 'Study 30 days in a row', icon: 'badge-streak-30', isUnlocked: false, condition: 'streak', threshold: 30 },
  { id: 'master_50', name: 'Half Century', description: 'Master 50 words', icon: 'badge-half-century', isUnlocked: false, condition: 'master', threshold: 50 },
  { id: 'quiz_perfect', name: 'Perfect Score', description: 'Get 100% on a quiz', icon: 'badge-quiz-perfect', isUnlocked: false, condition: 'quiz', threshold: 100 },
  { id: 'review_100', name: 'Reviewer', description: 'Review 100 words', icon: 'badge-reviewer', isUnlocked: false, condition: 'review', threshold: 100 },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Defensive sanitizer for any array of "word-like" objects — the bundled
 * vocabulary JSON, or anything a learner typed in via Add Word. Every place
 * in the app that does `words.map(w => w.word)` (Quiz, Flashcards, Matching,
 * Dashboard, WordList, …) would otherwise throw the instant it hits a
 * null/undefined/word-less entry, crashing the whole render tree. Filtering
 * once, right where data enters app state, makes every downstream `.word`
 * access safe.
 */
function coerceWord(w: any): VocabularyWord {
  return {
    ...w,
    word: String(w.word),
    definition: typeof w.definition === 'string' ? w.definition : '',
    exampleSentence: typeof w.exampleSentence === 'string' ? w.exampleSentence : '',
    partOfSpeech: w.partOfSpeech || 'noun',
    cefrLevel: w.cefrLevel || 'B1',
    difficulty: w.difficulty || 'medium',
    studyCount: typeof w.studyCount === 'number' ? w.studyCount : 0,
    correctCount: typeof w.correctCount === 'number' ? w.correctCount : 0,
    isStarred: !!w.isStarred,
    isLearned: !!w.isLearned,
    dateAdded: typeof w.dateAdded === 'string' ? w.dateAdded : new Date().toISOString(),
  };
}

function sanitizeWords(arr: unknown): VocabularyWord[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (w): w is Record<string, unknown> =>
        !!w && typeof w === 'object' && typeof (w as any).word === 'string' && (w as any).word.trim() !== ''
    )
    .map(coerceWord);
}

function saveToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage:`, error);
    return false;
  }
}

export function useVocabulary(dataKeyPrefix?: string) {
  const KEYS = useMemo(() => makeStorageKeys(dataKeyPrefix), [dataKeyPrefix]);

  // ── Storage architecture ─────────────────────────────────────────────────
  // Two small, local-only layers — nothing ever leaves this browser and
  // nothing is fetched from a network service:
  //
  //   • baseWords    — the full 9,000+ word ESL curriculum, shipped as
  //                     src/data/defaultVocabulary.json directly inside the
  //                     app's code. Loaded straight into memory on mount
  //                     (its own separate JS chunk, fetched only after first
  //                     paint so it never blocks initial render). It is
  //                     NEVER written to storage and NEVER mutated — every
  //                     word from the file stays exactly as shipped,
  //                     duplicates included. The JSON itself has no id
  //                     field, so each entry is assigned a stable id from
  //                     its position in the file (`base-<index>`) — this
  //                     stays the same across reloads of the same app
  //                     build, which is what lets this learner's own
  //                     per-word progress (baseProgress, below) reliably
  //                     line up with the same word every time.
  //   • manualWords  — words THIS learner typed in themselves via Add Word.
  //                     Small, persisted per-account in localStorage
  //                     (KEYS.words).
  //   • baseProgress — per-learner study progress (star/learned/study
  //                    count/etc, plus a `hidden` flag for "remove from my
  //                    list") layered on top of baseWords, keyed by word id.
  //                    Persisted per-account in localStorage. Only ever
  //                    holds entries for words this learner has actually
  //                    studied, starred, edited, or hidden — a small
  //                    fraction of the full curriculum — so it stays tiny.
  //
  // The `words` array this hook returns is the combined, in-memory view
  // every page in the app reads.
  const [manualWords, setManualWords] = useState<VocabularyWord[]>(() =>
    sanitizeWords(loadFromStorage<VocabularyWord[]>(KEYS.words, []))
  );

  const [baseWords, setBaseWords] = useState<VocabularyWord[]>([]);
  const [baseLoaded, setBaseLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import('@/data/defaultVocabulary.json').then((mod) => {
      if (cancelled) return;
      const raw = (mod as { default?: unknown }).default ?? mod;
      if (Array.isArray(raw)) {
        const withIds = raw.map((w: any, i: number) => ({ ...w, id: `base-${i}` }));
        setBaseWords(sanitizeWords(withIds));
      }
      setBaseLoaded(true);
    }).catch(() => {
      // Base curriculum chunk failed to load — non-fatal, app still works
      // with any manually-added words.
      setBaseLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const [baseProgress, setBaseProgress] = useState<Record<string, Partial<VocabularyWord> & { hidden?: boolean }>>(() =>
    loadFromStorage<Record<string, Partial<VocabularyWord> & { hidden?: boolean }>>(KEYS.words + '_progress', {})
  );

  const [sessions, setSessions] = useState<StudySession[]>(() =>
    loadFromStorage(KEYS.sessions, [])
  );
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadFromStorage(KEYS.profile, DEFAULT_PROFILE)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage(KEYS.settings, DEFAULT_SETTINGS)
  );
  const [achievements] = useState<Achievement[]>(() =>
    loadFromStorage(KEYS.achievements, ACHIEVEMENTS)
  );

  // The combined view every page in the app actually reads. This learner's
  // personal progress (star/learned/study count) is laid on top of the base
  // curriculum, and anything they chose to remove from their own view is
  // filtered out here without touching the underlying JSON.
  const words = useMemo(() => {
    const applyOverlay = (list: VocabularyWord[]) => list
      .filter(w => !baseProgress[w.id]?.hidden)
      .map(w => {
        const p = baseProgress[w.id];
        if (!p) return w;
        const { hidden: _hidden, ...progressFields } = p;
        return { ...w, ...progressFields };
      });
    return [...manualWords, ...applyOverlay(baseWords)];
  }, [manualWords, baseWords, baseProgress]);

  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const clearStorageWarning = useCallback(() => setStorageWarning(null), []);

  useEffect(() => {
    const ok = saveToStorage(KEYS.words, manualWords);
    if (!ok) {
      setStorageWarning(
        `Couldn't save your ${manualWords.length.toLocaleString()} word(s) — your browser's storage is full. ` +
        `Try removing a few of your own added words.`
      );
    }
  }, [manualWords, KEYS.words]);
  useEffect(() => { saveToStorage(KEYS.words + '_progress', baseProgress); }, [baseProgress, KEYS.words]);
  useEffect(() => { saveToStorage(KEYS.sessions, sessions); }, [sessions, KEYS.sessions]);
  useEffect(() => { saveToStorage(KEYS.profile, profile); }, [profile, KEYS.profile]);
  useEffect(() => { saveToStorage(KEYS.settings, settings); }, [settings, KEYS.settings]);
  useEffect(() => { saveToStorage(KEYS.achievements, achievements); }, [achievements, KEYS.achievements]);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
      const isLightBlue = settings.theme === 'light-blue';
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light-blue', isLightBlue);
    };
    applyTheme();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (settings.theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [settings.theme]);

  // Apply font size to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    root.classList.add(`text-size-${settings.fontSize}`);
    const sizes: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
    root.style.fontSize = sizes[settings.fontSize] || '16px';
  }, [settings.fontSize]);

  const addWord = useCallback((wordData: Omit<VocabularyWord, 'id' | 'dateAdded' | 'studyCount' | 'correctCount' | 'isLearned' | 'difficulty'>) => {
    const newWord: VocabularyWord = {
      ...wordData,
      id: uuidv4(),
      dateAdded: new Date().toISOString(),
      studyCount: 0,
      correctCount: 0,
      isLearned: false,
      difficulty: 'medium',
    };
    setManualWords(prev => [newWord, ...prev]);
    return newWord;
  }, []);

  const updateWord = useCallback((id: string, updates: Partial<VocabularyWord>) => {
    if (manualWords.some(w => w.id === id)) {
      setManualWords(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
      return;
    }
    // A base-curriculum word: personal edits/progress for this learner live
    // in the local overlay only (the bundled JSON itself is never mutated).
    setBaseProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  }, [manualWords]);

  const deleteWord = useCallback((id: string) => {
    if (manualWords.some(w => w.id === id)) {
      setManualWords(prev => prev.filter(w => w.id !== id));
      return;
    }
    // Hide this base-curriculum word from this learner's own list only —
    // the shared 9,000+ word bank stays intact for everyone else.
    setBaseProgress(prev => ({ ...prev, [id]: { ...prev[id], hidden: true } }));
  }, [manualWords]);

  const toggleStar = useCallback((id: string) => {
    if (manualWords.some(w => w.id === id)) {
      setManualWords(prev => prev.map(w => w.id === id ? { ...w, isStarred: !w.isStarred } : w));
    } else {
      const current = baseProgress[id]?.isStarred ?? baseWords.find(w => w.id === id)?.isStarred ?? false;
      setBaseProgress(prev => ({ ...prev, [id]: { ...prev[id], isStarred: !current } }));
    }
  }, [manualWords, baseProgress, baseWords]);

  const addSession = useCallback((session: Omit<StudySession, 'id'>) => {
    const newSession: StudySession = {
      ...session,
      id: uuidv4(),
    };
    setSessions(prev => [newSession, ...prev]);

    // Update streak
    const today = new Date().toDateString();
    const lastStudy = profile.lastStudyDate ? new Date(profile.lastStudyDate).toDateString() : null;

    if (lastStudy !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastStudy === yesterday.toDateString()) {
        const newStreak = profile.currentStreak + 1;
        setProfile(prev => ({
          ...prev,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, prev.longestStreak),
          lastStudyDate: new Date().toISOString(),
        }));
      } else {
        setProfile(prev => ({
          ...prev,
          currentStreak: 1,
          lastStudyDate: new Date().toISOString(),
        }));
      }
    }

    return newSession;
  }, [profile]);

  // Search by word text, definition, example sentence, synonyms, or
  // translations; filter by CEFR level and/or category — all combinable.
  const getFilteredWords = useCallback((filter: FilterLevel, sort: SortOption, searchQuery: string, category?: string) => {
    let filtered = [...words];

    if (filter !== 'all') {
      filtered = filtered.filter(w => w.cefrLevel === filter);
    }

    if (category) {
      filtered = filtered.filter(w => w.category === category);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.word.toLowerCase().includes(q) ||
        (w.definition && w.definition.toLowerCase().includes(q)) ||
        (w.exampleSentence && w.exampleSentence.toLowerCase().includes(q)) ||
        (w.synonym && w.synonym.toLowerCase().includes(q)) ||
        (w.laoTranslation && w.laoTranslation.toLowerCase().includes(q)) ||
        (w.thaiTranslation && w.thaiTranslation.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case 'alphabetical':
        filtered.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'level':
        const levelOrder: Record<CEFRLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
        filtered.sort((a, b) => levelOrder[a.cefrLevel] - levelOrder[b.cefrLevel]);
        break;
      case 'studied':
        filtered.sort((a, b) => b.studyCount - a.studyCount);
        break;
      default:
        filtered.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    }

    return filtered;
  }, [words]);

  const getWordsDueForReview = useCallback(() => {
    return words.filter(w => {
      if (w.isLearned) return false;
      if (!w.nextReviewDate) return w.studyCount > 0;
      return new Date(w.nextReviewDate) <= new Date();
    });
  }, [words]);

  const getStarredWords = useCallback(() => {
    return words.filter(w => w.isStarred);
  }, [words]);

  const getLearnedWords = useCallback(() => {
    return words.filter(w => w.isLearned);
  }, [words]);

  const getCategories = useCallback(() => {
    const cats = new Set<string>();
    words.forEach(w => { if (w.category) cats.add(w.category); });
    return Array.from(cats).sort();
  }, [words]);

  const getStats = useCallback(() => {
    const totalWords = words.length;
    const learnedWords = words.filter(w => w.isLearned).length;
    const starredWords = words.filter(w => w.isStarred).length;
    const reviewDue = getWordsDueForReview().length;
    const totalSessions = sessions.length;
    const totalStudyTime = sessions.reduce((acc, s) => acc + s.duration, 0);

    const levelDistribution = words.reduce((acc, w) => {
      acc[w.cefrLevel] = (acc[w.cefrLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toDateString();
      const count = sessions.filter(s => new Date(s.date).toDateString() === dateStr).length;
      return { day: date.toLocaleDateString('en', { weekday: 'short' }), count };
    });

    return {
      totalWords,
      learnedWords,
      starredWords,
      reviewDue,
      totalSessions,
      totalStudyTime,
      levelDistribution,
      weeklyActivity,
      currentStreak: profile.currentStreak,
    };
  }, [words, sessions, profile, getWordsDueForReview]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Admin "reset" actions — everything is local to this device/account, so
  // there's nothing to reconcile with a server; these just clear storage
  // directly.
  const resetMyWords = useCallback(() => {
    const removedCount = manualWords.length;
    setManualWords([]);
    return { removed: removedCount };
  }, [manualWords]);

  const resetProgress = useCallback(() => {
    setManualWords(prev => prev.map(w => ({
      ...w,
      studyCount: 0,
      correctCount: 0,
      isLearned: false,
      difficulty: 'medium' as const,
      nextReviewDate: undefined,
    })));
    setBaseProgress({});
    setSessions([]);
    setProfile(prev => ({ ...prev, currentStreak: 0, longestStreak: 0 }));
  }, []);

  return {
    words,
    sessions,
    profile,
    settings,
    achievements,
    // Size of the bundled, storage-free base curriculum (9,000+ words
    // shipped directly in the app's code).
    baseWordCount: baseWords.length,
    // True once the base curriculum has finished loading (or failed to) —
    // lets callers tell "still loading" apart from "genuinely empty".
    baseLoaded,
    addWord,
    updateWord,
    deleteWord,
    toggleStar,
    addSession,
    getFilteredWords,
    getWordsDueForReview,
    getStarredWords,
    getLearnedWords,
    getCategories,
    getStats,
    updateProfile,
    updateSettings,
    resetMyWords,
    resetProgress,
    storageWarning,
    clearStorageWarning,
  };
}
