import { createContext, useContext, useState, useEffect } from "react";
import { getSeasons, getGames, seedDefaultSeason } from "../lib/storage";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [seasons,        setSeasons]        = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [games,          setGames]          = useState([]);
  const [selectedGame,   setSelectedGame]   = useState(null);
  const [mode,           setMode]           = useState("prep"); // "prep" | "live"
  const [sidebarOpen,    setSidebarOpen]    = useState(true);

  // Boot: seed default season then load
  useEffect(() => {
    const s = seedDefaultSeason();
    refreshSeasons(s.id);
  }, []);

  function refreshSeasons(selectId) {
    const all = getSeasons();
    setSeasons(all);
    const pick = selectId
      ? all.find(s => s.id === selectId) || all[0]
      : selectedSeason
        ? all.find(s => s.id === selectedSeason.id) || all[0]
        : all[0];
    if (pick) {
      setSelectedSeason(pick);
      refreshGames(pick.id);
    }
  }

  function refreshGames(seasonId, selectId) {
    const all = getGames(seasonId || selectedSeason?.id);
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
