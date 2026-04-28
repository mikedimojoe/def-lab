// ── Analytics computation engine ─────────────────────────────────────────────
// Takes an array of play rows (PlaylistData columns) and computes
// all the statistics needed by the analysis pages.

// Detailed down-group order matching the desktop app
export const DOWN_GROUP_ORDER = [
  "1st & 10 (+)", "1st short",
  "2nd & 10+", "2nd & 9-7", "2nd & 4-6", "2nd & 1-3",
  "3rd & 8+",  "3rd & 5-7", "3rd & 3-4", "3rd & 1-2",
  "4th & 8+",  "4th & 5-7", "4th & 3-4", "4th & 1-2",
];

// Which "parent" down each detailed group belongs to
export const DOWN_GROUP_PARENT = {
  "1st & 10 (+)": "1st", "1st short":  "1st",
  "2nd & 10+":    "2nd", "2nd & 9-7":  "2nd", "2nd & 4-6": "2nd", "2nd & 1-3": "2nd",
  "3rd & 8+":     "3rd", "3rd & 5-7":  "3rd", "3rd & 3-4": "3rd", "3rd & 1-2": "3rd",
  "4th & 8+":     "4th", "4th & 5-7":  "4th", "4th & 3-4": "4th", "4th & 1-2": "4th",
};

// Simple aggregated downs for charts
export const DOWN_ORDER = ["1st","2nd","3rd","4th"];

// Infer detailed down group from DN + DIST columns (fallback when DOWN GROUP not set)
export function buildDownGroup(dn, dist) {
  const d  = parseInt(dn);
  const di = parseInt(dist);
  if (isNaN(d) || isNaN(di)) return "";
  if (d === 1) return di >= 7 ? "1st & 10 (+)" : "1st short";
  if (d === 2) {
    if (di >= 10) return "2nd & 10+";
    if (di >= 7)  return "2nd & 9-7";
    if (di >= 4)  return "2nd & 4-6";
    return "2nd & 1-3";
  }
  if (d === 3) {
    if (di >= 8) return "3rd & 8+";
    if (di >= 5) return "3rd & 5-7";
    if (di >= 3) return "3rd & 3-4";
    return "3rd & 1-2";
  }
  if (d === 4) {
    if (di >= 8) return "4th & 8+";
    if (di >= 5) return "4th & 5-7";
    if (di >= 3) return "4th & 3-4";
    return "4th & 1-2";
  }
  return "";
}

// Resolve the down group for a single row
export function rowDownGroup(row) {
  return (row["DOWN GROUP"] && String(row["DOWN GROUP"]).trim())
    || buildDownGroup(row["DN"], row["DIST"]);
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 100 * 10) / 10;
}

function top3(arr, limit = 3) {
  const counts = {};
  arr.forEach(v => { if (v && String(v).trim()) { const k = String(v).trim(); counts[k] = (counts[k] || 0) + 1; } });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

// Canonical play type
function playType(row) {
  const pt = String(row["PLAY TYPE"] || "").trim();
  if (pt === "Run") return "Run";
  if (pt === "Pass") return "Pass";
  return pt;
}

// ── Filter helpers ────────────────────────────────────────────────────────────
export function filterRows(rows, { odk, downGroup, personnel, formation, backfield } = {}) {
  return rows.filter(r => {
    if (odk && r["ODK"] !== odk) return false;
    if (downGroup && downGroup !== "All") {
      const dg = rowDownGroup(r);
      if (dg !== downGroup) return false;
    }
    if (personnel && r["PERSONNEL"] !== personnel) return false;
    if (formation  && r["OFF FORM"]  !== formation)  return false;
    if (backfield  && r["BACKFIELD"] !== backfield)   return false;
    return true;
  });
}

// ── Sorted unique values (by frequency) ──────────────────────────────────────
export function uniqueValuesByFreq(rows, col) {
  const counts = {};
  rows.forEach(r => {
    const v = r[col] ? String(r[col]).trim() : "";
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

export function uniqueValues(rows, col) {
  const seen = new Set();
  rows.forEach(r => { if (r[col]) seen.add(r[col]); });
  return [...seen].sort();
}

// ── Build D&D rows (detailed) ─────────────────────────────────────────────────
function buildDDRows(filtered) {
  const byGroup = {};
  filtered.forEach(r => {
    const dg = rowDownGroup(r);
    if (!dg) return;
    if (!byGroup[dg]) byGroup[dg] = [];
    byGroup[dg].push(r);
  });

  return DOWN_GROUP_ORDER
    .filter(dg => byGroup[dg])
    .map(dg => {
      const dgRows = byGroup[dg];
      const run  = dgRows.filter(r => playType(r) === "Run").length;
      const pass = dgRows.filter(r => playType(r) === "Pass").length;
      return {
        downGroup: dg,
        parent: DOWN_GROUP_PARENT[dg] || "",
        total: dgRows.length,
        run, runPct: pct(run, dgRows.length),
        pass, passPct: pct(pass, dgRows.length),
      };
    });
}

// ── Aggregated simple down rows (for bar chart) ───────────────────────────────
export function aggregateByDown(ddRows) {
  const byDown = {};
  ddRows.forEach(r => {
    const p = r.parent || r.downGroup;
    if (!byDown[p]) byDown[p] = { run: 0, pass: 0, total: 0 };
    byDown[p].run   += r.run;
    byDown[p].pass  += r.pass;
    byDown[p].total += r.total;
  });
  return DOWN_ORDER
    .filter(d => byDown[d])
    .map(d => ({
      downGroup: d,
      total: byDown[d].total,
      run:   byDown[d].run,
      pass:  byDown[d].pass,
      runPct:  pct(byDown[d].run,  byDown[d].total),
      passPct: pct(byDown[d].pass, byDown[d].total),
    }));
}

// ── Playtype stats (Overview / Playtype tab) ──────────────────────────────────
export function computePlaytypeStats(rows, filterDown = "All") {
  const offense  = filterRows(rows, { odk: "O" });
  const filtered = filterDown === "All"
    ? offense
    : offense.filter(r => {
        const dg = rowDownGroup(r);
        return DOWN_GROUP_PARENT[dg] === filterDown || dg.startsWith(filterDown);
      });

  const total = filtered.length;
  const run   = filtered.filter(r => playType(r) === "Run").length;
  const pass  = filtered.filter(r => playType(r) === "Pass").length;

  const tableRows = buildDDRows(filtered);
  const chartRows = aggregateByDown(tableRows);

  return { total, run, pass,
           runPct: pct(run, total), passPct: pct(pass, total),
           tableRows, chartRows };
}

// ── Formation stats ───────────────────────────────────────────────────────────
export function computeFormationStats(rows, formation, backfield) {
  const offense  = filterRows(rows, { odk: "O" });
  const filtered = filterRows(offense, {
    formation: formation || undefined,
    backfield:  backfield  || undefined,
  });

  const total = filtered.length;
  const run   = filtered.filter(r => playType(r) === "Run").length;
  const pass  = filtered.filter(r => playType(r) === "Pass").length;

  const ddRows    = buildDDRows(filtered);
  const chartRows = aggregateByDown(ddRows);

  const top3Run      = top3(filtered.filter(r => playType(r) === "Run").map(r => r["OFF PLAY"]));
  const top3PassPlay = top3(filtered.filter(r => playType(r) === "Pass").map(r => r["ROUTE CONCEPT"]));
  const top3FRoutes  = top3(filtered.map(r => r["F ROUTES"]));
  const top3BRoutes  = top3(filtered.map(r => r["B ROUTES"]));

  // Backfield breakdown for the chosen formation
  const bfSrc = formation ? offense.filter(r => r["OFF FORM"] === formation) : offense;
  const bfMap = {};
  bfSrc.forEach(r => { const b = r["BACKFIELD"] || ""; if (b) bfMap[b] = (bfMap[b] || 0) + 1; });
  const backfieldList = Object.entries(bfMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: pct(count, bfSrc.length) }));

  return { total, run, pass, runPct: pct(run, total), passPct: pct(pass, total),
           ddRows, chartRows, top3Run, top3PassPlay, top3FRoutes, top3BRoutes, backfieldList };
}

// ── Personnel stats ───────────────────────────────────────────────────────────
export function computePersonnelStats(rows, personnel) {
  const offense = filterRows(rows, { odk: "O" });
  const pMap = {};
  offense.forEach(r => { const p = r["PERSONNEL"] || "Unknown"; pMap[p] = (pMap[p] || 0) + 1; });
  const allPersonnel = Object.entries(pMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: pct(count, offense.length) }));

  if (!personnel) return { allPersonnel, detail: null };

  const filtered = filterRows(offense, { personnel });
  const total    = filtered.length;
  const run      = filtered.filter(r => playType(r) === "Run").length;
  const pass     = filtered.filter(r => playType(r) === "Pass").length;

  const ddRows    = buildDDRows(filtered);
  const chartRows = aggregateByDown(ddRows);

  const formMap = {};
  filtered.forEach(r => { const f = r["OFF FORM"] || "Unknown"; formMap[f] = (formMap[f] || 0) + 1; });
  const formations = Object.entries(formMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: pct(count, total),
      run:  filtered.filter(r => r["OFF FORM"] === name && playType(r) === "Run").length,
      pass: filtered.filter(r => r["OFF FORM"] === name && playType(r) === "Pass").length,
    }));

  return {
    allPersonnel,
    detail: { total, run, pass, runPct: pct(run, total), passPct: pct(pass, total),
              ddRows, chartRows, formations },
  };
}

// ── Opponent / Formation scouting ─────────────────────────────────────────────
export function computeOpponentFormations(rows, topN = 5) {
  const offense = filterRows(rows, { odk: "O" });

  // Build formation+backfield combined keys sorted by frequency
  const fbMap = {};
  offense.forEach(r => {
    const form = String(r["OFF FORM"] || "").trim();
    if (!form) return;
    const bf  = String(r["BACKFIELD"] || "").trim();
    const key = bf ? `${form} / ${bf}` : form;
    if (!fbMap[key]) fbMap[key] = { form, bf, rows: [] };
    fbMap[key].rows.push(r);
  });

  return Object.entries(fbMap)
    .sort((a, b) => b[1].rows.length - a[1].rows.length)
    .slice(0, topN)
    .map(([key, { form, bf, rows: sub }]) => {
      const total  = sub.length;
      const runR   = sub.filter(r => playType(r) === "Run");
      const passR  = sub.filter(r => playType(r) === "Pass");
      const runN   = runR.length;
      const passN  = passR.length;
      return {
        key, form, bf, total,
        runN,  runPct:  pct(runN,  total),
        passN, passPct: pct(passN, total),
        topRuns:     top3(runR.map(r => r["OFF PLAY"]),  4),
        topConcepts: top3(passR.map(r => r["ROUTE CONCEPT"]), 4),
        topFRoutes:  top3(passR.map(r => r["F ROUTES"]), 4),
        topBRoutes:  top3(passR.map(r => r["B ROUTES"]), 4),
      };
    });
}

// ── Callsheet tendency ────────────────────────────────────────────────────────
function tendency(rows) {
  const n = rows.length;
  if (!n) return { run: 0, pass: 0, n: 0 };
  const run  = rows.filter(r => playType(r) === "Run").length;
  const pass = n - run;
  return { run: pct(run, n), pass: pct(pass, n), n };
}

function topPersonnel(rows, topN = 4) {
  const map = {};
  rows.forEach(r => { const p = r["PERSONNEL"] || ""; if (p) map[p] = (map[p] || 0) + 1; });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([pers]) => {
      const sub = rows.filter(r => r["PERSONNEL"] === pers);
      const t   = tendency(sub);
      return { pers, ...t };
    });
}

export function computeCallsheetData(rows) {
  const offense = filterRows(rows, { odk: "O" });

  // P&10 tiles
  const p10Codes = [
    { code: "K", title: "P&10 K", subtitle: "After Kickoff" },
    { code: "P", title: "P&10 P", subtitle: "After Punt" },
    { code: "T", title: "P&10 T", subtitle: "After Turnover" },
    { code: "D", title: "P&10 D", subtitle: "Turnover on Downs" },
    { code: "N", title: "P&10 N", subtitle: "Other (TB / MFGG)" },
  ];

  const p10Tiles = p10Codes.map(({ code, title, subtitle }) => {
    const sub = offense.filter(r => String(r["P&10"] || "").trim().toUpperCase() === code);
    return { title, subtitle, ...tendency(sub), pers: topPersonnel(sub) };
  });

  // P&10 E (extended) — split by prev play type
  const eAll  = offense.filter(r => String(r["P&10"] || "").trim().toUpperCase() === "E");
  const eRun  = eAll.filter(r => String(r["PREV PLAY TYPE"] || "").trim().toUpperCase() === "RUN");
  const ePass = eAll.filter(r => ["PASS","INC"].includes(String(r["PREV PLAY TYPE"] || "").trim().toUpperCase()));
  if (eRun.length || ePass.length) {
    p10Tiles.push({ title: "P&10 E", subtitle: "After Run",  ...tendency(eRun),  pers: topPersonnel(eRun) });
    p10Tiles.push({ title: "P&10 E", subtitle: "After Pass", ...tendency(ePass), pers: topPersonnel(ePass) });
  } else if (eAll.length) {
    p10Tiles.push({ title: "P&10 E", subtitle: "Extended / New 1st", ...tendency(eAll), pers: topPersonnel(eAll) });
  }

  // 2nd down (split by prev play type)
  const d2Buckets = [
    { key: "2nd & 10+", label: "2nd & 10+" },
    { key: "2nd & 9-7", label: "2nd & 7-9" },
    { key: "2nd & 4-6", label: "2nd & 4-6" },
    { key: "2nd & 1-3", label: "2nd & 1-3" },
  ];
  const d2Tiles = [];
  d2Buckets.forEach(({ key, label }) => {
    const bkt = offense.filter(r => rowDownGroup(r) === key);
    if (!bkt.length) return;

    const prevRun  = bkt.filter(r => String(r["PREV PLAY TYPE"] || "").trim().toUpperCase() === "RUN");
    const prevPass = bkt.filter(r => ["PASS","INC"].includes(String(r["PREV PLAY TYPE"] || "").trim().toUpperCase()));

    if (prevRun.length || prevPass.length) {
      d2Tiles.push({ title: label, subtitle: "after Pass", ...tendency(prevPass), pers: topPersonnel(prevPass, 3) });
      d2Tiles.push({ title: label, subtitle: "after Run",  ...tendency(prevRun),  pers: topPersonnel(prevRun, 3) });
    } else {
      d2Tiles.push({ title: label, subtitle: "",           ...tendency(bkt),      pers: topPersonnel(bkt, 3) });
    }
  });

  // 3rd down
  const d3Buckets = [
    { key: "3rd & 1-2", label: "3rd & 1-2" },
    { key: "3rd & 3-4", label: "3rd & 3-4" },
    { key: "3rd & 5-7", label: "3rd & 5-7" },
    { key: "3rd & 8+",  label: "3rd & 8+"  },
  ];
  const d3Tiles = d3Buckets
    .map(({ key, label }) => {
      const bkt = offense.filter(r => rowDownGroup(r) === key);
      if (!bkt.length) return null;
      return { title: label, subtitle: "", ...tendency(bkt), pers: topPersonnel(bkt) };
    })
    .filter(Boolean);

  // Personnel tendency (top 90%)
  const persMap = {};
  offense.forEach(r => { const p = r["PERSONNEL"] || ""; if (p) persMap[p] = (persMap[p] || 0) + 1; });
  const totalOff = offense.length;
  let acc = 0;
  const topPersList = [];
  Object.entries(persMap).sort((a,b) => b[1]-a[1]).forEach(([pers, cnt]) => {
    topPersList.push(pers);
    acc += cnt;
    return acc < totalOff * 0.9;
  });

  const persTiles = topPersList.map(pers => {
    const sub = offense.filter(r => r["PERSONNEL"] === pers);
    const pct_val = pct(persMap[pers], totalOff);
    const dgRows  = DOWN_GROUP_ORDER
      .map(dg => {
        const s = sub.filter(r => rowDownGroup(r) === dg);
        if (!s.length) return null;
        return { label: dg, ...tendency(s) };
      })
      .filter(Boolean);
    return { title: `PERS ${pers}`, subtitle: `${pct_val}%`, ...tendency(sub), dgRows };
  });

  return { p10Tiles, d2Tiles, d3Tiles, persTiles };
}
