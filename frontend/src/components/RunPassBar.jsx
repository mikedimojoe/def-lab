// ── Run / Pass / RPO grouped bar chart — two-row layout ──────────────────────
// Row 1: 1st & 2nd down groups   |   Row 2: 3rd & 4th down groups

const RPO_COLOR  = "var(--rpo-color)";
const ROW_LABELS = ["1st & 2nd Down", "3rd & 4th Down"];

// Which parent-down goes in which row
function rowIndex(downGroup) {
  const s = String(downGroup || "");
  if (s.startsWith("1st") || s.startsWith("2nd")) return 0;
  return 1;
}

function shortLabel(s) {
  return String(s || "")
    .replace(/\s*\(.*\)\s*$/, "")
    .replace(/^1st & 10$/, "1st&10")
    .replace(/^(2nd|3rd|4th) & /, "$1 ");
}

function SingleBar({ rows, hasRPO, title }) {
  const filtered = rows.filter(r => r.total > 0);
  if (!filtered.length) return null;

  const barsPerGroup = hasRPO ? 3 : 2;
  const groupCount   = filtered.length;
  const groupPx      = Math.max(46, Math.min(80, 480 / groupCount));
  const W   = Math.max(280, groupCount * groupPx + 52);
  const H   = 150;
  const PAD = { top: 18, right: 12, bottom: 34, left: 38 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;
  const groupW = chartW / groupCount;
  const barW   = Math.max(6, Math.min(groupW / (barsPerGroup + 1), 22));
  const gap    = 2;

  return (
    <div>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.6, color: "var(--text3)", marginBottom: 4 }}>
          {title}
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        {/* Grid */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = PAD.top + chartH - (v / 100) * chartH;
          return (
            <g key={v}>
              <line x1={PAD.left - 4} x2={PAD.left + chartW} y1={y} y2={y}
                stroke="var(--border)" strokeWidth={v === 0 ? 1.2 : 0.5} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fill="var(--text3)" fontSize="9">{v}%</text>
            </g>
          );
        })}

        {/* Bars */}
        {filtered.map((r, i) => {
          const cx    = PAD.left + i * groupW + groupW / 2;
          const y0    = PAD.top + chartH;
          const runH  = (r.runPct  / 100) * chartH;
          const passH = (r.passPct / 100) * chartH;
          const rpoH  = ((r.rpoPct || 0) / 100) * chartH;
          const totalW = barsPerGroup * barW + (barsPerGroup - 1) * gap;
          const startX = cx - totalW / 2;
          const runX   = startX;
          const passX  = startX + barW + gap;
          const rpoX   = startX + 2 * (barW + gap);

          return (
            <g key={r.downGroup || i}>
              {/* Run */}
              <rect x={runX} y={y0 - runH} width={barW} height={runH}
                style={{ fill: "var(--run-color)" }} rx={2} />
              {r.runPct > 4 && (
                <text x={runX + barW / 2} y={y0 - runH - 3}
                  textAnchor="middle" style={{ fill: "var(--run-color)" }}
                  fontSize="7.5" fontWeight="700">{r.runPct}%</text>
              )}
              {/* Pass */}
              <rect x={passX} y={y0 - passH} width={barW} height={passH}
                style={{ fill: "var(--pass-color)" }} rx={2} />
              {r.passPct > 4 && (
                <text x={passX + barW / 2} y={y0 - passH - 3}
                  textAnchor="middle" style={{ fill: "var(--pass-color)" }}
                  fontSize="7.5" fontWeight="700">{r.passPct}%</text>
              )}
              {/* RPO */}
              {hasRPO && (
                <>
                  <rect x={rpoX} y={y0 - rpoH} width={barW} height={rpoH}
                    fill={RPO_COLOR} rx={2} />
                  {(r.rpoPct || 0) > 4 && (
                    <text x={rpoX + barW / 2} y={y0 - rpoH - 3}
                      textAnchor="middle" fill={RPO_COLOR}
                      fontSize="7.5" fontWeight="700">{r.rpoPct}%</text>
                  )}
                </>
              )}
              {/* X label */}
              <text x={cx} y={H - 4} textAnchor="middle" fill="var(--text3)" fontSize="8.5">
                {shortLabel(r.downGroup)}
              </text>
            </g>
          );
        })}

        {/* Legend — only on first row, handled by caller */}
      </svg>
    </div>
  );
}

export default function RunPassBar({ rows = [] }) {
  const filtered = rows.filter(r => r.total > 0);
  if (!filtered.length) return null;

  const hasRPO = filtered.some(r => (r.rpo || 0) > 0);
  const row0   = filtered.filter(r => rowIndex(r.downGroup) === 0);
  const row1   = filtered.filter(r => rowIndex(r.downGroup) === 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2,
            background: "var(--run-color)", display: "inline-block" }} />
          <span style={{ color: "var(--text3)", fontSize: 10 }}>Run</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2,
            background: "var(--pass-color)", display: "inline-block" }} />
          <span style={{ color: "var(--text3)", fontSize: 10 }}>Pass</span>
        </span>
        {hasRPO && (
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2,
              background: RPO_COLOR, display: "inline-block" }} />
            <span style={{ color: "var(--text3)", fontSize: 10 }}>RPO</span>
          </span>
        )}
      </div>

      {row0.length > 0 && (
        <SingleBar rows={row0} hasRPO={hasRPO} title={ROW_LABELS[0]} />
      )}
      {row1.length > 0 && (
        <SingleBar rows={row1} hasRPO={hasRPO} title={ROW_LABELS[1]} />
      )}
    </div>
  );
}
