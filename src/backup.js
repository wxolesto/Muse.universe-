import {getAllAudioFiles,saveAudioFile} from "./music-storage.js";
import {getEntries,saveEntry} from "./storage.js";
import {validateBackupPayload,mergeById,mergeArchive,mergePlaylists} from "./backup-core.js";

const KEYS = {
  archive:"muse.archive.entries.v1",
  pixelGallery:"muse.pixel.gallery.v1",
  discoveries:"muse.discoveries.v1",
  worldObjects:"muse.world.objects.v1",
  innerCheckins:"muse.inner.checkins.v1",
  musicTracks:"muse.music.tracks.v1",
  musicPlaylists:"muse.music.playlists.v1",
  libraryItems:"muse.library.items.v1"
};

export async function exportBackup() {
  const audioFiles = await Promise.all((await getAllAudioFiles()).map(async item => ({
    id:item.id,name:item.name,type:item.type,data:await blobToDataURL(item.blob)
  })));
  const payload = {
    format:"muse-backup",version:1,exportedAt:new Date().toISOString(),
    journal:await getEntries(),
    archive:readJSON(KEYS.archive,{}),
    pixelGallery:readJSON(KEYS.pixelGallery,[]),
    discoveries:readJSON(KEYS.discoveries,[]),
    worldObjects:readJSON(KEYS.worldObjects,[]),
    innerCheckins:readJSON(KEYS.innerCheckins,[]),
    musicTracks:readJSON(KEYS.musicTracks,[]),
    musicPlaylists:readJSON(KEYS.musicPlaylists,[]),
    libraryItems:readJSON(KEYS.libraryItems,[]),
    musicAudio:audioFiles
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href=url;
  link.download="muse-backup-"+new Date().toISOString().slice(0,10)+".json";
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return payload;
}

export async function importBackup(file) {
  if (!file || typeof file.text !== "function") throw new Error("Choose a valid MUSE backup file.");
  if (Number.isFinite(file.size) && file.size > 120 * 1024 * 1024) throw new Error("This backup is larger than the 120 MB import limit.");
  let payload;
  try { payload = JSON.parse(await file.text()); }
  catch { throw new Error("The backup file is not valid JSON."); }

  // Validate every section and media payload before the first storage write.
  const incoming = validateBackupPayload(payload);
  const currentJournal = await getEntries();
  const nextJournal = mergeById(currentJournal,incoming.journal);
  const nextArchive = mergeArchive(readJSON(KEYS.archive,{}),incoming.archive);
  const nextPixelGallery = mergeById(readJSON(KEYS.pixelGallery,[]),incoming.pixelGallery);
  const nextDiscoveries = mergeById(readJSON(KEYS.discoveries,[]),incoming.discoveries);
  const nextWorldObjects = mergeById(readJSON(KEYS.worldObjects,[]),incoming.worldObjects);
  const nextInnerCheckins = mergeById(readJSON(KEYS.innerCheckins,[]),incoming.innerCheckins);
  const nextMusicTracks = mergeById(readJSON(KEYS.musicTracks,[]),incoming.musicTracks);
  const nextMusicPlaylists = mergePlaylists(readJSON(KEYS.musicPlaylists,[]),incoming.musicPlaylists);
  const nextLibraryItems = mergeById(readJSON(KEYS.libraryItems,[]),incoming.libraryItems);

  try {
    for (const item of incoming.musicAudio) {
      await saveAudioFile(item.id,dataURLToBlob(item.data,item.type,item.name));
    }
    for (const entry of incoming.journal) await saveEntry(entry);
    const nextValues = {
      [KEYS.archive]:nextArchive,
      [KEYS.pixelGallery]:nextPixelGallery,
      [KEYS.discoveries]:nextDiscoveries,
      [KEYS.worldObjects]:nextWorldObjects,
      [KEYS.innerCheckins]:nextInnerCheckins,
      [KEYS.musicTracks]:nextMusicTracks,
      [KEYS.musicPlaylists]:nextMusicPlaylists,
      [KEYS.libraryItems]:nextLibraryItems
    };
    for (const [key,value] of Object.entries(nextValues)) localStorage.setItem(key,JSON.stringify(value));
  } catch (error) {
    throw new Error("MUSE could not finish restoring this backup. Some earlier writes may already have been saved; your existing records were not intentionally deleted. Check available device storage and try again. Details: " + (error?.message || "storage error"));
  }

  return {
    journal:incoming.journal.length,
    archive:Object.values(incoming.archive).reduce((sum,items)=>sum+items.length,0),
    artwork:incoming.pixelGallery.length,
    discoveries:incoming.discoveries.length,
    worldObjects:incoming.worldObjects.length,
    innerCheckins:incoming.innerCheckins.length,
    musicTracks:incoming.musicTracks.length,
    musicAudioFiles:incoming.musicAudio.length,
    musicPlaylists:incoming.musicPlaylists.length,
    libraryItems:incoming.libraryItems.length,
    mode:"merged"
  };
}

function readJSON(key,fallback) {
  try { const value=JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));return value; }
  catch { return fallback; }
}
function blobToDataURL(blob) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function dataURLToBlob(data,type,name) {
  const base64=data.slice(data.indexOf(",")+1);
  const binary=atob(base64),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new File([bytes],name,{type});
}
