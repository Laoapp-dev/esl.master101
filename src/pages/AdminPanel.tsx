import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Shield, Trash2,
  AlertTriangle, Cloud, WifiOff, Crown, UserX, UserCheck, User,
  CheckCircle2, Info, Zap, BookOpen, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/App';
import type { AuthUser } from '@/types/auth';

// ── Tiny helpers ────────────────────────────────────────────────────────────────
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 ${props.className ?? ''}`} />;
}
function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {children}
    </div>
  );
}
function Spinner() {
  return <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />;
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200">{children}</div>;
}
function WarnBox({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">{children}</div>;
}

type Tab = 'users' | 'aikeys';

const ADMIN_API_KEYS_KEY = 'moe_admin_api_cfg';

// ── Admin Panel ─────────────────────────────────────────────────────────────────
// Deliberately minimal: this app has no server, no external accounts to
// manage, and no data-sync integrations to configure. Everything lives
// locally in each learner's own browser, seeded from the 9,000+ word
// curriculum bundled directly into the app. The only things an admin
// actually needs to control are (1) who has an account, and (2) the AI
// keys that power lesson/practice generation and writing & speaking
// feedback for learners.
export function AdminPanel() {
  const { getAllUsers, deleteUser, toggleUserActive, isOnline, currentUser } = useAuth();
  const { vocabulary, addToast } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AuthUser[]>(() => getAllUsers());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<'progress' | 'factory' | null>(null);
  const [resetting, setResetting] = useState(false);

  const refreshUsers = useCallback(() => setUsers(getAllUsers()), [getAllUsers]);

  // ── User actions ──────────────────────────────────────────────────────────────
  const handleToggleActive = (id: string) => { toggleUserActive(id); refreshUsers(); addToast('User status updated', 'success'); };
  const handleDelete = (id: string) => {
    if (confirmDelete === id) { deleteUser(id); setConfirmDelete(null); refreshUsers(); addToast('User deleted', 'info'); }
    else { setConfirmDelete(id); setTimeout(() => setConfirmDelete(null), 3000); }
  };

  // ── Reset actions (Danger Zone) — all local to this device, nothing to
  // reconcile with a server since there's no external sync anymore. ─────────
  const handleResetProgress = () => {
    if (resetConfirm !== 'progress') {
      setResetConfirm('progress');
      setTimeout(() => setResetConfirm(prev => prev === 'progress' ? null : prev), 5000);
      return;
    }
    setResetConfirm(null);
    setResetting(true);
    vocabulary.resetProgress();
    setResetting(false);
    addToast('🗑️ Study progress reset — the 9,000+ word curriculum itself is untouched', 'success');
  };

  const handleFactoryReset = async () => {
    if (resetConfirm !== 'factory') {
      setResetConfirm('factory');
      setTimeout(() => setResetConfirm(prev => prev === 'factory' ? null : prev), 5000);
      return;
    }
    setResetting(true);
    try { localStorage.clear(); } catch { /* ignore */ }
    try { sessionStorage.clear(); } catch { /* ignore */ }
    try {
      if ('indexedDB' in window && (indexedDB as any).databases) {
        const dbs = await (indexedDB as any).databases();
        await Promise.all((dbs || []).map((db: { name?: string }) =>
          db.name ? new Promise(res => { const req = indexedDB.deleteDatabase(db.name!); req.onsuccess = req.onerror = req.onblocked = () => res(null); }) : null
        ));
      }
    } catch { /* ignore */ }
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch { /* ignore */ }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch { /* ignore */ }
    window.location.href = window.location.origin + window.location.pathname;
  };

  // AI API Keys state (admin-only, stored under protected key)
  const loadAiCfg = () => { try { return JSON.parse(localStorage.getItem(ADMIN_API_KEYS_KEY) || '{}'); } catch { return {}; } };
  const [aiGoogleKey,   setAiGoogleKey]   = useState<string>(() => loadAiCfg().google      || '');
  const [aiElevenKey,   setAiElevenKey]   = useState<string>(() => loadAiCfg().elevenlabs  || '');
  const [aiElevenVoice, setAiElevenVoice] = useState<string>(() => loadAiCfg().elevenVoice || 'JBFqnCBsd6RMkjVDRZzb');
  const [aiKeySaved,    setAiKeySaved]    = useState(false);
  const [showAiKeys,    setShowAiKeys]    = useState<Record<string, boolean>>({});
  const toggleShowKey = (k: string) => setShowAiKeys(prev => ({ ...prev, [k]: !prev[k] }));

  const saveAiKeys = () => {
    try {
      localStorage.setItem(ADMIN_API_KEYS_KEY, JSON.stringify({
        google:      aiGoogleKey.trim(),
        elevenlabs:  aiElevenKey.trim(),
        elevenVoice: aiElevenVoice.trim() || 'JBFqnCBsd6RMkjVDRZzb',
      }));
      setAiKeySaved(true);
      setTimeout(() => setAiKeySaved(false), 2500);
    } catch (error) {
      addToast(`Couldn't save API keys — browser storage may be full: ${(error as Error).message}`, 'error');
    }
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'users',  label: 'Users',   icon: Users },
    { id: 'aikeys', label: 'AI Keys', icon: Zap   },
  ];

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="rounded-2xl bg-[#1A1A2E] text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#F5A623]/20 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-[#F5A623]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-xs text-white/50">Logged in as {currentUser?.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'text-green-400 bg-green-500/10' : 'text-white/40 bg-white/5'}`}>
              {isOnline ? <Cloud className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <button onClick={() => navigate('/my-account')} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-colors">
              <User className="h-3.5 w-3.5" /> My Account
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="h-4 w-4 shrink-0" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ USERS ══════════════════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">All Users ({users.length})</h2>
          </div>
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${user.role === 'admin' ? 'bg-[#F5A623]' : 'bg-[#4A90E2]'}`}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{user.username}</span>
                      {user.role === 'admin' && <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full"><Crown className="h-2.5 w-2.5" />Admin</span>}
                      {!user.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Joined {new Date(user.joinDate).toLocaleDateString()} · {user.cefrLevel} · {user.currentStreak}d streak</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleToggleActive(user.id)} disabled={user.role === 'admin'} className={`p-1.5 rounded-lg transition-colors ${user.role === 'admin' ? 'opacity-30 cursor-not-allowed' : user.isActive ? 'text-green-600 hover:bg-green-50' : 'text-muted-foreground hover:bg-muted'}`}>
                      {user.isActive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleDelete(user.id)} disabled={user.role === 'admin' || user.id === currentUser?.id} className={`p-1.5 rounded-lg transition-colors ${confirmDelete === user.id ? 'bg-red-100 text-red-600' : user.role === 'admin' || user.id === currentUser?.id ? 'opacity-30 cursor-not-allowed text-muted-foreground' : 'text-red-400 hover:bg-red-50'}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* App data summary */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#F5A623]" />
              <h2 className="font-semibold text-foreground">Vocabulary Database</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {vocabulary.baseWordCount > 0
                ? `${vocabulary.baseWordCount.toLocaleString()} words are built into the app`
                : 'Loading the built-in word list…'} — stored as a single local JSON file, no
              import, export, or online sync needed. Every learner gets the exact same
              curriculum the moment the app loads, online or offline.
            </p>
          </div>

          {/* ── Danger Zone ─────────────────────────────────────────────────────── */}
          <div className="bg-card rounded-xl border-2 border-red-200 dark:border-red-900 p-5 space-y-4">
            <h2 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </h2>

            <div className="space-y-2">
              <p className="text-sm text-foreground font-medium">Reset study progress</p>
              <p className="text-xs text-muted-foreground">
                Clears stars, mastered status, study counts, and streaks on this device. The
                9,000+ word curriculum and any words a learner typed in themselves are left alone.
              </p>
              <button onClick={handleResetProgress} disabled={resetting}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                  resetConfirm === 'progress'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100'
                }`}>
                {resetting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                {resetConfirm === 'progress' ? 'Click again to confirm reset' : 'Reset Study Progress'}
              </button>
            </div>

            <div className="border-t border-red-100 dark:border-red-900 pt-4 space-y-2">
              <p className="text-sm text-foreground font-medium">Full factory reset (clears login too)</p>
              <p className="text-xs text-muted-foreground">
                This app has no external server or account service — your login session,
                vocabulary progress, and admin settings all live in this browser only. This wipes
                ALL of it (localStorage, cached files, the service worker) and signs you out,
                exactly like a fresh install. Only affects this device.
              </p>
              <button onClick={handleFactoryReset} disabled={resetting}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                  resetConfirm === 'factory'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100'
                }`}>
                {resetting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                {resetConfirm === 'factory' ? 'Click again to confirm — this signs you out' : 'Full Factory Reset & Sign Out'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══ AI API KEYS ═════════════════════════════════════════════════════════ */}
      {tab === 'aikeys' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

          {/* Header card */}
          <div className="rounded-2xl bg-[#1A1A2E] text-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#F5A623]/20 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-[#F5A623]" />
              </div>
              <div>
                <h2 className="font-semibold text-white">AI Service Configuration</h2>
                <p className="text-xs text-white/50">Powers AI-generated lessons, practice exercises & speaking feedback</p>
              </div>
            </div>
          </div>

          <InfoBox>
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>What this powers:</strong> once a Google Gemini key is set below, every
              learner automatically gets AI-generated mini-lessons and practice questions (built
              from the app's built-in vocabulary) on the Practice page, plus real feedback on
              their writing and speaking. No per-user setup — one key here enables it for
              everyone.
            </div>
          </InfoBox>

          {/* Provider cards */}

          {/* ── Google Gemini ── */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path d="M12 11.2L2 7l10-4 10 4-10 4.2Z" fill="#4285F4" />
                  <path d="M12 11.2v10L2 17V7l10 4.2Z" fill="#34A853" />
                  <path d="M12 11.2v10l10-4.2V7L12 11.2Z" fill="#FBBC05" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Google Gemini</p>
                <p className="text-xs text-muted-foreground">Lesson generation, practice questions & AI feedback</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${aiGoogleKey ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                {aiGoogleKey ? '✓ Set' : 'Not set'}
              </span>
            </div>
            <div className="relative">
              <Input
                type={showAiKeys['google'] ? 'text' : 'password'}
                placeholder="AIza…"
                value={aiGoogleKey}
                onChange={e => setAiGoogleKey(e.target.value)}
                className="pr-10"
              />
              <button onClick={() => toggleShowKey('google')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs">
                {showAiKeys['google'] ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Free tier: 1,500 req/day · <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#4A90E2] hover:underline">Get key at Google AI Studio →</a>
            </p>
          </div>

          {/* ── ElevenLabs ── */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#8B5CF6">
                  <rect x="4" y="3" width="3" height="18" rx="1.5" />
                  <rect x="10.5" y="6" width="3" height="15" rx="1.5" />
                  <rect x="17" y="9" width="3" height="12" rx="1.5" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">ElevenLabs</p>
                <p className="text-xs text-muted-foreground">Natural AI voice for pronunciation playback (British male)</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${aiElevenKey ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                {aiElevenKey ? '✓ Set' : 'Not set'}
              </span>
            </div>
            <div className="relative">
              <Input
                type={showAiKeys['eleven'] ? 'text' : 'password'}
                placeholder="ElevenLabs API key…"
                value={aiElevenKey}
                onChange={e => setAiElevenKey(e.target.value)}
                className="pr-10"
              />
              <button onClick={() => toggleShowKey('eleven')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs">
                {showAiKeys['eleven'] ? 'Hide' : 'Show'}
              </button>
            </div>
            <Field label="Voice ID" note="Defaults to 'George' — a male, British-English voice, for accurate pronunciation modeling.">
              <Input
                type="text"
                placeholder="JBFqnCBsd6RMkjVDRZzb  (default: George — British male)"
                value={aiElevenVoice}
                onChange={e => setAiElevenVoice(e.target.value)}
                className="font-mono text-xs"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Free tier: 10,000 chars/month · <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-[#4A90E2] hover:underline">Get key at ElevenLabs →</a>
              {' '}· <a href="https://elevenlabs.io/voice-library" target="_blank" rel="noopener noreferrer" className="text-[#4A90E2] hover:underline">Browse voices →</a>
            </p>
          </div>

          {/* Status summary */}
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Provider Status</p>
            <div className="space-y-1.5">
              {[
                { label: 'Google Gemini', key: aiGoogleKey, role: 'Lessons, practice & AI feedback' },
                { label: 'ElevenLabs',    key: aiElevenKey, role: 'AI voice playback (British male)' },
              ].map(p => (
                <div key={p.label} className="flex items-center gap-2.5 text-sm">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${p.key ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                  <span className="font-medium text-foreground w-28 shrink-0">{p.label}</span>
                  <span className="text-muted-foreground text-xs">{p.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button onClick={saveAiKeys}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F5A623] text-white text-sm font-bold hover:bg-[#E09400] active:scale-[0.98] transition-all">
            {aiKeySaved
              ? <><CheckCircle2 className="h-4 w-4" /> All Keys Saved!</>
              : <><Zap className="h-4 w-4" /> Save All AI Keys</>}
          </button>

          <InfoBox>
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>User privacy:</strong> Keys are stored under a protected admin key (<code className="bg-blue-100 px-1 rounded text-xs">moe_admin_api_cfg</code>) and are never shown in any user-facing UI, settings pages, or Practice screens.
            </div>
          </InfoBox>
          <WarnBox>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>Keys are stored in this browser's <code className="bg-amber-100 px-1 rounded text-xs">localStorage</code>. For production, use a backend secrets manager. Never share admin login credentials.</div>
          </WarnBox>
        </motion.div>
      )}
    </div>
  );
}
