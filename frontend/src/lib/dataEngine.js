// ── Analytics computation engine ─────────────────────────────────────────────
// Takes an array of play rows (PlaylistData columns) and computes
// all the statistics needed by the analysis pages.

export const DOWN_ORDER = ["1st Down","2nd Down","3rd Down","4th Down"];

export function buildDownGroup(dn, dist) {
  const d = parseInt(dn);
  if (d === 1) return "1st Down";
  if (d === 2) return "2nd Down";
  if (d === 3) return "3rd Down";
  if (d === 4) return "4th Down";
  return "Other";
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function top3(arr) {
  const counts = {};
  arr.forEach(v => { if (v) counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));
}

// ── Filter helpers ────────────────────────────────────────────────────────────
export function filterRows(rows, { odk, downGroup, personnel, formation } = {}) {
  return rows.filter(r => {
    if (odk && r["ODK"] !== odk) return false;
    if (downGroup && downGroup !== "All") {
      const dg = r["DOWN GROUP"] || buildDownGroup(r["DN"], r["DIST"]);
      if (dg !== downGroup) return false;
    }
    if (personnel && r["PERSONNEL"] !== personnel) return false;
    if (formation && r["OFF FORM"] !== formation) return false;
    return true;
  });
}

// ── Playtype stats ────────────────────────────────────────────────────────────
export function computePlaytypeStats(rows, downGroup = "All") {
  const filtered = filterRows(rows, { odk: "O", downGroup });
  const total = filtered.length;
  const byType = {};

  filtered.forEach(r => {
    const dg = r["DOWN GROUP"] || buildDownGroup(r["DN"], r["DIST"]);
    const pt = r["PLAY TYPE"] || "Unknown";
    if (!byType[dg]) byType[dg] = {};
    byType[dg][pt] = (byType[dg][pt] || 0) + 1;
  });

  // Build table rows per down group
  const tableRows = [];
  DOWN_ORDER.forEach(dg => {
    if (!byType[dg]) return;
    const dgTotal = Object.values(byType[dg]).reduce((a, b) => a + b, 0);
    const run = byType[dg]["Run"] || 0;
    const pass = byType[dg]["Pass"] || 0;
    tableRows.push({
      downGroup: dg,
      total: dgTotal,
      run, runPct: pct(run, dgTotal),
      pass, passPct: pct(pass, dgTotal),
    });
  });

  return { total, tableRows };
}

// ── Formation stats ───────────────────────────────────────────────────────────
export function computeFormationStats(rows, formation, backfield) {
  const offense = filterRows(rows, { odk: "O" });
  const filtered = filterRows(offense, {
    formation: formation || undefined,
    ...(backfield ? {} : {}),
  }).filter(r => !backfield || r["BACKFIELD"] === backfield);

  const total = filtered.length;
  const run = filtered.filter(r => r["PLAY TYPE"] === "Run").length;
  const pass = filtered.filter(r => r["PLAY TYPE"] === "Pass").length;

  const ddRows = [];
  DOWN_ORDER.forEach(dg => {
    const dgRows = filtered.filter(r =>
      (r["DOWN GROUP"] || buildDownGroup(r["DN"], r["DIST"])) === dg);
    if (!dgRows.length) return;
    const dgRun  = dgRows.filter(r => r["PLAY TYPE"] === "Run").length;
    const dgPass = dgRows.filter(r => r["PLAY TYPE"] === "Pass").length;
    ddRows.push({
      downGroup: dg,
      total: dgRows.length,
      run: dgRun, runPct: pct(dgRun, dgRows.length),
      pass: dgPass, passPct: pct(dgPass, dgRows.length),
    });
  });

  const top3Run      = top3(filtered.filter(r => r["PLAY TYPE"] === "Run").map(r => r["OFF PLAY"]));
  const top3Pass     = top3(filtered.filter(r => r["PLAY TYPE"] === "Pass").map(r => r["OFF PLAY"]));
  const top3FRoutes  = top3(filtered.map(r => r["F ROUTES"]));
  const top3BRoutes  = top3(filtered.map(r => r["B ROUTES"]));

  // Backfield breakdown
  const backfields = {};
  offense.filter(r => !formation || r["OFF FORM"] === formation).forEach(r => {
    const bf = r["BACKFIELD"] || "Unknown";
    backfields[bf] = (backfields[bf] || 0) + 1;
  });
  const backfieldList = Object.entries(backfields)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: pct(count, offense.length) }));

  return { total, run, pass, runPct: pct(run, total), passPct: pct(pass, total),
           ddRows, top3Run, top3Pass, top3FRoutes, top3BRoutes, backfieldList };
}

// ── Personnel stats ───────────────────────────────────────────────────────────
export function computePersonnelStats(rows, personnel) {
  const offense = filterRows(rows, { odk: "O" });
  const personnelList = {};
  offense.forEach(r => {
    const p = r["PERSONNEL"] || "Unknown";
    personnelList[p] = (personnelList[p] || 0) + 1;
  });
  const allPersonnel = Object.entries(personnelList)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: pct(count, offense.length) }));

  if (!personnel) return { allPersonnel, detail: null };

  const filtered = filterRows(offense, { personnel });
  const total = filtered.length;
  const run  = filtered.filter(r => r["PLAY TYPE"] === "Run").length;
  const pass = filtered.filter(r => r["PLAY TYPE"] === "Pass").length;

  const ddRows = [];
  DOWN_ORDER.forEach(dg => {
    const dgRows = filtered.filter(r =>
      (r["DOWN GROUP"] || buildDownGroup(r["DN"], r["DIST"])) === dg);
    if (!dgRows.length) return;
    const dgRun  = dgRows.filter(r => r["PLAY TYPE"] === "Run").length;
    const dgPass = dgRows.filter(r => r["PLAY TYPE"] === "Pass").length;
    ddRows.push({
      downGroup: dg, total: dgRows.length,
      run: dgRun, runPct: pct(dgRun, dgRows.length),
      pass: dgPass, passPct: pct(dgPass, dgRows.length),
    });
  });

  // Formation usage for this personnel
  const formMap = {};
  filtered.forEach(r => {
    const f = r["OFF FORM"] || "Unknown";
    formMap[f] = (formMap[f] || 0) + 1;
  });
  const formations = Object.entries(formMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: pct(count, total) }));

  return {
    allPersonnel,
    detail: {
      total, run, pass,
      runPct: pct(run, total), passPct: pct(pass, total),
      ddRows, formations,
    },
  };
}

// ── Unique value helpers ──────────────────────────────────────────────────────
export function uniqueValues(rows, col) {
  const seen = new Set();
  rows.forEach(r => { if (r[col]) seen.add(r[col]); });
  return [...seen].sort();
}
