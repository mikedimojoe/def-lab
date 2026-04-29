import { useMemo, useState, useEffect, useCallback } from "react";
import { useApp } from "../contexts/AppContext";
import { computeOpponentFormations } from "../lib/dataEngine";
import { matchFormationImage } from "../lib/formationImages";
import { apiGetImages, apiUploadImage } from "../lib/api";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const RUN_COLOR  = "#7B6EA0";
const PASS_COLOR = "#4472C4";
const GREEN      = "#154734";

const TOP_N_OPTIONS = [3, 5, 10];

// ── Tendency banner ────────────────────────────────────────────────────────────
function TendencyBanner({ runPct, passPct }) {
  if (passPct >= 70) {
    return (
      <div style={{ background: "#1a2a44", color: PASS_COLOR, fontSize: 12,
        fontWeight: 700, padding: "4px 12px", letterSpacing: .5 }}>
        PASS {passPct}%
      </div>
    );
  }
  if (runPct >= 70) {
    return (
      <div style={{ background: "#1e1a2e", color: RUN_COLOR, fontSize: 12,
        fontWeight: 700, padding: "4px 12px", letterSpacing: .5 }}>
        RUN {runPct}%
      </div>
    );
  }
  return null;
}

// ── Route / play box ──────────────────────────────────────────────────────────
function ConceptBox({ title, items, color, bg }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: bg, borderRadius: 4,
      padding: "8px 10px", border: `1px solid ${color}33` }}>
      <div style={{ color, fontSize: 10, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: .7, marginBottom: 5 }}>
        {title}
      </div>
      {!items || items.length === 0
        ? <div style={{ color: "var(--text3)", fontSize: 11 }}>—</div>
        : items.slice(0, 4).map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between",
            marginBottom: 3, fontSize: 11 }}>
            <span style={{ color: "var(--text2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              flex: 1, paddingRight: 4 }}>
              {it.name}
            </span>
            <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{it.count}×</span>
          </div>
        ))
      }
    </div>
  );
}

// ── Single formation card ──────────────────────────────────────────────────────
function FormationCard({ data, gameId, images, onImageUpdate }) {
  const { key, form, bf, total, runN, runPct, passN, passPct,
          topRuns, topConcepts, topFRoutes, topBRoutes } = data;

  const matchedImage = useMemo(() => matchFormationImage(key, images), [key, images]);

  async function handleImageClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      await apiUploadImage(gameId, file);
      onImageUpdate();
    };
    input.click();
  }

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center",
        background: "var(--surface2)", padding: "8px 14px", gap: 8 }}>
        <span style={{ color: "var(--text3)", fontSize: 11, fontStyle: "italic" }}>◄ FIELD</span>
        <span style={{ color: "var(--text3)", fontSize: 11, flex: 1, textAlign: "center" }}>
          {total} plays · Run {runPct}% · Pass {passPct}%
        </span>
        <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>
          {bf ? `${form} / ${bf}` : form}
        </span>
      </div>

      <TendencyBanner runPct={runPct} passPct={passPct} />

      {/* Image area */}
      <div
        onClick={handleImageClick}
        style={{
          width: "100%", aspectRatio: "960 / 410", background: "var(--surface2)",
          cursor: "pointer", position: "relative", overflow: "hidden", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
        {matchedImage ? (
          <img src={matchedImage} alt={key}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ color: "var(--text3)", fontSize: 12, textAlign: "center", padding: 12 }}>
            Click to add formation image<br />
            <span style={{ fontSize: 10 }}>PNG / JPG · recommended 960×410</span>
          </div>
        )}
      </div>

      {/* Concept boxes */}
      <div style={{ display: "flex", gap: 6, padding: "10px 10px 12px" }}>
        <ConceptBox title="F Routes"     items={topFRoutes}  color="#D84315" bg="rgba(216,67,21,.06)"  />
        <ConceptBox title="Runs"         items={topRuns}     color={PASS_COLOR} bg="rgba(68,114,196,.06)" />
        <ConceptBox title="Route Concept"items={topConcepts} color="#7B1FA2" bg="rgba(123,31,162,.06)" />
        <ConceptBox title="B Routes"     items={topBRoutes}  color="#2E7D32" bg="rgba(46,125,50,.06)"  />
      </div>
    </div>
  );
}

// ── Main Opponent page ────────────────────────────────────────────────────────
export default function Opponent() {
  const { selectedGame, mode, playRows, liveRows } = useApp();
  const [topN, setTopN] = useState(5);
  const [images, setImages] = useState({});

  const rows = mode === "live" ? liveRows : playRows;

  const formations = useMemo(
    () => computeOpponentFormations(rows, topN),
    [rows, topN]);

  const refreshImages = useCallback(() => {
    if (!selectedGame) return;
    apiGetImages(selectedGame.id).then(setImages).catch(() => {});
  }, [selectedGame?.id]);

  // Load images from API
  useEffect(() => {
    setImages({});
    refreshImages();
  }, [selectedGame?.id]);

  const noData = !selectedGame || rows.length === 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>
          Opponent Overview
        </h2>
        {selectedGame && (
          <span style={{ color: "var(--text3)", fontSize: 13 }}>
            W{selectedGame.week} — {selectedGame.opponent}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {/* Top-N selector */}
        <div style={{ display: "flex", gap: 4 }}>
          {TOP_N_OPTIONS.map(n => (
            <button key={n} onClick={() => setTopN(n)} style={{
              padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12,
              fontWeight: 600, cursor: "pointer",
              background: topN === n ? GREEN : "var(--surface2)",
              color: topN === n ? "#fff" : "var(--text3)",
            }}>
              Top {n}
            </button>
          ))}
        </div>
      </div>

      <p style={{ color: "var(--text3)", fontSize: 12, margin: "0 0 20px" }}>
        Top {topN} offensive formations by play count. Click any image area to upload a formation diagram.
        Use Formations → Upload Images to bulk-upload from a folder.
      </p>

      {noData ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 48, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
          {!selectedGame ? "Select a game from the sidebar."
            : mode === "live" ? "No live data yet."
            : "No playdata uploaded. Go to Admin → Upload .xlsx"}
        </div>
      ) : formations.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 48, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
          No offensive formation data found (check ODK column = "O").
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {formations.map(f => (
            <FormationCard
              key={f.key}
              data={f}
              gameId={selectedGame.id}
              images={images}
              onImageUpdate={refreshImages}
            />
          ))}
        </div>
      )}
    </div>
  );
}
