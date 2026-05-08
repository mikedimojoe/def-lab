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

// Compute FP GROUP from YARD LN value
export function fpGroupFromYardLine(yardLn) {
  const y = parseInt(String(yardLn || "").replace(/[^\d\-]/g, ""));
  if (isNaN(y)) return "";
  if (y >= 1   && y <= 10)  return "HIGH REDZONE";
  if (y >= 11  && y <= 20)  return "LOW REDZONE";
  if (y >= 21  && y <= 50)  return "PLUS TERRITORY";
  if (y >= -49 && y <= -11) return "MINUS TERRITORY";
  if (y >= -10 && y <= -1)  return "BACKED UP";
  return "";
}

// Resolve the down group for a single row
export function rowDownGroup(row) {
  return (row["DOWN GROUP"] && String(row["DOWN GROUP"]).trim())
    || buildDownGroup(row["DN"], row["DIST"]);
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function top3(arr, limit = 3) {
  const counts = {};
  arr.forEach(v => { if (v && String(v).trim()) { const k = String(v).trim(); counts[k] = (counts[k] || 0) + 1; } });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

// Canonical play type — uses PLAY TYPE CALLED (analysis), falls back to PLAY TYPE
function playType(row) {
  const pt = String(row["PLAY TYPE CALLED"] || row["PLAY TYPE"] || "").trim().toLowerCase();
  if (pt === "run")  return "Run";
  if (pt === "pass") return "Pass";
  if (pt === "rpo")  return "RPO";
  return String(row["PLAY TYPE CALLED"] || row["PLAY TYPE"] || "").trim();
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
      const rpo  = dgRows.filter(r => playType(r) === "RPO").length;
      return {
        downGroup: dg,
        parent: DOWN_GROUP_PARENT[dg] || "",
        total: dgRows.length,
        run,  runPct:  pct(run,  dgRows.length),
        pass, passPct: pct(pass, dgRows.length),
        rpo,  rpoPct:  pct(rpo,  dgRows.length),
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
  const rpo   = filtered.filter(r => playType(r) === "RPO").length;

  const tableRows = buildDDRows(filtered);
  const chartRows = aggregateByDown(tableRows);

  return { total, run, pass, rpo,
           runPct: pct(run, total), passPct: pct(pass, total), rpoPct: pct(rpo, total),
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

// ── Drive analysis ────────────────────────────────────────────────────────────
const DRIVE_STARTERS = new Set(["K","P","T","D","N"]);

export const DRIVE_START_LABELS = {
  K: "After Kickoff", P: "After Punt", T: "After Turnover",
  D: "Turnover on Downs", N: "Other", "?": "—",
};

export function computeDrives(rows) {
  const offense = filterRows(rows, { odk: "O" });
  const drives = [];
  let current = null;

  offense.forEach(row => {
    const p10 = String(row["P&10"] || "").trim().toUpperCase();
    const isStart = DRIVE_STARTERS.has(p10) || current === null;
    if (isStart) {
      if (current && current.plays.length > 0) drives.push(current);
      current = { startCode: p10 || "?", plays: [] };
    }
    if (current) current.plays.push(row);
  });
  if (current && current.plays.length > 0) drives.push(current);

  return drives.map((d, i) => {
    const run  = d.plays.filter(r => playType(r) === "Run").length;
    const pass = d.plays.filter(r => playType(r) === "Pass").length;
    return {
      number: i + 1,
      startCode: d.startCode,
      total: d.plays.length,
      run, pass,
      runPct:  pct(run,  d.plays.length),
      passPct: pct(pass, d.plays.length),
    };
  });
}

// ── Callsheet tendency ────────────────────────────────────────────────────────
function tendency(rows) {
  const n = rows.length;
  if (!n) return { run: 0, pass: 0, rpo: 0, n: 0 };
  const run  = rows.filter(r => playType(r) === "Run").length;
  const pass = rows.filter(r => playType(r) === "Pass").length;
  const rpo  = rows.filter(r => playType(r) === "RPO").length;
  return { run: pct(run, n), pass: pct(pass, n), rpo: pct(rpo, n), n };
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

// ── Drive-opener detection ─────────────────────────────────────────────────────
function detectDriveOpenerIndices(offense) {
  // Priority 1: DRIVE column (first play per drive value)
  const hasDrive = offense.some(r => String(r["DRIVE"] || "").trim() !== "");
  if (hasDrive) {
    const seen = new Set();
    const out  = new Set();
    offense.forEach((r, i) => {
      const drv = String(r["DRIVE"] || "").trim();
      if (drv && !seen.has(drv)) { seen.add(drv); out.add(i); }
    });
    return out;
  }
  // Priority 2: P&10 column (drive-starter codes)
  const haP10 = offense.some(r =>
    ["K","P","T","D","N"].includes(String(r["P&10"] || "").trim().toUpperCase()));
  if (haP10) {
    const out = new Set();
    offense.forEach((r, i) => {
      if (["K","P","T","D","N"].includes(String(r["P&10"] || "").trim().toUpperCase())) out.add(i);
    });
    return out;
  }
  // Fallback: first row only
  return new Set(offense.length > 0 ? [0] : []);
}

export function computeCallsheetData(rows, { persFilter = [], fpFilter = [], driveFilter = [] } = {}) {
  let offense = filterRows(rows, { odk: "O" });

  // Personnel filter
  if (persFilter.length > 0)
    offense = offense.filter(r => persFilter.includes(String(r["PERSONNEL"] || "").trim()));
  // FP filter
  if (fpFilter.length > 0)
    offense = offense.filter(r => fpFilter.includes(String(r["FP GROUP"] || "").trim()));
  // Drive filter (multi-select array)
  if (driveFilter.length > 0)
    offense = offense.filter(r => driveFilter.includes(String(r["DRIVE"] || "").trim()));

  // ── Previous play type: Map<row, "Run"|"Pass"|"RPO"|""> ──────────────────
  // For each row: what play type was the previous play in the same drive?
  // Drive openers (first play of a drive) get "" — no predecessor.
  const openerIdx = detectDriveOpenerIndices(offense);

  // Build Map so lookup is O(1) and there's no indexOf confusion
  const prevTypeMap = new Map();
  offense.forEach((r, i) => {
    if (i === 0 || openerIdx.has(i)) {
      prevTypeMap.set(r, "");                  // start of drive
    } else {
      prevTypeMap.set(r, playType(offense[i - 1]));
    }
  });

  // ── 1st Down ─────────────────────────────────────────────────────────────
  const driveOpenerRows = offense.filter((_, i) => openerIdx.has(i));
  const d1All           = offense.filter(r => String(r["DN"] || "").trim() === "1");
  const d1_10           = d1All.filter(r => rowDownGroup(r) === "1st & 10 (+)");

  // After conversion = 1st down that has a prev play (not a drive opener)
  const afterConvAll  = d1All.filter(r => prevTypeMap.get(r) !== "");
  const afterConvPass = afterConvAll.filter(r => prevTypeMap.get(r) === "Pass");
  const afterConvRun  = afterConvAll.filter(r => prevTypeMap.get(r) === "Run");
  const afterConvRpo  = afterConvAll.filter(r => prevTypeMap.get(r) === "RPO");

  const d1Section = {
    driveOpener: { ...tendency(driveOpenerRows), rows: driveOpenerRows },
    d1_10:       { ...tendency(d1_10),           rows: d1_10 },
    afterConv: {
      all:  { ...tendency(afterConvAll),  rows: afterConvAll  },
      pass: { ...tendency(afterConvPass), rows: afterConvPass },
      run:  { ...tendency(afterConvRun),  rows: afterConvRun  },
      rpo:  { ...tendency(afterConvRpo),  rows: afterConvRpo  },
    },
  };

  // ── 2nd Down — grouped by what the previous play was ─────────────────────
  const D2_BUCKETS = [
    { key: "2nd & 10+", label: "2nd & 10+" },
    { key: "2nd & 9-7", label: "2nd & 7-9" },
    { key: "2nd & 4-6", label: "2nd & 4-6" },
    { key: "2nd & 1-3", label: "2nd & 1-3" },
  ];

  const d2Section = D2_BUCKETS.map(({ key, label }) => {
    const bkt       = offense.filter(r => rowDownGroup(r) === key);
    const afterPass = bkt.filter(r => prevTypeMap.get(r) === "Pass");
    const afterRun  = bkt.filter(r => prevTypeMap.get(r) === "Run");
    const afterRpo  = bkt.filter(r => prevTypeMap.get(r) === "RPO");
    return {
      label,
      total:     bkt.length,
      all:       tendency(bkt),
      afterPass: tendency(afterPass),
      afterRun:  tendency(afterRun),
      afterRpo:  tendency(afterRpo),
      hasDetail: afterPass.length > 0 || afterRun.length > 0 || afterRpo.length > 0,
    };
  }).filter(b => b.total > 0);

  // ── 3rd Down ─────────────────────────────────────────────────────────────
  const D3_BUCKETS = [
    { key: "3rd & 1-2", label: "3rd & 1-2" },
    { key: "3rd & 3-4", label: "3rd & 3-4" },
    { key: "3rd & 5-7", label: "3rd & 5-7" },
    { key: "3rd & 8+",  label: "3rd & 8+"  },
  ];
  const d3Tiles = D3_BUCKETS
    .map(({ key, label }) => {
      const bkt = offense.filter(r => rowDownGroup(r) === key);
      if (!bkt.length) return null;
      return { title: label, ...tendency(bkt), pers: topPersonnel(bkt) };
    })
    .filter(Boolean);

  // ── 4th Down (only if data exists) ───────────────────────────────────────
  const D4_BUCKETS = [
    { key: "4th & 1-2", label: "4th & 1-2" },
    { key: "4th & 3-4", label: "4th & 3-4" },
    { key: "4th & 5-7", label: "4th & 5-7" },
    { key: "4th & 8+",  label: "4th & 8+"  },
  ];
  const d4Tiles = D4_BUCKETS
    .map(({ key, label }) => {
      const bkt = offense.filter(r => rowDownGroup(r) === key);
      if (!bkt.length) return null;
      return { title: label, ...tendency(bkt), pers: topPersonnel(bkt) };
    })
    .filter(Boolean);

  // Available drives and FP zones (for filter chips)
  const allDrives = [...new Set(
    rows.filter(r => r["ODK"] === "O").map(r => String(r["DRIVE"] || "").trim()).filter(Boolean)
  )];
  const FP_ZONE_ORDER = ["HIGH REDZONE","LOW REDZONE","PLUS TERRITORY","MINUS TERRITORY","BACKED UP"];
  const presentFP = new Set(rows.filter(r => r["ODK"] === "O").map(r => String(r["FP GROUP"] || "").trim()).filter(Boolean));
  const allFPZones = FP_ZONE_ORDER.filter(z => presentFP.has(z));
  const allPersonnel = [...new Set(
    rows.filter(r => r["ODK"] === "O").map(r => String(r["PERSONNEL"] || "").trim()).filter(Boolean)
  )].sort((a, b) => {
    // Sort by frequency
    const fa = rows.filter(r => r["PERSONNEL"] === a).length;
    const fb = rows.filter(r => r["PERSONNEL"] === b).length;
    return fb - fa;
  });

  return { d1Section, d2Section, d3Tiles, d4Tiles, allDrives, allFPZones, allPersonnel };
}

// ── Prep Callsheet (P&10-based, original structure) ───────────────────────────
const P10_LABELS = {
  K: "After Kickoff",
  P: "After Punt",
  T: "After Turnover",
  D: "Turnover on Downs",
  E: "Extended (New 1st Down)",
  S: "1st & Short",
  L: "1st & Long (10+ yds)",
  N: "Other / Unclassified",
};

export function computeCallsheetDataPrep(rows, { persFilter = [], fpFilter = [] } = {}) {
  let offense = filterRows(rows, { odk: "O" });
  if (persFilter.length > 0)
    offense = offense.filter(r => persFilter.includes(String(r["PERSONNEL"] || "").trim()));
  if (fpFilter.length > 0)
    offense = offense.filter(r => fpFilter.includes(String(r["FP GROUP"] || "").trim()));

  // ── P&10 tiles: group by P&10 column value ──────────────────────────────
  const p10Map = {};
  offense.forEach(r => {
    const v = String(r["P&10"] || "").trim().toUpperCase();
    if (!v) return;
    if (!p10Map[v]) p10Map[v] = [];
    p10Map[v].push(r);
  });
  const p10Tiles = Object.entries(p10Map)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, sub]) => ({
      title:    P10_LABELS[key] || key,
      subtitle: key,
      ...tendency(sub),
      pers: topPersonnel(sub),
    }));

  // ── prevTypeMap: what play type came before each row? ────────────────────
  const openerIdx = detectDriveOpenerIndices(offense);
  const prevTypeMap = new Map();
  offense.forEach((r, i) => {
    prevTypeMap.set(r, (i === 0 || openerIdx.has(i)) ? "" : playType(offense[i - 1]));
  });

  // ── 2nd Down tiles ────────────────────────────────────────────────────────
  // Order: long → short (10+, 7-9, 4-6, 1-3)
  const D2_BUCKETS = [
    { key: "2nd & 10+", label: "2nd & 10+" },
    { key: "2nd & 9-7", label: "2nd & 7-9" },
    { key: "2nd & 4-6", label: "2nd & 4-6" },
    { key: "2nd & 1-3", label: "2nd & 1-3" },
  ];
  const d2Tiles = D2_BUCKETS.map(({ key, label }) => {
    const bkt = offense.filter(r => rowDownGroup(r) === key);
    if (!bkt.length) return null;
    return { title: label, ...tendency(bkt), pers: topPersonnel(bkt) };
  }).filter(Boolean);

  // ── 2nd Down split by previous play type ─────────────────────────────────
  // Always returns all 4 buckets (n=0 = N/A tile). Top 3 personnel each.
  function d2BucketsByPrev(prevLabel) {
    return D2_BUCKETS.map(({ key, label }) => {
      const bkt = offense.filter(r => rowDownGroup(r) === key && prevTypeMap.get(r) === prevLabel);
      return { title: label, ...tendency(bkt), pers: topPersonnel(bkt, 3) };
    });
  }
  const d2ByPrevType = {
    afterPass: d2BucketsByPrev("Pass"),
    afterRun:  d2BucketsByPrev("Run"),
    afterRpo:  d2BucketsByPrev("RPO"),
  };

  // ── 3rd Down tiles ────────────────────────────────────────────────────────
  const D3_BUCKETS = [
    { key: "3rd & 1-2", label: "3rd & 1-2" },
    { key: "3rd & 3-4", label: "3rd & 3-4" },
    { key: "3rd & 5-7", label: "3rd & 5-7" },
    { key: "3rd & 8+",  label: "3rd & 8+"  },
  ];
  const d3Tiles = D3_BUCKETS.map(({ key, label }) => {
    const bkt = offense.filter(r => rowDownGroup(r) === key);
    if (!bkt.length) return null;
    return { title: label, ...tendency(bkt), pers: topPersonnel(bkt) };
  }).filter(Boolean);

  // Available filter options (from unfiltered offense rows)
  const raw = filterRows(rows, { odk: "O" });
  const FP_ZONE_ORDER = ["HIGH REDZONE","LOW REDZONE","PLUS TERRITORY","MINUS TERRITORY","BACKED UP"];
  const presentFP   = new Set(raw.map(r => String(r["FP GROUP"] || "").trim()).filter(Boolean));
  const allFPZones  = FP_ZONE_ORDER.filter(z => presentFP.has(z));
  const allPersonnel = [...new Set(raw.map(r => String(r["PERSONNEL"] || "").trim()).filter(Boolean))]
    .sort((a, b) => raw.filter(r => r["PERSONNEL"] === b).length - raw.filter(r => r["PERSONNEL"] === a).length);

  return { p10Tiles, d2Tiles, d2ByPrevType, d3Tiles, allPersonnel, allFPZones };
}
