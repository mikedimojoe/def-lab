import { createContext, useContext, useState, useEffect } from "react";
import { apiSaveUserSettings } from "../lib/api";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("dl_theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dl_theme", theme);
  }, [theme]);

  function toggle() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    apiSaveUserSettings({ theme: newTheme }).catch(() => {});
  }

  function setThemeAndSave(t) {
    setTheme(t);
    apiSaveUserSettings({ theme: t }).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, setThemeAndSave }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
