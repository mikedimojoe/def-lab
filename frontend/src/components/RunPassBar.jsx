// ── Run/Pass grouped bar chart (SVG) ─────────────────────────────────────────
// Uses CSS variables for colors so it adapts to light/dark theme.
const RUN_COLOR  = "#7B6EA0";
const PASS_COLOR = "#4472C4";

export default function RunPassBar({ rows = [] }) {
  if (!rows.length) return null;
  // Accept both aggregated simple rows and detailed rows
  // If rows have a 'parent' property they're detailed — aggregate first
  const filtered = rows.filter(r => r.total > 0);
  if (!filtered.length) return null;

  const W = 360, H = 170, PAD = { top: 14, right: 12, bottom: 34, left: 40 };
  const chartW = W - PAD.left  - PAD.right;
  const chartH = H - PAD.top   - PAD.bottom;
  const maxPct = 100;
  const groupW = chartW / filtered.length;
  const barW   = Math.max(6, Math.min(groupW * 0.36, 22));

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Grid */}
      {gridLines.map(v => {
        const y = PAD.top + chartH - (v / maxPct) * chartH;
        return (
          <g key={v}>
            <line x1={PAD.left - 4} x2={PAD.left + chartW} y1={y} y2={y}
              stroke="var(--border)" strokeWidth={v === 0 ? 1.2 : 0.5} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end"
              fill="var(--text3)" fontSize="9">{v}%</text>
          </g>
        );
      })}

      {filtered.map((r, i) => {
        const gx    = PAD.left + i * groupW + groupW / 2;
        const runH  = (r.runPct  / maxPct) * chartH;
        const passH = (r.passPct / maxPct) * chartH;
        const y0    = PAD.top + chartH;
        // Label: strip "Down" suffix for simple downs, keep short otherwise
        const label = String(r.downGroup || "").replace(/ Down$/, "").replace("& 10 (+)", "& 10+");
        return (
          <g key={r.downGroup || i}>
            {/* Run bar */}
            <rect x={gx - barW - 2} y={y0 - runH} width={barW} height={runH}
              fill={RUN_COLOR} rx={2} />
            {r.runPct > 5 && (
              <text x={gx - barW / 2 - 2} y={y0 - runH - 3}
                textAnchor="middle" fill={RUN_COLOR} fontSize="8" fontWeight="600">
                {r.runPct}%
              </text>
            )}

            {/* Pass bar */}
            <rect x={gx + 2} y={y0 - passH} width={barW} height={passH}
              fill={PASS_COLOR} rx={2} />
            {r.passPct > 5 && (
              <text x={gx + barW / 2 + 2} y={y0 - passH - 3}
                textAnchor="middle" fill={PASS_COLOR} fontSize="8" fontWeight="600">
                {r.passPct}%
              </text>
            )}

            {/* X label */}
            <text x={gx} y={H - 6} textAnchor="middle" fill="var(--text3)" fontSize="8.5">
              {label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={PAD.left} y={3} width={8} height={8} fill={RUN_COLOR} rx={1} />
      <text x={PAD.left + 12} y={11} fill="var(--text3)" fontSize="9">Run</text>
      <rect x={PAD.left + 46} y={3} width={8} height={8} fill={PASS_COLOR} rx={1} />
      <text x={PAD.left + 58} y={11} fill="var(--text3)" fontSize="9">Pass</text>
    </svg>
  );
}
