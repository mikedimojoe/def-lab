import { Fragment } from "react";
// ── Down & Distance table component ──────────────────────────────────────────
// Supports detailed DOWN_GROUP_ORDER with group header rows.

const RUN_COLOR  = "#7B6EA0";
const PASS_COLOR = "#4472C4";
const THRESH     = 65;

export default function DDTable({ rows = [], showTotal = true }) {
  if (!rows.length) {
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>No data</p>;
  }

  const seenParents = new Set();

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          <th style={th}>Down Group</th>
          {showTotal && <th style={{ ...th, textAlign: "right" }}>Plays</th>}
          <th style={{ ...th, textAlign: "right" }}>Run</th>
          <th style={{ ...th, textAlign: "right" }}>Run%</th>
          <th style={{ ...th, textAlign: "right" }}>Pass</th>
          <th style={{ ...th, textAlign: "right" }}>Pass%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const parent     = r.parent || "";
          const showHeader = parent && !seenParents.has(parent);
          if (showHeader) seenParents.add(parent);
          const cols = showTotal ? 6 : 5;

          return (
            <Fragment key={r.downGroup}>
              {showHeader && (
                <tr>
                  <td colSpan={cols} style={groupHdr}>{parent} Down</td>
                </tr>
              )}
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ ...td, paddingLeft: parent ? 16 : 8,
                  color: "var(--text2)", fontWeight: 500 }}>
                  {r.downGroup}
                </td>
                {showTotal && (
                  <td style={{ ...td, textAlign: "right", color: "var(--text3)" }}>{r.total}</td>
                )}
                <td style={{ ...td, textAlign: "right", color: "var(--text3)" }}>{r.run}</td>
                <td style={{ ...td, textAlign: "right",
                  color:      r.runPct  >= THRESH ? RUN_COLOR  : "var(--text2)",
                  fontWeight: r.runPct  >= THRESH ? 700 : 400 }}>
                  {r.runPct}%
                </td>
                <td style={{ ...td, textAlign: "right", color: "var(--text3)" }}>{r.pass}</td>
                <td style={{ ...td, textAlign: "right",
                  color:      r.passPct >= THRESH ? PASS_COLOR : "var(--text2)",
                  fontWeight: r.passPct >= THRESH ? 700 : 400 }}>
                  {r.passPct}%
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

const th = {
  padding: "5px 8px", textAlign: "left", fontWeight: 600, fontSize: 10,
  textTransform: "uppercase", letterSpacing: .6,
  color: "var(--text3)", borderBottom: "1px solid var(--border)",
};
const td       = { padding: "6px 8px" };
const groupHdr = {
  padding: "8px 8px 3px",
  color: "var(--text3)", fontSize: 10,
  fontWeight: 700, textTransform: "uppercase",
  letterSpacing: .8, background: "var(--surface2)",
};
