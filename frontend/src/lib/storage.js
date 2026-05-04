// ── Persistent storage layer (localStorage) ──────────────────────────────────
// Structure:
//   dl_teams    → [{id, name, color1, color2}]
//   dl_users    → [{id, username, passwordHash, role, displayName, teamId}]
//   dl_seasons  → [{id, year, name, teamId}]
//   dl_games    → [{id, seasonId, week, opponent, date, playdata, rosterData, formationData}]
//   dl_liverows → {gameId: [...rows]}
//   dl_colvis   → {visible: [...colNames]}

const KEYS = {
  teams:    "dl_teams",
  users:    "dl_users",
  seasons:  "dl_seasons",
  games:    "dl_games",
  liverows: "dl_liverows",
  colvis:   "dl_colvis",
};

function get(key)        { try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; } }
function getObj(key)     { try { return JSON.parse(localStorage.getItem(key)) ?? {}; } catch { return {}; } }
function set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── Password hashing ─────────────────────────────────────────────────────────
// Uses SHA-256 via WebCrypto when available (HTTPS), falls back to a simple
// deterministic hash for non-secure contexts (dev over HTTP).
export async function hashPassword(pw) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }
  // Fallback: djb2 variant (non-secure, only used in HTTP dev)
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h) ^ pw.charCodeAt(i);
  return "fb_" + (h >>> 0).toString(16).padStart(8, "0");
}

// ── Teams ────────────────────────────────────────────────────────────────────
export function getTeams()   { return get(KEYS.teams); }
export function getTeam(id)  { return get(KEYS.teams).find(t => t.id === id) || null; }

export function createTeam(name, color1 = "#154734", color2 = "#5CBF8A") {
  const t = { id: uid(), name, color1, color2 };
  set(KEYS.teams, [...get(KEYS.teams), t]);
  return t;
}

export function updateTeam(id, changes) {
  set(KEYS.teams, get(KEYS.teams).map(t => t.id === id ? { ...t, ...changes } : t));
}

export function deleteTeam(id) {
  set(KEYS.teams, get(KEYS.teams).filter(t => t.id !== id));
  // Remove seasons belonging to this team
  const seasonIds = get(KEYS.seasons).filter(s => s.teamId === id).map(s => s.id);
  set(KEYS.seasons, get(KEYS.seasons).filter(s => s.teamId !== id));
  set(KEYS.games,   get(KEYS.games).filter(g => !seasonIds.includes(g.seasonId)));
}

export function seedDefaultTeam() {
  const teams = get(KEYS.teams);
  if (teams.length > 0) return teams[0];
  return createTeam("Schwäbisch Hall Unicorns", "#154734", "#5CBF8A");
}

// ── Users ────────────────────────────────────────────────────────────────────
export function getUsers() { return get(KEYS.users); }

export async function seedAdmin() {
  if (get(KEYS.users).length > 0) return;
  const hash = await hashPassword("admin123");
  // Admin has no teamId — sees all teams
  set(KEYS.users, [{ id: uid(), username: "admin", passwordHash: hash,
    role: "Admin", displayName: "Administrator", teamId: null }]);
}

export async function login(username, password) {
  const users = get(KEYS.users);
  const user  = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return null;
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return null;
  return user;
}

export async function createUser(username, password, role, displayName, teamId = null) {
  const users = get(KEYS.users);
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    throw new Error("Username already taken");
  const hash    = await hashPassword(password);
  const newUser = { id: uid(), username, passwordHash: hash, role,
    displayName: displayName || username, teamId: teamId || null };
  set(KEYS.users, [...users, newUser]);
  return newUser;
}

export async function updateUserPassword(userId, newPassword) {
  const hash = await hashPassword(newPassword);
  set(KEYS.users, get(KEYS.users).map(u =>
    u.id === userId ? { ...u, passwordHash: hash } : u));
}

export function deleteUser(userId) {
  set(KEYS.users, get(KEYS.users).filter(u => u.id !== userId));
}

export function updateUser(userId, changes) {
  set(KEYS.users, get(KEYS.users).map(u =>
    u.id === userId ? { ...u, ...changes } : u));
}

// ── Seasons ──────────────────────────────────────────────────────────────────
// teamId = null means visible to all (Admin)
export function getSeasons(teamId) {
  const all = get(KEYS.seasons);
  if (!teamId) return all;          // Admin sees everything
  return all.filter(s => s.teamId === teamId);
}
export function getSeason(id) { return get(KEYS.seasons).find(s => s.id === id) || null; }

export function createSeason(year, name, teamId = null) {
  const s = { id: uid(), year: String(year), name: name || `GFL ${year} Season`, teamId };
  set(KEYS.seasons, [...get(KEYS.seasons), s]);
  return s;
}

export function deleteSeason(id) {
  set(KEYS.seasons, get(KEYS.seasons).filter(s => s.id !== id));
  set(KEYS.games,   get(KEYS.games).filter(g => g.seasonId !== id));
}

export function seedDefaultSeason(teamId = null) {
  const all = teamId
    ? get(KEYS.seasons).filter(s => s.teamId === teamId)
    : get(KEYS.seasons);
  if (all.length > 0) return all[0];
  return createSeason("2026", "GFL 2026 Season", teamId);
}

// ── Games ────────────────────────────────────────────────────────────────────
export function getGames(seasonId)  { return get(KEYS.games).filter(g => g.seasonId === seasonId); }
export function getGame(id)         { return get(KEYS.games).find(g => g.id === id) || null; }

export function createGame(seasonId, week, opponent, date) {
  const g = { id: uid(), seasonId, week, opponent, date: date || "",
    playdata: null, rosterData: null, formationData: null };
  set(KEYS.games, [...get(KEYS.games), g]);
  return g;
}

export function saveGameData(gameId, field, jsonStr) {
  // field: "playdata" | "rosterData" | "formationData"
  set(KEYS.games, get(KEYS.games).map(g =>
    g.id === gameId ? { ...g, [field]: jsonStr } : g));
}

// Keep backwards-compat alias
export function saveGamePlaydata(gameId, json) { saveGameData(gameId, "playdata", json); }

export function deleteGame(gameId) {
  set(KEYS.games, get(KEYS.games).filter(g => g.id !== gameId));
  const lr = getObj(KEYS.liverows);
  delete lr[gameId];
  set(KEYS.liverows, lr);
}

// ── Live tagging rows ────────────────────────────────────────────────────────
export function getLiveRows(gameId)       { return getObj(KEYS.liverows)[gameId] || []; }
export function saveLiveRows(gameId, rows) {
  const all = getObj(KEYS.liverows);
  all[gameId] = rows;
  set(KEYS.liverows, all);
}

// ── Column visibility + order ─────────────────────────────────────────────────
export const ALL_COLUMNS = [
  "PLAY #","ODK","QTR","DOWN GROUP","P&10","DN","DIST","HASH","YARD LN",
  "FP GROUP","RESULT","GN/LS","PLAY TYPE","PLAY TYPE CALLED","PERSONNEL",
  "MOTION","OFF FORM","F FORM VAR","B FORM VAR","Y VAR","BACKFIELD",
  "OFF PLAY","ROUTE CONCEPT","F ROUTES","B ROUTES","* LOC","PROTECTION",
  "PREV PLAY TYPE","PREV PLAY RESULT","DEF CALL","DEF PERS","DEF TYPE",
  "DEF FRONT","COVERAGE","COMMENT","NOTE",
];

export const DEFAULT_VISIBLE_COLUMNS = [
  "PLAY #","ODK","QTR","DN","DIST","PLAY TYPE","PERSONNEL",
  "OFF FORM","BACKFIELD","OFF PLAY","ROUTE CONCEPT","F ROUTES","B ROUTES",
  "RESULT","COMMENT",
];

// Returns { visible: string[], order: string[] }
export function getColumnConfig() {
  const saved = getObj(KEYS.colvis);
  const visible = Array.isArray(saved.visible) ? saved.visible : DEFAULT_VISIBLE_COLUMNS;
  // order: persisted order, or fall back to ALL_COLUMNS order
  const order = Array.isArray(saved.order)
    ? [
        ...saved.order.filter(c => ALL_COLUMNS.includes(c)),
        ...ALL_COLUMNS.filter(c => !saved.order.includes(c)),
      ]
    : [...ALL_COLUMNS];
  return { visible, order };
}

export function saveColumnConfig({ visible, order }) {
  set(KEYS.colvis, { visible, order });
}

// Backwards-compat shims
export function getVisibleColumns() { return getColumnConfig().visible; }
export function saveVisibleColumns(cols) {
  const { order } = getColumnConfig();
  saveColumnConfig({ visible: cols, order });
}
