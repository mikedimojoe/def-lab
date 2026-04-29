import { useState, useCallback } from "react";
import { useApp }  from "../contexts/AppContext";
import { apiSavePlays, apiSaveRoster, apiGetRoster, apiUploadImage, apiGetImages, apiDeleteImage } from "../lib/api";
import { parsePlaylistData } from "../lib/xlsxParser";
import { normalizeName } from "../lib/formationImages";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

async function parseXlsx(file) {
  const { default: XLSX } = await import("xlsx");
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      res(XLSX.utils.sheet_to_json(ws, { defval: "" }));
    };
    reader.onerror = rej;
    reader.readAsArrayBuffer(file);
  });
}

// ── Upload card component ─────────────────────────────────────────────────────
function UploadCard({ label, description, accept, status, loading, onUpload, multiple = false }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>{description}</div>
        {status && (
          <div style={{ fontSize: 12, marginTop: 6,
            color: status.startsWith("✅") ? ACCENT : status.startsWith("❌") ? "#e57373" : "var(--text3)" }}>
            {status}
          </div>
        )}
      </div>
      <label style={{
        background: loading ? "var(--surface2)" : GREEN, color: loading ? "var(--text3)" : "#fff",
        border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13,
        fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
      }}>
        {loading ? "Uploading…" : "Upload"}
        <input type="file" accept={accept} multiple={multiple} style={{ display: "none" }}
          disabled={loading}
          onChange={e => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }} />
      </label>
    </div>
  );
}

// ── Formation images manager ──────────────────────────────────────────────────
function FormationImagesSection({ teamId }) {
  const [images, setImages]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState("");
  const [loaded, setLoaded]     = useState(false);

  async function loadImages() {
    if (!teamId) return;
    const imgs = await apiGetImages(teamId).catch(() => ({}));
    setImages(imgs);
    setLoaded(true);
  }

  async function handleUpload(files) {
    if (!teamId) return;
    setLoading(true); setStatus("");
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        await apiUploadImage(teamId, file);
        count++;
      }
      setStatus(`✅ ${count} image(s) uploaded`);
      const updated = await apiGetImages(teamId);
      setImages(updated);
      setLoaded(true);
    } catch (e) {
      setStatus(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(normName) {
    if (!teamId) return;
    await apiDeleteImage(teamId, normName).catch(() => {});
    setImages(prev => { const n = { ...prev }; delete n[normName]; return n; });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>Formation Images</div>
          <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>
            PNG/JPG — filename = formation name (e.g. "Trips_Right.jpg"). Team-wide, not game-specific.
          </div>
          {status && (
            <div style={{ fontSize: 12, marginTop: 6,
              color: status.startsWith("✅") ? ACCENT : "#e57373" }}>
              {status}
            </div>
          )}
        </div>
        <label style={{
          background: loading ? "var(--surface2)" : GREEN, color: loading ? "var(--text3)" : "#fff",
          border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13,
          fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "Uploading…" : "Upload Images"}
          <input type="file" accept="image/*" multiple style={{ display: "none" }}
            disabled={loading || !teamId}
            onChange={e => e.target.files?.length && handleUpload(e.target.files)} />
        </label>
        {!loaded && teamId && (
          <button onClick={loadImages} style={{
            background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)",
            borderRadius: 7, padding: "8px 14px", fontSize: 12, cursor: "pointer",
          }}>
            Show existing
          </button>
        )}
      </div>

      {loaded && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {Object.entries(images).length === 0 ? (
            <span style={{ color: "var(--text3)", fontSize: 12 }}>No images uploaded yet.</span>
          ) : Object.entries(images).map(([normName, url]) => (
            <div key={normName} style={{
              position: "relative", background: "var(--surface2)",
              borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)",
            }}>
              <img src={url} alt={normName}
                style={{ width: 120, height: 52, objectFit: "cover", display: "block" }} />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "rgba(0,0,0,.65)", padding: "2px 4px",
                fontSize: 9, color: "#ccc", textOverflow: "ellipsis",
                overflow: "hidden", whiteSpace: "nowrap",
              }}>{normName}</div>
              <button onClick={() => handleDelete(normName)} style={{
                position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.5)",
                border: "none", borderRadius: 3, color: "#fff", fontSize: 10,
                cursor: "pointer", padding: "1px 4px", lineHeight: 1.4,
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Upload page ──────────────────────────────────────────────────────────
export default function Upload() {
  const { selectedGame, selectedSeason, refreshGames } = useApp();
  const [status, setStatus]   = useState({});
  const [loading, setLoading] = useState({});

  const teamId = selectedSeason?.team_id;

  async function handleUploadPlays(files) {
    if (!selectedGame) return;
    setLoading(l => ({ ...l, playdata: true }));
    setStatus(s => ({ ...s, playdata: "" }));
    try {
      const rows = await parsePlaylistData(files[0]);
      await apiSavePlays(selectedGame.id, rows);
      refreshGames(selectedSeason?.id);
      setStatus(s => ({ ...s, playdata: `✅ ${rows.length} rows imported` }));
    } catch (ex) {
      setStatus(s => ({ ...s, playdata: `❌ ${ex.message}` }));
    } finally {
      setLoading(l => ({ ...l, playdata: false }));
    }
  }

  async function handleUploadRoster(files) {
    if (!selectedGame) return;
    setLoading(l => ({ ...l, roster: true }));
    setStatus(s => ({ ...s, roster: "" }));
    try {
      const rows = await parseXlsx(files[0]);
      const current = await apiGetRoster(selectedGame.id).catch(() => ({}));
      await apiSaveRoster(selectedGame.id, { ...current, importData: rows });
      setStatus(s => ({ ...s, roster: `✅ ${rows.length} rows imported` }));
    } catch (ex) {
      setStatus(s => ({ ...s, roster: `❌ ${ex.message}` }));
    } finally {
      setLoading(l => ({ ...l, roster: false }));
    }
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 800 }}>
      <h2 style={{ color: "var(--text)", margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
        Upload
      </h2>
      <p style={{ color: "var(--text3)", fontSize: 12, margin: "0 0 24px" }}>
        Manage all data uploads in one place.
      </p>

      {/* Game Data */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: "var(--text2)", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>
          Game Data
          {selectedGame
            ? <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>
                W{selectedGame.week} — {selectedGame.opponent}
              </span>
            : <span style={{ color: "#e57373", fontWeight: 400, marginLeft: 8 }}>
                — select a game in the sidebar
              </span>
          }
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <UploadCard
            label="Play Data"
            description="PlaylistData .xlsx — main play-by-play data"
            accept=".xlsx"
            status={status.playdata}
            loading={loading.playdata}
            onUpload={handleUploadPlays}
          />
          <UploadCard
            label="Roster"
            description="Roster file (CSV or .xlsx) — player information"
            accept=".xlsx,.csv"
            status={status.roster}
            loading={loading.roster}
            onUpload={handleUploadRoster}
          />
        </div>
      </div>

      {/* Formation Images */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "16px 20px",
      }}>
        <div style={{ color: "var(--text2)", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: .8, marginBottom: 14 }}>
          Formation Images
          {teamId
            ? <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>
                Team: {selectedSeason?.name}
              </span>
            : <span style={{ color: "#e57373", fontWeight: 400, marginLeft: 8 }}>
                — select a season in the sidebar
              </span>
          }
        </div>
        {teamId
          ? <FormationImagesSection teamId={teamId} />
          : <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>
              Select a season from the sidebar to manage formation images.
            </p>
        }
      </div>
    </div>
  );
}
