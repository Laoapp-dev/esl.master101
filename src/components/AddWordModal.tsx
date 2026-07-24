import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '@/App';
import type { VocabularyWord, CEFRLevel, PartOfSpeech } from '@/types/vocabulary';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  editWord?: VocabularyWord | null;
}

const POS_OPTIONS: { value: PartOfSpeech; label: string }[] = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'pronoun', label: 'Pronoun' },
  { value: 'preposition', label: 'Preposition' },
  { value: 'conjunction', label: 'Conjunction' },
  { value: 'interjection', label: 'Interjection' },
  { value: 'phrase', label: 'Phrase' },
];

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function AddWordModal({ isOpen, onClose, editWord }: AddWordModalProps) {
  const { vocabulary, addToast } = useApp();
  const [word, setWord] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>('noun');
  const [laoTranslation, setLaoTranslation] = useState('');
  const [thaiTranslation, setThaiTranslation] = useState('');
  const [definition, setDefinition] = useState('');
  const [category, setCategory] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [synonym, setSynonym] = useState('');
  const [antonym, setAntonym] = useState('');
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('A2');

  useEffect(() => {
    if (editWord) {
      setWord(editWord.word);
      setPartOfSpeech(editWord.partOfSpeech);
      setLaoTranslation(editWord.laoTranslation || '');
      setThaiTranslation(editWord.thaiTranslation || '');
      setDefinition(editWord.definition);
      setCategory(editWord.category || '');
      setExampleSentence(editWord.exampleSentence);
      setSynonym(editWord.synonym || '');
      setAntonym(editWord.antonym || '');
      setCefrLevel(editWord.cefrLevel);
    } else {
      resetForm();
    }
  }, [editWord, isOpen]);

  const resetForm = () => {
    setWord('');
    setPartOfSpeech('noun');
    setLaoTranslation('');
    setThaiTranslation('');
    setDefinition('');
    setCategory('');
    setExampleSentence('');
    setSynonym('');
    setAntonym('');
    setCefrLevel('A2');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!word.trim() || !definition.trim() || !exampleSentence.trim()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    const wordData = {
      word: word.trim(),
      partOfSpeech,
      laoTranslation: laoTranslation.trim() || undefined,
      thaiTranslation: thaiTranslation.trim() || undefined,
      definition: definition.trim(),
      category: category.trim() || undefined,
      exampleSentence: exampleSentence.trim(),
      synonym: synonym.trim() || undefined,
      antonym: antonym.trim() || undefined,
      cefrLevel,
      isStarred: editWord?.isStarred || false,
    };

    if (editWord) {
      vocabulary.updateWord(editWord.id, wordData);
      addToast('Word updated successfully', 'success');
    } else {
      vocabulary.addWord(wordData);
      addToast('Word added successfully', 'success');
      resetForm();
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#1A1A2E]/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-[20px] bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EBEBE6] px-6 py-4">
              <h2 className="text-xl font-semibold text-[#1A1A2E]">
                {editWord ? 'Edit Word' : 'Add New Word'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-[#9B9BAE] transition-colors hover:bg-[#F5F5F0] hover:text-[#1A1A2E]"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Word */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                  Word <span className="text-[#FF3B30]">*</span>
                </label>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="w-full rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#9B9BAE]"
                  placeholder="Enter the word"
                  required
                />
              </div>

              {/* Part of Speech */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                  Part of Speech <span className="text-[#FF3B30]">*</span>
                </label>
                <select
                  value={partOfSpeech}
                  onChange={(e) => setPartOfSpeech(e.target.value as PartOfSpeech)}
                  className="w-full rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] bg-white"
                >
                  {POS_OPTIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>

              {/* Translations */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                    Lao Translation
                  </label>
                  <input
                    type="text"
                    value={laoTranslation}
                    onChange={(e) => setLaoTranslation(e.target.value)}
                    className="w-full rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#9B9BAE]"
                    placeholder="Lao translation"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                    Thai Translation
                  </label>
                  <input
                    type="text"
                    value={thaiTranslation}
                    onChange={(e) => setThaiTranslation(e.target.value)}
                    className="w-full rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#9B9BAE]"
                    placeholder="Thai translation"
                  />
                </div>
              </div>

              {/* Definition */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                  Definition <span className="text-[#FF3B30]">*</span>
                </label>
                <textarea
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  className="w-full min-h-[80px] rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#9B9BAE] resize-none"
                  placeholder="Enter the definition"
                  required
                />
              </div>

              {/* Example Sentence */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                  Example Sentence <span className="text-[#FF3B30]">*</span>
                </label>
                <textarea
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                  className="w-full min-h-[60px] rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#9B9BAE] resize-none"
                  placeholder="Enter an example sentence"
                  required
                />
              </div>

              {/* Synonyms & Antonyms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                    Synonyms
                  </label>
                  <input
                    type="text"
                    value={synonym}
                    onChange={(e) => setSynonym(e.target.value)}
                    className="w-full rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#9B9BAE]"
                    placeholder="word1, word2, word3"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                    Antonyms
                  </label>
                  <input
                    type="text"
                    value={antonym}
                    onChange={(e) => setAntonym(e.target.value)}
                    className="w-full rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#9B9BAE]"
                    placeholder="word1, word2, word3"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                  Category / Theme
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-[10px] border border-[#E5E5DD] px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#9B9BAE]"
                  placeholder="e.g., Emotions, Business, Travel"
                />
              </div>

              {/* CEFR Level */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">
                  CEFR Level <span className="text-[#FF3B30]">*</span>
                </label>
                <div className="flex gap-2">
                  {CEFR_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCefrLevel(level)}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                        cefrLevel === level
                          ? 'bg-[#F5A623] text-white'
                          : 'bg-[#F5F5F0] text-[#6B6B80] hover:bg-[#EBEBE6]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[#EBEBE6]">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-[10px] border border-[#E5E5DD] bg-white py-2.5 text-sm font-medium text-[#1A1A2E] transition-colors hover:bg-[#F5F5F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-[10px] bg-[#F5A623] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E09400]"
                >
                  {editWord ? 'Save Changes' : 'Save Word'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
