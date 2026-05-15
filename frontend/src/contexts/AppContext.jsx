import { createContext, useContext, useState, useEffect } from "react";
import {
  apiGetSeasons, apiGetGames, apiGetPlays, apiGetLiveRows,
  apiHeartbeat, apiGetActiveUsers,
} from "../lib/api";
import { useAuth } from "./AuthContext";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();

  const [seasons,        setSeasons]        = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [gamesBySeason,  setGamesBySeason]  = useState({});   // {seasonId: Game[]}
  const [selectedGame,   setSelectedGame]   = useState(null);
  const [playRows,       setPlayRows]       = useState([]);
  const [liveRows,       setLiveRows]       = useState([]);
  const [mode,           setMode]           = useState("prep");
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);
  const [activeUsers,     setActiveUsers]     = useState(1);

  // Reload seasons when user changes
  useEffect(() => {
    if (!user) {
      setSeasons([]); setSelectedSeason(null);
      setGamesBySeason({}); setSelectedGame(null);
      setPlayRows([]); setLiveRows([]);
      return;
    }
    refreshSeasons();
  }, [user?.id]);

  // Reload play data when selected game changes
  useEffect(() => {
    if (!selectedGame) { setPlayRows([]); setLiveRows([]); return; }
    apiGetPlays(selectedGame.id).then(setPlayRows).catch(() => setPlayRows([]));
    apiGetLiveRows(selectedGame.id).then(setLiveRows).catch(() => setLiveRows([]));
  }, [selectedGame?.id]);

  // Poll live rows every 2 s — server is always authoritative
  useEffect(() => {
    if (!selectedGame) return;
    const poll = () => {
      apiGetLiveRows(selectedGame.id).then(serverRows => {
        setLiveRows(prev => {
          if (!serverRows.length && prev.length) return prev;
          const changed = serverRows.length !== prev.length ||
            serverRows.some((r, i) => JSON.stringify(r) !== JSON.stringify(prev[i]));
          if (changed) setLiveUpdateCount(c => c + 1);
          return changed ? serverRows : prev;
        });
      }).catch(() => {});
    };
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [selectedGame?.id]);

  // Heartbeat: tell server we're alive every 30 s, fetch active user count every 30 s
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      apiHeartbeat().catch(() => {});
      apiGetActiveUsers().then(d => setActiveUsers(d.active ?? 1)).catch(() => {});
    };
    tick(); // immediate on login
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Current season's games shorthand
  const games = gamesBySeason[selectedSeason?.id] || [];

  async function loadGamesForSeason(seasonId) {
    try {
      const g = await apiGetGames(seasonId);
      setGamesBySeason(prev => ({ ...prev, [seasonId]: g }));
      return g;
    } catch { return []; }
  }

  async function refreshSeasons(selectId) {
    try {
      const all = await apiGetSeasons();
      setSeasons(all);
      const pick = selectId
        ? all.find(s => s.id === selectId) || all[0]
        : selectedSeason
          ? all.find(s => s.id === selectedSeason.id) || all[0]
          : all[0];
      if (pick) {
        setSelectedSeason(pick);
        await refreshGames(pick.id);
      } else {
        setSelectedSeason(null);
        setSelectedGame(null);
      }
    } catch (e) { console.error('refreshSeasons:', e); }
  }

  async function refreshGames(seasonId, selectId) {
    const sid = seasonId || selectedSeason?.id;
    if (!sid) { setSelectedGame(null); return; }
    try {
      const all = await apiGetGames(sid);
      setGamesBySeason(prev => ({ ...prev, [sid]: all }));
      const pick = selectId
        ? all.find(g => g.id === selectId)
        : selectedGame
          ? all.find(g => g.id === selectedGame.id)
          : all[all.length - 1] || null;
      setSelectedGame(pick || null);
    } catch (e) { console.error('refreshGames:', e); }
  }

  function selectSeason(s) {
    setSelectedSeason(s);
    setSelectedGame(null);
    // Ensure games are loaded for this season
    if (!gamesBySeason[s.id]) {
      loadGamesForSeason(s.id);
    }
  }

  function refreshPlayRows() {
    if (!selectedGame) return;
    apiGetPlays(selectedGame.id).then(setPlayRows).catch(() => setPlayRows([]));
  }

  function refreshLiveRows() {
    if (!selectedGame) return;
    apiGetLiveRows(selectedGame.id).then(setLiveRows).catch(() => setLiveRows([]));
  }

  return (
    <AppContext.Provider value={{
      seasons, selectedSeason, selectSeason, refreshSeasons,
      games, gamesBySeason, loadGamesForSeason,
      selectedGame, setSelectedGame, refreshGames,
      playRows, liveRows, setLiveRows, refreshPlayRows, refreshLiveRows,
      mode, setMode,
      sidebarOpen, setSidebarOpen,
      liveUpdateCount, activeUsers,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
