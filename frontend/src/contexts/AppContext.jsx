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
      playRows, liveRows, refreshPlayRows, refreshLiveRows,
      mode, setMode,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
