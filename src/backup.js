import { getEntries, saveEntry } from "./storage.js";

const ARCHIVE_KEY = "muse.archive.entries.v1";
const ART_KEY = "muse.pixel.gallery.v1";

export async function exportBackup() {
  const payload = {
    format: "muse-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    journal: await getEntries(),
    archive: readJSON(ARCHIVE_KEY, {}),
    pixelGallery: readJSON(ART_KEY, []),
    discoveries: readJSON("muse.discoveries.v1", [])
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "muse-backup-" + new Date().toISOString().slice(0,10) + ".json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return payload;
}

export async function importBackup(file) {
  const text = await file.text();
  const payload = JSON.parse(text);
  if (payload?.format !== "muse-backup" || payload?.version !== 1) {
    throw new Error("This file is not a supported MUSE backup.");
  }
  if (!Array.isArray(payload.journal) || !payload.archive || typeof payload.archive !== "object" || Array.isArray(payload.archive) || !Array.isArray(payload.pixelGallery)) {
    throw new Error("The backup file is incomplete or invalid.");
  }
  for (const entry of payload.journal) {
    if (entry && typeof entry.id === "string" && typeof entry.title === "string") await saveEntry(entry);
  }
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(payload.archive));
  localStorage.setItem(ART_KEY, JSON.stringify(payload.pixelGallery));
  if (Array.isArray(payload.discoveries)) localStorage.setItem("muse.discoveries.v1", JSON.stringify(payload.discoveries));
  return {
    journal: payload.journal.length,
    archive: Object.values(payload.archive).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0),
    artwork: payload.pixelGallery.length,
    discoveries: Array.isArray(payload.discoveries) ? payload.discoveries.length : 0
  };
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
