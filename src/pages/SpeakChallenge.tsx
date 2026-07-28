/**
 * Speak Challenge — pronunciation practice across every CEFR level.
 *
 * Scope: A1–C2, sliceable by level and by category/group, always shuffled.
 * Levels lock/unlock using the same shared rule as every other study mode
 * (see src/lib/levelLock.ts) — A1 is always open, each next level unlocks
 * once the previous one hits UNLOCK_PCT mastery (or the user's pretest
 * placed them higher). This keeps progression consistent across Flashcards,
 * Quiz, Matching, Spelling and Speak Challenge: unlock it once, it's
 * unlocked everywhere.
 *
 * Per word: CEFR + part-of-speech badges, the word itself, native TTS
 * playback ("Listen"), a guided "Shadow" mode (plays the word, then
 * automatically arms the mic so the learner repeats it right after
 * hearing it), manual record/stop, and file upload — then lets the
 * learner play back their own attempt to self-compare. No AI scoring;
 * this is deliberately just listen → repeat → compare.
 *
 * Colors: every surface uses the app's theme CSS variables (bg-background,
 * bg-card, text-foreground, bg-primary, etc.) instead of hardcoded hex, so
 * the page automatically matches whichever theme is active (Light, Dark,
 * or Ocean/light-blue) — same as the rest of the app.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Upload, Volume2, ChevronLeft, ChevronRight,
  Repeat2, Trash2, AlertCircle, PartyPopper, RefreshCw, ArrowLeft,
  Tags, Layers, Lock, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { useSpeech } from '@/hooks/useSpeech';
import type { VocabularyWord, CEFRLevel } from '@/types/vocabulary';
import { CEFR_ORDER, UNLOCK_PCT, isLevelUnlocked, getMasteryPct, getPretestLevel } from '@/lib/levelLock';

// Speak Challenge now covers the full CEFR ladder, A1 through C2.
const CHALLENGE_LEVELS: CEFRLevel[] = CEFR_ORDER;

// Accent colors for badges — purely informational color-coding, layered on
// top of the theme's own card/muted surfaces so they read correctly in
// Light, Dark, and Ocean modes alike.
const POS_BADGE: Record<string, string> = {
  noun: '#22C55E', verb: '#F59E0B', adjective: '#8B5CF6', adverb: '#EC4899',
  pronoun: '#F472B6', preposition: '#94A3B8', conjunction: '#2DD4BF',
  interjection: '#F87171', phrase: '#818CF8',
};

const CEFR_BADGE: Record<string, string> = {
  A1: '#34D399', A2: '#4ADE80', B1: '#FBBF24', B2: '#FB923C', C1: '#F97316', C2: '#EF4444',
};

type RecordState = 'idle' | 'requesting' | 'recording';

export function SpeakChallenge() {
  const { vocabulary, addToast } = useApp();
  const { speak } = useSpeech();
  const navigate = useNavigate();
  const pretestLevel = getPretestLevel();

  const [showSetup, setShowSetup] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<'all' | CEFRLevel>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [queue, setQueue] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [practicedCount, setPracticedCount] = useState(0);
  const practicedRef = useRef<Set<string>>(new Set());

  // Which levels the learner has actually unlocked right now (A1 always,
  // then each next level once the previous one reaches UNLOCK_PCT mastery).
  const unlockedLevels = useMemo(
    () => CHALLENGE_LEVELS.filter(l => isLevelUnlocked(vocabulary.words, l, pretestLevel)),
    [vocabulary.words, pretestLevel]
  );

  // "All" only ever pools words from levels the learner has actually
  // unlocked — otherwise the level lock would be cosmetic and a locked
  // level's words could still sneak into a mixed "All" session.
  const basePool = useMemo(
    () => vocabulary.words.filter(w => unlockedLevels.includes(w.cefrLevel)),
    [vocabulary.words, unlockedLevels]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    basePool.forEach(w => { if (w.category) set.add(w.category); });
    return Array.from(set).sort();
  }, [basePool]);

  const pool = useMemo(() => basePool.filter(w =>
    (selectedLevel === 'all' || w.cefrLevel === selectedLevel) &&
    (selectedCategory === 'all' || w.category === selectedCategory)
  ), [basePool, selectedLevel, selectedCategory]);

  // If the currently-selected level gets locked out from under us (e.g.
  // switching accounts / a pretest change), fall back to "All" instead of
  // silently showing an empty pool.
  useEffect(() => {
    if (selectedLevel !== 'all' && !unlockedLevels.includes(selectedLevel)) {
      setSelectedLevel('all');
    }
  }, [selectedLevel, unlockedLevels]);

  const startChallenge = () => {
    if (pool.length === 0) { addToast('No words found for this level/group.', 'info'); return; }
    const list = [...pool];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    practicedRef.current = new Set();
    setQueue(list);
    setCurrentIndex(0);
    setSessionComplete(false);
    setPracticedCount(0);
    setSessionStartTime(Date.now());
    setShowSetup(false);
  };

  const finishChallenge = useCallback(() => {
    shadowTokenRef.current += 1;
    recordingTokenRef.current += 1;
    hardStopRecording();
    window.speechSynthesis?.cancel();
    const duration = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 1000));
    vocabulary.addSession({
      date: new Date().toISOString(),
      mode: 'speaking',
      wordsStudied: queue.length,
      correctAnswers: practicedRef.current.size,
      totalQuestions: queue.length,
      duration,
      cefrLevel: selectedLevel === 'all' ? 'A2' : selectedLevel,
    });
    setSessionComplete(true);
    // hardStopRecording/shadowTokenRef/recordingTokenRef are declared further down but
    // are stable refs/callbacks — safe to close over since this is only invoked post-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, sessionStartTime, vocabulary, selectedLevel]);

  const goToCard = useCallback((delta: number) => {
    const next = currentIndex + delta;
    if (next < 0) return;
    if (next >= queue.length) { finishChallenge(); return; }
    setCurrentIndex(next);
  }, [currentIndex, queue.length, finishChallenge]);

  // ── Recording ──────────────────────────────────────────────────────────
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [micError, setMicError] = useState('');

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Why the mic used to "start itself" ───────────────────────────────
  // Shadow mode wires SpeechSynthesisUtterance.onend → startRecording().
  // Problem: calling speechSynthesis.cancel() (which we do on every word
  // change, on unmount, and which the shared useSpeech "Listen" button
  // also does internally) fires that SAME onend/onerror callback for
  // whatever utterance was still pending — not just a real "finished
  // speaking" event. So navigating to the next word, or just clicking
  // "Listen" while a Shadow utterance was queued, could silently arm the
  // mic on its own.
  //
  // Fix: every Shadow call gets a unique token. The onend/onerror
  // handlers only start recording if their token is still the "current"
  // one. Anything that should invalidate a pending Shadow (new word,
  // unmount, Listen, Shadow pressed again, manual stop) bumps the token
  // first, so a stray cancel-triggered callback becomes a harmless no-op.
  const shadowTokenRef = useRef(0);
  const invalidateShadow = useCallback(() => { shadowTokenRef.current += 1; }, []);

  // Separate token guarding the MediaRecorder's own async callbacks
  // (ondataavailable/onstop), so a recorder left over from a word the
  // learner already navigated away from can't apply its stale audio to
  // whatever card is on screen now.
  const recordingTokenRef = useRef(0);
  const startingRef = useRef(false); // guards against double-start races (rapid taps before getUserMedia resolves)

  const resetAudio = useCallback(() => {
    setAudioUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setRecordedSeconds(0);
    setFileName(null);
    setMicError('');
  }, []);

  const hardStopRecording = useCallback(() => {
    recordingTokenRef.current += 1; // any in-flight recorder's callbacks become stale
    startingRef.current = false;
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      try { mediaRef.current.stop(); } catch { /* already stopped */ }
    }
    mediaRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // New word → clear any recording from the previous word, stop anything
  // still playing/recording so it can't bleed into the next card.
  useEffect(() => {
    invalidateShadow();
    hardStopRecording();
    resetAudio();
    setRecordState('idle');
    window.speechSynthesis?.cancel();
  }, [currentIndex, invalidateShadow, hardStopRecording, resetAudio]);

  // Stop everything on unmount (leaving the page mid-recording shouldn't
  // leave the mic hot in the background).
  useEffect(() => () => {
    invalidateShadow();
    hardStopRecording();
    window.speechSynthesis?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markPracticed = useCallback((word: VocabularyWord) => {
    if (!practicedRef.current.has(word.id)) {
      practicedRef.current.add(word.id);
      setPracticedCount(practicedRef.current.size);
    }
    vocabulary.updateWord(word.id, {
      studyCount: word.studyCount + 1,
      lastStudied: new Date().toISOString(),
    });
  }, [vocabulary]);

  // Codecs tried in order of preference; falls back to the browser's
  // default (undefined mimeType) when none of these are supported —
  // Safari/iOS in particular doesn't support audio/webm at all, which
  // previously threw and was mis-reported as "permission denied".
  const pickMimeType = (): string | undefined => {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];
    return candidates.find(t => MediaRecorder.isTypeSupported(t));
  };

  const startRecording = useCallback(async (word: VocabularyWord) => {
    if (startingRef.current || recordState === 'recording') return; // ignore double-taps / overlapping triggers
    startingRef.current = true;
    invalidateShadow(); // a manual/real recording start supersedes any pending Shadow auto-start
    setMicError('');
    resetAudio();
    setRecordState('requesting');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicError('Recording isn’t supported in this browser. Try uploading an audio file instead.');
      setRecordState('idle');
      startingRef.current = false;
      return;
    }

    const token = ++recordingTokenRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // If the learner navigated away / stopped while permission was pending, discard this stream.
      if (token !== recordingTokenRef.current) {
        stream.getTracks().forEach(t => t.stop());
        startingRef.current = false;
        return;
      }
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const usedMimeType = recorder.mimeType || mimeType || 'audio/webm';
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (token !== recordingTokenRef.current) return; // stale recorder from a previous word — drop it
        const blob = new Blob(chunksRef.current, { type: usedMimeType });
        setAudioUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        streamRef.current = null;
        if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
        markPracticed(word);
        setRecordState('idle');
      };
      recorder.onerror = () => {
        if (token !== recordingTokenRef.current) return;
        setMicError('Recording stopped unexpectedly. Please try again.');
        setRecordState('idle');
      };
      recorder.start(250);
      mediaRef.current = recorder;
      startingRef.current = false;
      setRecordState('recording');
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 250);
    } catch (err) {
      startingRef.current = false;
      if (token !== recordingTokenRef.current) return;
      const name = err instanceof Error ? err.name : '';
      const message =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Microphone access denied. Allow microphone access in your browser settings, or upload an audio file instead.'
          : name === 'NotFoundError' || name === 'DevicesNotFoundError'
          ? 'No microphone found on this device. Try uploading an audio file instead.'
          : name === 'NotReadableError'
          ? 'Your microphone is busy or unavailable right now (another app may be using it).'
          : 'Couldn’t start recording. Please try again, or upload an audio file instead.';
      setMicError(message);
      setRecordState('idle');
    }
  }, [invalidateShadow, resetAudio, markPracticed, recordState]);

  const stopRecording = useCallback(() => {
    invalidateShadow();
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop(); // onstop handles cleanup + setRecordState('idle')
    } else {
      setRecordState('idle');
    }
  }, [invalidateShadow]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, word: VocabularyWord) => {
    const file = e.target.files?.[0];
    if (!file) return;
    invalidateShadow();
    resetAudio();
    setAudioUrl(URL.createObjectURL(file));
    setFileName(file.name);
    const probe = new Audio(URL.createObjectURL(file));
    probe.onloadedmetadata = () => setRecordedSeconds(Math.round(probe.duration || 0));
    markPracticed(word);
    e.target.value = '';
  };

  // "Shadow": play the native pronunciation, then automatically start
  // recording the instant it finishes so the learner repeats it right
  // away. Uses the Web Speech API directly (rather than the shared
  // useSpeech hook) so we get a reliable onend callback to chain the
  // recording start to — no guessing at timing. Token-guarded (see notes
  // above) so a cancelled/superseded utterance can never trigger it.
  const handleShadow = (word: VocabularyWord) => {
    if (recordState === 'recording' || recordState === 'requesting') return;
    invalidateShadow();
    resetAudio();
    if (!window.speechSynthesis) { startRecording(word); return; }
    const token = ++shadowTokenRef.current;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.onend = () => { if (shadowTokenRef.current === token) startRecording(word); };
    utterance.onerror = () => { if (shadowTokenRef.current === token) startRecording(word); };
    window.speechSynthesis.speak(utterance);
  };

  // Wraps the plain "Listen" button: invalidates any pending Shadow token
  // first so speak()'s internal speechSynthesis.cancel() can't trigger an
  // unrelated auto-record.
  const handleListen = (text: string) => {
    invalidateShadow();
    speak(text);
  };

  // ── Setup screen ───────────────────────────────────────────────────────
  if (showSetup) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Mic className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Speak Challenge</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pool.length} words ready · A1–C2 pronunciation practice
            </p>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Layers className="h-3.5 w-3.5" /> Level
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {(['all', ...CHALLENGE_LEVELS] as const).map(level => {
                const locked = level !== 'all' && !unlockedLevels.includes(level);
                const mastery = level !== 'all' ? getMasteryPct(vocabulary.words, level as CEFRLevel) : null;
                return (
                  <button
                    key={level}
                    onClick={() => {
                      if (locked) { addToast(`Reach ${UNLOCK_PCT}% mastery on the previous level to unlock ${level}.`, 'info'); return; }
                      setSelectedLevel(level);
                    }}
                    aria-disabled={locked}
                    className={`relative rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                      selectedLevel === level
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : locked
                        ? 'bg-muted/60 text-muted-foreground/50 cursor-not-allowed'
                        : 'bg-card border border-border text-muted-foreground hover:bg-muted/50'
                    }`}>
                    {locked && <Lock className="absolute top-1.5 right-1.5 h-2.5 w-2.5 text-muted-foreground/60" />}
                    <div>{level === 'all' ? 'All' : level}</div>
                    {mastery !== null && !locked && mastery > 0 && (
                      <div className={`text-[9px] mt-0.5 ${selectedLevel === level ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {mastery}%
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              🔒 Complete each level to {UNLOCK_PCT}% mastery to unlock the next — step by step from A1 up to C2.
            </p>
          </div>

          <div className="relative">
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Tags className="h-3.5 w-3.5" /> Group
            </label>
            <button onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="flex items-center gap-3 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
              <span className="flex-1 text-left truncate">{selectedCategory === 'all' ? 'All Groups' : selectedCategory}</span>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${showCategoryPicker ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence>
              {showCategoryPicker && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full mt-1 w-full z-30 max-h-64 overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
                  <button onClick={() => { setSelectedCategory('all'); setShowCategoryPicker(false); }}
                    className={`block w-full px-4 py-2.5 text-sm text-left transition-colors ${selectedCategory === 'all' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/40 text-foreground'}`}>
                    All Groups
                  </button>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setShowCategoryPicker(false); }}
                      className={`block w-full px-4 py-2.5 text-sm text-left transition-colors ${selectedCategory === cat ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/40 text-foreground'}`}>
                      {cat}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={startChallenge}
            className="w-full rounded-[10px] py-3 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Start Speak Challenge
          </button>

          <button onClick={() => navigate(-1)}
            className="w-full rounded-[10px] border border-border bg-card py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
            ← Back
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Complete screen ────────────────────────────────────────────────────
  if (sessionComplete) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <PartyPopper className="h-14 w-14 mx-auto text-primary" strokeWidth={1.5} />
          <h2 className="text-3xl font-bold text-foreground">Challenge Complete!</h2>
          <div className="flex justify-center gap-10">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{practicedCount}</div>
              <div className="text-sm text-muted-foreground mt-1">Words Spoken</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-muted-foreground">{queue.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Words</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowSetup(true)}
              className="rounded-[10px] border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
              New Challenge
            </button>
            <button onClick={startChallenge}
              className="flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> Challenge Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Challenge card ──────────────────────────────────────────────────────
  const word = queue[currentIndex];
  if (!word) return null;
  const isLast = currentIndex === queue.length - 1;
  const posColor = POS_BADGE[word.partOfSpeech] ?? '#818CF8';
  const cefrColor = CEFR_BADGE[word.cefrLevel] ?? '#818CF8';

  return (
    <div className="-mx-4 -my-6 md:-mx-8 md:-my-8 px-4 py-6 md:px-8 md:py-8 min-h-[calc(100vh-1px)] bg-background">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => { invalidateShadow(); hardStopRecording(); window.speechSynthesis?.cancel(); setShowSetup(true); }}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Exit
          </button>
          <span className="text-xs font-medium text-muted-foreground">{currentIndex + 1} / {queue.length}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full rounded-full bg-primary"
            initial={{ width: 0 }} animate={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={word.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} className="space-y-5">

            {/* Badges + word */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide bg-muted"
                  style={{ color: posColor }}>
                  {word.partOfSpeech}
                </span>
                <span className="rounded-lg px-3 py-1.5 text-xs font-bold bg-muted"
                  style={{ color: cefrColor }}>
                  {word.cefrLevel}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight break-words">{word.word}</h1>
              {word.pronunciation && (
                <p className="mt-1.5 text-base font-medium text-muted-foreground">{word.pronunciation}</p>
              )}
            </div>

            {/* Listen */}
            <button onClick={() => handleListen(word.word)}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]">
              <Volume2 className="h-5 w-5" strokeWidth={2} /> Listen Native Audio
            </button>

            <div className="h-px bg-border" />

            {/* Definition */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Definition</p>
              <p className="text-lg text-foreground">{word.definition}</p>
            </div>

            {/* Translations */}
            {(word.laoTranslation || word.thaiTranslation) && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-1.5">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  🌐 Translations
                </p>
                {word.laoTranslation && (
                  <p className="text-base font-medium text-foreground">🇱🇦 Lao: {word.laoTranslation}</p>
                )}
                {word.thaiTranslation && (
                  <p className="text-base font-medium text-foreground">🇹🇭 Thai: {word.thaiTranslation}</p>
                )}
              </div>
            )}

            {/* Example */}
            {word.exampleSentence && (
              <div className="rounded-2xl p-5 bg-primary/[0.06] border border-primary/20">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2 text-primary/80">Example Sentence</p>
                <p className="text-base italic text-foreground/85">&ldquo;{word.exampleSentence}&rdquo;</p>
              </div>
            )}

            <div className="h-px bg-border" />

            {/* Shadow + mic */}
            <div className="flex flex-col items-center gap-3 pt-1">
              <button onClick={() => handleShadow(word)} disabled={recordState !== 'idle'}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground border border-border hover:bg-muted/50 transition-colors disabled:opacity-40">
                <Repeat2 className="h-3.5 w-3.5" /> Shadow Practice (listen, then repeat)
              </button>

              <button
                onClick={() => {
                  if (recordState === 'recording') stopRecording();
                  else if (recordState === 'idle') startRecording(word);
                  // 'requesting': ignore taps until the permission prompt resolves
                }}
                disabled={recordState === 'requesting'}
                className={`relative flex h-28 w-28 items-center justify-center rounded-full transition-transform active:scale-95 disabled:cursor-wait ${
                  recordState === 'recording' ? 'bg-destructive shadow-[0_0_0_12px_hsl(var(--destructive)/0.15)]' : 'bg-primary shadow-[0_0_0_12px_hsl(var(--primary)/0.15)]'
                }`}>
                {recordState === 'recording'
                  ? <Square className="h-9 w-9 text-white" fill="white" strokeWidth={0} />
                  : recordState === 'requesting'
                  ? <Loader2 className="h-9 w-9 text-primary-foreground animate-spin" strokeWidth={1.5} />
                  : <Mic className="h-10 w-10 text-primary-foreground" strokeWidth={1.5} />}
                {recordState === 'recording' && (
                  <motion.span className="absolute inset-0 rounded-full border-2 border-destructive"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.4, repeat: Infinity }} />
                )}
              </button>

              <p className="text-sm font-medium text-muted-foreground">
                {recordState === 'recording'
                  ? `Recording… ${recordedSeconds}s (tap to stop)`
                  : recordState === 'requesting'
                  ? 'Requesting microphone access…'
                  : 'Click Microphone & Speak Word Out Loud'}
              </p>

              {!audioUrl && recordState === 'idle' && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Upload Audio File
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
                onChange={e => handleFileUpload(e, word)} />

              {micError && (
                <div className="flex items-start gap-2 rounded-xl px-4 py-3 w-full bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-destructive">{micError}</span>
                </div>
              )}

              {audioUrl && (
                <div className="w-full space-y-2 rounded-xl p-3 bg-card border border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex-1 truncate">{fileName || 'Your recording'}</span>
                    <span>{recordedSeconds}s</span>
                    <button onClick={resetAudio} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <audio controls src={audioUrl} className="w-full h-9" />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => goToCard(-1)} disabled={currentIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-muted-foreground border border-border hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button onClick={() => goToCard(1)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            {isLast ? 'Finish' : 'Next Word'} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
