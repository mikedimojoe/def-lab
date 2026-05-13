// ── DEF LAB Local Storage ─────────────────────────────────────────────────────

const KEYS = {
  colvis:    "dl_colvis",
  theme:     "dl_theme",
  runColor:  "dl_run_color",
  passColor: "dl_pass_color",
};

function get(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; } catch { return fallback; }
}

function set(key, value) {
  try { localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); } catch {}
}

function getObj(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
}

export const ALL_COLUMNS = [
  "PLAY #","DRIVE","ODK","QTR","DOWN GROUP","P&10","DN","DIST","HASH","YARD LN",
  "FP GROUP","RESULT","GN/LS","PLAY TYPE","PLAY TYPE CALLED","PERSONNEL",
  "MOTION","OFF FORM","F FORM VAR","B FORM VAR","Y VAR","BACKFIELD",
  "OFF PLAY","ROUTE CONCEPT","F ROUTES","B ROUTES","* LOC","PROTECTION",
  "PREV PLAY TYPE","PREV PLAY RESULT","DEF CALL","DEF PERS","DEF TYPE",
  "DEF FRONT","COVERAGE","COMMENT","NOTE",
];

export const DEFAULT_VISIBLE_COLUMNS = [
  "PLAY #","DRIVE","ODK","QTR","DN","DIST","PLAY TYPE","PERSONNEL",
  "OFF FORM","BACKFIELD","OFF PLAY","ROUTE CONCEPT","F ROUTES","B ROUTES",
  "RESULT","COMMENT",
];

// Field position zones (ordered from own end zone outward)
export const FP_ZONES = [
  "BACKED UP",
  "MINUS TERRITORY",
  "PLUS TERRITORY",
  "LOW REDZONE",
  "HIGH REDZONE",
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

// Theme persistence
export function getSavedTheme() { return get(KEYS.theme, "dark"); }
export function saveTheme(t)    { set(KEYS.theme, t); }

// Color persistence
export function getSavedRunColor()  { return get(KEYS.runColor,  null); }
export function getSavedPassColor() { return get(KEYS.passColor, null); }
export function saveRunColor(c)     { set(KEYS.runColor, c); }
export function savePassColor(c)    { set(KEYS.passColor, c); }
