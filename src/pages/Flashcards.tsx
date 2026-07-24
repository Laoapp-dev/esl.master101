import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, ArrowLeft, ArrowRight, Bookmark,
  Tag, BarChart2, RefreshCw, Lock,
} from 'lucide-react';
import { useApp } from '@/App';
import { useNavigate } from 'react-router-dom';
import { useSpeech } from '@/hooks/useSpeech';
import type { VocabularyWord, CEFRLevel } from '@/types/vocabulary';
import { CEFR_ORDER, UNLOCK_PCT, getMasteryPct, isLevelUnlocked, getPretestLevel } from '@/lib/levelLock';
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

  // Read the current user's pretest level (shared helper — see src/lib/levelLock.ts)
  const pretestLevel: string | undefined = getPretestLevel();

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

  // Words for the current level selection (respects session filter)
  const levelWords: VocabularyWord[] = ssFilter === 'favorites'
    ? vocabulary.words.filter(w => w.isStarred)
    : ssFilter === 'category'
    ? vocabulary.words.filter(w => w.category === ssCategory && (!ssLevel || w.cefrLevel === ssLevel))
    : ssFilter === 'level' && ssLevel
    ? vocabulary.words.filter(w => w.cefrLevel === ssLevel)
    : selectedLevel === 'all'
    ? vocabulary.words
    : vocabulary.words.filter(w => w.cefrLevel === selectedLevel);

  const startSession = () => {
    const filtered = levelWords.filter(w => !w.isLearned);
    if (filtered.length === 0) { addToast('No words to study! All words are learned.', 'info'); return; }
    // Sort by level order (A1 first), then alphabetically — NO random shuffle by default
    const sorted = [...filtered].sort((a, b) => {
      const li = CEFR_ORDER.indexOf(a.cefrLevel) - CEFR_ORDER.indexOf(b.cefrLevel);
      if (li !== 0) return li;
      return a.word.localeCompare(b.word);
    });
    const list = vocabulary.settings.shuffleCards
      ? [...sorted].sort(() => Math.random() - 0.5)
      : sorted;
    setQueue(list);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setSessionStats({ mastered:0, review:0 });
    setDirection(null);
    setShowSetup(false);
    isAdvancingRef.current = false;
  };

  const handleFlip = useCallback(() => setIsFlipped(p => !p), []);

  // Guards against double-advancing: handleNext schedules a 220ms timeout
  // before moving to the next card. If the user presses the arrow key or
  // clicks again inside that window (very easy to do while practicing
  // quickly), handleNext used to re-run against the same stale
  // `currentIndex`, queuing a second advance for a card that was only
  // studied once. That could push currentIndex past the end of the queue,
  // at which point `queue[currentIndex]` is undefined, `w.id` throws, and
  // the screen freezes/blanks with no way to continue. This ref makes
  // handleNext a no-op while a transition is already in flight.
  const isAdvancingRef = useRef(false);

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
    setSessionStats(p => learned
      ? { ...p, mastered: p.mastered + 1 }
      : { ...p, review: p.review + 1 }
    );
    if (currentIndex < queue.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(p => p + 1);
        setDirection(null);
        isAdvancingRef.current = false;
      }, 220);
    } else {
      setSessionComplete(true);
      isAdvancingRef.current = false;
    }
  }, [queue, currentIndex, vocabulary]);

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
          const live = vocabulary.words.find(x => x.id === w.id);
          addToast(!live?.isStarred ? '⭐ Added to Favorites' : 'Removed from Favorites', 'success');
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showSetup, sessionComplete, handleFlip, handleNext, queue, currentIndex, vocabulary, addToast]);

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
              {levelWords.filter(w => !w.isLearned).length} words ready · sorted A1 → C2
            </p>
          </div>

          {!ssFilter ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Select Level</label>
            <div className="grid grid-cols-4 gap-2">
              {(['all','A1','A2','B1','B2','C1','C2'] as const).map(level => {
                const locked = level !== 'all' && !isLevelUnlocked(vocabulary.words, level as CEFRLevel, pretestLevel);
                const mastery = level !== 'all' ? getMasteryPct(vocabulary.words, level as CEFRLevel) : null;
                return (
                  <button key={level} onClick={() => !locked && setSelectedLevel(level)}
                    disabled={locked}
                    className={`relative rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                      selectedLevel === level
                        ? 'bg-[#F5A623] text-white shadow-sm'
                        : locked
                        ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
                        : 'bg-card border border-border text-muted-foreground hover:bg-muted/50'
                    }`}>
                    {locked && <Lock className="absolute top-1.5 right-1.5 h-2.5 w-2.5 text-muted-foreground/40"/>}
                    <div>{level === 'all' ? 'All' : level}</div>
                    {mastery !== null && !locked && mastery > 0 && (
                      <div className={`text-[9px] mt-0.5 ${selectedLevel === level ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {mastery}%
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              🔒 Levels unlock when previous level reaches {UNLOCK_PCT}% mastery
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
  const word       = vocabulary.words.find(w => w.id === staleWord?.id) ?? staleWord;
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
