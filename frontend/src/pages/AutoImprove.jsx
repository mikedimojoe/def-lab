import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

// ── Auto Improve Lab ──────────────────────────────────────────────────────────
// Admin-only sandbox for UI improvement proposals.
// Each card shows a self-contained prototype with title + description.
// Nothing here affects production pages — it's purely a preview lab.

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

function LabCard({ title, description, tags = [], children, status = "new" }) {
  const [expanded, setExpanded] = useState(true);
  const statusColors = {
    new:      { bg: "#1a3a28", color: ACCENT,   label: "New" },
    review:   { bg: "#3a2a10", color: "#E0A940", label: "In Review" },
    approved: { bg: "#0a2a18", color: "#4caf50", label: "✓ Approved" },
    rejected: { bg: "#2a1010", color: "#f66",    label: "✕ Skip" },
  };
  const sc = statusColors[status] || statusColors.new;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", marginBottom: 20,
    }}>
      {/* Card header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px", borderBottom: expanded ? "1px solid var(--border)" : "none",
        cursor: "pointer", background: "var(--surface2)",
      }} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 700 }}>{title}</span>
            <span style={{
              background: sc.bg, color: sc.color,
              fontSize: 10, fontWeight: 700, padding: "2px 8px",
              borderRadius: 10, letterSpacing: .4,
            }}>{sc.label}</span>
          </div>
          <p style={{ color: "var(--text3)", fontSize: 12, margin: 0 }}>{description}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tags.map(t => (
            <span key={t} style={{
              background: "var(--bg)", color: "var(--text3)",
              fontSize: 10, padding: "2px 8px", borderRadius: 8,
              border: "1px solid var(--border)",
            }}>{t}</span>
          ))}
        </div>
        <span style={{ color: "var(--text3)", fontSize: 14 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "18px 20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal #1 — Column Presets
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS = [
  { name: "Live Minimal",    cols: ["PLAY #","ODK","QTR","DN","DIST","PLAY TYPE","OFF FORM","RESULT"] },
  { name: "Full Offense",    cols: ["PLAY #","DRIVE","QTR","DN","DIST","YARD LN","PERSONNEL","OFF FORM","BACKFIELD","OFF PLAY","PLAY TYPE","ROUTE CONCEPT","RESULT"] },
  { name: "Defense Focus",   cols: ["PLAY #","QTR","DN","DIST","DEF CALL","DEF PERS","DEF TYPE","DEF FRONT","COVERAGE","RESULT"] },
  { name: "Situational",     cols: ["PLAY #","QTR","DN","DIST","FP GROUP","DOWN GROUP","PLAY TYPE","RESULT","GN/LS"] },
];

function ColumnPresetsProposal() {
  const [active, setActive] = useState(null);
  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 12 }}>
        One-click column presets for Live Tagging — switch between views instantly instead of manually toggling columns.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PRESETS.map(p => (
          <button key={p.name} onClick={() => setActive(active === p.name ? null : p.name)}
            style={{
              background: active === p.name ? GREEN : "var(--surface2)",
              color: active === p.name ? "#fff" : "var(--text2)",
              border: `1px solid ${active === p.name ? GREEN : "var(--border)"}`,
              borderRadius: 8, padding: "8px 16px", fontSize: 12,
              fontWeight: 600, cursor: "pointer",
            }}>
            {p.name}
          </button>
        ))}
      </div>
      {active && (
        <div style={{ marginTop: 12, padding: "10px 14px",
          background: "var(--bg)", borderRadius: 8,
          border: "1px solid var(--border)" }}>
          <div style={{ color: "var(--text3)", fontSize: 11, marginBottom: 6 }}>
            Columns for <strong style={{ color: ACCENT }}>{active}</strong>:
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PRESETS.find(p => p.name === active)?.cols.map(c => (
              <span key={c} style={{
                background: "rgba(92,191,138,.12)", color: ACCENT,
                fontSize: 11, padding: "2px 8px", borderRadius: 4,
                border: "1px solid rgba(92,191,138,.25)",
              }}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal #2 — Keyboard Shortcut Overlay
// ─────────────────────────────────────────────────────────────────────────────
const SHORTCUTS = [
  { keys: ["Enter"], desc: "Start editing / confirm + next row" },
  { keys: ["Tab"],   desc: "Next cell" },
  { keys: ["Shift","Tab"], desc: "Previous cell" },
  { keys: ["↑↓←→"], desc: "Navigate cells" },
  { keys: ["Shift","Click"], desc: "Select range" },
  { keys: ["Ctrl","C"], desc: "Copy selection (TSV)" },
  { keys: ["Ctrl","V"], desc: "Paste TSV" },
  { keys: ["Del"], desc: "Clear selected cells" },
  { keys: ["Esc"], desc: "Cancel edit / close suggestions" },
  { keys: ["F2"],  desc: "Edit current cell" },
];

function KeyboardShortcutsProposal() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 12 }}>
        A "?" button or overlay showing all keyboard shortcuts for Live Tagging. Helps new users learn faster.
      </p>
      <button onClick={() => setShow(s => !s)}
        style={{
          background: "var(--surface2)", color: "var(--text2)",
          border: "1px solid var(--border)", borderRadius: 8,
          padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
        {show ? "Hide" : "Show"} Shortcut Overlay Preview
      </button>
      {show && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {SHORTCUTS.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", background: "var(--bg)",
              borderRadius: 6, border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", gap: 3 }}>
                {s.keys.map(k => (
                  <kbd key={k} style={{
                    background: "var(--surface2)", color: "var(--text)",
                    border: "1px solid var(--border)", borderRadius: 4,
                    padding: "2px 6px", fontSize: 11, fontFamily: "monospace",
                    boxShadow: "0 1px 0 var(--border)",
                  }}>{k}</kbd>
                ))}
              </div>
              <span style={{ color: "var(--text3)", fontSize: 11 }}>{s.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal #3 — Quick-Jump Play Search
// ─────────────────────────────────────────────────────────────────────────────
function QuickJumpSearchProposal() {
  const [q, setQ] = useState("");
  const DEMO_ROWS = [
    { n: 1,  dn: "1st & 10", form: "TREY",    pt: "PASS", play: "MESH" },
    { n: 5,  dn: "2nd & 6",  form: "DOUBLES", pt: "RUN",  play: "INSIDE ZONE" },
    { n: 12, dn: "3rd & 8",  form: "TRIPS",   pt: "PASS", play: "FLOOD" },
    { n: 18, dn: "1st & 10", form: "TREY",    pt: "RPO",  play: "BUBBLE" },
    { n: 23, dn: "3rd & 2",  form: "DOUBLES", pt: "RUN",  play: "QB SNEAK" },
  ];
  const filtered = q
    ? DEMO_ROWS.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(q.toLowerCase())))
    : DEMO_ROWS;

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 12 }}>
        A search bar in Live Tagging that instantly highlights / jumps to plays matching any term — play type, formation, down, concept.
      </p>
      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search plays… e.g. TREY, PASS, MESH"
        style={{
          background: "var(--bg)", color: "var(--text)",
          border: "1px solid var(--border)", borderRadius: 8,
          padding: "8px 12px", fontSize: 12, outline: "none",
          width: "100%", boxSizing: "border-box", marginBottom: 10,
        }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.map(r => (
          <div key={r.n} style={{
            display: "flex", gap: 12, alignItems: "center",
            padding: "6px 10px", background: "var(--bg)",
            borderRadius: 6, border: "1px solid var(--border)",
          }}>
            <span style={{ color: "var(--text3)", fontSize: 11, width: 24 }}>#{r.n}</span>
            <span style={{ color: "var(--text2)", fontSize: 12, width: 80 }}>{r.dn}</span>
            <span style={{ color: ACCENT, fontSize: 12, width: 70 }}>{r.form}</span>
            <span style={{
              color: r.pt === "PASS" ? "var(--pass-color)" : r.pt === "RPO" ? "#D4782A" : "var(--run-color)",
              fontSize: 12, fontWeight: 700, width: 40,
            }}>{r.pt}</span>
            <span style={{ color: "var(--text2)", fontSize: 12 }}>{r.play}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: "var(--text3)", fontSize: 12, padding: "8px 10px" }}>No plays match.</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal #4 — Live Stats Mini-Dashboard
// Floating Run / Pass / RPO counter that sits above the tagging grid
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_PLAYS = [
  { pt: "PASS" }, { pt: "RUN"  }, { pt: "PASS" }, { pt: "RPO"  },
  { pt: "RUN"  }, { pt: "PASS" }, { pt: "RUN"  }, { pt: "PASS" },
  { pt: "PASS" }, { pt: "RUN"  }, { pt: "RPO"  }, { pt: "PASS" },
];

function LiveMiniDashProposal() {
  const [plays, setPlays] = useState(DEMO_PLAYS);
  const run  = plays.filter(p => p.pt === "RUN").length;
  const pass = plays.filter(p => p.pt === "PASS").length;
  const rpo  = plays.filter(p => p.pt === "RPO").length;
  const total = plays.length;
  const runPct  = total ? Math.round(run  / total * 100) : 0;
  const passPct = total ? Math.round(pass / total * 100) : 0;
  const rpoPct  = total ? Math.round(rpo  / total * 100) : 0;

  function addPlay(pt) { setPlays(prev => [...prev, { pt }]); }
  function reset()     { setPlays([]); }

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 14 }}>
        A compact stats bar that sits above the Live Tagging grid. Updates in real time as you tag plays.
        Gives the DC an instant read of the run/pass ratio without leaving the tagging screen.
      </p>

      {/* The mini-dashboard itself */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "var(--bg)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "10px 16px", marginBottom: 12,
      }}>
        <span style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, letterSpacing: .6, marginRight: 4 }}>
          LIVE
        </span>
        {/* Bar */}
        <div style={{ flex: 1, height: 8, borderRadius: 4, overflow: "hidden", display: "flex", gap: 1 }}>
          <div style={{ flex: runPct,  background: "var(--run-color)",  minWidth: runPct  > 0 ? 3 : 0 }} />
          {rpoPct > 0 && <div style={{ flex: rpoPct, background: "#D4782A", minWidth: 3 }} />}
          <div style={{ flex: passPct, background: "var(--pass-color)", minWidth: passPct > 0 ? 3 : 0 }} />
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
          <span style={{ color: "var(--run-color)",  fontWeight: 700 }}>RUN {run} <span style={{ fontWeight: 400, color: "var(--text3)" }}>({runPct}%)</span></span>
          {rpo > 0 && <span style={{ color: "#D4782A", fontWeight: 700 }}>RPO {rpo} <span style={{ fontWeight: 400, color: "var(--text3)" }}>({rpoPct}%)</span></span>}
          <span style={{ color: "var(--pass-color)", fontWeight: 700 }}>PASS {pass} <span style={{ fontWeight: 400, color: "var(--text3)" }}>({passPct}%)</span></span>
          <span style={{ color: "var(--text3)", fontWeight: 400 }}>| {total} plays</span>
        </div>
      </div>

      {/* Simulate tagging */}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => addPlay("RUN")} style={{
          background: "rgba(var(--run-rgb),.15)", color: "var(--run-color)",
          border: "1px solid var(--run-color)", borderRadius: 6,
          padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>+ RUN</button>
        <button onClick={() => addPlay("PASS")} style={{
          background: "rgba(var(--pass-rgb),.15)", color: "var(--pass-color)",
          border: "1px solid var(--pass-color)", borderRadius: 6,
          padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>+ PASS</button>
        <button onClick={() => addPlay("RPO")} style={{
          background: "rgba(212,120,42,.15)", color: "#D4782A",
          border: "1px solid #D4782A", borderRadius: 6,
          padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>+ RPO</button>
        <button onClick={reset} style={{
          background: "var(--surface2)", color: "var(--text3)",
          border: "1px solid var(--border)", borderRadius: 6,
          padding: "6px 14px", fontSize: 11, cursor: "pointer", marginLeft: "auto",
        }}>Reset</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal #5 — Row Color Coding
// Color rows in Live Tagging grid by play type (Run / Pass / RPO)
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_ROWS_COLOR = [
  { n: 1,  pt: "RUN",  dn: "1st & 10", form: "DOUBLES", play: "OUTSIDE ZONE" },
  { n: 2,  pt: "PASS", dn: "2nd & 6",  form: "TREY",    play: "SMASH" },
  { n: 3,  pt: "RPO",  dn: "1st & 10", form: "DOUBLES", play: "BUBBLE" },
  { n: 4,  pt: "RUN",  dn: "3rd & 2",  form: "EMPTY",   play: "QB SNEAK" },
  { n: 5,  pt: "PASS", dn: "1st & 10", form: "TRIPS",   play: "FLOOD" },
  { n: 6,  pt: "RUN",  dn: "2nd & 4",  form: "DOUBLES", play: "INSIDE ZONE" },
  { n: 7,  pt: "PASS", dn: "3rd & 8",  form: "TREY",    play: "MESH" },
];

function RowColorCodingProposal() {
  const [mode, setMode] = useState("subtle"); // subtle | full | none

  const rowBg = (pt) => {
    if (mode === "none") return "var(--bg)";
    if (mode === "full") {
      if (pt === "RUN")  return "rgba(var(--run-rgb),.18)";
      if (pt === "PASS") return "rgba(var(--pass-rgb),.18)";
      if (pt === "RPO")  return "rgba(212,120,42,.18)";
    }
    if (mode === "subtle") {
      if (pt === "RUN")  return "rgba(var(--run-rgb),.07)";
      if (pt === "PASS") return "rgba(var(--pass-rgb),.07)";
      if (pt === "RPO")  return "rgba(212,120,42,.07)";
    }
    return "var(--bg)";
  };

  const ptColor = (pt) => {
    if (pt === "RUN")  return "var(--run-color)";
    if (pt === "PASS") return "var(--pass-color)";
    if (pt === "RPO")  return "#D4782A";
    return "var(--text2)";
  };

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 12 }}>
        Tint each row by play type so the DC can scan patterns at a glance. Try subtle vs. full highlighting.
      </p>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {["none","subtle","full"].map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{
              background: mode === m ? GREEN : "var(--surface2)",
              color: mode === m ? "#fff" : "var(--text3)",
              border: "none", borderRadius: 6, padding: "5px 14px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              textTransform: "capitalize",
            }}>{m}</button>
        ))}
      </div>
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "36px 60px 80px 80px 1fr",
          background: "var(--surface2)", borderBottom: "1px solid var(--border)",
          padding: "6px 12px", fontSize: 10, color: "var(--text3)",
          fontWeight: 700, letterSpacing: .5,
        }}>
          <span>#</span><span>TYPE</span><span>DOWN</span><span>FORM</span><span>PLAY</span>
        </div>
        {DEMO_ROWS_COLOR.map(row => (
          <div key={row.n} style={{
            display: "grid", gridTemplateColumns: "36px 60px 80px 80px 1fr",
            padding: "7px 12px", fontSize: 12,
            background: rowBg(row.pt),
            borderBottom: "1px solid var(--border)",
            transition: "background .15s",
          }}>
            <span style={{ color: "var(--text3)" }}>{row.n}</span>
            <span style={{ color: ptColor(row.pt), fontWeight: 700 }}>{row.pt}</span>
            <span style={{ color: "var(--text2)" }}>{row.dn}</span>
            <span style={{ color: ACCENT }}>{row.form}</span>
            <span style={{ color: "var(--text2)" }}>{row.play}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal #6 — Play Timer / Snap Clock
// Stopwatch per snap — measures time between plays tagged in Live Tagging
// ─────────────────────────────────────────────────────────────────────────────
function PlayTimerProposal() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [log, setLog]         = useState([]);
  const intervalRef = useRef(null);
  const startRef    = useRef(null);

  function start() {
    startRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(((Date.now() - startRef.current) / 1000));
    }, 100);
    setRunning(true);
  }

  function snap() {
    const t = elapsed;
    setLog(prev => [{ n: prev.length + 1, t: t.toFixed(1) }, ...prev].slice(0, 8));
    // reset
    clearInterval(intervalRef.current);
    startRef.current = Date.now();
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed(((Date.now() - startRef.current) / 1000));
    }, 100);
  }

  function stop() {
    clearInterval(intervalRef.current);
    setRunning(false);
  }

  function reset() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setElapsed(0);
    setLog([]);
  }

  const avg = log.length ? (log.reduce((s, e) => s + parseFloat(e.t), 0) / log.length).toFixed(1) : null;

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 14 }}>
        A play timer embedded in Live Tagging. Press <strong>Snap</strong> every time a play is tagged — tracks time between snaps. Useful for measuring tempo / no-huddle pacing.
      </p>
      {/* Clock */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)",
        padding: "14px 20px", marginBottom: 12,
      }}>
        <div style={{
          fontFamily: "monospace", fontSize: 40, fontWeight: 900,
          color: running ? ACCENT : "var(--text3)",
          minWidth: 90, textAlign: "right",
        }}>
          {elapsed.toFixed(1)}s
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {!running
            ? <button onClick={start} style={{
                background: GREEN, color: "#fff", border: "none",
                borderRadius: 6, padding: "7px 18px", fontSize: 12,
                fontWeight: 700, cursor: "pointer",
              }}>▶ Start</button>
            : <>
                <button onClick={snap} style={{
                  background: ACCENT, color: "#111", border: "none",
                  borderRadius: 6, padding: "7px 18px", fontSize: 12,
                  fontWeight: 700, cursor: "pointer",
                }}>⚡ Snap</button>
                <button onClick={stop} style={{
                  background: "var(--surface2)", color: "var(--text3)",
                  border: "1px solid var(--border)", borderRadius: 6,
                  padding: "4px 18px", fontSize: 11, cursor: "pointer",
                }}>■ Stop</button>
              </>
          }
        </div>
        {log.length > 0 && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ color: "var(--text3)", fontSize: 10 }}>AVG BETWEEN SNAPS</div>
            <div style={{ color: ACCENT, fontSize: 22, fontWeight: 700 }}>{avg}s</div>
          </div>
        )}
        <button onClick={reset} style={{
          background: "transparent", color: "var(--text3)",
          border: "none", fontSize: 11, cursor: "pointer", marginLeft: 4,
        }}>↺</button>
      </div>
      {/* Log */}
      {log.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {log.map(e => (
            <span key={e.n} style={{
              background: "var(--surface2)", color: "var(--text2)",
              fontSize: 11, padding: "3px 10px", borderRadius: 6,
              border: "1px solid var(--border)",
            }}>Play {e.n}: {e.t}s</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function AutoImprove() {
  const { user } = useAuth();
  if (user?.role !== "Admin") return <div style={{ padding: 32, color: "var(--text3)" }}>Admin only.</div>;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "var(--text)", margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
          🧪 Auto Improve Lab
        </h2>
        <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>
          UI improvement proposals — auto-built, admin-reviewed. Tell me which ones you want integrated into the main app.
        </p>
      </div>

      <LabCard
        title="Column Presets"
        description="One-click presets to switch between column sets in Live Tagging — no more manual toggling."
        tags={["Live Tagging", "UX", "Productivity"]}
        status="new"
      >
        <ColumnPresetsProposal />
      </LabCard>

      <LabCard
        title="Keyboard Shortcut Overlay"
        description="A ? button or help panel showing all Live Tagging keyboard shortcuts. Onboards new taggers faster."
        tags={["Live Tagging", "UX", "Help"]}
        status="new"
      >
        <KeyboardShortcutsProposal />
      </LabCard>

      <LabCard
        title="Quick-Jump Play Search"
        description="Search bar in Live Tagging that filters rows in real time — find any play by formation, concept, down."
        tags={["Live Tagging", "Search", "Navigation"]}
        status="new"
      >
        <QuickJumpSearchProposal />
      </LabCard>

      <LabCard
        title="Live Stats Mini-Dashboard"
        description="Compact Run / Pass / RPO counter bar that sits above the Live Tagging grid — updates instantly as you tag. Gives the DC a real-time ratio at a glance."
        tags={["Live Tagging", "UX", "Stats"]}
        status="new"
      >
        <LiveMiniDashProposal />
      </LabCard>

      <LabCard
        title="Row Color Coding"
        description="Tint each row in the Live Tagging grid by play type. Choose subtle (barely visible) or full highlight. Makes patterns visible at a glance while scanning."
        tags={["Live Tagging", "UX", "Visual"]}
        status="new"
      >
        <RowColorCodingProposal />
      </LabCard>

      <LabCard
        title="Play Timer / Snap Clock"
        description="Stopwatch embedded in Live Tagging. Press Snap after each tagged play to track time between plays — measures no-huddle tempo and pace of play."
        tags={["Live Tagging", "UX", "Tempo"]}
        status="new"
      >
        <PlayTimerProposal />
      </LabCard>
    </div>
  );
}
