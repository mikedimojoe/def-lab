import { createContext, useContext, useState, useEffect } from "react";
import { getSeasons, getGames, seedDefaultSeason, seedDefaultTeam } from "../lib/storage";
import { useAuth } from "./AuthContext";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();

  // Admin (teamId=null) sees all; others filtered by their teamId
  const teamId = user?.role === "Admin" ? null : (user?.teamId || null);

  const [seasons,        setSeasons]        = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [games,          setGames]          = useState([]);
  const [selectedGame,   setSelectedGame]   = useState(null);
  const [mode,           setMode]           = useState("prep");
  const [sidebarOpen,    setSidebarOpen]    = useState(true);

  useEffect(() => {
    seedDefaultTeam();
    const s = seedDefaultSeason(teamId);
    refreshSeasons(s.id);
  }, [teamId]);

  function refreshSeasons(selectId) {
    const all  = getSeasons(teamId);
    setSeasons(all);
    const pick = selectId
      ? all.find(s => s.id === selectId) || all[0]
      : selectedSeason
        ? all.find(s => s.id === selectedSeason.id) || all[0]
        : all[0];
    if (pick) {
      setSelectedSeason(pick);
      refreshGames(pick.id);
    } else {
      setSelectedSeason(null);
      setGames([]);
    }
  }

  function refreshGames(seasonId, selectId) {
    const sid = seasonId || selectedSeason?.id;
    if (!sid) { setGames([]); return; }
    const all  = getGames(sid);
    setGames(all);
    const pick = selectId
      ? all.find(g => g.id === selectId)
      : selectedGame
        ? all.find(g => g.id === selectedGame.id)
        : all[all.length - 1] || null;
    setSelectedGame(pick || null);
  }

  function selectSeason(s) {
    setSelectedSeason(s);
    setSelectedGame(null);
    refreshGames(s.id, null);
  }

  return (
    <AppContext.Provider value={{
      teamId,
      seasons, selectedSeason, selectSeason, refreshSeasons,
      games, selectedGame, setSelectedGame, refreshGames,
      mode, setMode,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
