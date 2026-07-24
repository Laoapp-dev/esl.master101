/**
 * AILessonPanel
 *
 * Self-contained "AI Lesson" generator for the Practice page. Pulls a
 * handful of words for the selected CEFR level straight out of the app's
 * built-in 9,000+ word database (via useApp().vocabulary — no separate
 * fetch, no network round-trip for the words themselves), then asks
 * practiceAI.generateLesson() to turn them into a short lesson + quiz.
 *
 * Works with or without an admin Gemini key: with a key, the intro blurb
 * and questions are AI-written; without one, it falls back to a
 * definition-matching quiz built directly from the word data so the
 * feature never feels broken.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, RotateCcw, CheckCircle2, XCircle, BookOpenCheck } from 'lucide-react';
import { useApp } from '@/App';
import { generateLesson, type GeneratedLesson } from '@/lib/practiceAI';
import type { CEFRLevel } from '@/data/speakingTopics';

export function AILessonPanel({ level }: { level: CEFRLevel }) {
  const { vocabulary } = useApp();
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    const pool = vocabulary.words.filter(w => w.cefrLevel === level || (level === 'C1' && w.cefrLevel === 'C2'));
    const result = await generateLesson({ words: pool, level });
    setLesson(result);
    setLoading(false);
  };

  const score = lesson ? lesson.questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0) : 0;

  const handleSubmit = () => {
    setSubmitted(true);
    if (lesson && lesson.questions.length > 0) {
      vocabulary.addSession({
        date: new Date().toISOString(),
        mode: 'quiz',
        wordsStudied: lesson.words.length,
        correctAnswers: score,
        totalQuestions: lesson.questions.length,
        duration: 60,
        cefrLevel: level === 'C1' ? 'C1' : level,
      });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-[#1A1A2E] to-[#2A2A4E]">
        <div className="h-8 w-8 rounded-lg bg-[#F5A623]/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-[#F5A623]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">AI Vocabulary Lesson</p>
          <p className="text-xs text-white/50">Generated from the app's {level}-level word list</p>
        </div>
        {!loading && (
          <button onClick={handleGenerate}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#F5A623] text-white px-3 py-1.5 rounded-lg hover:bg-[#E09400] transition-colors shrink-0">
            {lesson ? <RotateCcw className="h-3.5 w-3.5" /> : <BookOpenCheck className="h-3.5 w-3.5" />}
            {lesson ? 'New Lesson' : 'Generate'}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Building your lesson…
        </div>
      )}

      <AnimatePresence>
        {!loading && lesson && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pb-4 pt-1 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">{lesson.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{lesson.summary}</p>
              {!lesson.aiGenerated && (
                <p className="text-[10px] text-amber-600 mt-1">Basic mode — add a Gemini key in Admin → AI Keys for AI-written lessons.</p>
              )}
            </div>

            {lesson.words.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lesson.words.map(w => (
                  <span key={w.word} title={w.example} className="text-xs bg-muted px-2 py-1 rounded-full text-foreground font-medium">
                    {w.word}
                  </span>
                ))}
              </div>
            )}

            {lesson.questions.length > 0 && (
              <div className="space-y-3">
                {lesson.questions.map((q, i) => (
                  <div key={i} className="space-y-1.5">
                    <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {q.options.map(opt => {
                        const chosen = answers[i] === opt;
                        const isCorrect = opt === q.answer;
                        const showResult = submitted;
                        return (
                          <button key={opt} disabled={submitted}
                            onClick={() => setAnswers(prev => ({ ...prev, [i]: opt }))}
                            className={`flex items-center justify-between text-left text-sm px-3 py-2 rounded-lg border transition-colors
                              ${showResult && isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                                showResult && chosen && !isCorrect ? 'border-red-300 bg-red-50 text-red-700' :
                                chosen ? 'border-[#F5A623] bg-[#FFF3DD]' : 'border-border hover:bg-muted/40'}`}>
                            <span>{opt}</span>
                            {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                            {showResult && chosen && !isCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {!submitted ? (
                  <button onClick={handleSubmit} disabled={Object.keys(answers).length < lesson.questions.length}
                    className="w-full py-2.5 rounded-xl bg-[#1A1A2E] text-white text-sm font-semibold disabled:opacity-40 transition-opacity">
                    Check Answers
                  </button>
                ) : (
                  <div className="text-center py-2 text-sm font-semibold text-foreground">
                    Score: {score}/{lesson.questions.length}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !lesson && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-xs text-muted-foreground">
            Tap Generate for a quick AI-built lesson and quiz from this level's vocabulary.
          </p>
        </div>
      )}
    </div>
  );
}
