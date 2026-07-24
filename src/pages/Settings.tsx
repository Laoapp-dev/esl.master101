import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Globe, Sun, Volume2, Shuffle, Lightbulb,
  Trash2, Save, AlertTriangle, ChevronRight, Check,
  Moon, Monitor, Type, Droplets,
} from 'lucide-react';
import { useApp } from '@/App';
import { useAuth } from '@/hooks/useAuth';
import type { CEFRLevel } from '@/types/vocabulary';

type Section = 'account' | 'study' | 'display' | 'data';

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const CEFR_DESC: Record<CEFRLevel, string> = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper-Int.', C1: 'Advanced', C2: 'Mastery',
};

export function Settings() {
  const { vocabulary, addToast } = useApp();
  const { currentUser, updateCurrentUserProfile } = useAuth();
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [username, setUsername] = useState(currentUser?.username || vocabulary.profile.username);
  const [email,    setEmail]    = useState(currentUser?.email    || vocabulary.profile.email);
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>(
    (currentUser?.cefrLevel as CEFRLevel) || vocabulary.profile.cefrLevel
  );
  const [dailyGoal, setDailyGoal] = useState(currentUser?.dailyGoal || vocabulary.profile.dailyGoal);
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = () => {
    updateCurrentUserProfile({ username, email, cefrLevel, dailyGoal });
    vocabulary.updateProfile({ username, email, cefrLevel, dailyGoal });
    setSaved(true);
    addToast('Profile saved', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetProgress = () => {
    vocabulary.resetProgress();
    setShowResetConfirm(false);
    addToast('All progress has been reset', 'success');
  };

  const isAdmin = currentUser?.role === 'admin';

  const SECTIONS: { id: Section; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'account', label: 'Account',  icon: User,      desc: 'Profile, level & daily goal' },
    { id: 'study',   label: 'Study',    icon: Lightbulb, desc: 'Translations, audio & hints' },
    { id: 'display', label: 'Display',  icon: Sun,       desc: 'Theme & font size' },
    ...(isAdmin ? [{ id: 'data' as Section, label: 'Data', icon: Trash2, desc: 'Reset study progress' }] : []),
  ];

  /* ── If a section is open, show its panel (mobile: full-screen style) ──── */
  if (activeSection) {
    return (
      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>

        {/* Back header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Settings
          </button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-semibold text-foreground">
            {SECTIONS.find(s => s.id === activeSection)?.label}
          </span>
        </div>

        {/* ── Account ── */}
        {activeSection === 'account' && (
          <div className="space-y-4">

            {/* Avatar strip */}
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0
                ${currentUser?.role === 'admin' ? 'bg-[#F5A623]' : 'bg-[#4A90E2]'}`}>
                {username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{username || 'User'}</p>
                <p className="text-xs text-muted-foreground">{email || 'No email set'}</p>
                {currentUser?.role === 'admin' && (
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5A623]/15 text-[#00B4D8]">ADMIN</span>
                )}
              </div>
            </div>

            {/* Form card */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">

              <Field label="Username">
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 transition-shadow" />
              </Field>

              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 transition-shadow" />
              </Field>

              <Field label="CEFR Level" note="Your current English proficiency level">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {CEFR_LEVELS.map(lvl => (
                    <button key={lvl} onClick={() => setCefrLevel(lvl)}
                      className={`relative rounded-xl py-2.5 text-sm font-semibold transition-all
                        ${cefrLevel === lvl
                          ? 'bg-[#F5A623] text-white shadow-md shadow-[#F5A623]/30'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}>
                      {lvl}
                      {cefrLevel === lvl && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-white flex items-center justify-center">
                          <Check className="h-2 w-2 text-[#F5A623]" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {cefrLevel}: {CEFR_DESC[cefrLevel]}
                </p>
              </Field>

              <Field label={<span>Daily Goal: <span className="text-[#F5A623] font-bold">{dailyGoal} words</span></span>}
                note="How many new words you want to learn each day">
                <input type="range" min={5} max={50} step={5} value={dailyGoal}
                  onChange={e => setDailyGoal(Number(e.target.value))}
                  className="w-full accent-[#F5A623] h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5</span>
                  <div className="flex gap-3">
                    {[10,20,30,40].map(n => (
                      <span key={n} className={`${dailyGoal === n ? 'text-[#F5A623] font-medium' : ''}`}>{n}</span>
                    ))}
                  </div>
                  <span>50</span>
                </div>
              </Field>
            </div>

            <button onClick={handleSaveProfile}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all shadow-sm
                ${saved ? 'bg-emerald-500 text-white' : 'bg-[#F5A623] text-white hover:bg-[#E09400] active:scale-[0.98]'}`}>
              {saved ? <><Check className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}

        {/* ── Study ── */}
        {activeSection === 'study' && (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            <ToggleSetting label="Show Translations" description="Display Lao and Thai translations" icon={Globe}
              enabled={vocabulary.settings.showTranslations}
              onChange={val => vocabulary.updateSettings({ showTranslations: val })} />
            <ToggleSetting label="Auto-play Pronunciation" description="Automatically play audio for words" icon={Volume2}
              enabled={vocabulary.settings.autoPlayPronunciation}
              onChange={val => vocabulary.updateSettings({ autoPlayPronunciation: val })} />
            <ToggleSetting label="Shuffle Cards" description="Randomize card order in flashcard mode" icon={Shuffle}
              enabled={vocabulary.settings.shuffleCards}
              onChange={val => vocabulary.updateSettings({ shuffleCards: val })} />
            <ToggleSetting label="Show Hints" description="Display hint text during study" icon={Lightbulb}
              enabled={vocabulary.settings.showHints}
              onChange={val => vocabulary.updateSettings({ showHints: val })} />
          </div>
        )}

        {/* ── Display ── */}
        {activeSection === 'display' && (
          <div className="space-y-4">

            {/* Theme */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Theme</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'light'      as const, label: 'Light',  icon: Sun      },
                  { value: 'dark'       as const, label: 'Dark',   icon: Moon     },
                  { value: 'light-blue' as const, label: 'Ocean',  icon: Droplets },
                  { value: 'system'     as const, label: 'System', icon: Monitor  },
                ].map(t => {
                  const active = vocabulary.settings.theme === t.value;
                  return (
                    <button key={t.value} onClick={() => vocabulary.updateSettings({ theme: t.value })}
                      className={`flex flex-col items-center gap-2 rounded-xl py-4 text-sm font-medium transition-all border
                        ${active
                          ? 'border-[#00B4D8] bg-[#E0F7FA] dark:bg-[#003B4A] text-foreground shadow-sm light-blue:bg-[#CCEEFF]'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}`}>
                      <t.icon className={`h-5 w-5 ${active ? 'text-[#00B4D8]' : ''}`} strokeWidth={1.5} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font size */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Font Size</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'small'  as const, label: 'Small',  cls: 'text-xs'  },
                  { value: 'medium' as const, label: 'Medium', cls: 'text-sm'  },
                  { value: 'large'  as const, label: 'Large',  cls: 'text-base' },
                ].map(s => {
                  const active = vocabulary.settings.fontSize === s.value;
                  return (
                    <button key={s.value} onClick={() => vocabulary.updateSettings({ fontSize: s.value })}
                      className={`flex flex-col items-center gap-2 rounded-xl py-4 font-medium transition-all border
                        ${active
                          ? 'border-[#00B4D8] bg-[#E0F7FA] dark:bg-[#003B4A] text-foreground'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}`}>
                      <Type className={`h-5 w-5 ${active ? 'text-[#00B4D8]' : ''}`} strokeWidth={1.5} />
                      <span className={s.cls}>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Preview</p>
              <p className={`font-medium text-foreground leading-relaxed
                ${vocabulary.settings.fontSize === 'small' ? 'text-sm' :
                  vocabulary.settings.fontSize === 'large' ? 'text-xl' : 'text-base'}`}>
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </div>
        )}

        {/* ── Data ── */}
        {activeSection === 'data' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Data Management</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data is stored locally on this device. Resetting progress clears study history
                and streaks but keeps your word list intact.
              </p>
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reset Study Progress</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Clears all study counts, streaks, and session history. Words are not affected.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors active:scale-[0.98]">
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  Reset Progress
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  /* ── Settings home list (mobile-first) ───────────────────────────────────── */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="space-y-5">

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* User card */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0
          ${currentUser?.role === 'admin' ? 'bg-[#F5A623]' : 'bg-[#4A90E2]'}`}>
          {(currentUser?.username || vocabulary.profile.username || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{vocabulary.profile.username}</p>
          <p className="text-xs text-muted-foreground truncate">{vocabulary.profile.email || 'No email set'}</p>
        </div>
        <button onClick={() => setActiveSection('account')}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-muted/70 transition-colors">
          Edit
        </button>
      </div>

      {/* Settings rows */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {SECTIONS.map(section => (
          <button key={section.id} onClick={() => setActiveSection(section.id)}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors active:bg-muted/50 text-left">
            <div className="h-9 w-9 rounded-xl bg-muted/70 flex items-center justify-center flex-shrink-0">
              <section.icon className="h-4.5 w-4.5 text-foreground/70" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{section.label}</p>
              <p className="text-xs text-muted-foreground truncate">{section.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* App info */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">App Version</span>
          <span className="font-medium text-foreground">{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Words in library</span>
          <span className="font-medium text-foreground">{vocabulary.words.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Current level</span>
          <span className="font-medium text-[#F5A623]">{vocabulary.profile.cefrLevel} — {CEFR_DESC[vocabulary.profile.cefrLevel as CEFRLevel]}</span>
        </div>
      </div>

      {/* Reset confirm modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1A1A2E]/50 backdrop-blur-sm"
              onClick={() => setShowResetConfirm(false)} />
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-[400px] rounded-2xl bg-card border border-border p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Reset All Progress?</h3>
                <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                  This resets all study counts, streaks, and session history.<br />Your word list will not be deleted.
                </p>
                <div className="flex w-full gap-3">
                  <button onClick={() => setShowResetConfirm(false)}
                    className="flex-1 rounded-xl border border-border bg-muted/50 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleResetProgress}
                    className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 transition-colors active:scale-[0.98]">
                    Reset
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */
function Field({ label, note, children }: {
  label: React.ReactNode; note?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold text-foreground">{label}</label>
      {children}
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}

function ToggleSetting({ label, description, icon: Icon, enabled, onChange }: {
  label: string; description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  enabled: boolean; onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-muted/70 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-foreground/70" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ml-3
          ${enabled ? 'bg-[#F5A623]' : 'bg-border'}`}>
        <motion.div layout
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm"
          animate={{ x: enabled ? 20 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
      </button>
    </div>
  );
}
