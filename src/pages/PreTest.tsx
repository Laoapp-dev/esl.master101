/**
 * PreTest — 25-question CEFR placement test
 *
 * Scoring bands (as specified):
 *   0–4   → A1
 *   5–10  → A2
 *   11–13 → B1
 *   14–17 → B2 (spec says 11-13=B1, 14-17=B2 — we keep those exact boundaries)
 *   18–20 → C1
 *   21–25 → C2
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle2, XCircle, Trophy, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/App';

// ── Score → CEFR level mapping ─────────────────────────────────────────────────
export function scoreToCEFR(score: number): string {
  if (score <= 4)  return 'A1';
  if (score <= 10) return 'A2';
  if (score <= 13) return 'B1';
  if (score <= 17) return 'B2';
  if (score <= 20) return 'C1';
  return 'C2';
}

const CEFR_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  A1: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'A1 · Beginner'     },
  A2: { bg: 'bg-green-100',   text: 'text-green-700',   label: 'A2 · Elementary'   },
  B1: { bg: 'bg-yellow-100',  text: 'text-yellow-700',  label: 'B1 · Intermediate' },
  B2: { bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'B2 · Upper-Int.'   },
  C1: { bg: 'bg-red-100',     text: 'text-red-700',     label: 'C1 · Advanced'     },
  C2: { bg: 'bg-purple-100',  text: 'text-purple-700',  label: 'C2 · Mastery'      },
};

// ── Question bank — 25 questions spanning A1 → C2 ─────────────────────────────
// 5 questions per level band; definition-match format so no word list needed.
// Questions sorted easy → hard so the test feels progressive.
const QUESTION_BANK = [
  // ── A1 (q 1-5) ──
  { q: 'What does "happy" mean?',             opts: ['Feeling joy','Feeling cold','Feeling tired','Feeling scared'],  ans: 'Feeling joy',       level: 'A1' },
  { q: 'Which word means the opposite of "big"?', opts: ['Small','Fast','Tall','Dark'],                               ans: 'Small',             level: 'A1' },
  { q: '"She _____ to school every day." Which word fits?', opts: ['go','goes','going','gone'],                        ans: 'goes',              level: 'A1' },
  { q: 'What does "hungry" mean?',            opts: ['Wanting food','Feeling sick','Being tired','Needing water'],    ans: 'Wanting food',      level: 'A1' },
  { q: 'Choose the correct sentence:',        opts: ['I am a student.','I is a student.','I be student.','Am I student.'], ans: 'I am a student.', level: 'A1' },

  // ── A2 (q 6-10) ──
  { q: 'What does "argue" mean?',             opts: ['To disagree loudly','To cook food','To sleep deeply','To run fast'],   ans: 'To disagree loudly', level: 'A2' },
  { q: '"She has been _____ since 9 am." Choose the best word.', opts: ['work','works','working','worked'],              ans: 'working',           level: 'A2' },
  { q: 'What does "curious" mean?',           opts: ['Wanting to learn','Very tired','Quite hungry','Slightly angry'],      ans: 'Wanting to learn',  level: 'A2' },
  { q: 'Which word means "to allow"?',        opts: ['Permit','Prevent','Pursue','Pretend'],                                ans: 'Permit',            level: 'A2' },
  { q: '"_____ the rain, we went hiking." Choose the best phrase.', opts: ['Despite','Because','Although','However'],     ans: 'Despite',           level: 'A2' },

  // ── B1 (q 11-13) ──
  { q: 'What does "ambiguous" mean?',         opts: ['Having more than one meaning','Very clear','Completely wrong','Slightly boring'], ans: 'Having more than one meaning', level: 'B1' },
  { q: 'Choose the correct phrasal verb: "She _____ a new hobby last month."', opts: ['took up','took off','took over','took in'], ans: 'took up', level: 'B1' },
  { q: '"The policy had far-_____ consequences." Choose the best word.',         opts: ['reaching','going','seeing','coming'],       ans: 'reaching', level: 'B1' },

  // ── B2 (q 14-17) ──
  { q: 'What does "juxtapose" mean?',         opts: ['Place side by side for contrast','To argue strongly','To ignore completely','To deeply analyse'], ans: 'Place side by side for contrast', level: 'B2' },
  { q: '"Had I known, I _____ differently." Choose the correct form.',           opts: ['would have acted','will have acted','would act','had acted'], ans: 'would have acted', level: 'B2' },
  { q: 'What does "pragmatic" mean?',         opts: ['Dealing with things practically','Being overly emotional','Acting without thinking','Remaining completely neutral'], ans: 'Dealing with things practically', level: 'B2' },
  { q: 'Which word best completes: "The report _____ several key issues."?',     opts: ['delineates','delicates','deliberates','delineates'],   ans: 'delineates', level: 'B2' },

  // ── C1 (q 18-20) ──
  { q: 'What does "surreptitious" mean?',     opts: ['Done secretly','Extremely happy','Very confused','Widely known'],   ans: 'Done secretly',    level: 'C1' },
  { q: '"The treaty was _____ ratified by all signatories." Best adverb?',       opts: ['subsequently','simultaneous','supposedly','subjectively'], ans: 'subsequently', level: 'C1' },
  { q: 'What does "equivocate" mean?',        opts: ['Use vague language to avoid commitment','Speak very directly','Completely disagree','Support strongly'], ans: 'Use vague language to avoid commitment', level: 'C1' },

  // ── C2 (q 21-25) ──
  { q: 'What does "recondite" mean?',         opts: ['Little known; obscure','Widely celebrated','Freshly discovered','Openly debated'],    ans: 'Little known; obscure',  level: 'C2' },
  { q: '"The author\'s _____ prose left critics divided." Best adjective?',      opts: ['abstruse','abstract','abusive','abrasive'],           ans: 'abstruse',               level: 'C2' },
  { q: 'What does "tendentious" mean?',       opts: ['Promoting a particular cause or bias','Completely balanced','Widely accepted','Based on evidence'], ans: 'Promoting a particular cause or bias', level: 'C2' },
  { q: '"The legislation was _____ drafted to avoid loopholes." Best adverb?',   opts: ['meticulously','meticulous','meticulously','careful'],  ans: 'meticulously',           level: 'C2' },
  { q: 'What does "enervate" mean?',          opts: ['To weaken or drain energy','To strengthen resolve','To inspire deeply','To carefully observe'], ans: 'To weaken or drain energy', level: 'C2' },
];

type Phase = 'intro' | 'test' | 'result';

interface Answer { questionIdx: number; chosen: string; correct: boolean }

export function PreTest() {
  const { currentUser, updateCurrentUserProfile } = useAuth();
  const { addToast } = useApp();
  const navigate = useNavigate();

  const [phase, setPhase]         = useState<Phase>('intro');
  const [qIdx, setQIdx]           = useState(0);
  const [answers, setAnswers]     = useState<Answer[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [revealed, setRevealed]   = useState(false);
  const [saving, setSaving]       = useState(false);

  // Randomise option order per question (but keep the same order per session)
  const shuffledOpts = useMemo(() =>
    QUESTION_BANK.map(q => [...q.opts].sort(() => Math.random() - 0.5)),
    [] // once per mount
  );

  const totalQ   = QUESTION_BANK.length;
  const q        = QUESTION_BANK[qIdx];
  const score    = answers.filter(a => a.correct).length;
  const cefrLevel = scoreToCEFR(score);
  const cStyle   = CEFR_STYLE[cefrLevel];

  const handleSelect = (opt: string) => {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
    setAnswers(prev => [...prev, {
      questionIdx: qIdx,
      chosen: opt,
      correct: opt === q.ans,
    }]);
  };

  const handleNext = () => {
    if (qIdx < totalQ - 1) {
      setQIdx(p => p + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setPhase('result');
    }
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    const finalScore = answers.filter(a => a.correct).length;
    const finalLevel = scoreToCEFR(finalScore);
    await updateCurrentUserProfile({
      cefrLevel:    finalLevel,
      pretestDone:  true,
      pretestScore: finalScore,
      pretestLevel: finalLevel,
      pretestDate:  new Date().toISOString(),
    } as any);
    addToast(`Pre-test complete! Your level: ${finalLevel}`, 'success');
    setSaving(false);
    navigate('/study/level');
  };

  const handleSkip = () => {
    updateCurrentUserProfile({ pretestDone: true } as any);
    navigate('/');
  };

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-10 text-center max-w-md mx-auto space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FFF3DD]">
          <Star className="h-10 w-10 text-[#F5A623]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">English Level Pre-Test</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Answer 25 questions to find your starting CEFR level.
            The test takes about <strong>5–8 minutes</strong>.
            Your result unlocks the right level in Level Journey automatically.
          </p>
        </div>

        <div className="w-full rounded-xl border border-border bg-card p-4 space-y-2 text-left text-sm">
          {[
            { range: '0 – 4',   level: 'A1', label: 'Beginner'     },
            { range: '5 – 10',  level: 'A2', label: 'Elementary'   },
            { range: '11 – 13', level: 'B1', label: 'Intermediate' },
            { range: '14 – 17', level: 'B2', label: 'Upper-Int.'   },
            { range: '18 – 20', level: 'C1', label: 'Advanced'     },
            { range: '21 – 25', level: 'C2', label: 'Mastery'      },
          ].map(row => (
            <div key={row.level} className="flex items-center justify-between">
              <span className="text-muted-foreground">{row.range} correct</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CEFR_STYLE[row.level].bg} ${CEFR_STYLE[row.level].text}`}>
                {row.level} · {row.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex w-full gap-3">
          <button onClick={handleSkip}
            className="flex-1 rounded-[10px] border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            Skip for now
          </button>
          <button onClick={() => setPhase('test')}
            className="flex-1 rounded-[10px] bg-[#F5A623] py-3 text-sm font-bold text-white hover:bg-[#E09400] transition-colors">
            Start Test
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const pct = Math.round((score / totalQ) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-10 text-center max-w-md mx-auto space-y-6">

        <Trophy className="h-14 w-14 text-[#F5A623]" strokeWidth={1.5} />

        <div>
          <h2 className="text-2xl font-bold text-foreground">Pre-Test Complete!</h2>
          <p className="text-muted-foreground mt-1">You answered {score} of {totalQ} correctly ({pct}%)</p>
        </div>

        {/* Score ring */}
        <div className={`flex h-28 w-28 flex-col items-center justify-center rounded-full ring-4 ${cStyle.bg} ring-current`}>
          <span className={`text-3xl font-black ${cStyle.text}`}>{cefrLevel}</span>
          <span className={`text-[11px] font-semibold ${cStyle.text}`}>{cStyle.label.split(' · ')[1]}</span>
        </div>

        {/* Band breakdown */}
        <div className="w-full rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
          <p className="font-semibold text-foreground mb-2">Your score breakdown</p>
          {(['A1','A2','B1','B2','C1','C2'] as const).map(lvl => {
            const qInLevel = QUESTION_BANK.filter(q => q.level === lvl);
            const correct  = answers.filter((a, i) => QUESTION_BANK[i]?.level === lvl && a.correct).length;
            return (
              <div key={lvl} className="flex items-center gap-3">
                <span className={`w-16 rounded-full px-2 py-0.5 text-center text-[11px] font-bold ${CEFR_STYLE[lvl].bg} ${CEFR_STYLE[lvl].text}`}>{lvl}</span>
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-[#F5A623] transition-all"
                    style={{ width: `${qInLevel.length > 0 ? (correct / qInLevel.length) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{correct}/{qInLevel.length}</span>
              </div>
            );
          })}
        </div>

        <div className="w-full rounded-xl border border-[#F5A623]/30 bg-[#FFF8EC] p-4 text-sm text-left">
          <p className="font-semibold text-foreground">What happens next?</p>
          <p className="text-muted-foreground mt-1">
            Your Level Journey will start at <strong>{cefrLevel}</strong>.
            You can unlock higher levels as you pass each stage.
            All previous levels are also available for revision.
          </p>
        </div>

        <button onClick={handleSaveAndContinue} disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-[#F5A623] py-3 text-sm font-bold text-white hover:bg-[#E09400] transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : <><span>Start Learning at {cefrLevel}</span><ChevronRight className="h-4 w-4" strokeWidth={2}/></>}
        </button>
      </motion.div>
    );
  }

  // ── Test questions ──────────────────────────────────────────────────────────
  const progress = ((qIdx + (revealed ? 1 : 0)) / totalQ) * 100;
  const lvlStyle = CEFR_STYLE[q.level] ?? CEFR_STYLE.A1;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {qIdx + 1} of {totalQ}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${lvlStyle.bg} ${lvlStyle.text}`}>
            {q.level} level
          </span>
        </div>
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <motion.div className="h-full rounded-full bg-[#F5A623]"
            animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Score: {answers.filter(a => a.correct).length} correct</span>
          <span>{Math.round(progress)}% done</span>
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <p className="text-base font-semibold text-foreground leading-relaxed">{q.q}</p>
          <div className="space-y-2.5">
            {shuffledOpts[qIdx].map((opt, i) => {
              const isSel     = selected === opt;
              const isCorrect = opt === q.ans;
              let cls = 'border border-border bg-card text-foreground hover:border-[#F5A623]/60 cursor-pointer';
              if (revealed) {
                cls = isCorrect
                  ? 'border-2 border-[#34C759] bg-green-50 text-[#16A34A]'
                  : isSel
                  ? 'border-2 border-[#FF3B30] bg-red-50 text-[#FF3B30]'
                  : 'border border-border bg-muted/30 text-muted-foreground cursor-default';
              } else if (isSel) {
                cls = 'border-2 border-[#F5A623] bg-[#FFF3DD] text-foreground';
              }
              return (
                <button key={i} onClick={() => handleSelect(opt)} disabled={revealed}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium transition-all ${cls}`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 text-xs font-bold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />}
                  {revealed && isSel && !isCorrect && <XCircle className="h-4 w-4 shrink-0" strokeWidth={2} />}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {revealed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden">
                <div className="rounded-xl bg-muted/40 p-3 text-sm text-foreground">
                  <strong>Correct answer:</strong> {q.ans}
                </div>
                <button onClick={handleNext}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5A623] py-3 text-sm font-bold text-white hover:bg-[#E09400] transition-colors">
                  {qIdx < totalQ - 1 ? 'Next Question' : 'See My Results'}
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
