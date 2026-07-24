import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Star, Layers, HelpCircle, Puzzle,
  Keyboard, Settings, Flame, LogOut, Shield, User, TrendingUp, ClipboardList,
  Zap, PenLine, Tags,
} from 'lucide-react';
import type { UserProfile } from '@/types/vocabulary';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps { profile: UserProfile; currentStreak: number; }

function SideNavLink({ to, icon: Icon, label, end = false, accent = false }: {
  to: string; icon: React.ElementType; label: string; end?: boolean; accent?: boolean;
}) {
  const { pathname } = useLocation();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(to + '/');
  return (
    <NavLink to={to} end={end}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all
        ${isActive
          ? 'bg-white/12 text-white shadow-sm'
          : 'text-white/55 hover:bg-white/6 hover:text-white/90'}`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#00B4D8]" />
      )}
      <Icon
        className={`h-[18px] w-[18px] flex-shrink-0 ${
          accent ? 'text-[#00B4D8]' : isActive ? 'text-[#00B4D8]' : 'text-white/50'
        }`}
        strokeWidth={isActive ? 2.2 : 1.6}
      />
      <span className={accent ? 'text-[#48CAE4] font-bold' : ''}>{label}</span>
    </NavLink>
  );
}

export function Sidebar({ profile, currentStreak }: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <aside className="flex h-full w-[210px] flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #03045E 0%, #023E8A 50%, #0077B6 100%)' }}>

      {/* ── Logo ─────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 py-5 flex-shrink-0">
        {/* Owl mascot mini */}
        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-white/20">
          <img src="./icons/icon-192.png" alt="ESLmaster101" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[15px] font-black tracking-tight text-white leading-none font-display">
            ESLmaster101
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B4D8] self-start mt-0.5 flex-shrink-0 animate-pulse" />
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto overscroll-contain space-y-4 pb-2">

        {/* Library */}
        <div>
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-white/25">Library</div>
          <div className="space-y-0.5">
            <SideNavLink to="/"          icon={LayoutDashboard} label="Dashboard"  end />
            <SideNavLink to="/words"     icon={BookOpen}        label="My Words" />
            <SideNavLink to="/favorites" icon={Star}            label="Favorites" />
            <SideNavLink to="/pretest"   icon={ClipboardList}   label="Pre-Test" />
          </div>
        </div>

        {/* Study */}
        <div>
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-white/25">Study</div>
          <div className="space-y-0.5">
            <SideNavLink to="/study/level"      icon={TrendingUp}  label="Level Journey"  accent />
            <SideNavLink to="/study/categories" icon={Tags}        label="Categories" />
            <SideNavLink to="/study/flashcards" icon={Layers}      label="Flashcards" />
            <SideNavLink to="/study/quiz"       icon={HelpCircle}  label="Quiz" />
            <SideNavLink to="/study/matching"   icon={Puzzle}      label="Matching" />
            <SideNavLink to="/study/spelling"   icon={Keyboard}    label="Spelling" />
            <SideNavLink to="/practice"         icon={PenLine}     label="Speaking" accent />
          </div>
        </div>

        {/* Account */}
        <div>
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-white/25">Account</div>
          <div className="space-y-0.5">
            <SideNavLink to="/settings"   icon={Settings} label="Settings" />
            <SideNavLink to="/my-account" icon={User}     label="My Account" />
            {isAdmin && (
              <SideNavLink to="/admin" icon={Shield} label="Admin Panel" accent />
            )}
          </div>
        </div>
      </nav>

      {/* ── User footer ──────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/10 px-3 py-3">
        <NavLink to="/my-account"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1 transition-colors ${isActive ? 'bg-white/12' : 'hover:bg-white/7'}`
          }
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white flex-shrink-0
            ${isAdmin ? 'bg-[#F5A623]' : 'bg-[#00B4D8]'}`}>
            {profile.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{profile.username}</div>
            <div className="flex items-center gap-1 text-[11px] text-white/45">
              <Flame className="h-3 w-3 text-orange-400" />
              <span>{currentStreak}d streak</span>
              <span className="mx-0.5">·</span>
              <Zap className="h-3 w-3 text-yellow-400" />
            </div>
          </div>
        </NavLink>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="h-4 w-4" /><span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
