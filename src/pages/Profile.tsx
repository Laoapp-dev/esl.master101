import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle,
  GraduationCap,
  Award,
  Flame,
  Target,
  TrendingUp,
  Calendar,
  Lock,
  Star,
  Trophy,
  Import,
  Eye,
} from 'lucide-react';
import { useApp } from '@/App';

const ACHIEVEMENTS = [
  { id: 'first_word', name: 'First Word', description: 'Add your first word', icon: BookOpen, condition: 'word_count', threshold: 1 },
  { id: 'word_collector_10', name: 'Word Collector', description: 'Add 10 words', icon: Star, condition: 'word_count', threshold: 10 },
  { id: 'word_collector_50', name: 'Vocabulary Builder', description: 'Add 50 words', icon: Target, condition: 'word_count', threshold: 50 },
  { id: 'word_collector_100', name: 'Word Master', description: 'Add 100 words', icon: Trophy, condition: 'word_count', threshold: 100 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Study 7 days in a row', icon: Flame, condition: 'streak', threshold: 7 },
  { id: 'streak_30', name: 'Month Master', description: 'Study 30 days in a row', icon: Calendar, condition: 'streak', threshold: 30 },
  { id: 'master_50', name: 'Half Century', description: 'Master 50 words', icon: CheckCircle, condition: 'master', threshold: 50 },
  { id: 'quiz_perfect', name: 'Perfect Score', description: 'Get 100% on a quiz', icon: Award, condition: 'quiz', threshold: 100 },
  { id: 'import_pro', name: 'Import Pro', description: 'Import words from CSV', icon: Import, condition: 'import', threshold: 1 },
  { id: 'review_100', name: 'Reviewer', description: 'Review 100 words total', icon: Eye, condition: 'review', threshold: 100 },
];

export function Profile() {
  const { vocabulary } = useApp();
  const stats = vocabulary.getStats();

  // Calculate unlocked achievements
  const unlockedAchievements = useMemo(() => {
    return ACHIEVEMENTS.map(ach => {
      let isUnlocked = false;
      switch (ach.condition) {
        case 'word_count':
          isUnlocked = stats.totalWords >= ach.threshold;
          break;
        case 'streak':
          isUnlocked = stats.currentStreak >= ach.threshold;
          break;
        case 'master':
          isUnlocked = stats.learnedWords >= ach.threshold;
          break;
        case 'quiz':
          isUnlocked = vocabulary.sessions.some(s => s.mode === 'quiz' && s.correctAnswers === s.totalQuestions);
          break;
        case 'import':
          isUnlocked = vocabulary.sessions.some(s => s.mode === 'matching');
          break;
        case 'review':
          isUnlocked = vocabulary.words.reduce((acc, w) => acc + w.studyCount, 0) >= ach.threshold;
          break;
      }
      return { ...ach, isUnlocked };
    });
  }, [stats, vocabulary]);

  // Generate activity calendar data (last 52 weeks)
  const activityData = useMemo(() => {
    const data: { date: Date; count: number; active: boolean }[] = [];
    const sessionsByDate = new Map<string, number>();

    vocabulary.sessions.forEach(s => {
      const dateStr = new Date(s.date).toDateString();
      sessionsByDate.set(dateStr, (sessionsByDate.get(dateStr) || 0) + 1);
    });

    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const count = sessionsByDate.get(date.toDateString()) || 0;
      data.push({ date, count, active: count > 0 });
    }

    return data;
  }, [vocabulary.sessions]);

  const statCards = [
    { label: 'Total Words', value: stats.totalWords, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    { label: 'Words Mastered', value: stats.learnedWords, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Study Sessions', value: stats.totalSessions, icon: GraduationCap, color: 'bg-purple-50 text-purple-600' },
    { label: 'Avg Quiz Score', value: `${vocabulary.sessions.length > 0 ? Math.round(vocabulary.sessions.filter(s => s.mode === 'quiz').reduce((acc, s) => acc + (s.correctAnswers / s.totalQuestions) * 100, 0) / Math.max(vocabulary.sessions.filter(s => s.mode === 'quiz').length, 1)) : 0}%`, icon: Award, color: 'bg-orange-50 text-orange-600' },
    { label: 'Current Streak', value: stats.currentStreak, icon: Flame, color: 'bg-red-50 text-red-600' },
    { label: 'Longest Streak', value: vocabulary.profile.longestStreak, icon: TrendingUp, color: 'bg-teal-50 text-teal-600' },
  ];

  // Get intensity color for activity cell
  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-[#EBEBE6]';
    if (count === 1) return 'bg-[#F5A623]/30';
    if (count === 2) return 'bg-[#F5A623]/50';
    return 'bg-[#F5A623]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F5A623] text-3xl font-bold text-white">
          {vocabulary.profile.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A2E]">{vocabulary.profile.username}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="rounded-full bg-[#FFF3DD] px-3 py-1 text-xs font-semibold text-[#B37600]">
              {vocabulary.profile.cefrLevel}
            </span>
            <span className="text-xs text-[#9B9BAE]">
              Joined {new Date(vocabulary.profile.joinDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="card-hover rounded-2xl border border-[#E5E5DD] bg-white p-5"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
              <stat.icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="text-2xl font-semibold text-[#1A1A2E]">{stat.value}</div>
            <div className="text-xs text-[#9B9BAE] mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Activity Calendar */}
      <div className="rounded-2xl border border-[#E5E5DD] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">Study Activity</h2>
        <div className="overflow-x-auto">
          <div className="inline-grid grid-rows-7 gap-[3px]" style={{ gridAutoFlow: 'column' }}>
            {activityData.map((day, i) => (
              <div
                key={i}
                title={`${day.date.toDateString()}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                className={`h-[10px] w-[10px] rounded-sm ${getIntensityColor(day.count)}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-[#9B9BAE]">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="h-[10px] w-[10px] rounded-sm bg-[#EBEBE6]" />
            <div className="h-[10px] w-[10px] rounded-sm bg-[#F5A623]/30" />
            <div className="h-[10px] w-[10px] rounded-sm bg-[#F5A623]/50" />
            <div className="h-[10px] w-[10px] rounded-sm bg-[#F5A623]" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-2xl border border-[#E5E5DD] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">Achievements</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {unlockedAchievements.map((ach, i) => (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center ${
                ach.isUnlocked
                  ? 'border-[#E5E5DD] bg-white'
                  : 'border-[#EBEBE6] bg-[#F9F9F5] opacity-60'
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                ach.isUnlocked ? 'bg-[#FFF3DD]' : 'bg-[#F5F5F0]'
              }`}>
                {ach.isUnlocked ? (
                  <ach.icon className="h-6 w-6 text-[#F5A623]" strokeWidth={1.5} />
                ) : (
                  <Lock className="h-5 w-5 text-[#9B9BAE]" strokeWidth={1.5} />
                )}
              </div>
              <div>
                <div className={`text-xs font-semibold ${ach.isUnlocked ? 'text-[#1A1A2E]' : 'text-[#9B9BAE]'}`}>
                  {ach.name}
                </div>
                <div className="text-[10px] text-[#9B9BAE] mt-0.5">{ach.description}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
