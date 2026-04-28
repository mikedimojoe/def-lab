import { useState, useRef } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import {
  getUsers, createUser, deleteUser, updateUser, updateUserPassword,
} from "../lib/storage";
import { parsePlaylistData } from "../lib/xlsxParser";
import { saveGamePlaydata }  from "../lib/storage";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

// ── Modal ─────────────────────────────────────────────────────────────────────
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
            style={{ background: "none", border: "none", color: "#888",
              cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = {
  width: "100%", background: "#181818", color: "#ddd", border: "1px solid #2a2a2a",
  borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none",
  boxSizing: "border-box", marginBottom: 10,
};

function Btn({ onClick, type = "button", children, variant = "default", style: extra = {} }) {
  const v = {
    default: { background: "#2a2a2a", color: "#bbb" },
    primary: { background: GREEN,     color: "#fff" },
    danger:  { background: "#3a1111", color: "#f66" },
  };
  return (
    <button type={type} onClick={onClick} style={{
      border: "none", borderRadius: 6, padding: "8px 14px",
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      ...v[variant], ...extra,
    }}>
      {children}
    </button>
  );
}

// ── Invitation link helper ────────────────────────────────────────────────────
function buildInviteLink(userId, tempPassword) {
  const base = window.location.origin;
  return `${base}/?invite=${userId}&pw=${encodeURIComponent(tempPassword)}`;
}

// ── Users section ─────────────────────────────────────────────────────────────
function UsersSection() {
  const { user: me, refreshUser } = useAuth();
  const [users,  setUsers]  = useState(getUsers);
  const [modal,  setModal]  = useState(null);
  const [target, setTarget] = useState(null);
  const [form,   setForm]   = useState({});
  const [err,    setErr]    = useState("");
  const [inviteLink, setInviteLink] = useState("");

  function refresh() { setUsers(getUsers()); }
  function f(k) { return e => setForm(prev => ({ ...prev, [k]: e.target.value })); }

  async function handleCreate(e) {
    e.preventDefault(); setErr("");
    if (!form.username?.trim()) { setErr("Username required"); return; }
    if (!form.password?.trim()) { setErr("Password required"); return; }
    try {
      const u = await createUser(
        form.username.trim(),
        form.password.trim(),
        form.role || "Player",
        form.displayName?.trim() || form.username.trim(),
      );
      const link = buildInviteLink(u.id, form.password.trim());
      setInviteLink(link);
      refresh();
    } catch (ex) { setErr(ex.message); }
  }

  async function handlePasswd(e) {
    e.preventDefault(); setErr("");
    if (!form.pw1) { setErr("Enter a new password"); return; }
    if (form.pw1 !== form.pw2) { setErr("Passwords do not match"); return; }
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
    setTarget(u || null);
    setForm(u ? { displayName: u.displayName, role: u.role } : {});
    setErr(""); setInviteLink(""); setModal(type);
  }

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <h3 style={secH}>Users</h3>
        <Btn variant="primary" onClick={() => open("create")} style={{ marginLeft: "auto" }}>
          + New User
        </Btn>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #222" }}>
            {["Username","Display Name","Role",""].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
              <td style={tdStyle}>{u.username}</td>
              <td style={tdStyle}>{u.displayName}</td>
              <td style={{ ...tdStyle, color: u.role === "Admin" ? ACCENT : "#666" }}>{u.role}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <Btn onClick={() => open("invite", u)} style={{ marginRight: 6 }}>Invite Link</Btn>
                <Btn onClick={() => open("passwd", u)} style={{ marginRight: 6 }}>Password</Btn>
                <Btn onClick={() => open("edit",   u)} style={{ marginRight: 6 }}>Edit</Btn>
                {u.id !== me?.id && (
                  <Btn variant="danger" onClick={() => { deleteUser(u.id); refresh(); }}>Delete</Btn>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Create user modal */}
      {modal === "create" && (
        <Modal title="Create User" onClose={() => setModal(null)}>
          {!inviteLink ? (
            <form onSubmit={handleCreate}>
              <input placeholder="Username" style={inp} onChange={f("username")} />
              <input placeholder="Display name (optional)" style={inp} onChange={f("displayName")} />
              <input type="password" placeholder="Temporary password" style={inp} onChange={f("password")} />
              <select style={{ ...inp }} value={form.role || "Player"} onChange={f("role")}>
                <option>Player</option><option>Coach</option><option>Admin</option>
              </select>
              {err && <p style={{ color: "#f66", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn onClick={() => setModal(null)}>Cancel</Btn>
                <Btn type="submit" variant="primary">Create &amp; Get Link</Btn>
              </div>
            </form>
          ) : (
            <div>
              <p style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>
                User created. Share this invite link — it auto-fills their credentials and lets them set a new password:
              </p>
              <div style={{
                background: "#111", border: "1px solid #2a2a2a",
                borderRadius: 6, padding: "10px 12px",
                fontFamily: "monospace", fontSize: 11, color: ACCENT,
                wordBreak: "break-all", marginBottom: 12,
              }}>
                {inviteLink}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn onClick={() => { navigator.clipboard.writeText(inviteLink); }}>
                  Copy Link
                </Btn>
                <Btn variant="primary" onClick={() => { refresh(); setModal(null); }}>Done</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Invite link for existing user */}
      {modal === "invite" && target && (
        <Modal title={`Invite Link — ${target.username}`} onClose={() => setModal(null)}>
          {!inviteLink ? (
            <div>
              <p style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>
                Set a temporary password. The user will be prompted to change it via the invite link.
              </p>
              <input type="text" placeholder="Temporary password" style={inp}
                value={form.tempPw || ""} onChange={f("tempPw")} />
              {err && <p style={{ color: "#f66", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn onClick={() => setModal(null)}>Cancel</Btn>
                <Btn variant="primary" onClick={async () => {
                  if (!form.tempPw) { setErr("Enter a temporary password"); return; }
                  await updateUserPassword(target.id, form.tempPw);
                  setInviteLink(buildInviteLink(target.id, form.tempPw));
                }}>
                  Generate Link
                </Btn>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>
                Share this link with <strong style={{ color: "#ccc" }}>{target.username}</strong>:
              </p>
              <div style={{
                background: "#111", border: "1px solid #2a2a2a", borderRadius: 6,
                padding: "10px 12px", fontFamily: "monospace", fontSize: 11,
                color: ACCENT, wordBreak: "break-all", marginBottom: 12,
              }}>
                {inviteLink}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy Link</Btn>
                <Btn variant="primary" onClick={() => setModal(null)}>Done</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Change password */}
      {modal === "passwd" && (
        <Modal title={`Change Password — ${target?.username}`} onClose={() => setModal(null)}>
          <form onSubmit={handlePasswd}>
            <input type="password" placeholder="New password" style={inp} onChange={f("pw1")} />
            <input type="password" placeholder="Confirm password" style={inp} onChange={f("pw2")} />
            {err && <p style={{ color: "#f66", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" variant="primary">Save</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit user */}
      {modal === "edit" && (
        <Modal title={`Edit — ${target?.username}`} onClose={() => setModal(null)}>
          <form onSubmit={handleEdit}>
            <input value={form.displayName || ""} placeholder="Display name" style={inp}
              onChange={f("displayName")} />
            <select style={{ ...inp }} value={form.role || "Player"} onChange={f("role")}>
              <option>Player</option><option>Coach</option><option>Admin</option>
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" variant="primary">Save</Btn>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

// ── Playdata upload section ───────────────────────────────────────────────────
function PlaydataSection() {
  const { seasons, selectedSeason, selectSeason, refreshSeasons,
          games, selectedGame, setSelectedGame, refreshGames } = useApp();

  const [modal,      setModal]      = useState(null);
  const [uploadGame, setUploadGame] = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState("");

  async function handleUpload(file) {
    if (!uploadGame) return;
    setUploading(true); setUploadMsg("");
    try {
      const rows = await parsePlaylistData(file);
      saveGamePlaydata(uploadGame.id, JSON.stringify(rows));
      refreshGames(selectedSeason?.id);
      setUploadMsg(`✅ ${rows.length} plays imported successfully`);
    } catch (ex) {
      setUploadMsg(`❌ Error: ${ex.message}`);
    } finally { setUploading(false); }
  }

  return (
    <section style={sectionStyle}>
      <h3 style={{ ...secH, marginBottom: 14 }}>Upload Playdata</h3>
      <p style={{ color: "#555", fontSize: 13, marginBottom: 14 }}>
        Select a game from the sidebar file tree, then upload a PlaylistData .xlsx file.
      </p>

      {!selectedGame ? (
        <p style={{ color: "#444", fontSize: 13 }}>No game selected. Use the sidebar to select a game.</p>
      ) : (
        <div>
          <div style={{
            background: "#181818", border: "1px solid #2a2a2a", borderRadius: 8,
            padding: "12px 16px", display: "flex", alignItems: "center",
            gap: 12, marginBottom: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#ccc", fontSize: 13, fontWeight: 600 }}>
                W{selectedGame.week} — {selectedGame.opponent}
              </div>
              <div style={{ color: "#444", fontSize: 11, marginTop: 2 }}>
                {(() => {
                  let c = 0;
                  try { if (selectedGame.playdata) c = JSON.parse(selectedGame.playdata).length; } catch {}
                  return c > 0 ? `${c} plays loaded` : "No playdata yet";
                })()}
              </div>
            </div>
            <Btn variant="primary" onClick={() => { setUploadGame(selectedGame); setUploadMsg(""); setModal("upload"); }}>
              Upload .xlsx
            </Btn>
          </div>
        </div>
      )}

      {modal === "upload" && uploadGame && (
        <Modal title={`Upload Playdata — W${uploadGame.week} vs. ${uploadGame.opponent}`}
          onClose={() => setModal(null)}>
          <p style={{ color: "#666", fontSize: 13, margin: "0 0 12px" }}>
            Upload a PlaylistData Excel file (.xlsx).
          </p>
          <input type="file" accept=".xlsx" style={{ ...inp, padding: "6px" }}
            onChange={e => { if (e.target.files[0]) handleUpload(e.target.files[0]); }} />
          {uploading && <p style={{ color: "#888", fontSize: 12 }}>Importing…</p>}
          {uploadMsg && (
            <p style={{ fontSize: 13, margin: "8px 0",
              color: uploadMsg.startsWith("✅") ? ACCENT : "#f66" }}>
              {uploadMsg}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Btn onClick={() => setModal(null)}>Close</Btn>
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
    return <div style={{ padding: 32, color: "#555" }}>Access denied.</div>;
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <h2 style={{ color: "#eee", margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>Admin</h2>
      <UsersSection />
      <PlaydataSection />
    </div>
  );
}

const sectionStyle = {
  background: "#1a1a1a", border: "1px solid #222",
  borderRadius: 10, padding: "18px 20px", marginBottom: 20,
};
const secH    = { color: "#ddd", margin: 0, fontSize: 15, fontWeight: 700 };
const thStyle = { padding: "6px 8px", textAlign: "left", color: "#555",
  fontWeight: 600, fontSize: 11, textTransform: "uppercase" };
const tdStyle = { padding: "9px 8px", color: "#bbb" };
