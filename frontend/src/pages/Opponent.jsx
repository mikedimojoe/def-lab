import { useState, useMemo } from "react";
import { useApp } from "../contexts/AppContext";

const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "var(--rpo-color)";
const GREEN      = "#154734";

export default function Opponent() {
  const { selectedGame, mode, playRows, liveRows } = useApp();
  const rows = mode === "live" ? liveRows : playRows;

  if (!selectedGame) return (
    <div style={{ padding: 24, color: "var(--text3)" }}>Kein Spiel ausgewählt.</div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ color: "var(--text1)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        Opponent Analysis
      </div>
      <div style={{ color: "var(--text2)" }}>
        {rows.length} Plays · Opponent-Daten werden hier angezeigt.
      </div>
    </div>
  );
}
