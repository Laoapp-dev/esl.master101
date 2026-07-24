import { Star, Volume2, Pencil, Trash2, Tag, BarChart2 } from 'lucide-react';
import { useApp } from '@/App';
import { useAuth } from '@/hooks/useAuth';
import { useSpeech } from '@/hooks/useSpeech';
import type { VocabularyWord } from '@/types/vocabulary';

interface WordCardProps {
  word: VocabularyWord;
  onEdit: (word: VocabularyWord) => void;
  onDelete: (id: string) => void;
  showTranslations?: boolean;
}

const POS_COLORS: Record<string, string> = {
  noun:         'bg-blue-50   text-blue-700',
  verb:         'bg-green-50  text-green-700',
  adjective:    'bg-purple-50 text-purple-700',
  adverb:       'bg-orange-50 text-orange-700',
  pronoun:      'bg-pink-50   text-pink-700',
  preposition:  'bg-gray-50   text-gray-700',
  conjunction:  'bg-teal-50   text-teal-700',
  interjection: 'bg-red-50    text-red-700',
  phrase:       'bg-indigo-50 text-indigo-700',
};

// CEFR: colour + label to match the level's "feel"
const CEFR_STYLE: Record<string, { bg: string; label: string }> = {
  A1: { bg: 'bg-emerald-100 text-emerald-700', label: 'A1 · Beginner'      },
  A2: { bg: 'bg-green-100   text-green-700',   label: 'A2 · Elementary'    },
  B1: { bg: 'bg-yellow-100  text-yellow-700',  label: 'B1 · Intermediate'  },
  B2: { bg: 'bg-orange-100  text-orange-700',  label: 'B2 · Upper-Int.'    },
  C1: { bg: 'bg-red-100     text-red-700',     label: 'C1 · Advanced'      },
  C2: { bg: 'bg-purple-100  text-purple-700',  label: 'C2 · Mastery'       },
};

// Difficulty: icon dots + colour
const DIFF_STYLE: Record<string, { color: string; dots: number; label: string }> = {
  easy:   { color: 'text-emerald-600', dots: 1, label: 'Easy'   },
  medium: { color: 'text-amber-500',   dots: 2, label: 'Medium' },
  hard:   { color: 'text-red-500',     dots: 3, label: 'Hard'   },
};

function DifficultyDots({ level }: { level: string }) {
  const style = DIFF_STYLE[level] ?? DIFF_STYLE.medium;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${style.color}`}>
      {[1, 2, 3].map(n => (
        <span
          key={n}
          className={`inline-block h-1.5 w-1.5 rounded-full ${n <= style.dots ? 'bg-current' : 'bg-current opacity-20'}`}
        />
      ))}
      <span className="ml-1">{style.label}</span>
    </span>
  );
}

export function WordCard({ word, onEdit, onDelete, showTranslations = true }: WordCardProps) {
  const { vocabulary } = useApp();
  const { currentUser } = useAuth();
  const { speak } = useSpeech();
  const isAdmin = currentUser?.role === 'admin';

  const cefrStyle = CEFR_STYLE[word.cefrLevel] ?? { bg: 'bg-gray-100 text-gray-700', label: word.cefrLevel };

  return (
    <div className="group rounded-2xl border border-[#E5E5DD] dark:border-white/10 bg-white dark:bg-white/5 p-5 transition-shadow hover:shadow-md">

      {/* ── Row 1: word + POS + star ── */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">{word.word}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${POS_COLORS[word.partOfSpeech] ?? 'bg-gray-50 text-gray-700'}`}>
            {word.partOfSpeech}
          </span>
        </div>
        <button
          onClick={() => vocabulary.toggleStar(word.id)}
          className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[#F5F5F0] dark:hover:bg-white/10"
          title={word.isStarred ? 'Unstar' : 'Star'}
        >
          <Star className={`h-4 w-4 ${word.isStarred ? 'fill-[#F5A623] text-[#F5A623]' : 'text-[#9B9BAE]'}`} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Row 2: CEFR · difficulty · category badges ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* CEFR level */}
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${cefrStyle.bg}`}>
          {cefrStyle.label}
        </span>

        {/* Difficulty dots */}
        {word.difficulty && <DifficultyDots level={word.difficulty} />}

        {/* Category */}
        {word.category && (
          <span className="flex items-center gap-1 rounded-full bg-[#F5F5F0] dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-[#6B6B80] dark:text-white/60">
            <Tag className="h-2.5 w-2.5" />
            {word.category}
          </span>
        )}
      </div>

      {/* ── Definition ── */}
      <p className="mb-2 text-sm text-[#6B6B80] dark:text-white/60 line-clamp-2">{word.definition}</p>

      {/* ── Translations ── */}
      {showTranslations && (word.laoTranslation || word.thaiTranslation) && (
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-[#9B9BAE]">
          {word.laoTranslation && (
            <span>🇱🇦 <span className="text-[#6B6B80] dark:text-white/50">{word.laoTranslation}</span></span>
          )}
          {word.thaiTranslation && (
            <span>🇹🇭 <span className="text-[#6B6B80] dark:text-white/50">{word.thaiTranslation}</span></span>
          )}
        </div>
      )}

      {/* ── Example sentence ── */}
      {word.exampleSentence && (
        <p className="mb-3 text-[13px] italic text-[#9B9BAE] line-clamp-2">
          &ldquo;{word.exampleSentence}&rdquo;
        </p>
      )}

      {/* ── Synonyms / Antonyms ── */}
      {(word.synonym || word.antonym) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {word.synonym && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-[#9B9BAE]">Syn:</span>
              {word.synonym.split(',').map((s, i) => (
                <span key={i} className="rounded-full bg-[#FFF3DD] px-2 py-0.5 text-[11px] font-medium text-[#B37600]">
                  {s.trim()}
                </span>
              ))}
            </div>
          )}
          {word.antonym && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-[#9B9BAE]">Ant:</span>
              {word.antonym.split(',').map((a, i) => (
                <span key={i} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                  {a.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Study progress bar (only shown if word has been studied) ── */}
      {word.studyCount > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1 text-[11px] text-[#9B9BAE]">
              <BarChart2 className="h-3 w-3" /> Progress
            </span>
            <span className="text-[11px] text-[#9B9BAE]">
              {word.correctCount}/{word.studyCount} correct
            </span>
          </div>
          <div className="h-1 rounded-full bg-[#F5F5F0] dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#34C759] transition-all"
              style={{ width: `${Math.round((word.correctCount / word.studyCount) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex items-center gap-1 pt-2 border-t border-[#EBEBE6] dark:border-white/10">
        {/* Pronunciation — available to everyone */}
        <button
          onClick={() => speak(word.word)}
          className="rounded-lg p-1.5 text-[#9B9BAE] transition-colors hover:bg-[#F5F5F0] dark:hover:bg-white/10 hover:text-[#1A1A2E] dark:hover:text-white"
          title="Hear pronunciation"
        >
          <Volume2 className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {/* Edit & Delete — admin only */}
        {isAdmin && (
          <>
            <button
              onClick={() => onEdit(word)}
              className="rounded-lg p-1.5 text-[#9B9BAE] transition-colors hover:bg-[#F5F5F0] dark:hover:bg-white/10 hover:text-[#1A1A2E] dark:hover:text-white"
              title="Edit word"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => onDelete(word.id)}
              className="rounded-lg p-1.5 text-[#9B9BAE] transition-colors hover:bg-red-50 hover:text-[#FF3B30]"
              title="Delete word"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </>
        )}

        {/* Learned badge */}
        {word.isLearned && (
          <span className="ml-auto rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#16A34A]">
            ✓ Learned
          </span>
        )}
      </div>
    </div>
  );
}
