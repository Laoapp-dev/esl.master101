import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AuthUser, AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { AUTH_STORAGE_KEY, AUTH_CREDS_KEY, AUTH_SESSION_KEY } from '@/types/auth';

// Simple hash for demo (in production, use bcrypt on a server)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function loadUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUsers(users: AuthUser[]) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    // If the origin's storage quota is already full (e.g. a large
    // vocabulary import used most of it), this used to throw uncaught
    // straight out of login/registration and crash the whole app via the
    // top-level ErrorBoundary. Auth data is small and re-derivable from
    // the session already in memory, so failing this write quietly is far
    // better than taking down the app over it.
    console.error('Failed to save users to localStorage:', error);
  }
}

function loadCreds(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AUTH_CREDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCreds(creds: Record<string, string>) {
  try {
    localStorage.setItem(AUTH_CREDS_KEY, JSON.stringify(creds));
  } catch (error) {
    console.error('Failed to save credentials to localStorage:', error);
  }
}

// Small helper for the many session-persistence writes below — same
// rationale as saveUsers/saveCreds above: never let a full storage quota
// (most likely from a large vocabulary import) throw out of an auth flow.
function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to save "${key}" to localStorage:`, error);
  }
}

function persistSession(id: string, expireAt: number) {
  safeSetItem(SESSION_PERSIST_KEY, id);
  safeSetItem(SESSION_EXPIRE_KEY, String(expireAt));
}

const SESSION_PERSIST_KEY = AUTH_SESSION_KEY + '_persist';
const SESSION_EXPIRE_KEY  = AUTH_SESSION_KEY + '_expire';
const SESSION_DAYS = 7;

function getSessionUser(): AuthUser | null {
  try {
    // Check 7-day expiry for persistent sessions
    const expireAt = localStorage.getItem(SESSION_EXPIRE_KEY);
    if (expireAt && Date.now() > parseInt(expireAt, 10)) {
      localStorage.removeItem(SESSION_PERSIST_KEY);
      localStorage.removeItem(SESSION_EXPIRE_KEY);
      return null;
    }
    const id = sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(SESSION_PERSIST_KEY);
    if (!id) return null;
    const users = loadUsers();
    return users.find(u => u.id === id) || null;
  } catch { return null; }
}

function ensureAdminExists() {
  let users = loadUsers();
  let creds = loadCreds();

  // Migrate old admin email if present
  const OLD_EMAIL = 'admin@lexicon.app';
  const NEW_EMAIL = 'berndvh015@gmail.com';
  const oldAdmin = users.find(u => u.role === 'admin' && u.email.toLowerCase() === OLD_EMAIL);
  if (oldAdmin) {
    users = users.map(u =>
      u.id === oldAdmin.id ? { ...u, email: NEW_EMAIL, username: 'Beun Donsavanh' } : u
    );
    delete creds[OLD_EMAIL];
    creds[NEW_EMAIL] = simpleHash('admin123');
    saveUsers(users);
    saveCreds(creds);
    return;
  }

  // Create admin if no admin exists at all
  if (!users.find(u => u.role === 'admin')) {
    const adminId = uuidv4();
    const admin: AuthUser = {
      id: adminId,
      username: 'Beun Donsavanh',
      email: NEW_EMAIL,
      role: 'admin',
      joinDate: new Date().toISOString(),
      isActive: true,
      cefrLevel: 'C2',
      dailyGoal: 20,
      currentStreak: 0,
      longestStreak: 0,
      dataKey: `lexicon_data_${adminId}`,
    };
    users.push(admin);
    saveUsers(users);
    creds[NEW_EMAIL] = simpleHash('admin123');
    saveCreds(creds);
    return;
  }

  // Ensure the correct admin always has a valid credential entry
  const admin = users.find(u => u.role === 'admin');
  if (admin && !creds[admin.email.toLowerCase()]) {
    creds[admin.email.toLowerCase()] = simpleHash('admin123');
    saveCreds(creds);
  }
}

interface AuthContextType extends AuthState {
  login: (creds: LoginCredentials, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (creds: RegisterCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getAllUsers: () => AuthUser[];
  updateUser: (id: string, updates: Partial<AuthUser>) => void;
  deleteUser: (id: string) => void;
  toggleUserActive: (id: string) => void;
  updateCurrentUserProfile: (updates: Partial<AuthUser>) => void;
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; error?: string };
  isOnline: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    ensureAdminExists();
    const user = getSessionUser();
    if (user) setCurrentUser(user);
    setIsLoading(false);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const login = useCallback(async (creds: LoginCredentials, remember = false): Promise<{ success: boolean; error?: string }> => {
    const users = loadUsers();
    const storedCreds = loadCreds();
    const user = users.find(u => u.email.toLowerCase() === creds.email.toLowerCase());
    if (!user) return { success: false, error: 'No account found with this email' };
    if (!user.isActive) return { success: false, error: 'Account is deactivated. Contact admin.' };
    const hash = simpleHash(creds.password);
    if (storedCreds[user.email.toLowerCase()] !== hash) return { success: false, error: 'Incorrect password' };

    const updated = { ...user, lastLogin: new Date().toISOString() };
    const newUsers = users.map(u => u.id === user.id ? updated : u);
    saveUsers(newUsers);
    setCurrentUser(updated);
    if (remember) {
      const expireAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
      persistSession(user.id, expireAt);
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, user.id);
    }
    return { success: true };
  }, []);

  const register = useCallback(async (creds: RegisterCredentials): Promise<{ success: boolean; error?: string }> => {
    const users = loadUsers();
    const storedCreds = loadCreds();
    if (users.find(u => u.email.toLowerCase() === creds.email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists' };
    }
    if (creds.password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
    if (!creds.fullName?.trim()) return { success: false, error: 'Full name is required' };
    if (!creds.country?.trim()) return { success: false, error: 'Please select your country' };
    const id = uuidv4();
    const newUser: AuthUser = {
      id,
      username: creds.username.trim(),
      email: creds.email.toLowerCase(),
      role: 'user',
      joinDate: new Date().toISOString(),
      isActive: true,
      cefrLevel: 'A2',
      dailyGoal: 10,
      currentStreak: 0,
      longestStreak: 0,
      dataKey: `lexicon_data_${id}`,
      fullName: creds.fullName.trim(),
      country: creds.country.trim(),
    };
    users.push(newUser);
    saveUsers(users);
    storedCreds[creds.email.toLowerCase()] = simpleHash(creds.password);
    saveCreds(storedCreds);
    setCurrentUser(newUser);
    // Auto-login for 7 days after registration
    const expireAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
    persistSession(id, expireAt);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(SESSION_PERSIST_KEY);
    localStorage.removeItem(SESSION_EXPIRE_KEY);
  }, []);

  const getAllUsers = useCallback(() => loadUsers(), []);

  const updateUser = useCallback((id: string, updates: Partial<AuthUser>) => {
    const users = loadUsers();
    const newUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
    saveUsers(newUsers);
    if (currentUser?.id === id) setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
  }, [currentUser]);

  const deleteUser = useCallback((id: string) => {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (user) {
      const creds = loadCreds();
      delete creds[user.email.toLowerCase()];
      saveCreds(creds);
      // Remove user data
      localStorage.removeItem(user.dataKey + '_words');
      localStorage.removeItem(user.dataKey + '_sessions');
      localStorage.removeItem(user.dataKey + '_profile');
      localStorage.removeItem(user.dataKey + '_settings');
    }
    saveUsers(users.filter(u => u.id !== id));
  }, []);

  const toggleUserActive = useCallback((id: string) => {
    const users = loadUsers();
    const newUsers = users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u);
    saveUsers(newUsers);
  }, []);

  const changePassword = useCallback((currentPassword: string, newPassword: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    if (newPassword.length < 6) return { success: false, error: 'New password must be at least 6 characters' };
    const creds = loadCreds();
    const hash = simpleHash(currentPassword);
    if (creds[currentUser.email.toLowerCase()] !== hash) return { success: false, error: 'Current password is incorrect' };
    creds[currentUser.email.toLowerCase()] = simpleHash(newPassword);
    saveCreds(creds);
    return { success: true };
  }, [currentUser]);

  const updateCurrentUserProfile = useCallback((updates: Partial<AuthUser>) => {
    if (!currentUser) return;
    updateUser(currentUser.id, updates);
  }, [currentUser, updateUser]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isLoading,
      isOnline,
      login,
      register,
      logout,
      getAllUsers,
      updateUser,
      deleteUser,
      toggleUserActive,
      updateCurrentUserProfile,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
