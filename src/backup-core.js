const COLLECTIONS = ["soundtrack", "people", "curiosities", "memories"];
const WORLD_OBJECT_TYPES = ["tree", "lantern", "flowers", "stone"];
const MOODS = ["", "bright", "calm", "curious", "tender", "restless", "heavy", "hopeful", "uncertain"];
const MAX_RECORDS = 100000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 40 * 1024 * 1024;
const MAX_TOTAL_AUDIO_BYTES = 100 * 1024 * 1024;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid backup record: " + field + " must be a non-empty string.");
}
function optionalString(value, field) {
  if (value !== undefined && typeof value !== "string") throw new Error("Invalid backup record: " + field + " must be a string.");
}
function timestamp(value, field) {
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid backup record: " + field + " must be a valid timestamp.");
}
function recordArray(value, field, validator) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_RECORDS) throw new Error("Invalid backup section: " + field + " must be an array with at most " + MAX_RECORDS + " records.");
  value.forEach((item, index) => {
    if (!isObject(item)) throw new Error("Invalid backup record in " + field + " at index " + index + ".");
    validator(item, field);
  });
  return value;
}
function validateImageData(value, field, allowJpeg = false) {
  if (value === undefined || value === "") return;
  if (typeof value !== "string") throw new Error("Invalid backup media: " + field + " must be a data URL.");
  const pattern = allowJpeg
    ? /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i
    : /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/i;
  const match = value.match(pattern);
  if (!match) throw new Error("Invalid backup media: " + field + " is not a supported image data URL.");
  const bytes = Math.floor(match[1].length * 3 / 4) - (match[1].endsWith("==") ? 2 : match[1].endsWith("=") ? 1 : 0);
  if (bytes > MAX_IMAGE_BYTES) throw new Error("Invalid backup media: " + field + " exceeds the 5 MB image limit.");
}
function validateAudioData(value, type) {
  if (typeof value !== "string") throw new Error("Invalid backup audio: data must be a data URL.");
  const match = value.match(/^data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) throw new Error("Invalid backup audio: unsupported audio data URL.");
  if (type && type.toLowerCase() !== match[1].toLowerCase()) throw new Error("Invalid backup audio: MIME type does not match its data URL.");
  const encoded = match[2];
  const bytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
  if (bytes > MAX_AUDIO_BYTES) throw new Error("Invalid backup audio: an audio file exceeds the 40 MB limit.");
  return bytes;
}

export function validateBackupPayload(payload) {
  if (!isObject(payload) || payload.format !== "muse-backup" || payload.version !== 1) {
    throw new Error("This file is not a supported MUSE backup.");
  }
  if (!Array.isArray(payload.journal) || !isObject(payload.archive) || !Array.isArray(payload.pixelGallery)) {
    throw new Error("The backup file is incomplete or invalid.");
  }

  const journal = recordArray(payload.journal, "journal", item => {
    requiredString(item.id, "journal.id");
    requiredString(item.title, "journal.title");
    requiredString(item.body, "journal.body");
    timestamp(item.createdAt, "journal.createdAt");
  });
  for (const key of Object.keys(payload.archive)) {
    if (!COLLECTIONS.includes(key)) throw new Error("Invalid backup archive collection: " + key + ".");
  }
  const archive = {};
  for (const key of COLLECTIONS) {
    archive[key] = recordArray(payload.archive[key], "archive." + key, item => {
      requiredString(item.id, "archive.id");
      requiredString(item.title, "archive.title");
      optionalString(item.note, "archive.note");
      timestamp(item.createdAt, "archive.createdAt");
    });
  }
  const pixelGallery = recordArray(payload.pixelGallery, "pixelGallery", item => {
    requiredString(item.id, "pixelGallery.id");
    requiredString(item.title, "pixelGallery.title");
    validateImageData(item.image, "pixelGallery.image");
    timestamp(item.createdAt, "pixelGallery.createdAt");
    if (![16, 32, 64].includes(item.size)) throw new Error("Invalid backup artwork size.");
  });
  const discoveries = recordArray(payload.discoveries, "discoveries", item => {
    requiredString(item.id, "discoveries.id");
    requiredString(item.title, "discoveries.title");
    optionalString(item.description, "discoveries.description");
    optionalString(item.lore, "discoveries.lore");
    timestamp(item.discoveredAt, "discoveries.discoveredAt");
  });
  const worldObjects = recordArray(payload.worldObjects, "worldObjects", item => {
    requiredString(item.id, "worldObjects.id");
    if (!WORLD_OBJECT_TYPES.includes(item.type)) throw new Error("Invalid world object type.");
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) throw new Error("Invalid world object coordinates.");
  });
  const innerCheckins = recordArray(payload.innerCheckins, "innerCheckins", item => {
    requiredString(item.id, "innerCheckins.id");
    if (!MOODS.includes(item.mood)) throw new Error("Invalid mood check-in value.");
    optionalString(item.note, "innerCheckins.note");
    timestamp(item.createdAt, "innerCheckins.createdAt");
  });
  const musicTracks = recordArray(payload.musicTracks, "musicTracks", item => {
    requiredString(item.id, "musicTracks.id");
    requiredString(item.title, "musicTracks.title");
    for (const field of ["artist", "album", "mood", "note", "link", "audioUrl"]) optionalString(item[field], "musicTracks." + field);
    validateImageData(item.cover, "musicTracks.cover", true);
    if (item.link) {
      let url;
      try { url = new URL(item.link); } catch { throw new Error("Invalid music listening link."); }
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid music listening link protocol.");
    }
    if (item.audioUrl) {
      let url;
      try { url = new URL(item.audioUrl); } catch { throw new Error("Invalid legacy music audio URL."); }
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid legacy music audio URL protocol.");
    }
    timestamp(item.createdAt, "musicTracks.createdAt");
  });
  const musicPlaylists = recordArray(payload.musicPlaylists, "musicPlaylists", item => {
    requiredString(item.id, "musicPlaylists.id");
    requiredString(item.name, "musicPlaylists.name");
    if (!Array.isArray(item.trackIds) || item.trackIds.some(id => typeof id !== "string")) throw new Error("Invalid playlist track references.");
    timestamp(item.createdAt, "musicPlaylists.createdAt");
  });
  const musicAudio = recordArray(payload.musicAudio, "musicAudio", item => {
    requiredString(item.id, "musicAudio.id");
    requiredString(item.name, "musicAudio.name");
    requiredString(item.type, "musicAudio.type");
    if (!item.type.toLowerCase().startsWith("audio/")) throw new Error("Invalid backup audio MIME type.");
    validateAudioData(item.data, item.type);
  });
  const totalAudioBytes = musicAudio.reduce((sum, item) => {
    const encoded = item.data.split(",")[1];
    const bytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
    return sum + bytes;
  }, 0);
  if (totalAudioBytes > MAX_TOTAL_AUDIO_BYTES) throw new Error("The backup contains more than 100 MB of audio. Split it into smaller backups.");

  return { journal, archive, pixelGallery, discoveries, worldObjects, innerCheckins, musicTracks, musicPlaylists, musicAudio };
}

export function mergeById(existing = [], incoming = []) {
  const merged = [];
  const positions = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!item || typeof item.id !== "string") continue;
    if (positions.has(item.id)) merged[positions.get(item.id)] = item;
    else { positions.set(item.id, merged.length); merged.push(item); }
  }
  return merged;
}

export function mergeArchive(existing = {}, incoming = {}) {
  const result = {};
  for (const key of COLLECTIONS) result[key] = mergeById(existing?.[key], incoming?.[key]);
  return result;
}

export function mergePlaylists(existing = [], incoming = []) {
  const merged = mergeById(existing, incoming);
  const previous = new Map((Array.isArray(existing) ? existing : []).map(item => [item.id, item]));
  const imported = new Map((Array.isArray(incoming) ? incoming : []).map(item => [item.id, item]));
  return merged.map(item => {
    const old = previous.get(item.id);
    const next = imported.get(item.id);
    if (!old || !next) return item;
    return { ...item, trackIds: [...new Set([...(old.trackIds || []), ...(next.trackIds || [])])] };
  });
}
