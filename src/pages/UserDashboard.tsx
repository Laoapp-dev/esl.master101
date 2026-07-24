import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Flame, BookOpen, Target, TrendingUp, Calendar,
  Save, CheckCircle2, LogOut, Lock, Eye, EyeOff,
  Shield, Edit3, X, Award, GraduationCap,
  Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/App';
import type { CEFRLevel } from '@/types/vocabulary';

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
type Tab = 'overview' | 'profile' | 'security';

export function UserDashboard() {
  const { currentUser, updateCurrentUserProfile, changePassword, logout } = useAuth();
  const { vocabulary, addToast } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]         = useState<Tab>('overview');
  const [editing, setEditing]             = useState(false);
  const [username, setUsername]           = useState(currentUser?.username || '');
  const [cefrLevel, setCefrLevel]         = useState<CEFRLevel>((currentUser?.cefrLevel as CEFRLevel) || 'A1');
  const [dailyGoal, setDailyGoal]         = useState(currentUser?.dailyGoal || 10);
  const [currentPw, setCurrentPw]         = useState('');
  const [newPw, setNewPw]                 = useState('');
  const [confirmPw, setConfirmPw]         = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading]         = useState(false);
  const [showLogout, setShowLogout]       = useState(false);

  const stats = vocabulary.getStats();
  const todaySessions = vocabulary.sessions.filter(
    s => new Date(s.date).toDateString() === new Date().toDateString()
  );
  const todayWords  = todaySessions.reduce((a, s) => a + s.wordsStudied, 0);
  const goalPct     = Math.min(100, (todayWords / (currentUser?.dailyGoal || 10)) * 100);
  const masteryPct  = stats.totalWords > 0 ? Math.round((stats.learnedWords / stats.totalWords) * 100) : 0;
  const isAdmin     = currentUser?.role === 'admin';
  const pretestDone = currentUser?.pretestDone;

  const handleSaveProfile = () => {
    if (!username.trim()) { addToast('Name cannot be empty', 'error'); return; }
    updateCurrentUserProfile({ username: username.trim(), cefrLevel, dailyGoal });
    vocabulary.updateProfile({ username: username.trim(), cefrLevel, dailyGoal });
    addToast('Profile updated', 'success');
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setUsername(currentUser?.username || '');
    setCefrLevel((currentUser?.cefrLevel as CEFRLevel) || 'A1');
    setDailyGoal(currentUser?.dailyGoal || 10);
    setEditing(false);
  };

  const handleChangePassword = () => {
    if (!newPw || !currentPw) { addToast('Fill all password fields', 'error'); return; }
    if (newPw !== confirmPw)   { addToast('Passwords do not match', 'error');  return; }
    if (newPw.length < 6)      { addToast('Minimum 6 characters', 'error');    return; }
    setPwLoading(true);
    setTimeout(() => {
      const r = changePassword(currentPw, newPw);
      if (r.success) { addToast('Password changed', 'success'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
      else            { addToast(r.error || 'Failed', 'error'); }
      setPwLoading(false);
    }, 400);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'profile',  label: 'Profile',  icon: User },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  const pwFields = [
    { label: 'Current Password',     value: currentPw,  setter: setCurrentPw,  show: showCurrentPw, toggle: () => setShowCurrentPw(v => !v) },
    { label: 'New Password',         value: newPw,      setter: setNewPw,      show: showNewPw,     toggle: () => setShowNewPw(v => !v)     },
    { label: 'Confirm New Password', value: confirmPw,  setter: setConfirmPw,  show: showConfirmPw, toggle: () => setShowConfirmPw(v => !v) },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="space-y-6 pb-8">

      {/* Header card */}
      <div className="rounded-2xl bg-[#1A1A2E] text-white overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 ${isAdmin ? 'bg-[#F5A623]' : 'bg-[#4A90E2]'}`}>
                {currentUser?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{currentUser?.username}</h1>
                  {isAdmin && (
                    <span className="flex items-center gap-1 bg-[#F5A623]/20 text-[#F5A623] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60 mt-0.5">{currentUser?.email}</p>
                <p className="text-xs text-white/40 mt-0.5">{currentUser?.cefrLevel} · joined {new Date(currentUser?.joinDate || '').toLocaleDateString()}</p>
              </div>
            </div>
            <button onClick={() => setShowLogout(true)}
              className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

          {/* Daily goal bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-[#F5A623]" /> Today</span>
              <span>{todayWords}/{currentUser?.dailyGoal || 10} words</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${goalPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-[#F5A623] rounded-full" />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Streak',   value: stats.currentStreak },
              { label: 'Mastered', value: stats.learnedWords  },
              { label: 'Total',    value: stats.totalWords    },
            ].map(s => (
              <div key={s.label} className="text-center bg-white/5 rounded-xl py-3">
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-[10px] text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-white/10">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === t.id ? 'text-[#F5A623] border-b-2 border-[#F5A623]' : 'text-white/40 hover:text-white/70'
              }`}>
              <t.icon className="h-4 w-4" strokeWidth={1.5} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">

            {/* Pre-test result / CTA */}
            {pretestDone ? (
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#FFF3DD] flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-6 w-6 text-[#F5A623]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Pre-test completed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Score: {currentUser?.pretestScore}/25 · Level: <strong>{currentUser?.pretestLevel}</strong>
                    {currentUser?.pretestDate && ` · ${new Date(currentUser.pretestDate).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => navigate('/pretest')}
                  className="text-xs text-[#4A90E2] font-medium hover:underline flex-shrink-0">
                  Retake
                </button>
              </div>
            ) : (
              <div className="bg-[#1A1A2E] rounded-2xl p-4 flex items-center gap-4 text-white">
                <div className="h-12 w-12 rounded-xl bg-[#F5A623]/20 flex items-center justify-center flex-shrink-0">
                  <Award className="h-6 w-6 text-[#F5A623]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Take the Placement Pre-test</p>
                  <p className="text-xs text-white/50 mt-0.5">25 questions · find your CEFR level · unlock study path</p>
                </div>
                <button onClick={() => navigate('/pretest')}
                  className="flex-shrink-0 px-3 py-1.5 bg-[#F5A623] text-white text-xs font-bold rounded-lg hover:bg-[#E09400] transition-colors">
                  Start
                </button>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Words Learned',  value: `${stats.learnedWords}/${stats.totalWords}`, icon: BookOpen,   color: 'text-green-600',  bg: 'bg-green-50'  },
                { label: 'Study Sessions', value: stats.totalSessions,                          icon: Calendar,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
                { label: 'Mastery Rate',   value: `${masteryPct}%`,                             icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Daily Goal',     value: `${currentUser?.dailyGoal || 10} words`,      icon: Target,     color: 'text-amber-600',  bg: 'bg-amber-50'  },
              ].map(card => (
                <div key={card.label} className="bg-card rounded-2xl border border-border p-4">
                  <div className={`h-9 w-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="text-xl font-bold text-foreground">{card.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Recent sessions */}
            {vocabulary.sessions.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                  <GraduationCap className="h-4 w-4 text-[#4A90E2]" strokeWidth={1.5} /> Recent Sessions
                </h3>
                <div className="space-y-0">
                  {vocabulary.sessions.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div>
                        <span className="text-sm font-medium capitalize text-foreground">{s.mode}</span>
                        <span className="text-xs text-muted-foreground ml-2">{new Date(s.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{s.wordsStudied}w</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.totalQuestions > 0 && (s.correctAnswers / s.totalQuestions) >= 0.8
                            ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {s.totalQuestions > 0 ? `${Math.round((s.correctAnswers / s.totalQuestions) * 100)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Award className="h-4 w-4 text-[#F5A623]" strokeWidth={1.5} /> Achievements
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'First Word',   unlocked: stats.totalWords >= 1      },
                  { label: '10 Words',     unlocked: stats.totalWords >= 10     },
                  { label: '7-Day Streak', unlocked: stats.currentStreak >= 7   },
                  { label: '50 Mastered',  unlocked: stats.learnedWords >= 50   },
                ].map(a => (
                  <div key={a.label} className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all ${
                    a.unlocked ? 'border-[#F5A623]/40 bg-[#FFF3DD]' : 'border-border bg-muted/30 opacity-50'
                  }`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${a.unlocked ? 'bg-[#F5A623]' : 'bg-muted'}`}>
                      <Award className={`h-4 w-4 ${a.unlocked ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] text-center text-muted-foreground leading-tight">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Profile ── */}
        {activeTab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Works on any device</p>
                  <p className="text-xs text-blue-700 mt-0.5">Log in with your email &amp; password on any phone, tablet, or computer — your account syncs automatically.</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-[#4A90E2]" strokeWidth={1.5} /> Personal Information
                </h2>
                {!editing
                  ? <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-[#4A90E2] font-medium"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
                  : <button onClick={handleCancelEdit} className="flex items-center gap-1.5 text-sm text-muted-foreground"><X className="h-3.5 w-3.5" /> Cancel</button>
                }
              </div>

              {!editing ? (
                <div className="space-y-0">
                  {[
                    { label: 'Display Name', value: currentUser?.username },
                    { label: 'Email',        value: currentUser?.email },
                    { label: 'CEFR Level',   value: currentUser?.cefrLevel },
                    { label: 'Daily Goal',   value: `${currentUser?.dailyGoal} words/day` },
                    { label: 'Role',         value: isAdmin ? '👑 Administrator' : '👤 Student' },
                    { label: 'Member Since', value: new Date(currentUser?.joinDate || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-medium text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Display Name</label>
                    <input value={username} onChange={e => setUsername(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40"
                      placeholder="Your display name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email (read-only)</label>
                    <input value={currentUser?.email} disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">CEFR Level</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {CEFR_LEVELS.map(l => (
                        <button key={l} onClick={() => setCefrLevel(l)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            cefrLevel === l ? 'bg-[#F5A623] text-white border-[#F5A623]' : 'bg-card text-muted-foreground border-border hover:border-[#F5A623]/50'
                          }`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Daily Goal: <span className="text-[#F5A623] font-bold">{dailyGoal} words</span>
                    </label>
                    <input type="range" min={5} max={50} step={5} value={dailyGoal}
                      onChange={e => setDailyGoal(Number(e.target.value))} className="w-full accent-[#F5A623]" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>5</span><span>50</span></div>
                  </div>
                  <button onClick={handleSaveProfile}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F5A623] text-white rounded-xl text-sm font-semibold hover:bg-[#E09400] transition-colors">
                    <Save className="h-4 w-4" strokeWidth={1.5} /> Save Changes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Security ── */}
        {activeTab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#4A90E2]" strokeWidth={1.5} /> Change Password
              </h2>
              {pwFields.map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
                  <div className="relative">
                    <input type={f.show ? 'text' : 'password'} value={f.value}
                      onChange={e => f.setter(e.target.value)}
                      placeholder={f.label === 'New Password' ? 'Min 6 characters' : '••••••••'}
                      className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40" />
                    <button type="button" onClick={f.toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={handleChangePassword} disabled={pwLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1A1A2E] text-white rounded-xl text-sm font-semibold hover:bg-[#252540] transition-colors disabled:opacity-60">
                {pwLoading
                  ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Lock className="h-4 w-4" strokeWidth={1.5} /> Update Password</>
                }
              </button>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <LogOut className="h-4 w-4 text-red-500" strokeWidth={1.5} /> Sign Out
              </h2>
              <p className="text-sm text-muted-foreground">Sign out on this device. Your progress is saved.</p>
              <button onClick={() => setShowLogout(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
                <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sign Out of Account
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout modal */}
      <AnimatePresence>
        {showLogout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogout(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
                <LogOut className="h-6 w-6 text-red-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-foreground text-center mb-1">Sign Out?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">You'll return to login. Progress is saved.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogout(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
                <button onClick={logout}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
