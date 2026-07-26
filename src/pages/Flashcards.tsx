import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, ArrowLeft, ArrowRight, Bookmark,
  Tag, BarChart2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useApp } from '@/App';
import { useNavigate } from 'react-router-dom';
import { useSpeech } from '@/hooks/useSpeech';
import type { VocabularyWord, CEFRLevel } from '@/types/vocabulary';
import { getMasteryPct } from '@/lib/levelLock';
import { POS_COLORS, CEFR_STYLE, DiffDots, StarButton } from '@/components/FlashcardVisuals';

// Visual tokens (POS_COLORS, CEFR_STYLE, DIFF_STYLE, DiffDots, StarButton)
// live in src/components/FlashcardVisuals.tsx — imported above — so they
// stay in sync with the Categories study flow as well.

// ── Level mastery helpers now live in src/lib/levelLock.ts (shared with
// Quiz, Matching, and Spelling so the unlock rules stay identical everywhere)

// ── Main ───────────────────────────────────────────────────────────────────────
export function Flashcards() {
  const { vocabulary, addToast } = useApp();
  const { speak } = useSpeech();
  const navigate = useNavigate();

  // Session filter set by Favorites / LevelJourney / Categories pages.
  // NOTE: this used to be parsed as JSON (`JSON.parse(ssFilter)`), but
  // nothing ever wrote JSON here — Favorites.tsx and LevelJourney.tsx both
  // write plain strings ('favorites' / 'level'). The JSON.parse silently
  // threw and was swallowed by an empty catch, so navigating from Favorites
  // into Flashcards quietly showed ALL words instead of just starred ones.
  // Fixed to match the same plain-string convention already used correctly
  // by Quiz, Matching, and Spelling.
  const ssFilter = sessionStorage.getItem('moe_study_filter');
  const ssLevel  = sessionStorage.getItem('moe_study_level') as CEFRLevel | null;
  const ssCategory = sessionStorage.getItem('moe_study_category');

  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [isFlipped, setIsFlipped]         = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats]   = useState({ mastered: 0, review: 0 });
  const [queue, setQueue]                 = useState<VocabularyWord[]>([]);
  const [showSetup, setShowSetup]         = useState(true);
  const [direction, setDirection]         = useState<'left'|'right'|null>(null);
  const [sessionStartTime, setSessionStartTime] = useState(0);

  // The filter set by Favorites / Level Journey / Categories is meant for
  // this one visit only. Clear it on unmount so navigating away and later
  // clicking "Flashcards" directly from the sidebar doesn't silently
  // inherit a stale filter from a completely unrelated earlier session.
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('moe_study_filter');
      sessionStorage.removeItem('moe_study_level');
      sessionStorage.removeItem('moe_study_category');
    };
  }, []);

  // Words for the current level selection (respects session filter).
  // Memoized: vocabulary.words can be 9,000+ entries, and re-filtering the
  // whole array on every render (every flip, every tick) was extra work the
  // page didn't need — this only recomputes when the word list or filter
  // actually changes.
  const levelWords: VocabularyWord[] = useMemo(() => (
    ssFilter === 'favorites'
      ? vocabulary.words.filter(w => w.isStarred)
      : ssFilter === 'category'
      ? vocabulary.words.filter(w => w.category === ssCategory && (!ssLevel || w.cefrLevel === ssLevel))
      : ssFilter === 'level' && ssLevel
      ? vocabulary.words.filter(w => w.cefrLevel === ssLevel)
      : selectedLevel === 'all'
      ? vocabulary.words
      : vocabulary.words.filter(w => w.cefrLevel === selectedLevel)
  ), [vocabulary.words, ssFilter, ssCategory, ssLevel, selectedLevel]);

  // O(1) id → word lookup for the live-state read below (was a .find() scan
  // over the full word list on every single render — cheap in isolation but
  // adds up with flip/advance animations firing constantly during a session).
  const wordById = useMemo(() => {
    const m = new Map<string, VocabularyWord>();
    for (const w of vocabulary.words) m.set(w.id, w);
    return m;
  }, [vocabulary.words]);

  const startSession = () => {
    const filtered = levelWords.filter(w => !w.isLearned);
    if (filtered.length === 0) { addToast('No words to study! All words are learned.', 'info'); return; }
    // Always shuffle so a session mixes words across categories and CEFR
    // levels rather than marching straight through A1 → C2 in alphabetical
    // order. Fisher–Yates gives a properly uniform shuffle (the old
    // `.sort(() => Math.random() - 0.5)` trick is a well-known biased
    // shuffle that skews toward certain orderings).
    const list = [...filtered];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    setQueue(list);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setSessionStats({ mastered:0, review:0 });
    setDirection(null);
    setShowSetup(false);
    setSessionStartTime(Date.now());
    isAdvancingRef.current = false;
  };

  const handleFlip = useCallback(() => setIsFlipped(p => !p), []);

  // Guards against double-advancing: without this, a fast double-tap (very
  // easy while practicing quickly, especially on a touchscreen) could fire
  // handleNext twice for the same card before state caught up, pushing
  // currentIndex past the end of the queue and leaving the screen blank.
  //
  // This USED TO unlock itself via a 220ms setTimeout. That's what caused
  // the "flashcard freezes / pauses by itself" reports: mobile browsers
  // throttle timers in a backgrounded tab (switching apps, a notification,
  // the phone locking) to save battery, so that setTimeout could sit
  // pending for seconds or minutes. Meanwhile isAdvancingRef stayed `true`
  // the whole time, silently swallowing every tap/keypress with nothing on
  // screen to explain why. Unlocking it here instead — tied to currentIndex
  // actually changing — means it can never get stuck waiting on a timer.
  const isAdvancingRef = useRef(false);
  useEffect(() => {
    isAdvancingRef.current = false;
  }, [currentIndex, sessionComplete]);

  const handleNext = useCallback((learned: boolean) => {
    if (isAdvancingRef.current) return;
    const w = queue[currentIndex];
    if (!w) return; // nothing to act on — avoid throwing on undefined
    isAdvancingRef.current = true;
    setDirection(learned ? 'right' : 'left');
    vocabulary.updateWord(w.id, {
      isLearned:    learned ? true : w.isLearned,
      studyCount:   w.studyCount + 1,
      correctCount: w.correctCount + (learned ? 1 : 0),
      lastStudied:  new Date().toISOString(),
    });
    const updatedStats = learned
      ? { mastered: sessionStats.mastered + 1, review: sessionStats.review }
      : { mastered: sessionStats.mastered, review: sessionStats.review + 1 };
    setSessionStats(updatedStats);
    setIsFlipped(false);
    if (currentIndex < queue.length - 1) {
      // Advance immediately — the card-flip/slide animation is handled by
      // Framer Motion reacting to the key/state change below, not by an
      // artificial delay blocking input. This is what makes the deck feel
      // instant instead of laggy.
      setCurrentIndex(p => p + 1);
    } else {
      setSessionComplete(true);
      // Record this study session so it counts toward the learner's daily
      // streak and shows up in Dashboard stats (total sessions, study time,
      // weekly activity chart). Quiz, Matching, and Spelling already did
      // this — Flashcards never did, so finishing a flashcard session
      // silently vanished from progress tracking even though each card's
      // own studyCount/isLearned was still saved correctly underneath.
      const duration = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 1000));
      vocabulary.addSession({
        date: new Date().toISOString(),
        mode: 'flashcards',
        wordsStudied: queue.length,
        correctAnswers: updatedStats.mastered,
        totalQuestions: queue.length,
        duration,
        cefrLevel: selectedLevel === 'all' ? 'A2' : selectedLevel,
      });
    }
  }, [queue, currentIndex, vocabulary, sessionStats, sessionStartTime, selectedLevel]);

  // Pure navigation — move between cards without grading them "learned" or
  // "still learning". Lets a learner browse back over what they just saw,
  // or skip ahead, without that choice affecting their progress stats.
  const goToCard = useCallback((delta: number) => {
    const next = currentIndex + delta;
    if (next < 0 || next >= queue.length) return;
    setDirection(delta > 0 ? 'right' : 'left');
    setIsFlipped(false);
    setCurrentIndex(next);
  }, [currentIndex, queue.length]);

  // Clear the slide direction once the card has actually changed, so a
  // later flip (front↔back) doesn't inherit a stale slide-in direction
  // from the last Back/Next/Still-Learning/Got-It action.
  useEffect(() => {
    setDirection(null);
  }, [currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (showSetup || sessionComplete) return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleFlip(); }
      else if (e.code === 'ArrowLeft')  handleNext(false);
      else if (e.code === 'ArrowRight') handleNext(true);
      else if (e.code === 'KeyS') {
        const w = queue[currentIndex];
        if (w) {
          vocabulary.toggleStar(w.id);
          const live = wordById.get(w.id);
          addToast(!live?.isStarred ? '⭐ Added to Favorites' : 'Removed from Favorites', 'success');
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showSetup, sessionComplete, handleFlip, handleNext, queue, currentIndex, vocabulary, addToast, wordById]);

  // ── Setup ────────────────────────────────────────────────────────────────────
  if (showSetup) {
    return (
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
        className="flex flex-col items-center justify-center py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF3DD]">
              <Bookmark className="h-8 w-8 text-[#F5A623]" strokeWidth={1.5}/>
            </div>
            <h2 className="text-xl font-semibold text-foreground">Flashcards</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {levelWords.filter(w => !w.isLearned).length} words ready · shuffled across categories &amp; levels
            </p>
          </div>

          {!ssFilter ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Select Level</label>
            <div className="grid grid-cols-4 gap-2">
              {(['all','A1','A2','B1','B2','C1','C2'] as const).map(level => {
                // All levels are unlocked in Flashcards — free study mode,
                // unlike Quiz/Matching/Spelling which still gate levels by
                // mastery. A learner can jump straight to any level here.
                const mastery = level !== 'all' ? getMasteryPct(vocabulary.words, level as CEFRLevel) : null;
                return (
                  <button key={level} onClick={() => setSelectedLevel(level)}
                    className={`relative rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                      selectedLevel === level
                        ? 'bg-[#F5A623] text-white shadow-sm'
                        : 'bg-card border border-border text-muted-foreground hover:bg-muted/50'
                    }`}>
                    <div>{level === 'all' ? 'All' : level}</div>
                    {mastery !== null && mastery > 0 && (
                      <div className={`text-[9px] mt-0.5 ${selectedLevel === level ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {mastery}%
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              🔓 All levels unlocked · pick any level or study "All" for a mix of everything
            </p>
          </div>
        ) : (
          // Arrived via a deep link (Favorites / Level Journey / Categories) —
          // the level picker above is irrelevant here since the word list is
          // already fixed by that filter, so show what's actually being
          // studied instead of a level grid that would silently do nothing.
          <div className="rounded-xl border border-[#F5A623]/30 bg-[#FFF3DD] px-4 py-3 text-center">
            <p className="text-sm font-medium text-[#1A1A2E]">
              {ssFilter === 'favorites' && '⭐ Studying your Favorites'}
              {ssFilter === 'category' && `🏷️ Studying "${ssCategory}"${ssLevel ? ` · ${ssLevel}` : ' · All levels'}`}
              {ssFilter === 'level' && `📘 Studying ${ssLevel} words`}
            </p>
          </div>
        )}

          <button onClick={startSession}
            className="w-full rounded-[10px] bg-[#F5A623] py-3 text-sm font-semibold text-white hover:bg-[#E09400] transition-colors">
            Start Session
          </button>

          <button onClick={() => navigate('/study/level')}
            className="w-full rounded-[10px] border border-border bg-card py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
            Go to Level Journey →
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Complete ──────────────────────────────────────────────────────────────────
  if (sessionComplete) {
    return (
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        className="flex flex-col items-center justify-center py-16">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="text-5xl">🎉</div>
          <h2 className="text-3xl font-bold text-foreground">Session Complete!</h2>
          <div className="flex justify-center gap-10">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#34C759]">{sessionStats.mastered}</div>
              <div className="text-sm text-muted-foreground mt-1">Mastered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#F5A623]">{sessionStats.review}</div>
              <div className="text-sm text-muted-foreground mt-1">Still Learning</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowSetup(true)}
              className="rounded-[10px] border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
              New Session
            </button>
            <button onClick={startSession}
              className="flex items-center gap-2 rounded-[10px] bg-[#F5A623] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#E09400] transition-colors">
              <RefreshCw className="h-4 w-4" strokeWidth={1.5}/> Study Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Study card ────────────────────────────────────────────────────────────────
  // CRITICAL: always read the LIVE word from vocabulary.words so star/learned stays current
  const staleWord  = queue[currentIndex];
  const word       = (staleWord && wordById.get(staleWord.id)) ?? staleWord;
  if (!word) return null;

  const progress   = ((currentIndex + 1) / queue.length) * 100;
  const cefrStyle  = CEFR_STYLE[word.cefrLevel] ?? { bg:'bg-gray-100 text-gray-600', label:word.cefrLevel };

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Card {currentIndex + 1} of {queue.length}</span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <motion.div className="h-full rounded-full bg-[#F5A623]"
            initial={{ width:0 }} animate={{ width:`${progress}%` }} transition={{ duration:0.3 }}/>
        </div>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${word.id}-${isFlipped?'back':'front'}`}
          initial={{ opacity:0, x: direction==='right'?40:direction==='left'?-40:0 }}
          animate={{ opacity:1, x:0 }}
          exit={{ opacity:0, scale:0.96 }}
          transition={{ duration:0.2 }}
          className="w-full cursor-pointer"
          onClick={handleFlip}
        >
          {!isFlipped ? (
            /* ── FRONT ── */
            <div className="rounded-2xl border border-border bg-card shadow-sm min-h-[220px] flex flex-col items-center justify-center p-8 relative">
              {/* Star — uses StarButton which always reads live state */}
              <div className="absolute top-4 right-4">
                <StarButton wordId={word.id} />
              </div>

              <h3 className="text-4xl font-bold text-foreground text-center mb-4">{word.word}</h3>
              <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${POS_COLORS[word.partOfSpeech] ?? 'bg-gray-50 text-gray-700'}`}>
                {word.partOfSpeech}
              </span>
              <div className="flex items-center gap-3 mt-3 flex-wrap justify-center">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cefrStyle.bg}`}>{cefrStyle.label}</span>
                {word.difficulty && <DiffDots level={word.difficulty}/>}
                {word.category && (
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Tag className="h-2.5 w-2.5"/>{word.category}
                  </span>
                )}
              </div>
              {vocabulary.settings.showHints && (
                <p className="absolute bottom-4 text-xs text-muted-foreground/60">Tap to reveal · S to star</p>
              )}
            </div>
          ) : (
            /* ── BACK ── */
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-foreground">{word.word}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${POS_COLORS[word.partOfSpeech] ?? 'bg-gray-50 text-gray-700'}`}>
                    {word.partOfSpeech}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); speak(word.word); }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Volume2 className="h-4 w-4" strokeWidth={1.5}/>
                  </button>
                  <StarButton wordId={word.id} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cefrStyle.bg}`}>{cefrStyle.label}</span>
                {word.difficulty && <DiffDots level={word.difficulty}/>}
                {word.category && (
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Tag className="h-2.5 w-2.5"/>{word.category}
                  </span>
                )}
                {word.isLearned && <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#16A34A]">✓ Learned</span>}
              </div>

              <p className="text-sm font-medium text-foreground leading-relaxed">{word.definition}</p>

              {vocabulary.settings.showTranslations && (word.laoTranslation || word.thaiTranslation) && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {word.laoTranslation  && <span>🇱🇦 {word.laoTranslation}</span>}
                  {word.thaiTranslation && <span>🇹🇭 {word.thaiTranslation}</span>}
                </div>
              )}
              {word.exampleSentence && (
                <p className="text-[13px] italic text-muted-foreground leading-relaxed">&ldquo;{word.exampleSentence}&rdquo;</p>
              )}
              {(word.synonym || word.antonym) && (
                <div className="flex flex-wrap gap-2">
                  {word.synonym && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">Syn:</span>
                      {word.synonym.split(',').map((s,i) => <span key={i} className="rounded-full bg-[#FFF3DD] px-2 py-0.5 text-[11px] font-medium text-[#B37600]">{s.trim()}</span>)}
                    </div>
                  )}
                  {word.antonym && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">Ant:</span>
                      {word.antonym.split(',').map((a,i) => <span key={i} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">{a.trim()}</span>)}
                    </div>
                  )}
                </div>
              )}
              {word.studyCount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><BarChart2 className="h-3 w-3"/>Progress</span>
                    <span className="text-[11px] text-muted-foreground">{word.correctCount}/{word.studyCount} correct</span>
                  </div>
                  <div className="h-1 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-[#34C759] transition-all"
                      style={{ width:`${Math.round((word.correctCount/word.studyCount)*100)}%` }}/>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Browse navigation — move between cards without grading them.
          Separate from Still Learning / Got It below, which grade the card
          AND advance; these just move the cursor for reviewing/skipping. */}
      <div className="flex justify-center items-center gap-3">
        <button onClick={() => goToCard(-1)} disabled={currentIndex === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent">
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5}/> Back
        </button>
        <span className="text-[11px] text-muted-foreground/50">·</span>
        <button onClick={() => goToCard(1)} disabled={currentIndex === queue.length - 1}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent">
          Next <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5}/>
        </button>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <button onClick={() => handleNext(false)}
          className="flex items-center gap-2 rounded-xl border-2 border-[#F5A623] bg-card px-6 py-3 text-sm font-semibold text-[#F5A623] hover:bg-[#FFF3DD] transition-colors">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5}/> Still Learning
        </button>
        <button onClick={() => handleNext(true)}
          className="flex items-center gap-2 rounded-xl bg-[#F5A623] px-6 py-3 text-sm font-semibold text-white hover:bg-[#E09400] transition-colors">
          Got It <ArrowRight className="h-4 w-4" strokeWidth={1.5}/>
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground/70">
        Space to flip · ← Still Learning · → Got It · S to star/unstar
      </p>
    </div>
  );
}
