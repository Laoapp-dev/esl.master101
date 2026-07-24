/**
 * Categories — learn & practice vocabulary grouped by topic
 *
 * Rules (mirrors LevelJourney):
 *  • Words are grouped by their `category` field (e.g. "Emotions", "Communication").
 *  • Within a category, the same CEFR level-lock rules apply as everywhere
 *    else: A1 is always open, each next level needs ≥80% mastery on the
 *    previous one (or a passed pre-test at that level).
 *  • Picking a category + level and a study mode hands off to that mode via
 *    sessionStorage — exactly the same mechanism Level Journey and Favorites
 *    already use — so Flashcards/Quiz/Matching/Spelling need no separate
 *    "category mode"; they just receive an extra filter.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tags, Search, Layers, HelpCircle, Puzzle, Keyboard,
  Lock, ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import type { CEFRLevel, VocabularyWord } from '@/types/vocabulary';
import { CEFR_ORDER, UNLOCK_PCT, isLevelUnlocked, getPretestLevel } from '@/lib/levelLock';

const MODES = [
  { path: '/study/flashcards', label: 'Flashcards', icon: Layers,     desc: 'Flip cards to learn' },
  { path: '/study/quiz',       label: 'Quiz',       icon: HelpCircle, desc: 'Multiple choice'      },
  { path: '/study/matching',   label: 'Matching',   icon: Puzzle,     desc: 'Pair up words'         },
  { path: '/study/spelling',   label: 'Spelling',   icon: Keyboard,   desc: 'Type the word'         },
];

const UNCATEGORIZED = 'Uncategorized';

// Cycle a small color palette across category cards so the list is easy to
// visually scan without needing per-category configuration.
const PALETTE = [
  { bg: 'bg-blue-50',   text: 'text-blue-600'   },
  { bg: 'bg-purple-50', text: 'text-purple-600' },
  { bg: 'bg-emerald-50',text: 'text-emerald-600'},
  { bg: 'bg-orange-50', text: 'text-orange-600' },
  { bg: 'bg-pink-50',   text: 'text-pink-600'   },
  { bg: 'bg-teal-50',   text: 'text-teal-600'   },
  { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  { bg: 'bg-rose-50',   text: 'text-rose-600'   },
  { bg: 'bg-amber-50',  text: 'text-amber-600'  },
  { bg: 'bg-cyan-50',   text: 'text-cyan-600'   },
];

interface CategoryStats {
  name: string;
  words: VocabularyWord[];
  total: number;
  learned: number;
  mastery: number;
  byLevel: Partial<Record<CEFRLevel, number>>;
}

export function Categories() {
  const { vocabulary } = useApp();
  const navigate = useNavigate();
  const pretestLevel = getPretestLevel();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [levelChoice, setLevelChoice] = useState<Record<string, CEFRLevel | 'all'>>({});

  const categories = useMemo<CategoryStats[]>(() => {
    const byName = new Map<string, VocabularyWord[]>();
    for (const w of vocabulary.words) {
      const name = w.category?.trim() || UNCATEGORIZED;
      const list = byName.get(name) ?? [];
      list.push(w);
      byName.set(name, list);
    }
    const stats: CategoryStats[] = [];
    for (const [name, words] of byName) {
      const learned = words.filter(w => w.isLearned).length;
      const byLevel: Partial<Record<CEFRLevel, number>> = {};
      for (const lvl of CEFR_ORDER) {
        const count = words.filter(w => w.cefrLevel === lvl).length;
        if (count > 0) byLevel[lvl] = count;
      }
      stats.push({
        name,
        words,
        total: words.length,
        learned,
        mastery: words.length > 0 ? Math.round((learned / words.length) * 100) : 0,
        byLevel,
      });
    }
    // Alphabetical, but keep "Uncategorized" last
    return stats.sort((a, b) => {
      if (a.name === UNCATEGORIZED) return 1;
      if (b.name === UNCATEGORIZED) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [vocabulary.words]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.trim().toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const startStudy = (category: CategoryStats, modePath: string) => {
    const level = levelChoice[category.name] ?? 'all';
    sessionStorage.setItem('moe_study_filter', 'category');
    sessionStorage.setItem('moe_study_category', category.name);
    if (level === 'all') {
      sessionStorage.removeItem('moe_study_level');
    } else {
      sessionStorage.setItem('moe_study_level', level);
    }
    navigate(modePath);
  };

  const totalWords   = vocabulary.words.length;
  const totalLearned = vocabulary.words.filter(w => w.isLearned).length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="space-y-5 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Tags className="h-6 w-6 text-[#F5A623]" strokeWidth={1.5} /> Categories
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Learn and practice vocabulary grouped by topic — pick a category, a level, and a mode
        </p>
      </div>

      {/* Search */}
      {categories.length > 6 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40"
          />
        </div>
      )}

      {totalWords === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No words in your library yet. Add words to see them grouped by category here.
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No categories match "{search}"
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((cat, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            const isExpanded = expanded === cat.name;
            const chosenLevel = levelChoice[cat.name] ?? 'all';
            const levelsInCategory = CEFR_ORDER.filter(l => cat.byLevel[l]);
            const isComplete = cat.mastery >= UNLOCK_PCT && cat.total > 0;

            // Words available for the currently-chosen level (used to show
            // an accurate "remaining" count and to disable modes if empty)
            const scopedWords = chosenLevel === 'all'
              ? cat.words
              : cat.words.filter(w => w.cefrLevel === chosenLevel);
            const scopedRemaining = scopedWords.filter(w => !w.isLearned).length;

            return (
              <motion.div key={cat.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 8) * 0.04 }}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isExpanded ? 'border-[#F5A623] shadow-md shadow-[#F5A623]/10' : 'border-border'
                }`}>

                {/* Card header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : cat.name)}
                  className="w-full flex items-center gap-4 p-4 bg-card text-left"
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isComplete ? 'bg-[#F5A623]' : color.bg
                  }`}>
                    {isComplete
                      ? <CheckCircle2 className="h-6 w-6 text-white" strokeWidth={2} />
                      : <Tags className={`h-5 w-5 ${color.text}`} strokeWidth={1.5} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{cat.name}</span>
                      {isComplete && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">✓ Mastered</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {levelsInCategory.map(l => (
                        <span key={l} className="text-[10px] font-semibold text-muted-foreground bg-muted/60 rounded-full px-1.5 py-0.5">
                          {l} · {cat.byLevel[l]}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>{cat.learned}/{cat.total} mastered</span>
                        <span className={cat.mastery >= UNLOCK_PCT ? 'text-green-600 font-bold' : ''}>{cat.mastery}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div style={{ width: `${cat.mastery}%` }}
                          className={`h-full rounded-full transition-all ${cat.mastery >= UNLOCK_PCT ? 'bg-green-500' : 'bg-[#F5A623]'}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded
                    ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  }
                </button>

                {/* Expanded: level picker + study modes */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="border-t border-border bg-muted/30 px-4 py-4 space-y-4">

                      {/* Level picker (same unlock rules as everywhere else) */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Level
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setLevelChoice(prev => ({ ...prev, [cat.name]: 'all' }))}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              chosenLevel === 'all'
                                ? 'bg-[#F5A623] text-white'
                                : 'bg-card border border-border text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            All ({cat.total})
                          </button>
                          {levelsInCategory.map(level => {
                            const locked = !isLevelUnlocked(vocabulary.words, level, pretestLevel);
                            return (
                              <button
                                key={level}
                                onClick={() => !locked && setLevelChoice(prev => ({ ...prev, [cat.name]: level }))}
                                disabled={locked}
                                className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  chosenLevel === level
                                    ? 'bg-[#F5A623] text-white'
                                    : locked
                                    ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
                                    : 'bg-card border border-border text-muted-foreground hover:bg-muted/50'
                                }`}
                              >
                                {locked && <Lock className="inline h-2.5 w-2.5 mr-1 -mt-0.5" />}
                                {level} ({cat.byLevel[level]})
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          🔒 Levels unlock when the previous level reaches {UNLOCK_PCT}% mastery
                        </p>
                      </div>

                      {/* Study modes */}
                      {scopedWords.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No words available at this level for this category.
                        </p>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Practice — {scopedRemaining} remaining
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {MODES.map(m => (
                              <button key={m.path} onClick={() => startStudy(cat, m.path)}
                                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 hover:border-[#F5A623]/60 hover:bg-[#FFF3DD]/60 transition-colors">
                                <m.icon className="h-5 w-5 text-[#F5A623]" strokeWidth={1.5} />
                                <span className="text-xs font-medium text-foreground">{m.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {totalLearned === totalWords && totalWords > 0 && (
        <div className="rounded-2xl bg-[#F5A623] text-white p-6 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
          <h3 className="text-xl font-bold">All caught up!</h3>
          <p className="text-white/80 mt-1">You've mastered every word across every category.</p>
        </div>
      )}
    </motion.div>
  );
}
