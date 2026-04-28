// ── Down & Distance table component ──────────────────────────────────────────
const DOWN_COLORS = {
  "1st Down": "#5CBF8A",
  "2nd Down": "#5CBF8A",
  "3rd Down": "#5CBF8A",
  "4th Down": "#5CBF8A",
};
const RUN_COLOR  = "#7B6EA0";
const PASS_COLOR = "#4472C4";
const THRESH     = 70;

export default function DDTable({ rows = [], showTotal = true }) {
  if (!rows.length) return <p style={{ color: "#555", fontSize: 13 }}>Keine Daten</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ color: "#888" }}>
          <th style={th}>Down</th>
          {showTotal && <th style={{ ...th, textAlign: "right" }}>Plays</th>}
          <th style={{ ...th, textAlign: "right" }}>Run</th>
          <th style={{ ...th, textAlign: "right" }}>Run%</th>
          <th style={{ ...th, textAlign: "right" }}>Pass</th>
          <th style={{ ...th, textAlign: "right" }}>Pass%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.downGroup} style={{ borderBottom: "1px solid #222" }}>
            <td style={{ ...td, color: DOWN_COLORS[r.downGroup] || "#ddd", fontWeight: 600 }}>
              {r.downGroup}
            </td>
            {showTotal && <td style={{ ...td, textAlign: "right", color: "#bbb" }}>{r.total}</td>}
            <td style={{ ...td, textAlign: "right", color: "#bbb" }}>{r.run}</td>
            <td style={{ ...td, textAlign: "right", color: r.runPct >= THRESH ? RUN_COLOR : "#bbb", fontWeight: r.runPct >= THRESH ? 700 : 400 }}>
              {r.runPct}%
            </td>
            <td style={{ ...td, textAlign: "right", color: "#bbb" }}>{r.pass}</td>
            <td style={{ ...td, textAlign: "right", color: r.passPct >= THRESH ? PASS_COLOR : "#bbb", fontWeight: r.passPct >= THRESH ? 700 : 400 }}>
              {r.passPct}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th = { padding: "6px 8px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: .6 };
const td = { padding: "8px 8px", color: "#ccc" };
