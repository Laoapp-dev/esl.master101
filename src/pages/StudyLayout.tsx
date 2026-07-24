import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, HelpCircle, Puzzle, Keyboard, ArrowLeft, TrendingUp, Tags } from 'lucide-react';

const studyModes = [
  { path: '/study/level',      label: 'Level Journey', icon: TrendingUp,  description: 'Progress A1 → C2 level by level', featured: true  },
  { path: '/study/categories', label: 'Categories',    icon: Tags,        description: 'Learn & practice by topic',        featured: false },
  { path: '/study/flashcards', label: 'Flashcards',    icon: Layers,      description: 'Flip cards to test your memory',  featured: false },
  { path: '/study/quiz',       label: 'Quiz',          icon: HelpCircle,  description: 'Multiple-choice questions',        featured: false },
  { path: '/study/matching',   label: 'Matching',      icon: Puzzle,      description: 'Match words & definitions',        featured: false },
  { path: '/study/spelling',   label: 'Spelling',      icon: Keyboard,    description: 'Type the correct word',           featured: false },
];

export function StudyLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isRoot = pathname === '/study';

  if (isRoot) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Study</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a mode to practice your vocabulary</p>
        </div>

        {/* Featured: Level Journey */}
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          onClick={() => navigate('/study/level')}
          className="w-full card-hover flex items-center gap-4 rounded-2xl border-2 border-[#F5A623] bg-[#FFF3DD] p-6 text-left"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F5A623]">
            <TrendingUp className="h-8 w-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#1A1A2E]">Level Journey</h3>
              <span className="text-[10px] bg-[#F5A623] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Recommended</span>
            </div>
            <p className="text-sm text-[#6B6B80] mt-0.5">Start at A1 and progress level by level up to C2 mastery</p>
          </div>
        </motion.button>

        {/* Other modes */}
        <div className="grid gap-3 md:grid-cols-2">
          {studyModes.filter(m => !m.featured).map((mode, i) => (
            <motion.button
              key={mode.path}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
              onClick={() => navigate(mode.path)}
              className="card-hover flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF3DD]">
                <mode.icon className="h-6 w-6 text-[#F5A623]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{mode.label}</h3>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  const currentMode = studyModes.find(m => pathname.startsWith(m.path));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/study')}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted/50">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">{currentMode?.label}</h1>
      </div>
      <Outlet />
    </div>
  );
}
