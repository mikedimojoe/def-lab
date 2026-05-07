import { createContext, useContext, useState, useEffect } from "react";
import { apiGetSettings, apiSaveSettings, apiSaveUserSettings } from "../lib/api";

const AppearanceContext = createContext(null);

function hexToRgb(hex) {
  const safe = (hex || "#000000").replace("#","");
  const full = safe.length === 3
    ? safe.split("").map(c => c+c).join("")
    : safe.padEnd(6,"0");
  const r = parseInt(full.slice(0,2),16)||0;
  const g = parseInt(full.slice(2,4),16)||0;
  const b = parseInt(full.slice(4,6),16)||0;
  return `${r},${g},${b}`;
}

export function applyAppearance({ run, pass, teamPrimary, teamSecondary }) {
  const root = document.documentElement;
  if (run)  { root.style.setProperty("--run-color",  run);  root.style.setProperty("--run-rgb",  hexToRgb(run));  }
  if (pass) { root.style.setProperty("--pass-color", pass); root.style.setProperty("--pass-rgb", hexToRgb(pass)); }
  if (teamPrimary)   root.style.setProperty("--team-primary",   teamPrimary);
  if (teamSecondary) root.style.setProperty("--team-secondary", teamSecondary);
}

export function AppearanceProvider({ children }) {
  const [runColor,  setRunColor]  = useState(() => localStorage.getItem("dl_run_color")  || "#7B6EA0");
  const [passColor, setPassColor] = useState(() => localStorage.getItem("dl_pass_color") || "#4472C4");
  const [logo,      setLogoState] = useState(() => localStorage.getItem("dl_logo")       || null);

  // On mount: fetch server-side colors (admin-controlled) and override local
  useEffect(() => {
    apiGetSettings().then(s => {
      if (s.run_color)  { localStorage.setItem("dl_run_color",  s.run_color);  setRunColor(s.run_color);  }
      if (s.pass_color) { localStorage.setItem("dl_pass_color", s.pass_color); setPassColor(s.pass_color); }
    }).catch(() => {});
  }, []);

  // Apply on mount and whenever colors change
  useEffect(() => {
    applyAppearance({ run: runColor, pass: passColor });
  }, [runColor, passColor]);

  // Apply favicon when logo changes
  useEffect(() => {
    if (logo) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = logo;
    }
  }, [logo]);

  function saveRunPassColors(run, pass) {
    localStorage.setItem("dl_run_color", run);
    localStorage.setItem("dl_pass_color", pass);
    setRunColor(run); setPassColor(pass);
    // Persist to server so all users pick it up on next load
    apiSaveSettings({ run_color: run, pass_color: pass }).catch(() => {});
    // Also save to per-user settings
    apiSaveUserSettings({ run_color: run, pass_color: pass }).catch(() => {});
  }

  function saveLogo(dataUrl) {
    localStorage.setItem("dl_logo", dataUrl);
    setLogoState(dataUrl);
  }

  function applyTeamColors(primary, secondary) {
    applyAppearance({ run: runColor, pass: passColor, teamPrimary: primary, teamSecondary: secondary });
  }

  // Apply colors from user settings (localStorage + CSS vars) without saving to global settings
  function applyUserColors(run, pass) {
    if (run)  { localStorage.setItem("dl_run_color",  run);  setRunColor(run);  }
    if (pass) { localStorage.setItem("dl_pass_color", pass); setPassColor(pass); }
  }

  return (
    <AppearanceContext.Provider value={{
      runColor, passColor, logo,
      saveRunPassColors, saveLogo, applyTeamColors, applyUserColors,
    }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() { return useContext(AppearanceContext); }
