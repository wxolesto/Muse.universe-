import { getEntries, saveEntry, deleteEntry, createId } from "./storage.js";
import { initPixelStudio } from "./pixel-studio.js";
import { initArchive } from "./archive.js";
import { exportBackup, importBackup } from "./backup.js";
import { initInnerWorld } from "./inner-world.js";
import { initLibrary } from "./library.js";
import { initMusic } from "./music.js";

const $ = (selector) => document.querySelector(selector);
const toast = (message) => {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
};

const views = ["home", "journal", "archive", "inner", "music", "studio", "library"];
document.querySelectorAll(".rail-item[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.view;
    views.forEach(view => $(`#${view}-view`).classList.toggle("hidden", view !== target));
    document.querySelectorAll(".rail-item[data-view]").forEach(item => item.classList.toggle("active", item === button));
  });
});

function updateClock() {
  const now = new Date();
  $("#world-clock").textContent = new Intl.DateTimeFormat(undefined, {hour:"2-digit",minute:"2-digit",hour12:false}).format(now);
}
updateClock();
setInterval(updateClock, 15000);

initPixelStudio();
initArchive();
initInnerWorld();
initLibrary();
initMusic();

document.querySelectorAll("[data-open-view]").forEach(button => {
  button.addEventListener("click", () => openView(button.dataset.openView));
});

function openView(target) {
  if (!views.includes(target)) return;
  views.forEach(view => $(`#${view}-view`).classList.toggle("hidden", view !== target));
  document.querySelectorAll(".rail-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === target));
}

let editingEntryId = null;
const entrySubmit = $("#entry-form button[type=submit]");
const entryCancel = $("#entry-edit-cancel");
function cancelEntryEdit() {
  editingEntryId = null;
  $("#entry-form").reset();
  entrySubmit.innerHTML = 'SAVE PAGE <span>↗</span>';
  entryCancel.hidden = true;
}
entryCancel.addEventListener("click", cancelEntryEdit);
$("#entry-form").addEventListener("submit", async event => {
  event.preventDefault();
  const title = $("#entry-title").value.trim();
  const body = $("#entry-body").value.trim();
  if (!title || !body) return;
  const wasEditing = Boolean(editingEntryId);
  const existing = wasEditing ? (await getEntries()).find(item => item.id === editingEntryId) : null;
  await saveEntry({ id:editingEntryId || createId(), title, body, createdAt:existing?.createdAt || Date.now(), ...(wasEditing ? {updatedAt:Date.now()} : {}) });
  cancelEntryEdit();
  await renderEntries();
  toast(wasEditing ? "PAGE UPDATED" : "PAGE SAVED TO YOUR PRIVATE JOURNAL");
});

async function renderEntries() {
  const entries = await getEntries();
  $("#entry-count").textContent = `${entries.length} ENTR${entries.length === 1 ? "Y" : "IES"}`;
  $("#home-journal-count").textContent = String(entries.length).padStart(2,"0");
  $("#entries-list").innerHTML = entries.length ? entries.map(entry => `
    <article class="entry-card" data-id="${escapeHTML(entry.id)}">
      <time>${new Date(entry.createdAt).toLocaleDateString()}</time>
      <h3>${escapeHTML(entry.title)}</h3><p>${escapeHTML(entry.body)}</p>
      <div class="entry-actions"><button class="edit-entry" data-edit-entry="${escapeHTML(entry.id)}" type="button">EDIT PAGE ↗</button><button class="delete-entry" data-delete="${escapeHTML(entry.id)}" type="button">DELETE PAGE ×</button></div>
    </article>`).join("") : '<p style="font-size:11px;color:#79847d">Your first page is waiting to be written.</p>';
  document.querySelectorAll("[data-edit-entry]").forEach(button => button.addEventListener("click", async () => {
    const entry = (await getEntries()).find(item => item.id === button.dataset.editEntry);
    if (!entry) return;
    editingEntryId = entry.id;
    $("#entry-title").value = entry.title;
    $("#entry-body").value = entry.body;
    entrySubmit.innerHTML = 'UPDATE PAGE <span>↗</span>';
    entryCancel.hidden = false;
    $("#entry-title").focus();
    $("#entry-form").scrollIntoView({behavior:"smooth",block:"center"});
  }));
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", async () => {
    await deleteEntry(button.dataset.delete);
    await renderEntries();
    toast("PAGE DELETED");
  }));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
renderEntries();

const settingsDialog = $("#settings-dialog");
$("#settings-button").addEventListener("click", () => settingsDialog.showModal());
$("#settings-close").addEventListener("click", () => settingsDialog.close());
$("#backup-export").addEventListener("click", async () => {
  try { await exportBackup(); toast("MUSE BACKUP EXPORTED"); }
  catch { toast("BACKUP COULD NOT BE CREATED"); }
});
$("#backup-import").addEventListener("click", () => $("#backup-file").click());
$("#backup-file").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const summary = await importBackup(file);
    toast(`MERGED ${summary.journal + summary.archive + summary.artwork + (summary.innerCheckins || 0) + (summary.musicTracks || 0) + (summary.musicAudioFiles || 0) + (summary.musicPlaylists || 0) + (summary.libraryItems || 0)} ITEMS — RELOADING`);
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    toast(error.message || "BACKUP COULD NOT BE RESTORED");
  } finally { event.target.value = ""; }
});
settingsDialog.addEventListener("click", event => {
  if (event.target === settingsDialog) settingsDialog.close();
});
window.addEventListener("muse:toast", event => toast(event.detail));



async function updateHomeStats() {
  try {
    const entries = await getEntries();
    const archive = JSON.parse(localStorage.getItem("muse.archive.entries.v1") || "{}");
    const archiveCount = Object.values(archive).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0);
    const moodCount = JSON.parse(localStorage.getItem("muse.inner.checkins.v1") || "[]").length;
    const musicCount = JSON.parse(localStorage.getItem("muse.music.tracks.v1") || "[]").length;
    const artCount = JSON.parse(localStorage.getItem("muse.pixel.gallery.v1") || "[]").length;
    const libraryCount = JSON.parse(localStorage.getItem("muse.library.items.v1") || "[]").length;
    $("#home-journal-count").textContent = String(entries.length).padStart(2,"0");
    $("#home-archive-count").textContent = String(archiveCount).padStart(2,"0");
    $("#home-inner-count").textContent = String(moodCount).padStart(2,"0");
    $("#home-music-count").textContent = String(musicCount).padStart(2,"0");
    $("#home-studio-count").textContent = String(artCount).padStart(2,"0");
    $("#home-library-count").textContent = String(libraryCount).padStart(2,"0");
  } catch (error) {
    console.warn("MUSE overview counts could not be refreshed:", error);
  }
}
updateHomeStats();
