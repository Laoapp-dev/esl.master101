import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Clock, Zap, Puzzle, Lock } from 'lucide-react';
import { useApp } from '@/App';
import type { CEFRLevel } from '@/types/vocabulary';
import { getMasteryPct, isLevelUnlocked, getPretestLevel, UNLOCK_PCT, randomSessionSize, pickDiverseSample } from '@/lib/levelLock';

// Total *cards* per game (each word contributes 2 cards: word + definition),
// so this yields 5-10 word pairs per session.
const MIN_CARDS = 10;
const MAX_CARDS = 20;

interface GameCard {
  id: string;
  content: string;
  type: 'word' | 'definition';
  pairId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export function Matching() {
  const { vocabulary, addToast } = useApp();
  const pretestLevel = getPretestLevel();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [showSetup, setShowSetup] = useState(true);
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [stars, setStars] = useState(0);

  // The filter set by Favorites / Level Journey / Categories is meant for
  // this one visit only. Clear it on unmount so navigating away and later
  // clicking "Matching" directly from the sidebar doesn't silently inherit
  // a stale filter from a completely unrelated earlier session.
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('moe_study_filter');
      sessionStorage.removeItem('moe_study_level');
      sessionStorage.removeItem('moe_study_category');
    };
  }, []);

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

  const startGame = () => {
    const eligible = words.filter(w => !w.isLearned);
    const targetPairs = Math.floor(randomSessionSize(MIN_CARDS, MAX_CARDS, eligible.length * 2) / 2);
    const shuffled = pickDiverseSample(eligible, targetPairs);

    if (shuffled.length < 3) {
      addToast('Not enough words to match! Add more words or change level.', 'warning');
      return;
    }

    const gameCards: GameCard[] = [];
    shuffled.forEach((word, i) => {
      const pairId = `pair-${i}`;
      gameCards.push({
        id: `word-${i}`,
        content: word.word,
        type: 'word',
        pairId,
        isFlipped: false,
        isMatched: false,
      });
      gameCards.push({
        id: `def-${i}`,
        content: word.definition.length > 60 ? word.definition.substring(0, 60) + '...' : word.definition,
        type: 'definition',
        pairId,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle cards
    const shuffledCards = gameCards.sort(() => Math.random() - 0.5);

    setCards(shuffledCards);
    setFlippedCards([]);
    setMoves(0);
    setTimer(0);
    setIsPlaying(true);
    setGameComplete(false);
    setStars(0);
    setShowSetup(false);
  };

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !gameComplete) {
      interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, gameComplete]);

  const handleCardClick = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c));

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);

      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard?.pairId === secondCard?.pairId) {
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.pairId === firstCard?.pairId ? { ...c, isMatched: true } : c
          ));
          setFlippedCards([]);

          // Update word stats
          const word = words.find((_, i) => `pair-${i}` === firstCard?.pairId);
          if (word) {
            vocabulary.updateWord(word.id, {
              studyCount: word.studyCount + 1,
              correctCount: word.correctCount + 1,
              lastStudied: new Date().toISOString(),
            });
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [cards, flippedCards, words, vocabulary]);

  // Check completion
  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched) && !gameComplete) {
      setGameComplete(true);
      setIsPlaying(false);

      // Calculate stars
      const minMoves = cards.length / 2; // Perfect game
      if (moves <= minMoves + 2) setStars(3);
      else if (moves <= minMoves + 5) setStars(2);
      else setStars(1);

      // Save session
      vocabulary.addSession({
        date: new Date().toISOString(),
        mode: 'matching',
        wordsStudied: cards.length / 2,
        correctAnswers: cards.length / 2,
        totalQuestions: cards.length / 2,
        duration: timer,
        cefrLevel: selectedLevel === 'all' ? 'A2' : selectedLevel,
      });
    }
  }, [cards, gameComplete, moves, timer, selectedLevel, vocabulary]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showSetup) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50">
              <Puzzle className="h-8 w-8 text-purple-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-[#1A1A2E]">Matching Game</h2>
            <p className="mt-1 text-sm text-[#6B6B80]">Match words with their definitions</p>
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
            <p className="text-sm text-[#6B6B80]">
              {words.filter(w => !w.isLearned).length} words available · games use 5–10 pairs (10–20 cards), mixed across levels
            </p>
          </div>

          <button
            onClick={startGame}
            className="w-full rounded-[10px] bg-[#F5A623] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E09400]"
          >
            Start Game
          </button>
        </div>
      </motion.div>
    );
  }

  if (gameComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <Zap
                key={i}
                className={`h-10 w-10 ${
                  i <= stars ? 'text-[#F5A623] fill-[#F5A623]' : 'text-[#E5E5DD]'
                }`}
                strokeWidth={1.5}
              />
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#1A1A2E]">
              {stars === 3 ? 'Perfect!' : stars === 2 ? 'Great Job!' : 'Good Effort!'}
            </h2>
            <p className="mt-1 text-sm text-[#6B6B80]">
              Completed in {formatTime(timer)} with {moves} moves
            </p>
          </div>

          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1A1A2E]">{formatTime(timer)}</div>
              <div className="text-xs text-[#9B9BAE]">Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1A1A2E]">{moves}</div>
              <div className="text-xs text-[#9B9BAE]">Moves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#F5A623]">{stars}/3</div>
              <div className="text-xs text-[#9B9BAE]">Stars</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowSetup(true)}
              className="rounded-[10px] border border-[#E5E5DD] bg-white px-6 py-2.5 text-sm font-medium text-[#1A1A2E] hover:bg-[#F5F5F0]"
            >
              New Game
            </button>
            <button
              onClick={startGame}
              className="rounded-[10px] bg-[#F5A623] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#E09400]"
            >
              Play Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex items-center justify-between rounded-xl bg-white border border-[#E5E5DD] px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-[#6B6B80]">
            <Clock className="h-4 w-4" strokeWidth={1.5} />
            {formatTime(timer)}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[#6B6B80]">
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            {moves} moves
          </div>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="text-xs text-[#9B9BAE] hover:text-[#6B6B80]"
        >
          End Game
        </button>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="matching-card-container aspect-square"
            onClick={() => handleCardClick(card.id)}
          >
            <div
              className={`matching-card-inner ${card.isFlipped || card.isMatched ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
            >
              {/* Front (face-down) */}
              <div className="matching-card-front flex items-center justify-center rounded-xl border-2 border-[#E5E5DD] bg-[#F5F5F0] cursor-pointer hover:border-[#D5D5CD] transition-colors">
                <span className="text-2xl font-bold text-[#D5D5CD]">?</span>
              </div>

              {/* Back (face-up) */}
              <div
                className={`matching-card-back flex items-center justify-center rounded-xl border-2 p-3 cursor-pointer ${
                  card.isMatched
                    ? 'border-[#34C759] bg-green-50'
                    : 'border-[#F5A623] bg-[#FFF3DD]'
                }`}
              >
                <p className={`text-center text-xs font-medium leading-tight ${
                  card.type === 'word' ? 'text-[#1A1A2E] text-sm' : 'text-[#6B6B80]'
                }`}>
                  {card.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-[#9B9BAE]">
        Click cards to reveal. Match words with their definitions.
      </p>
    </div>
  );
}
