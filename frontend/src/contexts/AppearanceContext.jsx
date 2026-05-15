import { createContext, useContext, useState, useEffect } from "react";
import { apiGetSettings, apiSaveSettings } from "../lib/api";

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

export function applyAppearance({ run, pass, rpo, teamPrimary, teamSecondary }) {
  const root = document.documentElement;
  if (run)  { root.style.setProperty("--run-color",  run);  root.style.setProperty("--run-rgb",  hexToRgb(run));  }
  if (pass) { root.style.setProperty("--pass-color", pass); root.style.setProperty("--pass-rgb", hexToRgb(pass)); }
  if (rpo)  { root.style.setProperty("--rpo-color",  rpo);  root.style.setProperty("--rpo-rgb",  hexToRgb(rpo));  }
  if (teamPrimary)   root.style.setProperty("--team-primary",   teamPrimary);
  if (teamSecondary) root.style.setProperty("--team-secondary", teamSecondary);
}

export function AppearanceProvider({ children }) {
  const [runColor,  setRunColor]  = useState(() => localStorage.getItem("dl_run_color")  || "#7B6EA0");
  const [passColor, setPassColor] = useState(() => localStorage.getItem("dl_pass_color") || "#4472C4");
  const [rpoColor,  setRpoColor]  = useState(() => localStorage.getItem("dl_rpo_color")  || "#D4782A");
  const [teamIcon,  setTeamIcon]  = useState(() => localStorage.getItem("dl_team_icon")  || null);

  // On mount: fetch server-side settings and override local
  useEffect(() => {
    apiGetSettings().then(s => {
      if (s.run_color)  { localStorage.setItem("dl_run_color",  s.run_color);  setRunColor(s.run_color);  }
      if (s.pass_color) { localStorage.setItem("dl_pass_color", s.pass_color); setPassColor(s.pass_color); }
      if (s.rpo_color)  { localStorage.setItem("dl_rpo_color",  s.rpo_color);  setRpoColor(s.rpo_color);  }
      if (s.team_icon)  { localStorage.setItem("dl_team_icon",  s.team_icon);  setTeamIcon(s.team_icon);  }
    }).catch(() => {});
  }, []);

  // Apply on mount and whenever colors change
  useEffect(() => {
    applyAppearance({ run: runColor, pass: passColor, rpo: rpoColor });
  }, [runColor, passColor, rpoColor]);

  // Update favicon when team icon changes
  useEffect(() => {
    const url = teamIcon || "/icon.png";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = url;
  }, [teamIcon]);

  function saveColors(run, pass, rpo) {
    localStorage.setItem("dl_run_color",  run);
    localStorage.setItem("dl_pass_color", pass);
    localStorage.setItem("dl_rpo_color",  rpo);
    setRunColor(run); setPassColor(pass); setRpoColor(rpo);
  }

  // Legacy compat
  function saveRunPassColors(run, pass) { saveColors(run, pass, rpoColor); }

  function applyUserColors(run, pass, rpo) {
    if (run)  { setRunColor(run);  localStorage.setItem("dl_run_color",  run);  }
    if (pass) { setPassColor(pass); localStorage.setItem("dl_pass_color", pass); }
    if (rpo)  { setRpoColor(rpo);  localStorage.setItem("dl_rpo_color",  rpo);  }
  }

  function saveTeamIcon(dataUrl) {
    localStorage.setItem("dl_team_icon", dataUrl);
    setTeamIcon(dataUrl);
    apiSaveSettings({ team_icon: dataUrl }).catch(() => {});
  }

  function applyTeamColors(primary, secondary) {
    applyAppearance({ run: runColor, pass: passColor, rpo: rpoColor, teamPrimary: primary, teamSecondary: secondary });
  }

  return (
    <AppearanceContext.Provider value={{
      runColor, passColor, rpoColor, teamIcon,
      saveColors, saveRunPassColors, saveTeamIcon, applyTeamColors, applyUserColors,
    }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() { return useContext(AppearanceContext); }
