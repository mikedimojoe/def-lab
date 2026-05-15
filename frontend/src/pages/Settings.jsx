import { useState } from "react";
import { useTheme }      from "../contexts/ThemeContext";
import { useAppearance } from "../contexts/AppearanceContext";

const GREEN  = "#154734";
const ACCENT = "#5CBF8A";

// ── Color swatch preview ──────────────────────────────────────────────────────
function ColorSwatch({ color }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6,
      background: color, border: "2px solid rgba(255,255,255,.15)",
      flexShrink: 0,
    }} />
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, overflow: "hidden",
    }}>
      <div style={{
        background: GREEN, color: "#fff",
        padding: "9px 16px", fontSize: 11, fontWeight: 800,
        textTransform: "uppercase", letterSpacing: .7,
      }}>{title}</div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

// ── Label + input row ─────────────────────────────────────────────────────────
function Row({ label, hint, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Play type bar preview ─────────────────────────────────────────────────────
function PlayTypePreview({ run, pass, rpo }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>
        Vorschau
      </div>
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 1 }}>
        <div style={{ flex: 45, background: run }} />
        <div style={{ flex: 40, background: pass }} />
        <div style={{ flex: 15, background: rpo }} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {[["Run 45%", run], ["Pass 40%", pass], ["RPO 15%", rpo]].map(([label, color]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
            <span style={{ color: "var(--text2)" }}>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Settings() {
  const { theme, toggle, setTheme } = useTheme();
  const { runColor, passColor, rpoColor, saveColors, teamIcon, saveTeamIcon } = useAppearance();

  const [run,  setRun]  = useState(runColor);
  const [pass, setPass] = useState(passColor);
  const [rpo,  setRpo]  = useState(rpoColor);
  const [saved, setSaved] = useState(false);
  const [iconSaved, setIconSaved] = useState(false);

  function handleIconUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Resize to max 256px via canvas
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/png");
        saveTeamIcon(dataUrl);
        setIconSaved(true);
        setTimeout(() => setIconSaved(false), 2000);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    saveColors(run, pass, rpo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    const r = "#7B6EA0", p = "#4472C4", o = "#D4782A";
    setRun(r); setPass(p); setRpo(o);
    saveColors(r, p, o);
  }

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>

      {/* Header */}
      <div>
        <h2 style={{ color: "var(--text1)", fontSize: 20, fontWeight: 800, margin: 0 }}>Settings</h2>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>Erscheinungsbild und Darstellung anpassen</p>
      </div>

      {/* ── Appearance ── */}
      {/* ── Team Icon ── */}
      <Card title="Team Icon">
        <Row label="Icon" hint="Wird in der Sidebar und Login-Seite angezeigt">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={teamIcon || "/icon.png"}
              alt="Team Icon"
              style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", border: "1px solid var(--border)" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{
                padding: "7px 16px", borderRadius: 7, cursor: "pointer",
                background: GREEN, color: "#fff", fontSize: 12, fontWeight: 700,
                display: "inline-block",
              }}>
                {iconSaved ? "✓ Gespeichert" : "Bild auswählen"}
                <input type="file" accept="image/*" onChange={handleIconUpload}
                  style={{ display: "none" }} />
              </label>
              {teamIcon && (
                <button onClick={() => saveTeamIcon(null)} style={{
                  padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer",
                }}>
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>
        </Row>
      </Card>

      <Card title="Erscheinungsbild">
        <Row label="Dark / Light Mode" hint="Beeinflusst die gesamte App">
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {["dark", "light"].map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                style={{
                  padding: "7px 18px", border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 700,
                  background: theme === t ? GREEN : "var(--surface2)",
                  color: theme === t ? "#fff" : "var(--text3)",
                  transition: "background .15s, color .15s",
                }}
              >
                {t === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            ))}
          </div>
        </Row>
      </Card>

      {/* ── Play Colors ── */}
      <Card title="Play-Type Farben">
        <Row
          label="Run Farbe"
          hint="Wird in allen Charts und Karten verwendet"
        >
          <ColorSwatch color={run} />
          <input
            type="color" value={run}
            onChange={e => setRun(e.target.value)}
            style={{ width: 40, height: 32, border: "none", background: "none", cursor: "pointer", padding: 0 }}
          />
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text3)", minWidth: 60 }}>{run}</span>
        </Row>

        <Row
          label="Pass Farbe"
          hint="Wird in allen Charts und Karten verwendet"
        >
          <ColorSwatch color={pass} />
          <input
            type="color" value={pass}
            onChange={e => setPass(e.target.value)}
            style={{ width: 40, height: 32, border: "none", background: "none", cursor: "pointer", padding: 0 }}
          />
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text3)", minWidth: 60 }}>{pass}</span>
        </Row>

        <Row
          label="RPO Farbe"
          hint="Run-Pass Option Plays"
        >
          <ColorSwatch color={rpo} />
          <input
            type="color" value={rpo}
            onChange={e => setRpo(e.target.value)}
            style={{ width: 40, height: 32, border: "none", background: "none", cursor: "pointer", padding: 0 }}
          />
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text3)", minWidth: 60 }}>{rpo}</span>
        </Row>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <PlayTypePreview run={run} pass={pass} rpo={rpo} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 4 }}>
          <button
            onClick={handleSave}
            style={{
              background: GREEN, color: "#fff", border: "none",
              borderRadius: 7, padding: "9px 22px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Speichern
          </button>
          <button
            onClick={handleReset}
            style={{
              background: "var(--surface2)", color: "var(--text3)",
              border: "1px solid var(--border)", borderRadius: 7,
              padding: "9px 16px", fontSize: 12, cursor: "pointer",
            }}
          >
            Zurücksetzen
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>✓ Gespeichert</span>
          )}
        </div>
      </Card>

    </div>
  );
}
