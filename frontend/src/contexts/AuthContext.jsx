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

  // No auto-logout on page close/reload — session persists for 7 days.
  // Users log out explicitly via the Logout button.

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
