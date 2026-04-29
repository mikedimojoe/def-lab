import { useMemo, useState, useEffect, useCallback } from "react";
import { useApp }  from "../contexts/AppContext";
import { computeFormationStats, uniqueValuesByFreq } from "../lib/dataEngine";
import { matchFormationImage } from "../lib/formationImages";
import { apiGetImages, apiUploadImage, apiDeleteImage } from "../lib/api";
import DDTable   from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";
import Top3Card  from "../components/Top3Card";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

export default function Formations() {
  const { selectedGame, selectedSeason, mode, playRows, liveRows } = useApp();
  const teamId = selectedSeason?.team_id;
  const [selForm, setSelForm] = useState("");
  const [selBF,   setSelBF]   = useState("");

  // Formation images (served from server)
  const [images,      setImages]      = useState({});    // { normName: url }
  const [imgLoading,  setImgLoading]  = useState(false);
  const [showImgMgr,  setShowImgMgr] = useState(false);

  const rows = mode === "live" ? liveRows : playRows;

  const offRows = useMemo(() => rows.filter(r => r["ODK"] === "O"), [rows]);

  // Formation and backfield options sorted by frequency
  const formations = useMemo(() => uniqueValuesByFreq(offRows, "OFF FORM"), [offRows]);
  const backfields  = useMemo(() => {
    const base = selForm ? offRows.filter(r => r["OFF FORM"] === selForm) : offRows;
    return uniqueValuesByFreq(base, "BACKFIELD");
  }, [offRows, selForm]);

  const stats = useMemo(
    () => computeFormationStats(rows, selForm || undefined, selBF || undefined),
    [rows, selForm, selBF]);

  // Load images from server (team-based)
  useEffect(() => {
    if (!teamId) { setImages({}); return; }
    apiGetImages(teamId).then(setImages).catch(() => setImages({}));
  }, [teamId]);

  // Upload images to server
  const handleFolderUpload = useCallback(async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !teamId) return;
    setImgLoading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        await apiUploadImage(teamId, file);
      }
      const updated = await apiGetImages(teamId);
      setImages(updated);
    } catch (err) {
      console.warn("Image upload error:", err);
    } finally {
      setImgLoading(false);
      e.target.value = "";
    }
  }, [teamId]);

  const handleDeleteImage = useCallback(async normName => {
    if (!teamId) return;
    await apiDeleteImage(teamId, normName);
    setImages(prev => { const n = { ...prev }; delete n[normName]; return n; });
  }, [teamId]);

  const matchedImage = useMemo(
    () => selForm ? matchFormationImage(selForm, images, selBF) : null,
    [selForm, selBF, images]);

  const noData = !selectedGame || rows.length === 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>Formations</h2>
        <span style={{ flex: 1 }} />
        {selectedGame && (
          <>
            <label style={{ ...btnStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              📁 {imgLoading ? "Uploading…" : "Upload Images"}
              <input type="file" multiple
                accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                onChange={handleFolderUpload}
                style={{ display: "none" }} />
            </label>
            <button onClick={() => setShowImgMgr(v => !v)} style={btnStyle}>
              🖼 Manage ({Object.keys(images).length})
            </button>
          </>
        )}
      </div>

      {/* Image manager modal */}
      {showImgMgr && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowImgMgr(false)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 20, width: 540, maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "var(--text)", margin: 0, fontSize: 15 }}>Formation Images</h3>
              <button onClick={() => setShowImgMgr(false)}
                style={{ background: "none", border: "none", color: "var(--text3)",
                  cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            {Object.keys(images).length === 0 ? (
              <p style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 20 }}>
                No images uploaded yet. Use "Upload Images" to add a folder.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {Object.entries(images).map(([name, url]) => (
                  <div key={name} style={{ position: "relative", borderRadius: 6, overflow: "hidden",
                    border: "1px solid var(--border)" }}>
                    <img src={url} alt={name}
                      style={{ width: "100%", aspectRatio: "16/7", objectFit: "cover", display: "block" }} />
                    <div style={{ padding: "4px 6px", background: "var(--surface2)",
                      fontSize: 10, color: "var(--text3)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </div>
                    <button onClick={() => handleDeleteImage(name)}
                      style={{ position: "absolute", top: 4, right: 4,
                        background: "rgba(0,0,0,.65)", border: "none",
                        color: "#fff", borderRadius: 4, cursor: "pointer",
                        fontSize: 11, padding: "2px 5px" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelBF(""); }}
          style={selStyle}>
          <option value="">All Formations</option>
          {formations.map(f => <option key={f}>{f}</option>)}
        </select>
        <select value={selBF} onChange={e => setSelBF(e.target.value)} style={selStyle}>
          <option value="">All Backfields</option>
          {backfields.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      {noData ? (
        <EmptyCard selectedGame={selectedGame} mode={mode} />
      ) : (
        <>
          {/* Formation image */}
          {matchedImage && (
            <div style={{ marginBottom: 18, borderRadius: 8, overflow: "hidden",
              border: "1px solid var(--border)", maxWidth: 960 }}>
              <img src={matchedImage} alt={selForm}
                style={{ width: "100%", maxHeight: 300, objectFit: "contain",
                  background: "var(--surface2)", display: "block" }} />
            </div>
          )}

          {/* Summary strip */}
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            {[
              ["Plays", stats.total, "var(--text)"],
              ["Run",   `${stats.run} (${stats.runPct}%)`,  "#7B6EA0"],
              ["Pass",  `${stats.pass} (${stats.passPct}%)`, "#4472C4"],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "10px 18px" }}>
                <div style={{ color: "var(--text3)", fontSize: 11, textTransform: "uppercase", letterSpacing: .7 }}>{l}</div>
                <div style={{ color: c, fontSize: 22, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Top 3 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <Top3Card title="Top Run Plays"    emoji="🏃" items={stats.top3Run}      />
            <Top3Card title="Top Pass Scheme"  emoji="🎯" items={stats.top3PassPlay} />
            <Top3Card title="Top F Routes"     emoji="📐" items={stats.top3FRoutes}  />
            <Top3Card title="Top B Routes"     emoji="🔀" items={stats.top3BRoutes}  />
          </div>

          {/* D&D + chart */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 260, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={panelTitle}>Down &amp; Distance</h3>
              <DDTable rows={stats.ddRows} />
            </div>
            <div style={{ flex: 1, minWidth: 300, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={panelTitle}>Run / Pass</h3>
              <RunPassBar rows={stats.chartRows} />
            </div>
          </div>

          {/* Backfield breakdown */}
          {stats.backfieldList.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={panelTitle}>Backfield Usage</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {stats.backfieldList.map(b => (
                  <div key={b.name} style={{ background: "var(--surface2)", borderRadius: 6,
                    padding: "6px 12px", border: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text2)", fontSize: 13 }}>{b.name}</span>
                    <span style={{ color: ACCENT, fontSize: 12, marginLeft: 8, fontWeight: 700 }}>
                      {b.count}× ({b.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyCard({ selectedGame, mode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 32, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
      {!selectedGame ? "Select a game from the sidebar."
        : mode === "live" ? "No live data yet."
        : "No playdata uploaded. Go to Admin → Upload .xlsx"}
    </div>
  );
}

const selStyle = {
  background: "var(--surface)", color: "var(--text2)",
  border: "1px solid var(--border)", borderRadius: 6,
  padding: "7px 10px", fontSize: 13, outline: "none",
};
const panelTitle = {
  color: "var(--text3)", fontSize: 11, textTransform: "uppercase",
  letterSpacing: .8, margin: "0 0 12px", fontWeight: 600,
};
const btnStyle = {
  background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)",
  borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
