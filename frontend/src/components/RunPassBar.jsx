// ── Run/Pass grouped bar chart (SVG) ─────────────────────────────────────────
const RUN_COLOR  = "#7B6EA0";
const PASS_COLOR = "#4472C4";
const DOWN_ORDER = ["1st Down","2nd Down","3rd Down","4th Down"];

export default function RunPassBar({ rows = [] }) {
  if (!rows.length) return null;
  const filtered = rows.filter(r => DOWN_ORDER.includes(r.downGroup));
  if (!filtered.length) return null;

  const W = 340, H = 160, PAD = { top: 10, right: 10, bottom: 30, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const maxPct = 100;
  const groupW = chartW / filtered.length;
  const barW   = (groupW * 0.35);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Y-axis labels */}
      {[0,25,50,75,100].map(v => {
        const y = PAD.top + chartH - (v / maxPct) * chartH;
        return (
          <g key={v}>
            <line x1={PAD.left - 4} x2={PAD.left + chartW} y1={y} y2={y}
              stroke="#2a2a2a" strokeWidth={v === 0 ? 1 : 0.5} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="#555" fontSize="9">
              {v}%
            </text>
          </g>
        );
      })}

      {filtered.map((r, i) => {
        const gx = PAD.left + i * groupW + groupW / 2;
        const runH  = (r.runPct  / maxPct) * chartH;
        const passH = (r.passPct / maxPct) * chartH;
        const y0 = PAD.top + chartH;

        const label = r.downGroup.replace(" Down", "");
        return (
          <g key={r.downGroup}>
            {/* Run bar */}
            <rect x={gx - barW - 2} y={y0 - runH} width={barW} height={runH}
              fill={RUN_COLOR} rx={2} />
            <text x={gx - barW / 2 - 2} y={y0 - runH - 3}
              textAnchor="middle" fill={RUN_COLOR} fontSize="8" fontWeight="600">
              {r.runPct > 0 ? `${r.runPct}%` : ""}
            </text>

            {/* Pass bar */}
            <rect x={gx + 2} y={y0 - passH} width={barW} height={passH}
              fill={PASS_COLOR} rx={2} />
            <text x={gx + barW / 2 + 2} y={y0 - passH - 3}
              textAnchor="middle" fill={PASS_COLOR} fontSize="8" fontWeight="600">
              {r.passPct > 0 ? `${r.passPct}%` : ""}
            </text>

            {/* X-axis label */}
            <text x={gx} y={H - 6} textAnchor="middle" fill="#666" fontSize="9">
              {label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={PAD.left} y={2} width={8} height={8} fill={RUN_COLOR} rx={1} />
      <text x={PAD.left + 12} y={10} fill="#888" fontSize="9">Run</text>
      <rect x={PAD.left + 44} y={2} width={8} height={8} fill={PASS_COLOR} rx={1} />
      <text x={PAD.left + 56} y={10} fill="#888" fontSize="9">Pass</text>
    </svg>
  );
}
