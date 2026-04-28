// ── Top-3 card component ──────────────────────────────────────────────────────
const MEDALS = ["🥇","🥈","🥉"];
const MEDAL_COLORS = ["#FFD700","#C0C0C0","#CD7F32"];

export default function Top3Card({ title, emoji, items = [] }) {
  return (
    <div style={{
      background: "#1e1e1e",
      border: "1px solid #2a2a2a",
      borderRadius: 8,
      padding: "12px 14px",
      minWidth: 0,
    }}>
      <div style={{ color: "#888", fontSize: 11, textTransform: "uppercase",
        letterSpacing: .8, marginBottom: 8 }}>
        {emoji} {title}
      </div>
      {items.length === 0
        ? <p style={{ color: "#444", fontSize: 12, margin: 0 }}>–</p>
        : items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center",
            gap: 8, marginBottom: i < items.length - 1 ? 5 : 0 }}>
            <span style={{ fontSize: 14 }}>{MEDALS[i]}</span>
            <span style={{ color: "#ddd", fontSize: 12, flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name || "–"}
            </span>
            <span style={{ color: MEDAL_COLORS[i], fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {item.count}×
            </span>
          </div>
        ))
      }
    </div>
  );
}
