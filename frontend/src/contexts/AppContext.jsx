import { createContext, useContext, useState, useEffect } from "react";
import {
  apiGetSeasons, apiGetGames, apiGetPlays, apiGetLiveRows,
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

  // Poll server every 3 s regardless of mode — liveRows must always be current
  useEffect(() => {
    if (!selectedGame) return;
    const poll = () => {
      apiGetLiveRows(selectedGame.id).then(serverRows => {
        setLiveRows(prev => {
          // More rows on server → always take server version
          if (serverRows.length > prev.length) {
            setLiveUpdateCount(c => c + 1);
            return serverRows;
          }
          // Same count but content changed → update
          if (serverRows.length === prev.length) {
            const changed = serverRows.some(
              (r, i) => JSON.stringify(r) !== JSON.stringify(prev[i])
            );
            if (changed) setLiveUpdateCount(c => c + 1);
            return changed ? serverRows : prev;
          }
          return prev; // server has fewer → stale read, keep local
        });
      }).catch(() => {});
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [selectedGame?.id]);

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
      liveUpdateCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
