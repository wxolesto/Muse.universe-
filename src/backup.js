import {getAllAudioFiles,saveAudioFile} from "./music-storage.js";
import { getEntries, saveEntry } from "./storage.js";

const ARCHIVE_KEY = "muse.archive.entries.v1";
const ART_KEY = "muse.pixel.gallery.v1";

export async function exportBackup() {
  const audioFiles = await Promise.all((await getAllAudioFiles()).map(async item => ({id:item.id,name:item.name,type:item.type,data:await blobToDataURL(item.blob)})));
  const payload = {
    format: "muse-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    journal: await getEntries(),
    archive: readJSON(ARCHIVE_KEY, {}),
    pixelGallery: readJSON(ART_KEY, []),
    discoveries: readJSON("muse.discoveries.v1", []),
    worldObjects: readJSON("muse.world.objects.v1", []),
    innerCheckins: readJSON("muse.inner.checkins.v1", []),
    musicTracks: readJSON("muse.music.tracks.v1", []),
    musicAudio: audioFiles
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
  if (Array.isArray(payload.worldObjects)) localStorage.setItem("muse.world.objects.v1", JSON.stringify(payload.worldObjects));
  if (Array.isArray(payload.innerCheckins)) localStorage.setItem("muse.inner.checkins.v1", JSON.stringify(payload.innerCheckins));
  if (Array.isArray(payload.musicTracks)) localStorage.setItem("muse.music.tracks.v1", JSON.stringify(payload.musicTracks));
  if (Array.isArray(payload.musicAudio)) for (const item of payload.musicAudio) { if (item && typeof item.id === "string" && typeof item.data === "string") await saveAudioFile(item.id, dataURLToBlob(item.data, item.type)); }
  return {
    journal: payload.journal.length,
    archive: Object.values(payload.archive).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0),
    artwork: payload.pixelGallery.length,
    discoveries: Array.isArray(payload.discoveries) ? payload.discoveries.length : 0,
    worldObjects: Array.isArray(payload.worldObjects) ? payload.worldObjects.length : 0,
    innerCheckins: Array.isArray(payload.innerCheckins) ? payload.innerCheckins.length : 0,
    musicTracks: Array.isArray(payload.musicTracks) ? payload.musicTracks.length : 0,
    musicAudioFiles: Array.isArray(payload.musicAudio) ? payload.musicAudio.length : 0
  };
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function blobToDataURL(blob) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  });
}
function dataURLToBlob(data,type="application/octet-stream") {
  const base64=data.split(",")[1]||"",binary=atob(base64),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:type||data.slice(5,data.indexOf(";"))||"application/octet-stream"});
}
