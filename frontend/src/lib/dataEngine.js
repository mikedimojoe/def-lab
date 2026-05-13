// ── DEF LAB Data Engine ───────────────────────────────────────────────────────
// Pure computation functions — no React, no side effects.
// All functions receive rows (array of plain objects from xlsx or server).

// ── Helpers ───────────────────────────────────────────────────────────────────
function norm(v) { return String(v ?? "").trim(); }
function normLow(v) { return norm(v).toLowerCase(); }

// Plays with RESULT = "Timeout" are clock-stoppage events, not real plays.
// Filter them out before any analytics computation.
export function filterAnalyticsRows(rows) {
  return rows.filter(r => normLow(r["RESULT"]) !== "timeout");
}

function playType(r) {
  const pt = normLow(r["PLAY TYPE CALLED"]);
  if (pt === "run")  return "run";
  if (pt === "pass") return "pass";
  if (pt === "rpo")  return "rpo";
  return pt;
}

function topPersonnel(rows, n = 3) {
  const map = {};
  rows.forEach(r => {
    const p = norm(r["PERSONNEL"]);
    if (!p) return;
    if (!map[p]) map[p] = { pers: p, n: 0, run: 0, pass: 0, rpo: 0 };
    const e = map[p];
    e.n++;
    const pt = playType(r);
    if (pt === "run")  e.run++;
    if (pt === "pass") e.pass++;
    if (pt === "rpo")  e.rpo++;
  });
  return Object.values(map)
    .sort((a, b) => b.n - a.n)
    .slice(0, n);
}

// Round three percentages so they always sum to exactly 100
// (largest-remainder method on the dominant bucket).
function roundPcts(run, pass, rpo, total) {
  if (!total) return { runPct: 0, passPct: 0, rpoPct: 0 };
  const r = run  / total * 100;
  const p = pass / total * 100;
  const o = rpo  / total * 100;
  let rR = Math.floor(r), rP = Math.floor(p), rO = Math.floor(o);
  const rem = 100 - rR - rP - rO;
  // distribute remainder to the bucket with the largest fractional part
  const fracs = [
    { key: "r", frac: r - rR },
    { key: "p", frac: p - rP },
    { key: "o", frac: o - rO },
  ].sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < rem; i++) fracs[i % 3].key === "r" ? rR++ : fracs[i % 3].key === "p" ? rP++ : rO++;
  return { runPct: rR, passPct: rP, rpoPct: rO };
}

function tendency(rows) {
  const total = rows.length;
  const run  = rows.filter(r => playType(r) === "run").length;
  const pass = rows.filter(r => playType(r) === "pass").length;
  const rpo  = rows.filter(r => playType(r) === "rpo").length;
  const { runPct, passPct, rpoPct } = roundPcts(run, pass, rpo, total);
  return { total, run, pass, rpo, runPct, passPct, rpoPct };
}

// ── Down Groups ───────────────────────────────────────────────────────────────
// Returns the canonical down+distance bucket for a row.
// Hudl exports append suffixes like " (+)" to DOWN GROUP — strip them first.
// Normalise a raw Hudl DOWN GROUP string to our canonical form.
// Handles: "1st & 10 (+)" → "1st & 10", "4TH & 8+" → "4th & 8+", etc.
function normalizeHudlDownGroup(s) {
  // Strip parenthetical suffixes: " (+)", " (Red Zone)", etc.
  s = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  // Hudl writes "4TH" in uppercase — normalise to "4th"
  s = s.replace(/^4TH\b/, "4th");
  // Hudl sometimes writes "2ND", "3RD" in uppercase too
  s = s.replace(/^2ND\b/, "2nd").replace(/^3RD\b/, "3rd").replace(/^1ST\b/, "1st");
  return s;
}

export function rowDownGroup(r) {
  let stored = norm(r["DOWN GROUP"]);
  if (stored) return normalizeHudlDownGroup(stored);
  return buildDownGroup(norm(r["DN"]), norm(r["DIST"]));
}

// Builds a down-group string from raw dn + dist values.
export function buildDownGroup(dn, dist) {
  const d = parseInt(dn, 10);
  const x = parseInt(dist, 10);
  if (!d || isNaN(d)) return "";
  if (d === 1) return "1st & 10";
  if (d === 2) {
    if (isNaN(x))    return "2nd";
    if (x >= 10)     return "2nd & 10+";
    if (x >= 7)      return "2nd & 9-7";
    if (x >= 4)      return "2nd & 4-6";
    return "2nd & 1-3";
  }
  if (d === 3) {
    if (isNaN(x))    return "3rd";
    if (x <= 2)      return "3rd & 1-2";
    if (x <= 4)      return "3rd & 3-4";
    if (x <= 7)      return "3rd & 5-7";
    return "3rd & 8+";
  }
  if (d === 4) {
    if (isNaN(x))    return "4th";
    if (x <= 2)      return "4th & 1-2";
    if (x <= 4)      return "4th & 3-4";
    if (x <= 7)      return "4th & 5-7";
    return "4th & 8+";
  }
  return `${d}th`;
}

// Maps a down-group bucket → parent down label ("1st","2nd","3rd","4th")
export const DOWN_GROUP_PARENT = {
  "1st & 10":  "1st",
  "2nd & 10+": "2nd", "2nd & 9-7": "2nd", "2nd & 4-6": "2nd", "2nd & 1-3": "2nd", "2nd": "2nd",
  "3rd & 1-2": "3rd", "3rd & 3-4": "3rd", "3rd & 5-7": "3rd", "3rd & 8+":  "3rd", "3rd": "3rd",
  "4th":       "4th",
  "4th & 1-2": "4th", "4th & 3-4": "4th", "4th & 5-7": "4th", "4th & 8+":  "4th",
};

// Ordered list of all down-group buckets — long distance first, short last
export const DOWN_GROUP_ORDER = [
  "1st & 10",
  "2nd & 10+", "2nd & 9-7", "2nd & 4-6", "2nd & 1-3",
  "3rd & 8+",  "3rd & 5-7", "3rd & 3-4", "3rd & 1-2",
  "4th & 8+",  "4th & 5-7", "4th & 3-4", "4th & 1-2", "4th",
];

// ── Field Position ────────────────────────────────────────────────────────────
export function fpGroupFromYardLine(yl) {
  const n = parseInt(yl, 10);
  if (isNaN(n)) return "";
  if (n <= 10)  return "BACKED UP";
  if (n <= 39)  return "MINUS TERRITORY";
  if (n <= 50)  return "PLUS TERRITORY";
  if (n <= 60)  return "PLUS TERRITORY";
  // Opponent territory (reversed yard line)
  const opp = 100 - n;
  if (opp > 20) return "PLUS TERRITORY";
  if (opp > 10) return "LOW REDZONE";
  return "HIGH REDZONE";
}

// ── Unique values sorted by frequency ─────────────────────────────────────────
export function uniqueValuesByFreq(rows, field) {
  const counts = {};
  rows.forEach(r => {
    const v = norm(r[field]);
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([val]) => val);
}

// ── computePlaytypeStats ──────────────────────────────────────────────────────
// Returns summary stats plus rows suitable for DDTable / RunPassBar.
export function computePlaytypeStats(rows) {
  rows = filterAnalyticsRows(rows);
  const offense = rows;
  const t = tendency(offense);

  // Per-parent-down summary (for byDown API used elsewhere)
  const downs = ["1st","2nd","3rd","4th"];
  const byDown = {};
  downs.forEach(dn => {
    const dr = offense.filter(r => DOWN_GROUP_PARENT[rowDownGroup(r)] === dn);
    byDown[dn] = tendency(dr);
  });

  // Sub-group breakdown for DDTable — one row per bucket (e.g. "2nd & 4-6")
  // Ordered by DOWN_GROUP_ORDER, grouped under parent down headers.
  const tableRows = DOWN_GROUP_ORDER
    .map(bucket => {
      const parent = DOWN_GROUP_PARENT[bucket];
      const bkt    = offense.filter(r => rowDownGroup(r) === bucket);
      if (!bkt.length) return null;
      const td = tendency(bkt);
      return {
        downGroup: bucket,
        parent,
        total:   td.total,
        run:     td.run,    runPct:  td.runPct,
        pass:    td.pass,   passPct: td.passPct,
        rpo:     td.rpo,    rpoPct:  td.rpoPct,
      };
    })
    .filter(Boolean);

  // Chart rows: same sub-group breakdown as tableRows (for bar chart)
  const chartRows = tableRows;

  return {
    ...t,
    byDown,
    tableRows,
    chartRows,
  };
}

// ── computeDrives ─────────────────────────────────────────────────────────────
export const DRIVE_START_LABELS = {
  "KO":      "Kickoff",
  "PUNT":    "After Punt",
  "TO":      "After Turnover",
  "FG":      "After FG",
  "TD":      "After Opponent TD",
  "SAFETY":  "After Safety",
  "DOWNS":   "After Failed 4th",
  "EOH":     "End of Half",
  "OTHER":   "Other",
};

export function computeDrives(rows) {
  rows = filterAnalyticsRows(rows);
  const driveMap = {};
  rows.forEach(r => {
    const d = norm(r["DRIVE"]);
    if (!d) return;
    if (!driveMap[d]) {
      driveMap[d] = {
        number: d,
        startCode: norm(r["PREV PLAY RESULT"] || r["PREV PLAY TYPE"] || "OTHER").toUpperCase(),
        plays: [],
      };
    }
    driveMap[d].plays.push(r);
  });

  return Object.values(driveMap).map(({ number, startCode, plays }) => {
    const t = tendency(plays);
    return { number, startCode, ...t };
  }).sort((a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number));
}

// ── Formation stats ───────────────────────────────────────────────────────────
export function computeFormationStats(rows) {
  rows = filterAnalyticsRows(rows);
  const offense = rows;
  const formMap = {};
  offense.forEach(r => {
    const baseForm = norm(r["OFF FORM"]);
    if (!baseForm) return;
    const bf   = norm(r["BACKFIELD"]);
    const form = bf ? `${baseForm} ${bf}` : baseForm;
    if (!formMap[form]) {
      formMap[form] = { form, total: 0, run: 0, pass: 0, rpo: 0, plays: [] };
    }
    const entry = formMap[form];
    entry.total++;
    const pt = playType(r);
    if (pt === "run")  entry.run++;
    if (pt === "pass") entry.pass++;
    if (pt === "rpo")  entry.rpo++;
    entry.plays.push(r);
  });

  return Object.values(formMap).map(entry => ({
    ...entry,
    ...roundPcts(entry.run, entry.pass, entry.rpo, entry.total),
  })).sort((a, b) => b.total - a.total);
}

export function matchFormationImage(formName, images) {
  if (!formName || !images || images.length === 0) return null;
  const norm_ = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = norm_(formName);
  return images.find(img => norm_(img.norm_name || img.name || "") === key) || null;
}

// ── Personnel stats ───────────────────────────────────────────────────────────
export function computePersonnelData(rows) {
  rows = filterAnalyticsRows(rows);
  const offense = rows;
  const persMap = {};
  offense.forEach(r => {
    const pers = norm(r["PERSONNEL"]);
    if (!pers) return;
    if (!persMap[pers]) persMap[pers] = { pers, total: 0, run: 0, pass: 0, rpo: 0 };
    const e = persMap[pers];
    e.total++;
    const pt = playType(r);
    if (pt === "run")  e.run++;
    if (pt === "pass") e.pass++;
    if (pt === "rpo")  e.rpo++;
  });
  return Object.values(persMap).map(e => ({
    ...e,
    ...roundPcts(e.run, e.pass, e.rpo, e.total),
  })).sort((a, b) => b.total - a.total);
}

// ── Callsheet Data ────────────────────────────────────────────────────────────
// Shared helpers for prep + live callsheet computation

// Build a map: row → previous play's type ("Run"|"Pass"|"RPO"|null)
// Uses actual play-number sequence — Hudl data has no "PREV PLAY TYPE" column.
function buildPrevTypeMap(plays) {
  const sorted = [...plays].sort((a, b) => {
    const pa = parseInt(a["PLAY #"], 10) || 0;
    const pb = parseInt(b["PLAY #"], 10) || 0;
    return pa - pb;
  });
  const map = new Map();
  sorted.forEach((r, i) => {
    if (i === 0) { map.set(r, null); return; }
    const prev = sorted[i - 1];
    // Only count as "previous" if it's the same drive (or drive unknown)
    const dCurr = norm(r["DRIVE"]);
    const dPrev = norm(prev["DRIVE"]);
    if (dCurr && dPrev && dCurr !== dPrev) { map.set(r, null); return; }
    const pt = normLow(prev["PLAY TYPE CALLED"]);
    if (pt === "run")  map.set(r, "Run");
    else if (pt === "pass") map.set(r, "Pass");
    else if (pt === "rpo")  map.set(r, "RPO");
    else map.set(r, null);
  });
  return map;
}

function applyFilters(rows, { persFilter = [], fpFilter = [], driveFilter = [] } = {}) {
  return rows.filter(r => {
    if (persFilter.length > 0 && !persFilter.includes(norm(r["PERSONNEL"]))) return false;
    if (fpFilter.length > 0   && !fpFilter.includes(norm(r["FP GROUP"])))    return false;
    if (driveFilter.length > 0 && !driveFilter.includes(norm(r["DRIVE"])))   return false;
    return true;
  });
}

// makeTiles — groups raw rows by formation and returns tiles for TendCard.
// Output shape: [{ title, n, run, pass, rpo, pers, plays }]
function makeTiles(rows) {
  if (!rows || !rows.length) return [];

  // Group raw rows by formation
  const formRows = {};
  rows.forEach(r => {
    const baseForm = norm(r["OFF FORM"]) || "—";
    const bf       = norm(r["BACKFIELD"]);
    const form     = bf ? `${baseForm} ${bf}` : baseForm;
    if (!formRows[form]) formRows[form] = [];
    formRows[form].push(r);
  });

  return Object.entries(formRows)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([form, fRows]) => {
      const t   = tendency(fRows);
      const n   = t.total;

      // Top plays inside this formation
      const playMap = {};
      fRows.forEach(r => {
        const play = norm(r["OFF PLAY"]) || "—";
        const pt   = playType(r);
        if (!playMap[play]) playMap[play] = { total: 0, run: 0, pass: 0, rpo: 0 };
        playMap[play].total++;
        if (pt === "run")  playMap[play].run++;
        if (pt === "pass") playMap[play].pass++;
        if (pt === "rpo")  playMap[play].rpo++;
      });
      const plays = Object.entries(playMap)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([play, s]) => ({
          play, ...s,
          ...roundPcts(s.run, s.pass, s.rpo, s.total),
        }));

      // Personnel breakdown
      const persMap = {};
      fRows.forEach(r => {
        const p = norm(r["PERSONNEL"]);
        if (!p) return;
        const pt = playType(r);
        if (!persMap[p]) persMap[p] = { pers: p, n: 0, run: 0, pass: 0, rpo: 0 };
        persMap[p].n++;
        if (pt === "run")  persMap[p].run++;
        if (pt === "pass") persMap[p].pass++;
        if (pt === "rpo")  persMap[p].rpo++;
      });
      const pers = Object.values(persMap)
        .sort((a, b) => b.n - a.n)
        .slice(0, 3)
        .map(p => ({
          ...p,
          ...roundPcts(p.run, p.pass, p.rpo, p.n),
        }));

      return {
        title:   form,
        n,
        run:     t.runPct,
        pass:    t.passPct,
        rpo:     t.rpoPct,
        pers,
        plays,
      };
    });
}

// PREP callsheet data (P&10, 2nd down by prev type, 3rd down groups)
export function computeCallsheetDataPrep(rows, filters = {}) {
  rows = filterAnalyticsRows(rows);
  // Build prevTypeMap on FULL offense BEFORE filters — a filtered-out 1st-down play
  // must still mark the following 2nd-down play as "afterRun/Pass/RPO".
  const fullOffense = rows;
  const prevTypeMap = buildPrevTypeMap(fullOffense);
  const offense = applyFilters(fullOffense, filters);

  // P&10: break down by situation code (P/K/T/E/L/S) — skip N / empty
  // E is split by previous play type (Run/Pass/RPO)
  const p10BySituation = [];

  // P, K, T — aggregate
  [
    { code: "P", label: "Punt Return"    },
    { code: "K", label: "Kickoff Return" },
    { code: "T", label: "Turnover"       },
  ].forEach(({ code, label }) => {
    const plays = offense.filter(r => norm(r["P&10"]).toUpperCase() === code);
    if (!plays.length) return;
    const t = tendency(plays);
    p10BySituation.push({ code, label, subtype: null, n: t.total, run: t.runPct, pass: t.passPct, rpo: t.rpoPct, pers: topPersonnel(plays, 3) });
  });

  // E — Extended: split by previous play type
  const ePlays = offense.filter(r => norm(r["P&10"]).toUpperCase() === "E");
  if (ePlays.length > 0) {
    let hasSplit = false;
    [
      { prevType: "Run",  subtype: "run"  },
      { prevType: "Pass", subtype: "pass" },
      { prevType: "RPO",  subtype: "rpo"  },
    ].forEach(({ prevType, subtype }) => {
      const plays = ePlays.filter(r => prevTypeMap.get(r) === prevType);
      if (!plays.length) return;
      hasSplit = true;
      const t = tendency(plays);
      p10BySituation.push({ code: "E", label: "Extended", subtype, n: t.total, run: t.runPct, pass: t.passPct, rpo: t.rpoPct, pers: topPersonnel(plays, 3) });
    });
    if (!hasSplit) {
      const t = tendency(ePlays);
      p10BySituation.push({ code: "E", label: "Extended", subtype: null, n: t.total, run: t.runPct, pass: t.passPct, rpo: t.rpoPct, pers: topPersonnel(ePlays, 3) });
    }
  }

  // L, S — aggregate
  [
    { code: "L", label: "1st & Long"  },
    { code: "S", label: "1st & Short" },
  ].forEach(({ code, label }) => {
    const plays = offense.filter(r => norm(r["P&10"]).toUpperCase() === code);
    if (!plays.length) return;
    const t = tendency(plays);
    p10BySituation.push({ code, label, subtype: null, n: t.total, run: t.runPct, pass: t.passPct, rpo: t.rpoPct, pers: topPersonnel(plays, 3) });
  });

  // 2nd down — segmented by previous play type.
  // Structure: { afterPass: [{title, n, run, pass, rpo, pers},...], afterRun: [...], afterRpo: [...] }
  // Each tile = one 2nd-down distance bucket (e.g. "2nd & 10+").
  const D2_BUCKETS = [
    { key: "2nd & 10+", label: "2nd & 10+" },
    { key: "2nd & 9-7", label: "2nd & 9-7" },
    { key: "2nd & 4-6", label: "2nd & 4-6" },
    { key: "2nd & 1-3", label: "2nd & 1-3" },
  ];

  function bucketTile(bkt, label) {
    if (!bkt.length) return null;
    const t = tendency(bkt);
    return {
      title: label,
      n: t.total,
      run: t.runPct, pass: t.passPct, rpo: t.rpoPct,
      pers: topPersonnel(bkt, 3),
    };
  }

  const d2ByPrevType = {
    afterPass: D2_BUCKETS.map(({ key, label }) => {
      const bkt = offense.filter(r => rowDownGroup(r) === key && prevTypeMap.get(r) === "Pass");
      return bucketTile(bkt, label);
    }).filter(Boolean),
    afterRun: D2_BUCKETS.map(({ key, label }) => {
      const bkt = offense.filter(r => rowDownGroup(r) === key && prevTypeMap.get(r) === "Run");
      return bucketTile(bkt, label);
    }).filter(Boolean),
    afterRpo: D2_BUCKETS.map(({ key, label }) => {
      const bkt = offense.filter(r => rowDownGroup(r) === key && prevTypeMap.get(r) === "RPO");
      return bucketTile(bkt, label);
    }).filter(Boolean),
  };

  // 3rd down — one tendency card per distance bucket
  const D3_BUCKETS = [
    { key: "3rd & 8+",  label: "3rd & 8+"  },
    { key: "3rd & 5-7", label: "3rd & 5-7" },
    { key: "3rd & 3-4", label: "3rd & 3-4" },
    { key: "3rd & 1-2", label: "3rd & 1-2" },
  ];
  const d3Buckets = D3_BUCKETS.map(({ key, label }) => {
    const bkt = offense.filter(r => rowDownGroup(r) === key);
    return bucketTile(bkt, label);
  }).filter(Boolean);

  // Filter options always from full (unfiltered) offense so chips don't disappear
  const persOptions  = uniqueValuesByFreq(fullOffense, "PERSONNEL");
  const fpOptions    = uniqueValuesByFreq(fullOffense, "FP GROUP");
  const driveOptions = uniqueValuesByFreq(fullOffense, "DRIVE");

  return { p10BySituation, d2ByPrevType, d3Buckets, persOptions, fpOptions, driveOptions };
}

// LIVE callsheet data (Drive openers, 1st&10, after conversion, 2nd down)
export function computeCallsheetData(rows, filters = {}) {
  rows = filterAnalyticsRows(rows);
  // Build prevTypeMap on FULL offense BEFORE filters (same reason as computeCallsheetDataPrep).
  const fullOffense = rows;
  const convPrevMap = buildPrevTypeMap(fullOffense);
  const prevTypeMap = convPrevMap; // same map, referenced below for d2Section
  const offense = applyFilters(fullOffense, filters);

  // Drive opener: first play of each drive — sort by PLAY # to guarantee order
  const driveMap = {};
  offense.forEach(r => {
    const d = norm(r["DRIVE"]);
    if (!d) return;
    if (!driveMap[d]) driveMap[d] = [];
    driveMap[d].push(r);
  });
  const openerRows = Object.values(driveMap).map(plays => {
    plays.sort((a, b) => (parseInt(a["PLAY #"], 10) || 0) - (parseInt(b["PLAY #"], 10) || 0));
    return plays[0];
  }).filter(Boolean);

  // 1st & 10 section
  const first10 = offense.filter(r => rowDownGroup(r) === "1st & 10");

  // After conversion (plays marked as after a conversion or first play of drive)
  const afterConvAll  = first10;
  const afterConvPass = first10.filter(r => convPrevMap.get(r) === "Pass");
  const afterConvRun  = first10.filter(r => convPrevMap.get(r) === "Run");
  const afterConvRpo  = first10.filter(r => convPrevMap.get(r) === "RPO");

  const d1Section = {
    openers:   { tiles: makeTiles(openerRows), total: openerRows.length },
    first10:   { tiles: makeTiles(first10),    total: first10.length    },
    afterConv: {
      all:  makeTiles(afterConvAll),
      pass: makeTiles(afterConvPass),
      run:  makeTiles(afterConvRun),
      rpo:  makeTiles(afterConvRpo),
    },
  };

  // 2nd down
  const D2_BUCKETS = [
    { key: "2nd & 10+", label: "2nd & 10+" },
    { key: "2nd & 9-7", label: "2nd & 9-7" },
    { key: "2nd & 4-6", label: "2nd & 4-6" },
    { key: "2nd & 1-3", label: "2nd & 1-3" },
  ];
  // prevTypeMap is already computed above on fullOffense

  const d2Section = D2_BUCKETS.map(({ key, label }) => {
    const bkt       = offense.filter(r => rowDownGroup(r) === key);
    const afterPass = bkt.filter(r => prevTypeMap.get(r) === "Pass");
    const afterRun  = bkt.filter(r => prevTypeMap.get(r) === "Run");
    const afterRpo  = bkt.filter(r => prevTypeMap.get(r) === "RPO");
    return {
      label, key,
      total:     bkt.length,
      all:       tendency(bkt),
      afterPass: { ...tendency(afterPass), pers: topPersonnel(afterPass, 3), tiles: makeTiles(afterPass) },
      afterRun:  { ...tendency(afterRun),  pers: topPersonnel(afterRun,  3), tiles: makeTiles(afterRun)  },
      afterRpo:  { ...tendency(afterRpo),  pers: topPersonnel(afterRpo,  3), tiles: makeTiles(afterRpo)  },
      hasDetail: afterPass.length > 0 || afterRun.length > 0 || afterRpo.length > 0,
    };
  }).filter(b => b.total > 0);

  // Filter options always from full (unfiltered) offense so chips don't disappear
  const persOptions  = uniqueValuesByFreq(fullOffense, "PERSONNEL");
  const fpOptions    = uniqueValuesByFreq(fullOffense, "FP GROUP");
  const driveOptions = uniqueValuesByFreq(fullOffense, "DRIVE");

  return { d1Section, d2Section, persOptions, fpOptions, driveOptions };
}
