import { useState, useRef, useEffect } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import {
  apiGetUsers, apiCreateUser, apiDeleteUser, apiUpdateUser,
  apiGetTeams, apiCreateTeam, apiUpdateTeam, apiDeleteTeam,
  apiSavePlays, apiSaveRoster, apiGetRoster,
} from "../lib/api";
import { parsePlaylistData } from "../lib/xlsxParser";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
      zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding: 24, width: 440, maxWidth: "95vw" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 15 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none",
            color: "var(--text3)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = {
  width: "100%", background: "var(--bg)", color: "var(--text)",
  border: "1px solid var(--border)", borderRadius: 6,
  padding: "8px 10px", fontSize: 13, outline: "none",
  boxSizing: "border-box", marginBottom: 10,
};

function Btn({ onClick, type = "button", children, variant = "default", style: ex = {} }) {
  const v = {
    default: { background: "var(--surface2)", color: "var(--text2)" },
    primary: { background: GREEN, color: "#fff" },
    danger:  { background: "#3a1111", color: "#f66" },
  };
  return (
    <button type={type} onClick={onClick} style={{
      border: "none", borderRadius: 6, padding: "7px 14px",
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      ...v[variant], ...ex,
    }}>
      {children}
    </button>
  );
}

// ── Color picker input ────────────────────────────────────────────────────────
function ColorInput({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", color: "var(--text3)", fontSize: 11, marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 30, border: "1px solid var(--border)",
            borderRadius: 4, cursor: "pointer", background: "none", padding: 2 }} />
        <input type="text" value={value}
          onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          placeholder="#154734"
          style={{ ...inp, marginBottom: 0, width: 100, fontFamily: "monospace" }} />
        <div style={{ width: 24, height: 24, borderRadius: 4,
          background: value, border: "1px solid var(--border)" }} />
      </div>
    </div>
  );
}

function buildInviteLink(userId, tempPassword) {
  return `${window.location.origin}/?invite=${userId}&pw=${encodeURIComponent(tempPassword)}`;
}

// ── Teams section ─────────────────────────────────────────────────────────────
function TeamsSection() {
  const [teams,  setTeams]  = useState([]);
  const [modal,  setModal]  = useState(null);
  const [target, setTarget] = useState(null);
  const [form,   setForm]   = useState({});

  useEffect(() => { apiGetTeams().then(setTeams).catch(() => {}); }, []);

  function refresh() { apiGetTeams().then(setTeams).catch(() => {}); }
  function f(k) { return v => setForm(p => ({ ...p, [k]: typeof v === "string" ? v : v.target.value })); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name?.trim()) return;
    await apiCreateTeam(form.name.trim(), form.color1 || "#154734", form.color2 || "#5CBF8A");
    refresh(); setModal(null);
  }

  async function handleEdit(e) {
    e.preventDefault();
    await apiUpdateTeam(target.id, { name: form.name, color1: form.color1, color2: form.color2 });
    refresh(); setModal(null);
  }

  function open(type, t) {
    setTarget(t || null);
    setForm(t ? { name: t.name, color1: t.color1, color2: t.color2 } : { color1: "#154734", color2: "#5CBF8A" });
    setModal(type);
  }

  return (
    <section style={sec}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <h3 style={secH}>Teams</h3>
        <Btn variant="primary" onClick={() => open("create")} style={{ marginLeft: "auto" }}>
          + New Team
        </Btn>
      </div>

      {teams.length === 0
        ? <p style={{ color: "var(--text3)", fontSize: 13 }}>No teams yet.</p>
        : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Team","Colors",""].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--bg)" }}>
                  <td style={td}>{t.name}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ width: 16, height: 16, borderRadius: 3,
                        background: t.color1, border: "1px solid var(--border)" }} />
                      <span style={{ fontFamily: "monospace", fontSize: 11,
                        color: "var(--text3)" }}>{t.color1}</span>
                      <span style={{ width: 16, height: 16, borderRadius: 3,
                        background: t.color2, border: "1px solid var(--border)" }} />
                      <span style={{ fontFamily: "monospace", fontSize: 11,
                        color: "var(--text3)" }}>{t.color2}</span>
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Btn onClick={() => open("edit", t)} style={{ marginRight: 6 }}>Edit</Btn>
                    <Btn variant="danger" onClick={() => apiDeleteTeam(t.id).then(refresh)}>Delete</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {modal === "create" && (
        <Modal title="New Team" onClose={() => setModal(null)}>
          <form onSubmit={handleCreate}>
            <input placeholder="Team name" style={inp} value={form.name || ""}
              onChange={f("name")} autoFocus />
            <ColorInput label="Primary Color" value={form.color1 || "#154734"} onChange={f("color1")} />
            <ColorInput label="Secondary Color" value={form.color2 || "#5CBF8A"} onChange={f("color2")} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" variant="primary">Create</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal === "edit" && target && (
        <Modal title={`Edit — ${target.name}`} onClose={() => setModal(null)}>
          <form onSubmit={handleEdit}>
            <input placeholder="Team name" style={inp} value={form.name || ""}
              onChange={f("name")} autoFocus />
            <ColorInput label="Primary Color" value={form.color1 || "#154734"} onChange={f("color1")} />
            <ColorInput label="Secondary Color" value={form.color2 || "#5CBF8A"} onChange={f("color2")} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" variant="primary">Save</Btn>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

// ── Users section ─────────────────────────────────────────────────────────────
function UsersSection() {
  const { user: me, refreshUser } = useAuth();
  const [users,  setUsers]  = useState([]);
  const [teams,  setTeams]  = useState([]);
  const [modal,  setModal]  = useState(null);
  const [target, setTarget] = useState(null);
  const [form,   setForm]   = useState({});
  const [err,    setErr]    = useState("");
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    apiGetUsers().then(setUsers).catch(() => {});
    apiGetTeams().then(setTeams).catch(() => {});
  }, []);

  function refresh() {
    apiGetUsers().then(setUsers).catch(() => {});
    apiGetTeams().then(setTeams).catch(() => {});
  }
  function f(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })); }

  async function handleCreate(e) {
    e.preventDefault(); setErr("");
    if (!form.username?.trim()) { setErr("Username required"); return; }
    if (!form.password?.trim()) { setErr("Password required"); return; }
    try {
      const u = await apiCreateUser(
        form.username.trim(), form.password.trim(),
        form.role || "Player",
        form.displayName?.trim() || form.username.trim(),
        form.teamId || null,
      );
      setInviteLink(buildInviteLink(u.id, form.password.trim()));
      refresh();
    } catch (ex) { setErr(ex.message); }
  }

  async function handlePasswd(e) {
    e.preventDefault(); setErr("");
    if (!form.pw1) { setErr("Enter a new password"); return; }
    if (form.pw1 !== form.pw2) { setErr("Passwords do not match"); return; }
    await apiUpdateUser(target.id, { password: form.pw1 });
    if (target.id === me?.id) refreshUser();
    setModal(null);
  }

  async function handleEdit(e) {
    e.preventDefault();
    await apiUpdateUser(target.id, {
      display_name: form.displayName,
      role: form.role,
      team_id: form.teamId || null,
    });
    refresh(); setModal(null);
  }

  function open(type, u) {
    setTarget(u || null);
    setForm(u ? { displayName: u.display_name, role: u.role, teamId: u.team_id || "" } : {});
    setErr(""); setInviteLink(""); setModal(type);
  }
  // teamName uses team_id - alias for compat
  const _ = teamName;

  function teamName(team_id) {
    return teams.find(t => t.id === team_id)?.name || "—";
  }

  return (
    <section style={sec}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <h3 style={secH}>Users</h3>
        <Btn variant="primary" onClick={() => open("create")} style={{ marginLeft: "auto" }}>
          + New User
        </Btn>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Username","Name","Role","Team",""].map(h => <th key={h} style={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: "1px solid var(--bg)" }}>
              <td style={td}>{u.username}</td>
              <td style={td}>{u.display_name}</td>
              <td style={{ ...td, color: u.role === "Admin" ? ACCENT : "var(--text3)" }}>{u.role}</td>
              <td style={{ ...td, color: "var(--text3)", fontSize: 12 }}>
                {u.team_id ? teamName(u.team_id) : <span style={{ color: "var(--text3)" }}>All Teams</span>}
              </td>
              <td style={{ ...td, textAlign: "right" }}>
                <Btn onClick={() => {
                  setTarget(u); setForm({ tempPw: "" }); setInviteLink(""); setModal("invite");
                }} style={{ marginRight: 4 }}>Invite</Btn>
                <Btn onClick={() => { setTarget(u); setForm({}); setErr(""); setModal("passwd"); }}
                  style={{ marginRight: 4 }}>PW</Btn>
                <Btn onClick={() => open("edit", u)} style={{ marginRight: 4 }}>Edit</Btn>
                {u.id !== me?.id && (
                  <Btn variant="danger" onClick={() => apiDeleteUser(u.id).then(refresh)}>✕</Btn>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Create */}
      {modal === "create" && (
        <Modal title="Create User" onClose={() => setModal(null)}>
          {!inviteLink ? (
            <form onSubmit={handleCreate}>
              <input placeholder="Username" style={inp} onChange={f("username")} autoFocus />
              <input placeholder="Display name (optional)" style={inp} onChange={f("displayName")} />
              <input type="password" placeholder="Temporary password" style={inp} onChange={f("password")} />
              <select style={{ ...inp }} value={form.role || "Player"} onChange={f("role")}>
                <option>Player</option><option>Coach</option><option>Admin</option>
              </select>
              <select style={{ ...inp }} value={form.teamId || ""} onChange={f("teamId")}>
                <option value="">No team (Admin only)</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {err && <p style={{ color: "#f66", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn onClick={() => setModal(null)}>Cancel</Btn>
                <Btn type="submit" variant="primary">Create &amp; Get Link</Btn>
              </div>
            </form>
          ) : (
            <InviteLinkDisplay link={inviteLink} onDone={() => { refresh(); setModal(null); }} />
          )}
        </Modal>
      )}

      {/* Invite link for existing user */}
      {modal === "invite" && target && (
        <Modal title={`Invite Link — ${target.username}`} onClose={() => setModal(null)}>
          {!inviteLink ? (
            <div>
              <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 12 }}>
                Set a temporary password. The user will be prompted to change it.
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
                }}>Generate Link</Btn>
              </div>
            </div>
          ) : (
            <InviteLinkDisplay link={inviteLink} onDone={() => setModal(null)} />
          )}
        </Modal>
      )}

      {/* Change password */}
      {modal === "passwd" && (
        <Modal title={`Change Password — ${target?.username}`} onClose={() => setModal(null)}>
          <form onSubmit={handlePasswd}>
            <input type="password" placeholder="New password" style={inp} onChange={f("pw1")} autoFocus />
            <input type="password" placeholder="Confirm" style={inp} onChange={f("pw2")} />
            {err && <p style={{ color: "#f66", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" variant="primary">Save</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit */}
      {modal === "edit" && (
        <Modal title={`Edit — ${target?.username}`} onClose={() => setModal(null)}>
          <form onSubmit={handleEdit}>
            <input value={form.displayName || ""} placeholder="Display name" style={inp}
              onChange={f("displayName")} autoFocus />
            <select style={{ ...inp }} value={form.role || "Player"} onChange={f("role")}>
              <option>Player</option><option>Coach</option><option>Admin</option>
            </select>
            <select style={{ ...inp }} value={form.teamId || ""} onChange={f("teamId")}>
              <option value="">No team (Admin only)</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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

function InviteLinkDisplay({ link, onDone }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 12 }}>
        Share this invite link. The user will set their own password on first login:
      </p>
      <div style={{
        background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6,
        padding: "10px 12px", fontFamily: "monospace", fontSize: 11,
        color: ACCENT, wordBreak: "break-all", marginBottom: 12,
      }}>{link}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={() => { navigator.clipboard.writeText(link); setCopied(true); }}>
          {copied ? "✓ Copied!" : "Copy Link"}
        </Btn>
        <Btn variant="primary" onClick={onDone}>Done</Btn>
      </div>
    </div>
  );
}

// ── Data upload section ───────────────────────────────────────────────────────
function DataSection() {
  const { selectedGame, refreshGames, selectedSeason } = useApp();
  const [status, setStatus] = useState({});  // {field: message}
  const [loading, setLoading] = useState({});

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

  async function handleUploadPlays(file) {
    if (!selectedGame) return;
    setLoading(l => ({ ...l, playdata: true }));
    setStatus(s => ({ ...s, playdata: "" }));
    try {
      const rows = await parsePlaylistData(file);
      await apiSavePlays(selectedGame.id, rows);
      refreshGames(selectedSeason?.id);
      setStatus(s => ({ ...s, playdata: `✅ ${rows.length} rows imported` }));
    } catch (ex) {
      setStatus(s => ({ ...s, playdata: `❌ ${ex.message}` }));
    } finally {
      setLoading(l => ({ ...l, playdata: false }));
    }
  }

  async function handleUploadRoster(file) {
    if (!selectedGame) return;
    setLoading(l => ({ ...l, rosterData: true }));
    setStatus(s => ({ ...s, rosterData: "" }));
    try {
      const rows = await parseXlsx(file);
      // Merge into existing roster (keep depth chart, update importData)
      const current = await apiGetRoster(selectedGame.id).catch(() => ({}));
      await apiSaveRoster(selectedGame.id, { ...current, importData: rows });
      setStatus(s => ({ ...s, rosterData: `✅ ${rows.length} rows imported` }));
    } catch (ex) {
      setStatus(s => ({ ...s, rosterData: `❌ ${ex.message}` }));
    } finally {
      setLoading(l => ({ ...l, rosterData: false }));
    }
  }

  const DATA_TYPES = [
    {
      field: "playdata",
      label: "Play Data",
      description: "PlaylistData .xlsx — main play-by-play data",
      accept: ".xlsx",
      onUpload: handleUploadPlays,
    },
    {
      field: "rosterData",
      label: "Roster",
      description: "Roster file (CSV or .xlsx) — player information",
      accept: ".xlsx,.csv",
      onUpload: handleUploadRoster,
    },
  ];

  if (!selectedGame) {
    return (
      <section style={sec}>
        <h3 style={{ ...secH, marginBottom: 10 }}>Data</h3>
        <p style={{ color: "var(--text3)", fontSize: 13 }}>
          Select a game from the sidebar to upload data.
        </p>
      </section>
    );
  }

  const counts = {
    playdata:   selectedGame.play_count  ? Number(selectedGame.play_count)  : 0,
    rosterData: 0,
  };

  return (
    <section style={sec}>
      <h3 style={{ ...secH, marginBottom: 4 }}>Data</h3>
      <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 16 }}>
        W{selectedGame.week} — {selectedGame.opponent}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {DATA_TYPES.map(({ field, label, description, accept, onUpload }) => (
          <div key={field} style={{
            background: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{label}</div>
              <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 2 }}>{description}</div>
              {counts[field] > 0 && (
                <div style={{ color: ACCENT, fontSize: 11, marginTop: 3 }}>
                  {counts[field]} rows loaded
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {status[field] && (
                <span style={{ fontSize: 12,
                  color: status[field].startsWith("✅") ? ACCENT : "#f66" }}>
                  {status[field]}
                </span>
              )}
              <label style={{
                background: GREEN, color: "#fff", border: "none", borderRadius: 6,
                padding: "7px 14px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
              }}>
                {loading[field] ? "Uploading…" : "Upload"}
                <input type="file" accept={accept} style={{ display: "none" }}
                  onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Admin() {
  const { user } = useAuth();
  if (user?.role !== "Admin") {
    return <div style={{ padding: 32, color: "var(--text3)" }}>Access denied.</div>;
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 960 }}>
      <h2 style={{ color: "var(--text)", margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>
        Admin
      </h2>
      <TeamsSection />
      <UsersSection />
      <DataSection />
    </div>
  );
}

const sec  = { background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "18px 20px", marginBottom: 20 };
const secH = { color: "var(--text)", margin: 0, fontSize: 15, fontWeight: 700 };
const th   = { padding: "6px 8px", textAlign: "left", color: "var(--text3)",
  fontWeight: 600, fontSize: 11, textTransform: "uppercase" };
const td   = { padding: "9px 8px", color: "var(--text2)" };
