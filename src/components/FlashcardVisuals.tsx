import { Star } from 'lucide-react';
import { useApp } from '@/App';

// ── Visual tokens (shared by Flashcards and Categories study card) ──────────
export const POS_COLORS: Record<string, string> = {
  noun:'bg-blue-50 text-blue-700', verb:'bg-green-50 text-green-700',
  adjective:'bg-purple-50 text-purple-700', adverb:'bg-orange-50 text-orange-700',
  pronoun:'bg-pink-50 text-pink-700', preposition:'bg-gray-50 text-gray-700',
  conjunction:'bg-teal-50 text-teal-700', interjection:'bg-red-50 text-red-700',
  phrase:'bg-indigo-50 text-indigo-700',
};

export const CEFR_STYLE: Record<string, { bg: string; label: string }> = {
  A1:{ bg:'bg-emerald-100 text-emerald-700', label:'A1 · Beginner'     },
  A2:{ bg:'bg-green-100   text-green-700',   label:'A2 · Elementary'   },
  B1:{ bg:'bg-yellow-100  text-yellow-700',  label:'B1 · Intermediate' },
  B2:{ bg:'bg-orange-100  text-orange-700',  label:'B2 · Upper-Int.'   },
  C1:{ bg:'bg-red-100     text-red-700',     label:'C1 · Advanced'     },
  C2:{ bg:'bg-purple-100  text-purple-700',  label:'C2 · Mastery'      },
};

export const DIFF_STYLE: Record<string,{color:string;dots:number;label:string}> = {
  easy:{color:'text-emerald-600',dots:1,label:'Easy'},
  medium:{color:'text-amber-500',dots:2,label:'Medium'},
  hard:{color:'text-red-500',dots:3,label:'Hard'},
};

export function DiffDots({ level }: { level: string }) {
  const s = DIFF_STYLE[level] ?? DIFF_STYLE.medium;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${s.color}`}>
      {[1,2,3].map(n=><span key={n} className={`inline-block h-1.5 w-1.5 rounded-full ${n<=s.dots?'bg-current':'bg-current opacity-20'}`}/>)}
      <span className="ml-1">{s.label}</span>
    </span>
  );
}

// ── Star button — ALWAYS reads live state ─────────────────────────────────────
export function StarButton({ wordId, className = '' }: { wordId: string; className?: string }) {
  const { vocabulary, addToast } = useApp();
  // Always read live isStarred from vocabulary.words — never from stale snapshot
  const live = vocabulary.words.find(w => w.id === wordId);
  const isStarred = live?.isStarred ?? false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    vocabulary.toggleStar(wordId);
    addToast(isStarred ? 'Removed from Favorites' : '⭐ Added to Favorites', 'success');
  };

  return (
    <button
      onClick={handleClick}
      className={`rounded-lg p-1.5 transition-all hover:scale-110 active:scale-95 hover:bg-muted/50 ${className}`}
      title={isStarred ? 'Remove from Favorites (S)' : 'Add to Favorites (S)'}
    >
      <Star
        className={`h-5 w-5 transition-all ${isStarred ? 'fill-[#F5A623] text-[#F5A623] drop-shadow-sm' : 'text-muted-foreground'}`}
        strokeWidth={1.5}
      />
    </button>
  );
}
