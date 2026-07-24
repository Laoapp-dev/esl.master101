import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Sparkles, BookMarked, Zap, Star, Globe2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { COUNTRIES } from '@/data/countries';


/* ── Floating background orbs ─────────────────────────────── */
function Orbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-60px] left-[-60px] w-64 h-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-[-40px] right-[-40px] w-80 h-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-1/3 right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
    </div>
  );
}

/* ── Floating achievement badges ─────────────────────────── */
function FloatingBadge({ icon, label, delay, className }: { icon: string; label: string; delay: number; className: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, type: 'spring', stiffness: 120 }}
      className={`absolute flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/25 ${className}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </motion.div>
  );
}

/* ── Mascot / Logo area ───────────────────────────────────── */
function Mascot() {
  return (
    <div className="mascot-bounce flex items-center justify-center">
      {/* Owl-style mascot using emoji + glow ring */}
      <div className="relative">
        <div className="w-20 h-20 rounded-[28px] overflow-hidden shadow-xl ring-2 ring-white/30">
          <img src="./icons/icon-512.png" alt="ESLmaster101 owl" className="w-full h-full object-cover" />
        </div>
        {/* XP glow ring */}
        <div className="absolute -inset-1 rounded-[32px] border-2 border-white/20 animate-pulse-slow" />
      </div>
    </div>
  );
}

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await login({ email, password }, remember);
        if (!res.success) setError(res.error || 'Login failed');
      } else {
        if (!username.trim()) { setError('Full name is required'); return; }
        if (!country) { setError('Please select your country'); return; }
        const res = await register({ username, email, password, fullName: username, country });
        if (!res.success) setError(res.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dot-grid-bg flex flex-col items-center justify-center p-4">

      {/* ── Hero panel ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm mb-[-1px]">

        <div className="auth-hero-bg rounded-t-3xl px-6 pt-8 pb-10 relative overflow-hidden">
          <Orbs />

          {/* Floating achievement badges */}
          <FloatingBadge icon="⚡" label="Streak 7" delay={0.6} className="top-4 right-4" />
          <FloatingBadge icon="🏆" label="Level B2"  delay={0.8} className="bottom-4 left-4" />

          {/* Mascot */}
          <div className="flex flex-col items-center gap-4 relative z-10">
            <Mascot />
            <div className="text-center">
              <h1 className="text-3xl font-black text-white tracking-tight font-display">
                ESLmaster101
              </h1>
              <p className="text-white/80 text-sm font-medium mt-0.5">
                Learn English · Level Up · Have Fun
              </p>
            </div>

            {/* Mini XP strip */}
            <div className="flex items-center gap-4 bg-white/15 rounded-2xl px-5 py-2 border border-white/20">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-yellow-300" fill="currentColor" />
                <span className="text-white text-xs font-bold">1,240 XP</span>
              </div>
              <div className="w-px h-4 bg-white/30" />
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-300" fill="currentColor" />
                <span className="text-white text-xs font-bold">Top 5%</span>
              </div>
              <div className="w-px h-4 bg-white/30" />
              <div className="flex items-center gap-1.5">
                <BookMarked className="h-4 w-4 text-white/90" />
                <span className="text-white text-xs font-bold">850 words</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Auth Card ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-sm">

        <div className="bg-card rounded-b-3xl shadow-xl border border-border border-t-0 px-6 pt-6 pb-7">

          {/* Tab switcher */}
          <div className="flex bg-muted rounded-2xl p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === m
                    ? 'bg-white dark:bg-card text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                {m === 'login' ? '✦ Sign In' : '✦ Register'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form key={mode}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
              onSubmit={handleSubmit} className="space-y-3">

              {/* Full Name + Country (register only) */}
              {mode === 'register' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-border bg-background text-foreground text-sm font-medium focus:outline-none focus:border-[#00B4D8] transition-colors"
                        required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5 uppercase tracking-wide">Country</label>
                    <div className="relative">
                      <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <select value={country} onChange={e => setCountry(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-border bg-background text-foreground text-sm font-medium focus:outline-none focus:border-[#00B4D8] transition-colors appearance-none"
                        required>
                        <option value="" disabled>Select your country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-border bg-background text-foreground text-sm font-medium focus:outline-none focus:border-[#00B4D8] transition-colors"
                    required />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-border bg-background text-foreground text-sm font-medium focus:outline-none focus:border-[#00B4D8] transition-colors"
                    required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              {mode === 'login' && (
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#00B4D8]" />
                  <span className="text-sm text-muted-foreground font-medium">Keep me signed in</span>
                </label>
              )}

              {/* Error */}
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900 font-medium">
                  ⚠️ {error}
                </motion.div>
              )}

              {/* Submit button — Duolingo-style with bottom shadow */}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 mt-2 rounded-2xl text-sm font-black text-white tracking-wide
                  bg-[#00B4D8] border-b-4 border-[#0096B7]
                  hover:bg-[#00C2E8] active:border-b-0 active:mt-[4px] active:mb-[-4px]
                  transition-all duration-100 flex items-center justify-center gap-2
                  disabled:opacity-60 disabled:cursor-not-allowed shadow-md">
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <><Sparkles className="h-4 w-4" /> START LEARNING</>
                ) : (
                  <><Zap className="h-4 w-4" fill="currentColor" /> JOIN FOR FREE</>
                )}
              </button>

            </motion.form>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-center text-xs text-muted-foreground mt-4 font-medium">
        Register on any device · sign in anywhere with the same email
      </motion.p>
      {/* Build stamp — lets you confirm which deploy is actually live without
          repo access. If this doesn't change after a deploy, the browser is
          serving a cached build, not the new one (see MIGRATION_GUIDE.md). */}
      <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
        v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'} · build {typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__.replace('T', ' ').slice(0, 16) + ' UTC' : 'dev'}
      </p>
    </div>
  );
}
