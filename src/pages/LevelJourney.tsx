/**
 * LevelJourney — CEFR A1→C2 progression
 * 
 * Rules:
 *  • Starts at A1. Must reach ≥80% mastery to unlock next level.
 *  • Mastery = learnedWords / totalWords × 100 for that CEFR level.
 *  • Expand any unlocked level to launch any of the 4 study modes.
 *  • Study modes receive level filter via sessionStorage so they filter correctly.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Layers, HelpCircle, Puzzle, Keyboard,
  Lock, CheckCircle2, Star, ChevronDown, ChevronUp, Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import type { CEFRLevel } from '@/types/vocabulary';

const CEFR: { level: CEFRLevel; label: string; desc: string; badge: string }[] = [
  { level: 'A1', label: 'Beginner',      desc: 'Everyday expressions & basic phrases',           badge: 'bg-emerald-100 text-emerald-700' },
  { level: 'A2', label: 'Elementary',    desc: 'Familiar topics & simple communication',          badge: 'bg-teal-100    text-teal-700'    },
  { level: 'B1', label: 'Intermediate',  desc: 'Main points of clear, standard input',            badge: 'bg-blue-100    text-blue-700'    },
  { level: 'B2', label: 'Upper-Int.',    desc: 'Complex texts & abstract topics',                 badge: 'bg-indigo-100  text-indigo-700'  },
  { level: 'C1', label: 'Advanced',      desc: 'Demanding academic & professional language',      badge: 'bg-purple-100  text-purple-700'  },
  { level: 'C2', label: 'Mastery',       desc: 'Nuanced precision in any situation',              badge: 'bg-rose-100    text-rose-700'    },
];

const MODES = [
  { path: '/study/flashcards', label: 'Flashcards', icon: Layers     },
  { path: '/study/quiz',       label: 'Quiz',       icon: HelpCircle },
  { path: '/study/matching',   label: 'Matching',   icon: Puzzle     },
  { path: '/study/spelling',   label: 'Spelling',   icon: Keyboard   },
];

const UNLOCK_PCT = 80;

export function LevelJourney() {
  const { vocabulary } = useApp();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<CEFRLevel | null>(null);

  // Per-level stats
  const stats = useMemo(() => CEFR.map(({ level }) => {
    const total   = vocabulary.words.filter(w => w.cefrLevel === level).length;
    const learned = vocabulary.words.filter(w => w.cefrLevel === level && w.isLearned).length;
    const mastery = total > 0 ? Math.round((learned / total) * 100) : 0;
    return { level, total, learned, mastery };
  }), [vocabulary.words]);

  // Which levels are unlocked (A1 always; each subsequent needs prev ≥80%)
  const unlocked = useMemo(() => {
    const s = new Set<CEFRLevel>();
    for (let i = 0; i < CEFR.length; i++) {
      if (i === 0) { s.add(CEFR[i].level); continue; }
      const prev = stats[i - 1];
      if (prev.mastery >= UNLOCK_PCT || prev.total === 0) s.add(CEFR[i].level);
    }
    return s;
  }, [stats]);

  const startStudy = (level: CEFRLevel, modePath: string) => {
    sessionStorage.setItem('moe_study_filter', 'level');
    sessionStorage.setItem('moe_study_level', level);
    navigate(modePath);
  };

  const totalWords   = vocabulary.words.length;
  const totalLearned = vocabulary.words.filter(w => w.isLearned).length;
  const overall      = totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="space-y-5 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#F5A623]" strokeWidth={1.5} /> Level Journey
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master each CEFR level to unlock the next. Reach {UNLOCK_PCT}% to advance.
        </p>
      </div>

      {/* Overall banner */}
      <div className="rounded-2xl bg-[#1A1A2E] text-white px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold">Overall Progress</p>
            <p className="text-3xl font-bold mt-0.5">{overall}%</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold">Mastered</p>
            <p className="text-3xl font-bold mt-0.5">{totalLearned}<span className="text-lg text-white/30">/{totalWords}</span></p>
          </div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${overall}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-[#F5A623] rounded-full" />
        </div>
        <div className="flex justify-between">
          {CEFR.map(({ level }, i) => (
            <div key={level} className={`text-[10px] font-bold ${unlocked.has(level) ? 'text-[#F5A623]' : 'text-white/20'}`}>
              {level}
            </div>
          ))}
        </div>
      </div>

      {/* Level cards */}
      <div className="space-y-3">
        {CEFR.map(({ level, label, desc, badge }, idx) => {
          const s        = stats[idx];
          const isUnlocked  = unlocked.has(level);
          const isComplete  = s.mastery >= UNLOCK_PCT && s.total > 0;
          const isExpanded  = expanded === level;
          const nextLevel   = CEFR[idx + 1]?.level;

          return (
            <motion.div key={level} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isExpanded ? 'border-[#F5A623] shadow-md shadow-[#F5A623]/10' :
                isUnlocked ? 'border-border' : 'border-border opacity-50'
              }`}>

              {/* Card header */}
              <button
                onClick={() => isUnlocked && setExpanded(isExpanded ? null : level)}
                disabled={!isUnlocked}
                className="w-full flex items-center gap-4 p-4 bg-card text-left"
              >
                {/* Badge */}
                <div className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                  isComplete ? 'bg-[#F5A623]' : isUnlocked ? badge.split(' ')[0] : 'bg-muted'
                }`}>
                  {!isUnlocked
                    ? <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    : isComplete
                    ? <CheckCircle2 className="h-6 w-6 text-white" strokeWidth={2} />
                    : <span className={`text-sm font-bold ${badge.split(' ')[1]}`}>{level}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{level} — {label}</span>
                    {isComplete && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">✓ Unlocked next</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>

                  {isUnlocked && s.total > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>{s.learned}/{s.total} mastered</span>
                        <span className={s.mastery >= UNLOCK_PCT ? 'text-green-600 font-bold' : ''}>{s.mastery}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div style={{ width: `${s.mastery}%` }}
                          className={`h-full rounded-full transition-all ${s.mastery >= UNLOCK_PCT ? 'bg-green-500' : 'bg-[#F5A623]'}`} />
                      </div>
                      {s.mastery < UNLOCK_PCT && nextLevel && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Need {UNLOCK_PCT - s.mastery}% more to unlock {nextLevel}
                        </p>
                      )}
                    </div>
                  )}
                  {isUnlocked && s.total === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No {level} words yet — check back soon</p>
                  )}
                </div>

                {isUnlocked
                  ? isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                               : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  : <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                }
              </button>

              {/* Expanded study buttons */}
              <AnimatePresence>
                {isExpanded && isUnlocked && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="border-t border-border bg-muted/30 px-4 py-4">
                    {s.total === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No {level} words in your library yet — new lessons are added regularly.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Practice {level} words — {s.total - s.learned} remaining
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {MODES.map(m => (
                            <button key={m.path} onClick={() => startStudy(level, m.path)}
                              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 hover:border-[#F5A623]/60 hover:bg-[#FFF3DD]/60 transition-colors">
                              <m.icon className="h-5 w-5 text-[#F5A623]" strokeWidth={1.5} />
                              <span className="text-xs font-medium text-foreground">{m.label}</span>
                            </button>
                          ))}
                        </div>
                        {isComplete && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                            <Star className="h-4 w-4 fill-green-500 text-green-500" />
                            Level complete! {nextLevel ? `${nextLevel} is now unlocked.` : 'You have reached full mastery! 🎉'}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {totalLearned === totalWords && totalWords > 0 && (
        <div className="rounded-2xl bg-[#F5A623] text-white p-6 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-2" />
          <h3 className="text-xl font-bold">Congratulations!</h3>
          <p className="text-white/80 mt-1">You have mastered all {totalWords} words across all CEFR levels!</p>
        </div>
      )}
    </motion.div>
  );
}
