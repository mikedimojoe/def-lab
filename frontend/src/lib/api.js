// ── DEF LAB API Client ────────────────────────────────────────────────────────
// Centralised fetch wrapper for the PHP backend.
// Session cookie sent automatically via credentials: 'include'.

const BASE = '/api';

async function req(path, options = {}) {
  const { body, ...rest } = options;
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: isForm ? undefined : (body ? { 'Content-Type': 'application/json' } : undefined),
    body: isForm ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    ...rest,
  });
  let data;
  try { data = await res.json(); } catch { throw new Error('Server error'); }
  if (!data.ok) throw new Error(data.error || 'Request failed');
  return data.data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const apiLogin  = (username, password) =>
  req('/auth.php?action=login',  { method: 'POST', body: { username, password } });
export const apiLogout = () =>
  req('/auth.php?action=logout', { method: 'POST' });
export const apiMe     = () =>
  req('/auth.php?action=me');
export const apiChangePassword = (password) =>
  req('/auth.php?action=change_password', { method: 'POST', body: { password } });

// ── Teams ─────────────────────────────────────────────────────────────────────
export const apiGetTeams    = ()               => req('/teams.php');
export const apiCreateTeam  = (name, c1, c2)   =>
  req('/teams.php', { method: 'POST', body: { name, color1: c1, color2: c2 } });
export const apiUpdateTeam  = (id, changes)    =>
  req('/teams.php?id=' + id, { method: 'PUT', body: changes });
export const apiDeleteTeam  = (id)             =>
  req('/teams.php?id=' + id, { method: 'DELETE' });

// ── Users ─────────────────────────────────────────────────────────────────────
export const apiGetUsers    = ()  => req('/users.php');
export const apiCreateUser  = (username, password, role, display_name, team_id) =>
  req('/users.php', { method: 'POST', body: { username, password, role, display_name, team_id } });
export const apiUpdateUser  = (id, changes) =>
  req('/users.php?id=' + id, { method: 'PUT', body: changes });
export const apiDeleteUser  = (id) =>
  req('/users.php?id=' + id, { method: 'DELETE' });

// ── Seasons ───────────────────────────────────────────────────────────────────
export const apiGetSeasons    = ()             => req('/seasons.php');
export const apiCreateSeason  = (year, name, team_id) =>
  req('/seasons.php', { method: 'POST', body: { year, name, team_id } });
export const apiDeleteSeason  = (id)           =>
  req('/seasons.php?id=' + id, { method: 'DELETE' });

// ── Games ─────────────────────────────────────────────────────────────────────
export const apiGetGames    = (season_id)      => req('/games.php?season_id=' + season_id);
export const apiCreateGame  = (season_id, week, opponent, date = '') =>
  req('/games.php', { method: 'POST', body: { season_id, week, opponent, date } });
export const apiDeleteGame  = (id)             =>
  req('/games.php?id=' + id, { method: 'DELETE' });

// ── Plays ─────────────────────────────────────────────────────────────────────
export const apiGetPlays    = (game_id)        => req('/plays.php?game_id=' + game_id);
export const apiSavePlays   = (game_id, rows)  =>
  req('/plays.php?game_id=' + game_id, { method: 'POST', body: rows });

// ── Live Rows ─────────────────────────────────────────────────────────────────
export const apiGetLiveRows   = (game_id)      => req('/liverows.php?game_id=' + game_id);
export const apiSaveLiveRows  = (game_id, rows) =>
  req('/liverows.php?game_id=' + game_id, { method: 'POST', body: rows });

// ── Roster ────────────────────────────────────────────────────────────────────
// Stored as one JSON blob: { depth, opponent, importData }
export const apiGetRoster   = (game_id)        => req('/roster.php?game_id=' + game_id);
export const apiSaveRoster  = (game_id, data)  =>
  req('/roster.php?game_id=' + game_id, { method: 'POST', body: data });

// ── Formation Images ──────────────────────────────────────────────────────────
export const apiGetImages    = (game_id)       => req('/images.php?game_id=' + game_id);
export const apiDeleteImage  = (game_id, norm_name) =>
  req('/images.php?game_id=' + game_id + '&norm_name=' + encodeURIComponent(norm_name),
    { method: 'DELETE' });

export async function apiUploadImage(game_id, file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(BASE + '/images.php?game_id=' + game_id, {
    credentials: 'include',
    method: 'POST',
    body: form,
  });
  let data;
  try { data = await res.json(); } catch { throw new Error('Server error'); }
  if (!data.ok) throw new Error(data.error || 'Upload failed');
  return data.data;
}
