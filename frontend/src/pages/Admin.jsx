import { useState } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import {
  getUsers, createUser, deleteUser, updateUser, updateUserPassword,
  createSeason, deleteSeason,
  createGame, deleteGame, saveGamePlaydata,
} from "../lib/storage";
import { parsePlaylistData } from "../lib/xlsxParser";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

// ── Tiny modal ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
      zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#1e1e1e", border: "1px solid #333", borderRadius: 10,
        padding: 24, width: 420, maxWidth: "95vw",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "#eee", margin: 0, fontSize: 15 }}>{title}</h3>
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20 }}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Shared form styles ────────────────────────────────────────────────────────
const inp = {
  width: "100%", background: "#222", color: "#ddd", border: "1px solid #333",
  borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none",
  boxSizing: "border-box", marginBottom: 10,
};
function Btn({ onClick, children, variant = "default", style: extra = {} }) {
  const base = {
    border: "none", borderRadius: 6, padding: "8px 16px",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
  const v = {
    default: { background: "#2a2a2a", color: "#ccc" },
    primary: { background: GREEN,     color: "#fff"  },
    danger:  { background: "#3a1111", color: "#f66"  },
  };
  return <button onClick={onClick} style={{ ...base, ...v[variant], ...extra }}>{children}</button>;
}

// ── Users section ─────────────────────────────────────────────────────────────
function UsersSection() {
  const { user: me, refreshUser } = useAuth();
  const [users, setUsers] = useState(getUsers);
  const [modal, setModal] = useState(null); // "create" | "passwd" | "edit"
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({});
  const [err,  setErr]  = useState("");

  function refresh() { setUsers(getUsers()); }

  async function handleCreate(e) {
    e.preventDefault(); setErr("");
    try {
      await createUser(form.username, form.password, form.role || "Player", form.displayName);
      refresh(); setModal(null);
    } catch (ex) { setErr(ex.message); }
  }

  async function handlePasswd(e) {
    e.preventDefault(); setErr("");
    if (!form.pw1 || form.pw1 !== form.pw2) { setErr("Passwörter stimmen nicht überein"); return; }
    await updateUserPassword(target.id, form.pw1);
    if (target.id === me?.id) refreshUser();
    setModal(null);
  }

  function handleEdit(e) {
    e.preventDefault();
    updateUser(target.id, { displayName: form.displayName, role: form.role });
    refresh(); setModal(null);
  }

  function open(type, u) {
    setTarget(u || null); setForm(u ? { displayName: u.displayName, role: u.role } : {}); setErr(""); setModal(type);
  }

  return (
    <section style={section}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h3 style={secH}>Benutzer</h3>
        <Btn variant="primary" onClick={() => open("create")} style={{ marginLeft: "auto" }}>
          + Benutzer
        </Btn>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "#666", borderBottom: "1px solid #2a2a2a" }}>
            {["Username","Name","Rolle",""].map(h => (
              <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
              <td style={tdS}>{u.username}</td>
              <td style={tdS}>{u.displayName}</td>
              <td style={{ ...tdS, color: u.role === "Admin" ? ACCENT : "#888" }}>{u.role}</td>
              <td style={{ ...tdS, textAlign: "right" }}>
                <Btn onClick={() => open("passwd", u)} style={{ marginRight: 6 }}>PW</Btn>
                <Btn onClick={() => open("edit",   u)} style={{ marginRight: 6 }}>✏️</Btn>
                {u.id !== me?.id && (
                  <Btn variant="danger" onClick={() => { deleteUser(u.id); refresh(); }}>✕</Btn>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal === "create" && (
        <Modal title="Benutzer anlegen" onClose={() => setModal(null)}>
          <form onSubmit={handleCreate}>
            <input placeholder="Username" style={inp} onChange={e => setForm(f=>({...f,username:e.target.value}))} />
            <input placeholder="Anzeigename" style={inp} onChange={e => setForm(f=>({...f,displayName:e.target.value}))} />
            <input type="password" placeholder="Passwort" style={inp} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
            <select style={{ ...inp }} value={form.role||"Player"} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              <option>Player</option><option>Coach</option><option>Admin</option>
            </select>
            {err && <p style={{ color: "#f66", fontSize: 12 }}>{err}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Abbrechen</Btn>
              <Btn variant="primary" onClick={() => {}}>Erstellen</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "passwd" && (
        <Modal title={`Passwort — ${target?.username}`} onClose={() => setModal(null)}>
          <form onSubmit={handlePasswd}>
            <input type="password" placeholder="Neues Passwort" style={inp} onChange={e => setForm(f=>({...f,pw1:e.target.value}))} />
            <input type="password" placeholder="Wiederholen"    style={inp} onChange={e => setForm(f=>({...f,pw2:e.target.value}))} />
            {err && <p style={{ color: "#f66", fontSize: 12 }}>{err}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Abbrechen</Btn>
              <Btn variant="primary" onClick={() => {}}>Speichern</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "edit" && (
        <Modal title={`Benutzer — ${target?.username}`} onClose={() => setModal(null)}>
          <form onSubmit={handleEdit}>
            <input value={form.displayName||""} placeholder="Anzeigename" style={inp}
              onChange={e => setForm(f=>({...f,displayName:e.target.value}))} />
            <select style={{ ...inp }} value={form.role||"Player"} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              <option>Player</option><option>Coach</option><option>Admin</option>
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Abbrechen</Btn>
              <Btn variant="primary" onClick={() => {}}>Speichern</Btn>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

// ── Seasons & Games section ───────────────────────────────────────────────────
function SeasonsSection() {
  const { seasons, selectedSeason, selectSeason, refreshSeasons,
          games, selectedGame, setSelectedGame, refreshGames } = useApp();
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({});
  const [uploadGame, setUploadGame] = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState("");
  const fileRef = useRef(null);

  function handleCreateSeason(e) {
    e.preventDefault();
    createSeason(form.year, form.name);
    refreshSeasons();
    setModal(null);
  }

  function handleCreateGame(e) {
    e.preventDefault();
    if (!selectedSeason) return;
    const g = createGame(selectedSeason.id, form.week || "1", form.opponent || "TBD", form.date || "");
    refreshGames(selectedSeason.id, g.id);
    setModal(null);
  }

  async function handleUpload(file) {
    if (!uploadGame) return;
    setUploading(true); setUploadMsg("");
    try {
      const rows = await parsePlaylistData(file);
      saveGamePlaydata(uploadGame.id, JSON.stringify(rows));
      setUploadMsg(`✅ ${rows.length} Plays importiert`);
      refreshGames(selectedSeason?.id);
    } catch (ex) {
      setUploadMsg(`❌ Fehler: ${ex.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section style={section}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h3 style={secH}>Saisons & Spiele</h3>
        <Btn variant="primary" onClick={() => { setForm({}); setModal("season"); }} style={{ marginLeft: "auto" }}>
          + Saison
        </Btn>
        {selectedSeason && (
          <Btn variant="primary" onClick={() => { setForm({}); setModal("game"); }}>
            + Spiel
          </Btn>
        )}
      </div>

      {/* Season tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {seasons.map(s => (
          <button key={s.id} onClick={() => selectSeason(s)} style={{
            padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12,
            fontWeight: 600, cursor: "pointer",
            background: selectedSeason?.id === s.id ? GREEN : "#2a2a2a",
            color: selectedSeason?.id === s.id ? "#fff" : "#888",
          }}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Games list */}
      {selectedSeason && (
        <div>
          {games.length === 0 ? (
            <p style={{ color: "#444", fontSize: 13 }}>Noch keine Spiele.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#666", borderBottom: "1px solid #2a2a2a" }}>
                  {["Woche","Gegner","Datum","Playdata",""].map(h => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {games.map(g => {
                  let playCount = 0;
                  try { if (g.playdata) playCount = JSON.parse(g.playdata).length; } catch {}
                  return (
                    <tr key={g.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                      <td style={tdS}>W{g.week}</td>
                      <td style={tdS}>{g.opponent}</td>
                      <td style={{ ...tdS, color: "#555" }}>{g.date || "—"}</td>
                      <td style={{ ...tdS, color: playCount ? ACCENT : "#444" }}>
                        {playCount ? `${playCount} Plays` : "–"}
                      </td>
                      <td style={{ ...tdS, textAlign: "right" }}>
                        <Btn onClick={() => { setUploadGame(g); setUploadMsg(""); setModal("upload"); }}
                          style={{ marginRight: 6 }}>
                          Upload
                        </Btn>
                        <Btn variant="danger" onClick={() => {
                          deleteGame(g.id);
                          refreshGames(selectedSeason.id);
                          if (selectedGame?.id === g.id) setSelectedGame(null);
                        }}>✕</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {modal === "season" && (
        <Modal title="Neue Saison" onClose={() => setModal(null)}>
          <form onSubmit={handleCreateSeason}>
            <input placeholder="Jahr (z.B. 2026)" style={inp}
              onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
            <input placeholder="Name (optional)" style={inp}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Abbrechen</Btn>
              <Btn variant="primary" onClick={() => {}}>Erstellen</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "game" && (
        <Modal title="Neues Spiel" onClose={() => setModal(null)}>
          <form onSubmit={handleCreateGame}>
            <input placeholder="Woche (z.B. 1)" style={inp}
              onChange={e => setForm(f => ({ ...f, week: e.target.value }))} />
            <input placeholder="Gegner" style={inp}
              onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))} />
            <input type="date" style={inp}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Abbrechen</Btn>
              <Btn variant="primary" onClick={() => {}}>Erstellen</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "upload" && uploadGame && (
        <Modal title={`Playdata — W${uploadGame.week} vs. ${uploadGame.opponent}`} onClose={() => setModal(null)}>
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 12px" }}>
            Lade eine PlaylistData-Excel-Datei (.xlsx) hoch.
          </p>
          <input ref={fileRef} type="file" accept=".xlsx"
            style={{ ...inp, padding: "6px" }}
            onChange={e => { if (e.target.files[0]) handleUpload(e.target.files[0]); }} />
          {uploading && <p style={{ color: "#888", fontSize: 12 }}>Importing…</p>}
          {uploadMsg && <p style={{ fontSize: 13, margin: "8px 0" }}>{uploadMsg}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Btn onClick={() => setModal(null)}>Schließen</Btn>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ── Main Admin page ───────────────────────────────────────────────────────────
export default function Admin() {
  const { user } = useAuth();
  if (user?.role !== "Admin") {
    return (
      <div style={{ padding: 32, color: "#555" }}>
        Kein Zugriff.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <h2 style={{ color: "#eee", margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>
        Admin
      </h2>
      <UsersSection />
      <SeasonsSection />
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const section = {
  background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: 10, padding: "20px 20px", marginBottom: 20,
};
const secH   = { color: "#ddd", margin: 0, fontSize: 15, fontWeight: 700 };
const tdS    = { padding: "8px 8px", color: "#ccc" };
