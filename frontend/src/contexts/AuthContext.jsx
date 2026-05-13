import { createContext, useContext, useState, useEffect } from "react";
import { apiLogin, apiLogout, apiMe, apiChangePassword } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore PHP session on page load
  useEffect(() => {
    apiMe()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Session expired signal from api.js (soft logout, no page reload)
  useEffect(() => {
    const handle = () => setUser(null);
    window.addEventListener('auth:expired', handle);
    return () => window.removeEventListener('auth:expired', handle);
  }, []);

  // Auto-logout when browser tab/window is closed
  useEffect(() => {
    if (!user) return;
    const handleUnload = () => {
      // sendBeacon is fire-and-forget — works even during page unload
      const base = (import.meta.env.VITE_API_URL ?? '') + '/api';
      navigator.sendBeacon(base + '/auth.php?action=logout');
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);

  async function login(username, password) {
    const u = await apiLogin(username, password);
    setUser(u);
    return u;
  }

  async function logout() {
    try { await apiLogout(); } catch {}
    setUser(null);
  }

  async function refreshUser() {
    try { setUser(await apiMe()); } catch {}
  }

  async function changePassword(password) {
    await apiChangePassword(password);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
