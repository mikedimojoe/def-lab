import { Fragment } from "react";
// ── Down & Distance table — compact, single-row per group ────────────────────

const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "#D4782A";
const THRESH     = 65;

export default function DDTable({ rows = [], showRPO = false }) {
  if (!rows.length) {
    return <p style={{ color: "var(--text3)", fontSize: 12, margin: 0 }}>No data</p>;
  }

  // Show RPO column if caller says so, or any row actually has rpo > 0
  const hasRPO = showRPO || rows.some(r => (r.rpo || 0) > 0);
  const seenParents = new Set();

  return (
    <table style={{
      width: "100%", borderCollapse: "collapse",
      fontSize: 11, tableLayout: "fixed",
    }}>
      <colgroup>
        {/* Down Group column gets remaining space; number cols are fixed-width */}
        <col style={{ width: "auto" }} />
        <col style={{ width: 30 }} />
        <col style={{ width: 40 }} />
        <col style={{ width: 40 }} />
        {hasRPO && <col style={{ width: 46 }} />}
      </colgroup>
      <thead>
        <tr>
          <th style={th}>Down</th>
          <th style={{ ...th, textAlign: "right" }}>n</th>
          <th style={{ ...th, textAlign: "right", color: RUN_COLOR }}>R%</th>
          <th style={{ ...th, textAlign: "right", color: PASS_COLOR }}>P%</th>
          {hasRPO && <th style={{ ...th, textAlign: "right", color: RPO_COLOR }}>RPO%</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const parent     = r.parent || "";
          const showHeader = parent && !seenParents.has(parent);
          if (showHeader) seenParents.add(parent);

          return (
            <Fragment key={r.downGroup}>
              {showHeader && (
                <tr>
                  <td colSpan={hasRPO ? 5 : 4} style={groupHdr}>{parent} Down</td>
                </tr>
              )}
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{
                  ...td,
                  paddingLeft: parent ? 12 : 6,
                  color: "var(--text2)", fontWeight: 500,
                  whiteSpace: "nowrap", overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {r.downGroup}
                </td>
                <td style={{ ...td, textAlign: "right", color: "var(--text3)" }}>
                  {r.total}
                </td>
                <td style={{ ...td, textAlign: "right",
                  color:      r.runPct  >= THRESH ? RUN_COLOR  : "var(--text2)",
                  fontWeight: r.runPct  >= THRESH ? 700 : 400 }}>
                  {r.runPct}%
                </td>
                <td style={{ ...td, textAlign: "right",
                  color:      r.passPct >= THRESH ? PASS_COLOR : "var(--text2)",
                  fontWeight: r.passPct >= THRESH ? 700 : 400 }}>
                  {r.passPct}%
                </td>
                {hasRPO && (
                  <td style={{ ...td, textAlign: "right",
                    color:      (r.rpoPct || 0) >= THRESH ? RPO_COLOR : "var(--text2)",
                    fontWeight: (r.rpoPct || 0) >= THRESH ? 700 : 400 }}>
                    {r.rpoPct || 0}%
                  </td>
                )}
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

const th = {
  padding: "4px 4px", textAlign: "left", fontWeight: 600, fontSize: 10,
  textTransform: "uppercase", letterSpacing: .4,
  color: "var(--text3)", borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};
const td = { padding: "5px 4px" };
const groupHdr = {
  padding: "6px 6px 2px",
  color: "var(--text3)", fontSize: 9,
  fontWeight: 700, textTransform: "uppercase",
  letterSpacing: .8, background: "var(--surface2)",
  whiteSpace: "nowrap",
};
