// ── Top-3 card component ──────────────────────────────────────────────────────
const MEDALS       = ["🥇","🥈","🥉"];
const MEDAL_COLORS = ["#FFD700","#C0C0C0","#CD7F32"];

export default function Top3Card({ title, emoji, items = [] }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px",
      minWidth: 0,
    }}>
      <div style={{
        color: "var(--text3)", fontSize: 11, textTransform: "uppercase",
        letterSpacing: .8, marginBottom: 8, fontWeight: 600,
      }}>
        {emoji} {title}
      </div>
      {items.length === 0
        ? <p style={{ color: "var(--text3)", fontSize: 12, margin: 0 }}>–</p>
        : items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center",
            gap: 8, marginBottom: i < items.length - 1 ? 6 : 0,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{MEDALS[i] || `#${i+1}`}</span>
            <span style={{
              color: "var(--text2)", fontSize: 12, flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {item.name || "–"}
            </span>
            <span style={{
              color: MEDAL_COLORS[i] || "var(--text3)",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {item.count}×
            </span>
          </div>
        ))
      }
    </div>
  );
}
