import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Flame,
  ArrowRight,
  Star,
  Volume2,
  GraduationCap,
  Mic,
  PenLine,
  Award,
} from 'lucide-react';
import { useApp } from '@/App';
import { useAuth } from '@/hooks/useAuth';
import { useSpeech } from '@/hooks/useSpeech';
import { usePracticeSubmissions } from '@/hooks/usePracticeSubmissions';
import { SPEAKING_TOPICS } from '@/data/speakingTopics';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

export function Dashboard() {
  const navigate = useNavigate();
  const { vocabulary } = useApp();
  const { currentUser } = useAuth();
  const { speak } = useSpeech();
  const stats = vocabulary.getStats();
  const practice = usePracticeSubmissions(currentUser?.dataKey);

  const recentWords = vocabulary.words.slice(0, 5);
  const reviewWords = vocabulary.getWordsDueForReview().slice(0, 3);

  const statCards = [
    {
      label: 'Words Learned',
      value: stats.learnedWords,
      sub: `${stats.totalWords} total`,
      icon: CheckCircle,
      color: 'text-[#34C759]',
      bg: 'bg-green-50',
    },
    {
      label: 'Study Streak',
      value: stats.currentStreak,
      sub: 'days',
      icon: Flame,
      color: 'text-[#F5A623]',
      bg: 'bg-orange-50',
    },
    {
      label: 'Mastered',
      value: stats.learnedWords,
      sub: `${Math.round((stats.learnedWords / Math.max(stats.totalWords, 1)) * 100)}%`,
      icon: BookOpen,
      color: 'text-[#4A90E2]',
      bg: 'bg-blue-50',
    },
    {
      label: 'Review Due',
      value: stats.reviewDue,
      sub: stats.reviewDue > 0 ? 'needs attention' : 'all caught up',
      icon: Clock,
      color: stats.reviewDue > 0 ? 'text-[#FF3B30]' : 'text-[#34C759]',
      bg: stats.reviewDue > 0 ? 'bg-red-50' : 'bg-green-50',
    },
  ];

  const studyModes = [
    {
      title: 'Flashcards',
      description: 'Flip through cards to test your memory',
      icon: GraduationCap,
      path: '/study/flashcards',
      color: 'bg-[#FFF3DD] text-[#F5A623]',
    },
    {
      title: 'Quiz',
      description: 'Multiple choice questions',
      icon: BookOpen,
      path: '/study/quiz',
      color: 'bg-blue-50 text-[#4A90E2]',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your progress and continue learning</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => navigate('/words')}
            className="flex items-center gap-2 rounded-[10px] bg-[#F5A623] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E09400]"
          >
            <Star className="h-4 w-4" strokeWidth={1.5} />
            Add Word
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className="card-hover rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <div className="text-[28px] font-medium text-foreground" style={{ fontFamily: 'monospace' }}>
              {stat.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Weekly Activity + Quick Study */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-hover rounded-2xl border border-border bg-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Weekly Activity</h2>
            <span className="text-xs text-muted-foreground">Study sessions per day</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyActivity} barSize={24}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9B9BAE' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9B9BAE' }}
                  allowDecimals={false}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.weeklyActivity.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.count > 0 ? '#F5A623' : '#E5E5DD'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quick Study Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="rounded-xl bg-[#FFF3DD] p-4 mb-4">
            <h3 className="text-lg font-semibold text-foreground">Continue Studying</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.reviewDue > 0
                ? `${stats.reviewDue} words need review`
                : 'You\'re all caught up!'}
            </p>
          </div>

          {reviewWords.length > 0 && (
            <div className="space-y-2 mb-4">
              {reviewWords.map((word) => (
                <div
                  key={word.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-foreground">{word.word}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">{word.cefrLevel}</span>
                  </div>
                  <button
                    onClick={() => speak(word.word)}
                    className="rounded p-1 text-muted-foreground hover:bg-white"
                  >
                    <Volume2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {studyModes.map((mode) => (
              <button
                key={mode.path}
                onClick={() => navigate(mode.path)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-white p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${mode.color}`}>
                  <mode.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{mode.title}</div>
                  <div className="text-xs text-muted-foreground">{mode.description}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Words */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Recent Words</h2>
          <button
            onClick={() => navigate('/words')}
            className="flex items-center gap-1 text-sm text-[#F5A623] hover:text-[#E09400]"
          >
            View All
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Word</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">POS</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Level</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Definition</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentWords.map((word) => (
                <tr
                  key={word.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-6 py-3">
                    <span className="text-sm font-medium text-foreground">{word.word}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {word.partOfSpeech}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-[#FFF3DD] px-2.5 py-0.5 text-[11px] font-semibold text-[#B37600]">
                      {word.cefrLevel}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-muted-foreground max-w-[300px] truncate block">
                      {word.definition}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {word.isLearned ? (
                      <span className="flex items-center gap-1 text-xs text-[#34C759]">
                        <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Learned
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Learning</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
      {/* Writing & Speaking Practice */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Mic className="h-4 w-4 text-[#F5A623]" strokeWidth={1.5} />
              Speaking &amp; Writing Practice
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">AI-scored practice across all CEFR levels</p>
          </div>
          <button
            onClick={() => navigate('/practice')}
            className="flex items-center gap-1 text-sm text-[#F5A623] hover:text-[#E09400]"
          >
            Practice Now
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Top stat row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-muted/30 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Award className="h-3.5 w-3.5 text-[#F5A623]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Score</span>
              </div>
              <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'monospace' }}>{practice.stats.avgScore || '–'}</p>
            </div>
            <div className="rounded-xl bg-muted/30 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <PenLine className="h-3.5 w-3.5 text-[#4A90E2]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Writing</span>
              </div>
              <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'monospace' }}>{practice.stats.writingCount}</p>
            </div>
            <div className="rounded-xl bg-muted/30 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Mic className="h-3.5 w-3.5 text-[#34C759]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Speaking</span>
              </div>
              <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'monospace' }}>{practice.stats.speakingCount}</p>
            </div>
            <div className="rounded-xl bg-muted/30 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BookOpen className="h-3.5 w-3.5 text-[#9B5DE5]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Topics Tried</span>
              </div>
              <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'monospace' }}>
                {practice.stats.topicsAttempted}<span className="text-xs text-muted-foreground">/{SPEAKING_TOPICS.length}</span>
              </p>
            </div>
          </div>

          {/* Score trend + per-level breakdown */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Score Trend</p>
              {practice.stats.recentTrend.length > 0 ? (
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={practice.stats.recentTrend}>
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Line type="monotone" dataKey="score" stroke="#F5A623" strokeWidth={2} dot={{ r: 3, fill: '#F5A623' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No attempts yet — try a topic to see your trend
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By CEFR Level</p>
              <div className="space-y-2">
                {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map((lvl) => {
                  const data = practice.stats.byLevel[lvl];
                  return (
                    <div key={lvl} className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-muted/40 text-muted-foreground shrink-0 w-8 text-center">{lvl}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#F5A623] rounded-full" style={{ width: `${data.avgScore}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {data.count > 0 ? `${data.avgScore} avg` : '–'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
