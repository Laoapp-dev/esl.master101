import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, TrendingUp, Mic, Menu, X,
  Star, Settings, User, Shield, HelpCircle, Layers,
  Puzzle, Keyboard, Flame, LogOut, ClipboardList, Zap, Tags,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/App';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Bottom bar items ─────────────────────────────────────── */
const BAR_ITEMS = [
  { to: '/',            label: 'Home',    icon: LayoutDashboard, exact: true,  prefix: '/'         },
  { to: '/words',       label: 'Words',   icon: BookOpen,        exact: false, prefix: '/words'    },
  { to: '/study/level', label: 'Journey', icon: TrendingUp,      exact: false, prefix: '/study'    },
  { to: '/practice',    label: 'Speak',   icon: Mic,             exact: false, prefix: '/practice' },
  { to: '__menu__',     label: 'More',    icon: Menu,            exact: false, prefix: '__menu__'  },
];

/* ── NAV BAR STYLE (matches screenshot) ──────────────────── */
const NAV_BG      = '#0D1B2A';   // deep dark navy — like the image
const ACTIVE_BG   = '#1A2E44';   // slightly lighter rect behind active tab
const ACTIVE_CLR  = '#00B4D8';   // cyan for active icon + label
const INACTIVE    = 'rgba(255,255,255,0.38)';  // dim white for inactive

export function MobileNav() {
  const { currentUser, logout } = useAuth();
  const { vocabulary } = useApp();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profile = vocabulary.profile;

  return (
    <>
      {/* ════════════════════════════════════════════════════
          BOTTOM NAV BAR — dark rect + active pill rectangle
      ════════════════════════════════════════════════════ */}
      <nav
        className="sidebar-mobile fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
        style={{
          background: NAV_BG,
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-1 gap-1">
          {BAR_ITEMS.map(item => {
            if (item.to === '__menu__') {
              return (
                <button
                  key="menu"
                  onClick={() => setDrawerOpen(true)}
                  className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-all"
                  style={{
                    background: drawerOpen ? ACTIVE_BG : 'transparent',
                    minHeight: 56,
                  }}
                >
                  <Menu
                    className="h-5 w-5"
                    style={{ color: drawerOpen ? ACTIVE_CLR : INACTIVE }}
                    strokeWidth={drawerOpen ? 2.4 : 1.8}
                  />
                  <span
                    className="text-[11px] leading-none"
                    style={{
                      color: drawerOpen ? ACTIVE_CLR : INACTIVE,
                      fontWeight: drawerOpen ? 700 : 600,
                    }}
                  >
                    More
                  </span>
                </button>
              );
            }

            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.prefix);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-all"
                style={{
                  background: active ? ACTIVE_BG : 'transparent',
                  minHeight: 56,
                }}
              >
                <item.icon
                  className="h-5 w-5"
                  style={{ color: active ? ACTIVE_CLR : INACTIVE }}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className="text-[11px] leading-none"
                  style={{
                    color: active ? ACTIVE_CLR : INACTIVE,
                    fontWeight: active ? 700 : 600,
                  }}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════
          SLIDE-UP DRAWER FOR "More"
      ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl overflow-y-auto"
              style={{
                background: 'linear-gradient(180deg, #0D1B2A 0%, #071016 100%)',
                maxHeight: '85vh',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* User strip */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{ background: currentUser?.role === 'admin' ? '#F5A623' : '#00B4D8' }}
                >
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{profile.username}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/45">
                    <Flame className="h-3 w-3 text-orange-400" />
                    <span>{profile.currentStreak}d streak</span>
                    <span>·</span>
                    <Zap className="h-3 w-3 text-yellow-400" />
                    {currentUser?.role === 'admin' && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: 'rgba(245,166,35,0.2)', color: '#F5A623' }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {/* Links */}
              <div className="px-4 py-3 space-y-4">
                <DrawerSection label="Library">
                  <DrawerLink to="/favorites" icon={Star}          label="Favorites"  onNav={() => setDrawerOpen(false)} pathname={pathname} />
                  <DrawerLink to="/pretest"   icon={ClipboardList} label="Pre-Test"   onNav={() => setDrawerOpen(false)} pathname={pathname} />
                </DrawerSection>

                <DrawerSection label="Study">
                  <DrawerLink to="/study/level"       icon={TrendingUp} label="Level Journey" onNav={() => setDrawerOpen(false)} pathname={pathname} />
                  <DrawerLink to="/study/categories"  icon={Tags}       label="Categories" onNav={() => setDrawerOpen(false)} pathname={pathname} />
                  <DrawerLink to="/study/flashcards" icon={Layers}     label="Flashcards" onNav={() => setDrawerOpen(false)} pathname={pathname} />
                  <DrawerLink to="/study/quiz"       icon={HelpCircle} label="Quiz"       onNav={() => setDrawerOpen(false)} pathname={pathname} />
                  <DrawerLink to="/study/matching"   icon={Puzzle}     label="Matching"   onNav={() => setDrawerOpen(false)} pathname={pathname} />
                  <DrawerLink to="/study/spelling"   icon={Keyboard}   label="Spelling"   onNav={() => setDrawerOpen(false)} pathname={pathname} />
                </DrawerSection>

                <DrawerSection label="Account">
                  <DrawerLink to="/settings"   icon={Settings} label="Settings"   onNav={() => setDrawerOpen(false)} pathname={pathname} />
                  <DrawerLink to="/my-account" icon={User}     label="My Account" onNav={() => setDrawerOpen(false)} pathname={pathname} />
                  {currentUser?.role === 'admin' && (
                    <DrawerLink to="/admin" icon={Shield} label="Admin Panel" onNav={() => setDrawerOpen(false)} pathname={pathname} accent />
                  )}
                </DrawerSection>

                <div className="pt-1 pb-4">
                  <button
                    onClick={() => { setDrawerOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400"
                    style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Sub-components ───────────────────────────────────────── */
function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1.5"
        style={{ color: 'rgba(255,255,255,0.28)' }}>
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DrawerLink({
  to, icon: Icon, label, onNav, pathname, accent,
}: {
  to: string; icon: React.ElementType; label: string;
  onNav: () => void; pathname: string; accent?: boolean;
}) {
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <NavLink
      to={to}
      onClick={onNav}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
      style={{
        background: active ? 'rgba(0,180,216,0.12)' : 'transparent',
        color: active ? '#00B4D8' : accent ? '#00B4D8' : 'rgba(255,255,255,0.55)',
      }}
    >
      <Icon
        className="h-5 w-5 flex-shrink-0"
        style={{ color: active || accent ? '#00B4D8' : 'rgba(255,255,255,0.45)' }}
        strokeWidth={active ? 2.2 : 1.6}
      />
      <span>{label}</span>
    </NavLink>
  );
}
