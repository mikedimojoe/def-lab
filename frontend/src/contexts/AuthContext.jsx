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
