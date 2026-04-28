// ── Persistent storage layer (localStorage) ──────────────────────────────────
// All data lives in localStorage under namespaced keys.
// Structure:
//   dl_users     → [{id, username, passwordHash, role, displayName}]
//   dl_seasons   → [{id, year, name}]
//   dl_games     → [{id, seasonId, week, opponent, date, playdata}]
//   dl_liverows  → {gameId: [...rows]}
//   dl_colvis    → {visible: [...colNames]}

const KEYS = {
  users:    "dl_users",
  seasons:  "dl_seasons",
  games:    "dl_games",
  liverows: "dl_liverows",
  colvis:   "dl_colvis",
};

function get(key)        { try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; } }
function getObj(key)     { try { return JSON.parse(localStorage.getItem(key)) ?? {}; } catch { return {}; } }
function set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── Password hashing (SHA-256 via WebCrypto) ─────────────────────────────────
export async function hashPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ── Users ────────────────────────────────────────────────────────────────────
export function getUsers() { return get(KEYS.users); }

export async function seedAdmin() {
  if (get(KEYS.users).length > 0) return;
  const hash = await hashPassword("admin123");
  set(KEYS.users, [{ id: uid(), username: "admin", passwordHash: hash,
    role: "Admin", displayName: "Administrator" }]);
}

export async function login(username, password) {
  const users = get(KEYS.users);
  const user  = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return null;
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return null;
  return user;
}

export async function createUser(username, password, role, displayName) {
  const users = get(KEYS.users);
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    throw new Error("Username already taken");
  const hash = await hashPassword(password);
  const newUser = { id: uid(), username, passwordHash: hash, role, displayName: displayName || username };
  set(KEYS.users, [...users, newUser]);
  return newUser;
}

export async function updateUserPassword(userId, newPassword) {
  const users = get(KEYS.users);
  const hash  = await hashPassword(newPassword);
  set(KEYS.users, users.map(u => u.id === userId ? { ...u, passwordHash: hash } : u));
}

export function deleteUser(userId) {
  set(KEYS.users, get(KEYS.users).filter(u => u.id !== userId));
}

export function updateUser(userId, changes) {
  set(KEYS.users, get(KEYS.users).map(u => u.id === userId ? { ...u, ...changes } : u));
}

// ── Seasons ──────────────────────────────────────────────────────────────────
export function getSeasons()         { return get(KEYS.seasons); }
export function getSeason(id)        { return get(KEYS.seasons).find(s => s.id === id) || null; }

export function createSeason(year, name) {
  const s = { id: uid(), year: String(year), name: name || `GFL ${year} Season` };
  set(KEYS.seasons, [...get(KEYS.seasons), s]);
  return s;
}

export function deleteSeason(id) {
  set(KEYS.seasons, get(KEYS.seasons).filter(s => s.id !== id));
  set(KEYS.games,   get(KEYS.games).filter(g => g.seasonId !== id));
}

export function seedDefaultSeason() {
  if (get(KEYS.seasons).length > 0) return get(KEYS.seasons)[0];
  return createSeason("2026", "GFL 2026 Season");
}

// ── Games ────────────────────────────────────────────────────────────────────
export function getGames(seasonId)    { return get(KEYS.games).filter(g => g.seasonId === seasonId); }
export function getGame(id)           { return get(KEYS.games).find(g => g.id === id) || null; }

export function createGame(seasonId, week, opponent, date) {
  const g = { id: uid(), seasonId, week, opponent, date: date || "", playdata: null };
  set(KEYS.games, [...get(KEYS.games), g]);
  return g;
}

export function saveGamePlaydata(gameId, playdataJson) {
  set(KEYS.games, get(KEYS.games).map(g =>
    g.id === gameId ? { ...g, playdata: playdataJson } : g));
}

export function deleteGame(gameId) {
  set(KEYS.games, get(KEYS.games).filter(g => g.id !== gameId));
  const lr = getObj(KEYS.liverows);
  delete lr[gameId];
  set(KEYS.liverows, lr);
}

// ── Live tagging rows ────────────────────────────────────────────────────────
export function getLiveRows(gameId) {
  return getObj(KEYS.liverows)[gameId] || [];
}

export function saveLiveRows(gameId, rows) {
  const all = getObj(KEYS.liverows);
  all[gameId] = rows;
  set(KEYS.liverows, all);
}

// ── Column visibility ────────────────────────────────────────────────────────
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

export function getVisibleColumns() {
  const saved = getObj(KEYS.colvis);
  return saved.visible || DEFAULT_VISIBLE_COLUMNS;
}

export function saveVisibleColumns(cols) {
  set(KEYS.colvis, { visible: cols });
}
