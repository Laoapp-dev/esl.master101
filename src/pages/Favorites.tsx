import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, Layers, HelpCircle, Puzzle, Keyboard, Search, BookOpen, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { WordCard } from '@/components/WordCard';
import { AddWordModal } from '@/components/AddWordModal';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import type { VocabularyWord } from '@/types/vocabulary';

const STUDY_MODES = [
  { path: '/study/flashcards', label: 'Flashcards', icon: Layers,     desc: 'Flip cards', col: 'bg-amber-50  text-amber-600'  },
  { path: '/study/quiz',       label: 'Quiz',       icon: HelpCircle, desc: 'MCQ',        col: 'bg-blue-50   text-blue-600'   },
  { path: '/study/matching',   label: 'Matching',   icon: Puzzle,     desc: 'Pair up',    col: 'bg-purple-50 text-purple-600' },
  { path: '/study/spelling',   label: 'Spelling',   icon: Keyboard,   desc: 'Type it',    col: 'bg-green-50  text-green-600'  },
];

export function Favorites() {
  const { vocabulary } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [editWord, setEditWord] = useState<VocabularyWord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const allStarred = vocabulary.words.filter(w => w.isStarred);

  const favorites = useMemo(() => {
    if (!search.trim()) return allStarred;
    const q = search.toLowerCase();
    return allStarred.filter(w =>
      w.word.toLowerCase().includes(q) || w.definition.toLowerCase().includes(q)
    );
  }, [allStarred, search]);

  const learnedCount = allStarred.filter(w => w.isLearned).length;

  const handleStudy = (modePath: string) => {
    sessionStorage.setItem('moe_study_filter', 'favorites');
    sessionStorage.removeItem('moe_study_level');
    navigate(modePath);
  };

  const handleEdit   = (w: VocabularyWord) => { setEditWord(w); setIsAddOpen(true); };
  const handleDelete = (id: string) => {
    const w = vocabulary.words.find(x => x.id === id);
    if (w) { setDeleteId(id); setDeleteName(w.word); }
  };
  const confirmDelete = () => { if (deleteId) { vocabulary.deleteWord(deleteId); setDeleteId(null); } };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6 fill-[#F5A623] text-[#F5A623]" /> Favorites
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allStarred.length} starred · {learnedCount} mastered
          </p>
        </div>
        {allStarred.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Trophy className="h-3.5 w-3.5 text-[#F5A623]" />
            {Math.round((learnedCount / allStarred.length) * 100)}% mastered
          </div>
        )}
      </div>

      {/* Study panel */}
      {allStarred.length > 0 && (
        <div className="rounded-2xl bg-[#1A1A2E] p-5 text-white">
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-3">
            Study only your favorites
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STUDY_MODES.map(m => (
              <button key={m.path} onClick={() => handleStudy(m.path)}
                className="flex flex-col items-center gap-2 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 py-3 px-2 transition-colors">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${m.col} bg-opacity-90`}>
                  <m.icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">{m.label}</p>
                  <p className="text-[10px] text-white/40">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      {allStarred.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search favorites…"
            className="w-full rounded-[10px] border border-border bg-card py-2.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40" />
        </div>
      )}

      {/* Grid */}
      {favorites.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {favorites.map((word, i) => (
            <motion.div key={word.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.4) }}>
              <WordCard word={word} onEdit={handleEdit} onDelete={handleDelete}
                showTranslations={vocabulary.settings.showTranslations} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center px-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <Star className="h-7 w-7 text-[#F5A623]" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No favorites yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Tap the ★ on any word card to save it here for quick access and focused study.
          </p>
          <button onClick={() => navigate('/words')}
            className="mt-5 flex items-center gap-2 rounded-[10px] bg-[#F5A623] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#E09400]">
            <BookOpen className="h-4 w-4" /> Browse Words
          </button>
        </div>
      )}

      <AddWordModal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); setEditWord(null); }} editWord={editWord} />
      <DeleteConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} wordName={deleteName} />
    </motion.div>
  );
}
