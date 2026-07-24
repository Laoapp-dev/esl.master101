import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle, XCircle, Volume2, Award, Lock } from 'lucide-react';
import { useApp } from '@/App';
import { useSpeech } from '@/hooks/useSpeech';
import type { CEFRLevel, QuizType, QuizQuestion } from '@/types/vocabulary';
import { getMasteryPct, isLevelUnlocked, getPretestLevel, UNLOCK_PCT, randomSessionSize, pickDiverseSample } from '@/lib/levelLock';

const MIN_QUESTIONS = 10;
const MAX_QUESTIONS = 20;

export function Quiz() {
  const { vocabulary } = useApp();
  const { speak } = useSpeech();
  const pretestLevel = getPretestLevel();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [quizType, setQuizType] = useState<QuizType>('definition');
  const [showSetup, setShowSetup] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(0);

  // The filter set by Favorites / Level Journey / Categories is meant for
  // this one visit only. Clear it on unmount so navigating away and later
  // clicking "Quiz" directly from the sidebar doesn't silently inherit a
  // stale filter from a completely unrelated earlier session.
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

  const generateQuestions = useCallback(() => {
    const sessionSize = randomSessionSize(MIN_QUESTIONS, MAX_QUESTIONS, words.length);
    const shuffled = pickDiverseSample(words, sessionSize);
    const allWords = vocabulary.words;

    const newQuestions: QuizQuestion[] = shuffled.map((word) => {
      let question: string;
      let correctAnswer: string;
      let options: string[];

      switch (quizType) {
        case 'synonym':
          question = `Which word is a synonym of "${word.word}"?`;
          correctAnswer = word.synonym ? word.synonym.split(',')[0].trim() : word.definition;
          options = allWords
            .filter(w => w.id !== word.id && w.synonym)
            .map(w => w.synonym!.split(',')[0].trim())
            .slice(0, 3);
          break;
        case 'antonym':
          question = `Which word is an antonym of "${word.word}"?`;
          correctAnswer = word.antonym ? word.antonym.split(',')[0].trim() : 'No antonym available';
          options = allWords
            .filter(w => w.id !== word.id && w.antonym)
            .map(w => w.antonym!.split(',')[0].trim())
            .slice(0, 3);
          break;
        case 'fillBlank':
          question = word.exampleSentence.replace(word.word, '______');
          correctAnswer = word.word;
          options = allWords
            .filter(w => w.id !== word.id)
            .map(w => w.word)
            .slice(0, 3);
          break;
        default:
          question = `What does "${word.word}" mean?`;
          correctAnswer = word.definition;
          options = allWords
            .filter(w => w.id !== word.id)
            .map(w => w.definition)
            .slice(0, 3);
      }

      // Ensure we have enough options
      while (options.length < 3) {
        const filler = ['Not applicable', 'None of the above', 'Cannot be determined'];
        options.push(filler[options.length]);
      }

      // Add correct answer and shuffle
      options = [...options, correctAnswer].sort(() => Math.random() - 0.5);

      return {
        word,
        questionType: quizType,
        question,
        options,
        correctAnswer,
      };
    });

    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizComplete(false);
    setSessionStartTime(Date.now());
    setShowSetup(false);
  }, [words, quizType, vocabulary.words]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || showExplanation) return;

    setSelectedAnswer(answer);
    setShowExplanation(true);

    const currentQuestion = questions[currentQuestionIndex];

    // Record the answer on the question itself — the results/review screen
    // reads q.userAnswer to decide whether to show a green check or red X.
    // Without this, every question showed as incorrect on the results
    // screen regardless of what was actually selected.
    setQuestions(prev => prev.map((q, i) =>
      i === currentQuestionIndex ? { ...q, userAnswer: answer } : q
    ));

    if (answer === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
      vocabulary.updateWord(currentQuestion.word.id, {
        studyCount: currentQuestion.word.studyCount + 1,
        correctCount: currentQuestion.word.correctCount + 1,
        lastStudied: new Date().toISOString(),
      });
    } else {
      vocabulary.updateWord(currentQuestion.word.id, {
        studyCount: currentQuestion.word.studyCount + 1,
        lastStudied: new Date().toISOString(),
      });
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizComplete(true);

      // Save session. `score` already reflects the just-answered final
      // question (handleAnswer updates it before this button is clickable),
      // so use it directly — adding another conditional increment here
      // double-counted the last question when it was correct.
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      vocabulary.addSession({
        date: new Date().toISOString(),
        mode: 'quiz',
        wordsStudied: questions.length,
        correctAnswers: score,
        totalQuestions: questions.length,
        duration,
        cefrLevel: selectedLevel === 'all' ? 'A2' : selectedLevel,
      });
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + (showExplanation ? 1 : 0)) / questions.length) * 100 : 0;

  if (showSetup) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <Award className="h-8 w-8 text-[#4A90E2]" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-[#1A1A2E]">Quiz Mode</h2>
            <p className="mt-1 text-sm text-[#6B6B80]">Test your knowledge with multiple choice questions</p>
          </div>

          {!_ssFilter ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-[#1A1A2E]">CEFR Level</label>
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

          <div>
            <label className="mb-2 block text-sm font-medium text-[#1A1A2E]">Quiz Type</label>
            <div className="space-y-2">
              {[
                { value: 'definition' as QuizType, label: 'Definition Match', desc: 'Match the word to its definition' },
                { value: 'synonym' as QuizType, label: 'Synonym Match', desc: 'Find the synonym of the given word' },
                { value: 'antonym' as QuizType, label: 'Antonym Match', desc: 'Find the antonym of the given word' },
                { value: 'fillBlank' as QuizType, label: 'Fill in the Blank', desc: 'Complete the sentence' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setQuizType(type.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    quizType === type.value
                      ? 'border-[#F5A623] bg-[#FFF3DD]'
                      : 'border-[#E5E5DD] bg-white hover:bg-[#F5F5F0]'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    quizType === type.value ? 'bg-[#F5A623] text-white' : 'bg-[#F5F5F0] text-[#6B6B80]'
                  }`}>
                    <span className="text-sm font-bold">{type.label.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1A1A2E]">{type.label}</div>
                    <div className="text-xs text-[#9B9BAE]">{type.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-[#9B9BAE]">
            {words.length} words available · quizzes are 10–20 questions, mixed across levels
          </p>

          <button
            onClick={generateQuestions}
            disabled={words.length < 4}
            className="w-full rounded-[10px] bg-[#F5A623] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E09400] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {words.length < 4 ? 'Need at least 4 words' : 'Start Quiz'}
          </button>
        </div>
      </motion.div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPerfect = percentage === 100;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="text-center space-y-6">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            isPerfect ? 'bg-[#FFF3DD]' : percentage >= 70 ? 'bg-green-50' : 'bg-orange-50'
          }`}>
            {isPerfect ? (
              <Award className="h-10 w-10 text-[#F5A623]" strokeWidth={1.5} />
            ) : (
              <span className="text-2xl font-bold text-[#1A1A2E]">{percentage}%</span>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#1A1A2E]">
              {isPerfect ? 'Perfect Score!' : percentage >= 70 ? 'Great Job!' : 'Keep Practicing!'}
            </h2>
            <p className="mt-1 text-sm text-[#6B6B80]">
              You got {score} out of {questions.length} correct
            </p>
          </div>

          {/* Question Review */}
          <div className="w-full max-w-lg space-y-2">
            {questions.map((q, idx) => {
              const isCorrect = q.userAnswer === q.correctAnswer;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                    isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle className="h-5 w-5 shrink-0 text-[#34C759]" strokeWidth={1.5} />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-[#FF3B30]" strokeWidth={1.5} />
                  )}
                  <div className="text-left">
                    <span className="text-sm font-medium text-[#1A1A2E]">{q.word.word}</span>
                    <span className="text-xs text-[#6B6B80] ml-2">{q.correctAnswer}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowSetup(true)}
              className="rounded-[10px] border border-[#E5E5DD] bg-white px-6 py-2.5 text-sm font-medium text-[#1A1A2E] hover:bg-[#F5F5F0]"
            >
              New Quiz
            </button>
            <button
              onClick={generateQuestions}
              className="rounded-[10px] bg-[#F5A623] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#E09400]"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!currentQuestion) {
    // Defensive fallback: word list changed mid-quiz (e.g. a sync merged in
    // new words) and the question index no longer lines up. Send the person
    // back to setup instead of crashing on `currentQuestion.word`.
    setShowSetup(true);
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6B6B80]">Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span className="text-[#9B9BAE]">Score: {score}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#E5E5DD]">
          <motion.div
            className="h-full rounded-full bg-[#F5A623]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#E5E5DD] bg-white p-6"
        >
          {/* Question */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-2">
              <span className="rounded-full bg-[#FFF3DD] px-3 py-1 text-[11px] font-semibold text-[#B37600] uppercase">
                {currentQuestion.questionType}
              </span>
              <button
                onClick={() => speak(currentQuestion.word.word)}
                className="rounded-lg p-2 text-[#9B9BAE] hover:bg-[#F5F5F0]"
              >
                <Volume2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A2E]">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correctAnswer;
              let optionClass = 'option-btn border border-[#E5E5DD] bg-white text-[#1A1A2E]';

              if (showExplanation) {
                if (isCorrect) {
                  optionClass = 'option-btn correct';
                } else if (isSelected && !isCorrect) {
                  optionClass = 'option-btn wrong';
                } else {
                  optionClass = 'option-btn border border-[#E5E5DD] bg-[#F5F5F0] text-[#9B9BAE]';
                }
              } else if (isSelected) {
                optionClass = 'option-btn selected';
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  disabled={showExplanation}
                  className={`flex w-full items-center gap-3 rounded-xl px-5 py-4 text-left text-sm font-medium transition-all ${optionClass}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-bold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {showExplanation && isCorrect && (
                    <CheckCircle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                  )}
                  {showExplanation && isSelected && !isCorrect && (
                    <XCircle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Panel */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="rounded-xl bg-[#F5F5F0] p-4">
                  <p className="text-sm text-[#1A1A2E]">
                    <strong>Correct answer:</strong> {currentQuestion.correctAnswer}
                  </p>
                  <p className="mt-1 text-sm italic text-[#6B6B80]">
                    &ldquo;{currentQuestion.word.exampleSentence}&rdquo;
                  </p>
                </div>
                <button
                  onClick={handleNext}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5A623] py-3 text-sm font-semibold text-white hover:bg-[#E09400]"
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
