// ── IndexedDB helper for formation images ─────────────────────────────────────
// Images stored per game+formation: key = `{gameId}::{normName}`
// Up to 50-100 images per game, stored as base64 data URLs.

const DB_NAME    = "def-lab-formations";
const DB_VERSION = 1;
const STORE      = "images";

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

// Normalize a name: lowercase, spaces→underscores, strip extension
export function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")   // strip extension
    .replace(/[^a-z0-9]+/g, "_")    // non-alphanumeric → underscore
    .replace(/^_+|_+$/g, "");       // trim underscores
}

function key(gameId, name) {
  return `${gameId}::${normalizeName(name)}`;
}

export async function saveFormationImage(gameId, formationName, dataUrl) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, key(gameId, formationName));
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function getFormationImage(gameId, formationName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly")
                  .objectStore(STORE)
                  .get(key(gameId, formationName));
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

// Get all images for a game. Returns { normName: dataUrl }
export async function getAllFormationImages(gameId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const result = {};
    const prefix = `${gameId}::`;
    const req = db.transaction(STORE, "readonly")
                  .objectStore(STORE)
                  .openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        if (String(cursor.key).startsWith(prefix)) {
          result[String(cursor.key).slice(prefix.length)] = cursor.value;
        }
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    req.onerror = e => reject(e.target.error);
  });
}

export async function deleteFormationImage(gameId, formationName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key(gameId, formationName));
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

// Delete all images for a game (called when game is deleted)
export async function deleteAllFormationImages(gameId) {
  const db = await openDB();
  const prefix = `${gameId}::`;
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const str = tx.objectStore(STORE);
    const req = str.openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        if (String(cursor.key).startsWith(prefix)) cursor.delete();
        cursor.continue();
      } else resolve();
    };
    req.onerror = e => reject(e.target.error);
    tx.onerror  = e => reject(e.target.error);
  });
}

// Find a matching image in the loaded images map for a given formation name
// Returns the data URL or null
export function matchFormationImage(formationName, imagesMap) {
  if (!formationName || !imagesMap) return null;
  const norm = normalizeName(formationName);
  if (imagesMap[norm]) return imagesMap[norm];
  // Fuzzy: image key contains formation name or vice versa
  const entry = Object.entries(imagesMap).find(
    ([k]) => k.includes(norm) || norm.includes(k)
  );
  return entry ? entry[1] : null;
}

// Read a File as a base64 data URL
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
