// ── Browser-side Excel parser ─────────────────────────────────────────────────
// Uses SheetJS (xlsx) to read a PlaylistData .xlsx file and return
// an array of row objects keyed by column header.

import * as XLSX from "xlsx";
import { ALL_COLUMNS } from "./storage";

export async function parsePlaylistData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // Normalise: only keep known columns
        const rows = raw.map(r => {
          const out = {};
          ALL_COLUMNS.forEach(col => {
            out[col] = r[col] !== undefined ? String(r[col]).trim() : "";
          });
          return out;
        });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
