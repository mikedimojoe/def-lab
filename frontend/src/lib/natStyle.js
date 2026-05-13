// ── Shared nationality styling ────────────────────────────────────────────────
// Single source of truth for USA / Germany / International badge colors.
// Used by: Roster.jsx, Print.jsx

const USA_CODES = new Set(["US", "USA", "AME"]);
const GER_CODES = new Set(["DE", "DEU", "GER"]);

/**
 * Full style for editable roster (boxBg, boxFg, nameColor).
 */
export function getNatStyle(rawCode) {
  const code = (rawCode || "").toUpperCase().trim();
  if (USA_CODES.has(code)) return { boxBg: "#C8A951", boxFg: "#111",    nameColor: "#C8A951" };
  if (GER_CODES.has(code)) return { boxBg: "#1a1a1a", boxFg: "#e0e0e0", nameColor: "#9E9E9E" };
  return                          { boxBg: "#1B4D2E", boxFg: "#ffffff", nameColor: "#5CBF8A" };
}

/**
 * Compact badge style for print / read-only contexts (bg, fg only).
 */
export function getNatBadgeStyle(rawCode) {
  const code = (rawCode || "").toUpperCase().trim();
  if (USA_CODES.has(code)) return { bg: "#C8A951", fg: "#111"    };
  if (GER_CODES.has(code)) return { bg: "#1a1a1a", fg: "#e0e0e0" };
  return                          { bg: "#1B4D2E", fg: "#fff"     };
}
