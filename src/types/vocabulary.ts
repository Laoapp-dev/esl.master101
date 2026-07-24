export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'interjection' | 'phrase';

export interface VocabularyWord {
  id: string;
  word: string;
  partOfSpeech: PartOfSpeech;
  laoTranslation?: string;
  thaiTranslation?: string;
  definition: string;
  category?: string;
  exampleSentence: string;
  synonym?: string;
  antonym?: string;
  cefrLevel: CEFRLevel;
  dateAdded: string;
  lastStudied?: string;
  studyCount: number;
  correctCount: number;
  isStarred: boolean;
  isLearned: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  nextReviewDate?: string;
}

export interface StudySession {
  id: string;
  date: string;
  mode: 'flashcards' | 'quiz' | 'matching' | 'spelling';
  wordsStudied: number;
  correctAnswers: number;
  totalQuestions: number;
  duration: number; // in seconds
  cefrLevel: CEFRLevel;
}

export interface UserProfile {
  username: string;
  email: string;
  avatar?: string;
  cefrLevel: CEFRLevel;
  dailyGoal: number;
  joinDate: string;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
}

export interface AppSettings {
  showTranslations: boolean;
  autoPlayPronunciation: boolean;
  shuffleCards: boolean;
  showHints: boolean;
  theme: 'light' | 'dark' | 'system' | 'light-blue';
  fontSize: 'small' | 'medium' | 'large';
}

export interface QuizQuestion {
  word: VocabularyWord;
  questionType: 'definition' | 'synonym' | 'antonym' | 'fillBlank';
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
}

export interface MatchingPair {
  id: string;
  word: string;
  definition: string;
  isMatched: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedDate?: string;
  condition: 'word_count' | 'streak' | 'master' | 'quiz' | 'import' | 'review';
  threshold: number;
}

export type StudyMode = 'flashcards' | 'quiz' | 'matching' | 'spelling';
export type QuizType = 'definition' | 'synonym' | 'antonym' | 'fillBlank';
export type FilterLevel = 'all' | CEFRLevel;
export type SortOption = 'recent' | 'alphabetical' | 'level' | 'studied';
