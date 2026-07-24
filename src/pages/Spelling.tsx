import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle, XCircle, ArrowRight, Keyboard, Flame, Lock } from 'lucide-react';
import { useApp } from '@/App';
import { useSpeech } from '@/hooks/useSpeech';
import type { VocabularyWord, CEFRLevel } from '@/types/vocabulary';
import { getMasteryPct, isLevelUnlocked, getPretestLevel, UNLOCK_PCT, randomSessionSize, pickDiverseSample } from '@/lib/levelLock';

const MIN_WORDS = 10;
const MAX_WORDS = 20;

export function Spelling() {
  const { vocabulary, addToast } = useApp();
  const { speak } = useSpeech();
  const pretestLevel = getPretestLevel();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [showSetup, setShowSetup] = useState(true);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    const saved = localStorage.getItem('lexicon_best_streak');
    return saved ? parseInt(saved) : 0;
  });
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  // The words for this session, chosen once at startSession — a diverse,
  // randomized mix of 10-20 words spread across CEFR levels rather than a
  // fixed 10 picked one-at-a-time (which could repeat a heavily-weighted
  // level and never even hit 10 distinct words).
  const [sessionQueue, setSessionQueue] = useState<VocabularyWord[]>([]);

  // The filter set by Favorites / Level Journey / Categories is meant for
  // this one visit only. Clear it on unmount so navigating away and later
  // clicking "Spelling" directly from the sidebar doesn't silently inherit
  // a stale filter from a completely unrelated earlier session.
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('moe_study_filter');
      sessionStorage.removeItem('moe_study_level');
      sessionStorage.removeItem('moe_study_category');
    };
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);

  // Level-journey / favorites / category session filter (see Categories.tsx)
  const _ssFilter = sessionStorage.getItem('moe_study_filter');
  const _ssLevel  = sessionStorage.getItem('moe_study_level') as CEFRLevel | null;
  const _ssCategory = sessionStorage.getItem('moe_study_category');
  const words = _ssFilter === 'favorites'
    ? vocabulary.words.filter(w => w.isStarred)
    : _ssFilter === 'category'
    ? vocabulary.words.filter(w => w.category === _ssCategory && (!_ssLevel || w.cefrLevel === _ssLevel))
    : _ssFilter === 'level' && _ssLevel
    ? vocabulary.words.filter(w => w.cefrLevel === _ssLevel)
    : selectedLevel === 'all'
    ? vocabulary.words
    : vocabulary.words.filter(w => w.cefrLevel === selectedLevel);

  const showWordAt = useCallback((queue: VocabularyWord[], index: number) => {
    const word = queue[index];
    if (!word) {
      setSessionComplete(true);
      return;
    }
    setCurrentWord(word);
    setUserInput('');
    setIsChecked(false);
    setIsCorrect(false);

    // Auto-play pronunciation if enabled
    setTimeout(() => {
      speak(word.word);
    }, 300);
  }, [speak]);

  const startSession = () => {
    const available = words.filter(w => !w.isLearned);
    if (available.length === 0) {
      addToast('No words available! Add some words first.', 'warning');
      return;
    }
    const targetSize = randomSessionSize(MIN_WORDS, MAX_WORDS, available.length);
    const queue = pickDiverseSample(available, targetSize);
    setSessionQueue(queue);
    setStreak(0);
    setTotalAnswered(0);
    setCorrectCount(0);
    setSessionComplete(false);
    setShowSetup(false);
    showWordAt(queue, 0);
  };

  const handleCheck = () => {
    if (!currentWord || !userInput.trim() || isChecked) return;

    const correct = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    setIsCorrect(correct);
    setIsChecked(true);
    setTotalAnswered(prev => prev + 1);

    if (correct) {
      setCorrectCount(prev => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        try {
          localStorage.setItem('lexicon_best_streak', newStreak.toString());
        } catch { /* storage full — streak still tracked in memory for this session */ }
      }

      vocabulary.updateWord(currentWord.id, {
        studyCount: currentWord.studyCount + 1,
        correctCount: currentWord.correctCount + 1,
        lastStudied: new Date().toISOString(),
      });
    } else {
      setStreak(0);
      vocabulary.updateWord(currentWord.id, {
        studyCount: currentWord.studyCount + 1,
        lastStudied: new Date().toISOString(),
      });
    }
  };

  const handleNext = () => {
    if (totalAnswered >= sessionQueue.length) {
      setSessionComplete(true);

      // Save session
      vocabulary.addSession({
        date: new Date().toISOString(),
        mode: 'spelling',
        wordsStudied: totalAnswered,
        correctAnswers: correctCount,
        totalQuestions: totalAnswered,
        duration: 0,
        cefrLevel: selectedLevel === 'all' ? 'A2' : selectedLevel,
      });
    } else {
      showWordAt(sessionQueue, totalAnswered);
    }
  };

  const handleReplay = () => {
    if (currentWord) {
      speak(currentWord.word);
    }
  };

  // Focus input on mount and when word changes
  useEffect(() => {
    if (!showSetup && !isChecked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentWord, isChecked, showSetup]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSetup || sessionComplete) return;

      if (e.code === 'Enter') {
        if (isChecked) {
          handleNext();
        } else {
          handleCheck();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSetup, sessionComplete, isChecked, userInput, currentWord]);

  if (showSetup) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
              <Keyboard className="h-8 w-8 text-teal-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-[#1A1A2E]">Spelling Practice</h2>
            <p className="mt-1 text-sm text-[#6B6B80]">Listen and type the correct word</p>
          </div>

          {!_ssFilter ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-[#1A1A2E]">Select Level</label>
            <div className="grid grid-cols-4 gap-2">
              {(['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => {
                const locked = level !== 'all' && !isLevelUnlocked(vocabulary.words, level as CEFRLevel, pretestLevel);
                const mastery = level !== 'all' ? getMasteryPct(vocabulary.words, level as CEFRLevel) : null;
                return (
                  <button
                    key={level}
                    onClick={() => !locked && setSelectedLevel(level)}
                    disabled={locked}
                    className={`relative rounded-lg py-2.5 text-sm font-medium transition-colors ${
                      selectedLevel === level
                        ? 'bg-[#F5A623] text-white'
                        : locked
                        ? 'bg-[#F5F5F0] text-[#9B9BAE]/50 cursor-not-allowed'
                        : 'bg-white border border-[#E5E5DD] text-[#6B6B80] hover:bg-[#F5F5F0]'
                    }`}
                  >
                    {locked && <Lock className="absolute top-1.5 right-1.5 h-2.5 w-2.5 text-[#9B9BAE]/50" />}
                    <div>{level === 'all' ? 'All' : level}</div>
                    {mastery !== null && !locked && mastery > 0 && (
                      <div className={`text-[9px] mt-0.5 ${selectedLevel === level ? 'text-white/80' : 'text-[#9B9BAE]'}`}>
                        {mastery}%
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#9B9BAE]">
              🔒 Levels unlock when previous level reaches {UNLOCK_PCT}% mastery
            </p>
          </div>
          ) : (
            <div className="rounded-xl border border-[#F5A623]/30 bg-[#FFF3DD] px-4 py-3 text-center">
              <p className="text-sm font-medium text-[#1A1A2E]">
                {_ssFilter === 'favorites' && '⭐ Studying your Favorites'}
                {_ssFilter === 'category' && `🏷️ Studying "${_ssCategory}"${_ssLevel ? ` · ${_ssLevel}` : ' · All levels'}`}
                {_ssFilter === 'level' && `📘 Studying ${_ssLevel} words`}
              </p>
            </div>
          )}

          <div className="rounded-xl bg-[#F5F5F0] p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-[#F5A623]" strokeWidth={1.5} />
              <span className="text-sm font-medium text-[#1A1A2E]">Best Streak: {bestStreak}</span>
            </div>
            <p className="text-xs text-[#6B6B80]">
              {words.length} words available · sessions are 10–20 words, mixed across levels
            </p>
          </div>

          <button
            onClick={startSession}
            className="w-full rounded-[10px] bg-[#F5A623] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E09400]"
          >
            Start Practice
          </button>
        </div>
      </motion.div>
    );
  }

  if (sessionComplete) {
    const percentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-[#1A1A2E]">Session Complete!</h2>

          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#34C759]">{correctCount}</div>
              <div className="text-sm text-[#6B6B80]">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#1A1A2E]">{percentage}%</div>
              <div className="text-sm text-[#6B6B80]">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#F5A623]">{bestStreak}</div>
              <div className="text-sm text-[#6B6B80]">Best Streak</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowSetup(true)}
              className="rounded-[10px] border border-[#E5E5DD] bg-white px-6 py-2.5 text-sm font-medium text-[#1A1A2E] hover:bg-[#F5F5F0]"
            >
              New Session
            </button>
            <button
              onClick={startSession}
              className="rounded-[10px] bg-[#F5A623] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#E09400]"
            >
              Practice Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!currentWord) return null;

  // Create blanked sentence
  const blankedSentence = currentWord.exampleSentence.replace(
    new RegExp(currentWord.word, 'gi'),
    '______'
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center justify-between rounded-xl bg-white border border-[#E5E5DD] px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-[#6B6B80]">
            <span>Q {totalAnswered + 1}/{sessionQueue.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className={`h-4 w-4 ${streak > 0 ? 'text-[#F5A623]' : 'text-[#9B9BAE]'}`} strokeWidth={1.5} />
          <span className="text-sm font-medium text-[#1A1A2E]">{streak}</span>
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentWord.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[#E5E5DD] bg-white p-6 space-y-6"
      >
        {/* Audio Button */}
        <div className="flex justify-center">
          <button
            onClick={handleReplay}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3DD] text-[#F5A623] transition-transform hover:scale-105 active:scale-95"
          >
            <Volume2 className="h-8 w-8" strokeWidth={1.5} />
          </button>
        </div>

        {/* Definition */}
        <div className="text-center">
          <p className="text-sm text-[#6B6B80] mb-1">Definition:</p>
          <p className="text-base font-medium text-[#1A1A2E]">{currentWord.definition}</p>
        </div>

        {/* Blanked Sentence */}
        <div className="text-center">
          <p className="text-sm text-[#6B6B80] mb-1">Complete the sentence:</p>
          <p className="text-base italic text-[#1A1A2E]">&ldquo;{blankedSentence}&rdquo;</p>
        </div>

        {/* Translation hint (if enabled) */}
        {vocabulary.settings.showTranslations && (currentWord.laoTranslation || currentWord.thaiTranslation) && (
          <div className="text-center text-xs text-[#9B9BAE]">
            {currentWord.laoTranslation && <span>Lao: {currentWord.laoTranslation} </span>}
            {currentWord.thaiTranslation && <span>Thai: {currentWord.thaiTranslation}</span>}
          </div>
        )}

        {/* Input */}
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => !isChecked && setUserInput(e.target.value)}
            disabled={isChecked}
            placeholder="Type the word..."
            className={`w-full rounded-[10px] border px-4 py-3 text-center text-lg font-medium ${
              isChecked
                ? isCorrect
                  ? 'border-[#34C759] bg-green-50 text-[#34C759]'
                  : 'border-[#FF3B30] bg-red-50 text-[#FF3B30]'
                : 'border-[#E5E5DD] bg-white text-[#1A1A2E]'
            }`}
          />

          {/* Result */}
          <AnimatePresence>
            {isChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`rounded-xl p-4 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-[#34C759]" strokeWidth={1.5} />
                        <span className="font-medium text-[#34C759]">Correct!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-[#FF3B30]" strokeWidth={1.5} />
                        <span className="font-medium text-[#FF3B30]">Incorrect</span>
                      </>
                    )}
                  </div>
                  {!isCorrect && (
                    <p className="text-sm text-[#1A1A2E]">
                      Correct spelling: <strong>{currentWord.word}</strong>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          {!isChecked ? (
            <button
              onClick={handleCheck}
              disabled={!userInput.trim()}
              className="w-full rounded-[10px] bg-[#F5A623] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E09400] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#F5A623] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E09400]"
            >
              {totalAnswered >= sessionQueue.length - 1 ? 'See Results' : 'Next Word'}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </motion.div>

      <p className="text-center text-xs text-[#9B9BAE]">
        Press Enter to {isChecked ? 'continue' : 'check'}
      </p>
    </div>
  );
}
