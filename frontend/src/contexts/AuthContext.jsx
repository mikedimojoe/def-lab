import { createContext, useContext, useState, useEffect } from "react";
import { seedAdmin, login as storageLogin, getUsers } from "../lib/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedAdmin()
      .catch(err => console.warn("seedAdmin error:", err))
      .finally(() => {
        // Restore session regardless of whether seedAdmin succeeded
        const saved = sessionStorage.getItem("dl_session");
        if (saved) {
          try {
            const u     = JSON.parse(saved);
            const users = getUsers();
            const fresh = users.find(x => x.id === u.id);
            if (fresh) setUser(fresh);
          } catch { /* ignore */ }
        }
        setLoading(false);
      });
  }, []);

  async function login(username, password) {
    const u = await storageLogin(username, password);
    if (!u) throw new Error("Invalid username or password");
    sessionStorage.setItem("dl_session", JSON.stringify(u));
    setUser(u);
    return u;
  }

  function logout() {
    sessionStorage.removeItem("dl_session");
    setUser(null);
  }

  function refreshUser() {
    const users = getUsers();
    const fresh = users.find(x => x.id === user?.id);
    if (fresh) {
      setUser(fresh);
      sessionStorage.setItem("dl_session", JSON.stringify(fresh));
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
