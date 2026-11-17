import { createWorld } from "./world.js";
import { getEntries, saveEntry, deleteEntry, createId } from "./storage.js";
import { initPixelStudio } from "./pixel-studio.js";
import { initArchive } from "./archive.js";
import { exportBackup, importBackup } from "./backup.js";
import { createShoreAmbience } from "./ambience.js";
import { initInnerWorld } from "./inner-world.js";

const $ = (selector) => document.querySelector(selector);
const toast = (message) => {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
};

const views = ["world", "journal", "archive", "inner", "music", "studio"];
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
  const hour = now.getHours();
  const phase = hour < 5 ? "NIGHT" : hour < 8 ? "DAWN" : hour < 17 ? "DAYLIGHT" : hour < 20 ? "DUSK" : "NIGHT";
  $("#day-phase").textContent = phase;
  $("#season-label").textContent = ["WINTER","SPRING","SUMMER","AUTUMN"][Math.floor((now.getMonth()+1)%12/3)];
}
updateClock();
setInterval(updateClock, 15000);

initPixelStudio();
initArchive();
initInnerWorld();

let game;
try {
  game = createWorld("game-container");
} catch (error) {
  console.error("MUSE world could not start:", error);
  $("#game-container").innerHTML = '<div style="padding:24px;color:#e8e4d9;font:12px monospace">The world engine could not start. Please refresh this page.</div>';
}

$("#entry-form").addEventListener("submit", async event => {
  event.preventDefault();
  const title = $("#entry-title").value.trim();
  const body = $("#entry-body").value.trim();
  if (!title || !body) return;
  await saveEntry({ id:createId(), title, body, createdAt:Date.now() });
  $("#entry-title").value = "";
  $("#entry-body").value = "";
  await renderEntries();
  toast("PAGE SAVED TO YOUR PRIVATE JOURNAL");
});

async function renderEntries() {
  const entries = await getEntries();
  $("#entry-count").textContent = `${entries.length} ENTR${entries.length === 1 ? "Y" : "IES"}`;
  $("#entries-list").innerHTML = entries.length ? entries.map(entry => `
    <article class="entry-card" data-id="${entry.id}">
      <time>${new Date(entry.createdAt).toLocaleDateString()}</time>
      <h3>${escapeHTML(entry.title)}</h3><p>${escapeHTML(entry.body)}</p>
      <button class="delete-entry" data-delete="${entry.id}" style="background:none;border:0;color:#a1aa9c;font:9px monospace;cursor:pointer">DELETE PAGE ×</button>
    </article>`).join("") : '<p style="font-size:11px;color:#79847d">Your first page is waiting to be written.</p>';
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

const mapDialog = $("#map-dialog");
$("#map-button").addEventListener("click", () => mapDialog.showModal());
$("#map-close").addEventListener("click", () => mapDialog.close());
mapDialog.addEventListener("click", event => { if (event.target === mapDialog) mapDialog.close(); });
window.addEventListener("muse:position", event => {
  const {x,y} = event.detail;
  const marker = $("#map-player-marker");
  marker.setAttribute("cx", 122 + ((x - 180) / 1355) * 498);
  marker.setAttribute("cy", 95 + ((y - 185) / 715) * 235);
});
$("#inspect-button").addEventListener("click", () => game?.events.emit("interact"));

const builderDialog=$("#builder-dialog");
const builderStatus=$("#builder-status");
function updateBuilderStatus(){
  let count=0;
  try{const data=JSON.parse(localStorage.getItem("muse.world.objects.v1")||"[]");count=Array.isArray(data)?data.length:0;}catch{}
  builderStatus.textContent=`${count} CUSTOM OBJECTS · FIRST SHORE`;
}
$("#world-builder-button").addEventListener("click",()=>{updateBuilderStatus();builderDialog.showModal();});
$("#builder-close").addEventListener("click",()=>{builderDialog.close();game?.events.emit("builder:cancel");});
$("#builder-finish").addEventListener("click",()=>{builderDialog.close();game?.events.emit("builder:cancel");});
builderDialog.addEventListener("click",event=>{if(event.target===builderDialog){builderDialog.close();game?.events.emit("builder:cancel");}});
document.querySelectorAll("[data-build-item]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-build-item]").forEach(item=>item.classList.toggle("selected",item===button));
  builderDialog.close();
  game?.events.emit("builder:start",button.dataset.buildItem);
  window.dispatchEvent(new CustomEvent("muse:builder-mode",{detail:{active:true,type:button.dataset.buildItem}}));
}));
window.addEventListener("muse:object-placed",event=>{
  updateBuilderStatus();
  toast(`${event.detail.type.toUpperCase()} ADDED TO YOUR SHORE`);
});

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
    toast(`RESTORED ${summary.journal + summary.archive + summary.artwork + (summary.discoveries || 0) + (summary.worldObjects || 0)} ITEMS — RELOADING`);
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    toast(error.message || "BACKUP COULD NOT BE RESTORED");
  } finally { event.target.value = ""; }
});
settingsDialog.addEventListener("click", event => {
  if (event.target === settingsDialog) settingsDialog.close();
});
const ambience = createShoreAmbience();
const soundButton = $("#sound-toggle");
soundButton.setAttribute("aria-pressed","false");
soundButton.addEventListener("click", async () => {
  try {
    const enabled = await ambience.toggle();
    soundButton.classList.toggle("sound-on",enabled);
    soundButton.setAttribute("aria-pressed",String(enabled));
    soundButton.title = enabled ? "Mute shore ambience" : "Enable shore ambience";
    toast(enabled ? "THE SHORE IS ALIVE WITH SOUND" : "AMBIENT SOUND MUTED");
  } catch (error) {
    console.warn("MUSE ambience unavailable:",error);
    toast("AUDIO COULD NOT START IN THIS BROWSER");
  }
});
$("#ambience-volume").addEventListener("input",event=>ambience.setVolume(event.target.value));

document.querySelectorAll(".touch-pad button").forEach(button => {
  const start = event => { event.preventDefault(); game?.events.emit("touch-move", button.dataset.dir, true); };
  const stop = () => game?.events.emit("touch-move", button.dataset.dir, false);
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointerleave", stop);
  button.addEventListener("pointercancel", stop);
});

window.addEventListener("muse:toast", event => toast(event.detail));


const discoveryKey = "muse.discoveries.v1";
const fieldNotesDialog = $("#field-notes-dialog");
$("#field-notes-button").addEventListener("click", () => { renderFieldNotes(); fieldNotesDialog.showModal(); });
$("#field-notes-close").addEventListener("click", () => fieldNotesDialog.close());
fieldNotesDialog.addEventListener("click", event => { if (event.target === fieldNotesDialog) fieldNotesDialog.close(); });
function readDiscoveries() {
  try {
    const value = JSON.parse(localStorage.getItem(discoveryKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function updateDiscoveryCount() {
  const node = $("#discovery-count");
  if (!node) return;
  const count = readDiscoveries().length;
  node.innerHTML = `${String(count).padStart(2,"0")} <i>/ 04</i>`;
  const progress = $("#field-notes-progress");
  if (progress) progress.textContent = `${count} OF 4 LANDMARKS FOUND`;
  document.querySelectorAll("[data-map-discovery]").forEach(marker => marker.classList.toggle("found", readDiscoveries().some(item => item.id === marker.dataset.mapDiscovery)));
}
updateDiscoveryCount();
window.addEventListener("muse:discovery", event => {
  const item = event.detail;
  if (!item?.id || !item?.title) return;
  const discoveries = readDiscoveries();
  if (discoveries.some(saved => saved.id === item.id)) {
    toast(item.description || item.title);
    return;
  }
  discoveries.push({id:item.id,title:item.title,description:item.description,lore:item.lore,discoveredAt:Date.now()});
  try { localStorage.setItem(discoveryKey, JSON.stringify(discoveries)); }
  catch { toast("DISCOVERY FOUND — STORAGE IS FULL"); return; }
  updateDiscoveryCount();
  renderFieldNotes();
  toast(`NEW DISCOVERY · ${item.title}`);
});

function renderFieldNotes() {
  const list = $("#field-notes-list");
  if (!list) return;
  const discoveries = readDiscoveries();
  const escape = value => String(value || "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  if (!discoveries.length) {
    list.innerHTML = '<div class="field-notes-empty"><span>✧</span><strong>Nothing in the log. Yet.</strong><p>Wander the island and look for places that seem to hold a story. Press E or use INTERACT when you find one.</p></div>';
    return;
  }
  list.innerHTML = discoveries.map((item,index) => `
    <article class="field-note-card">
      <div class="field-note-index">0${index+1}</div>
      <div class="field-note-content"><div class="field-note-meta">LANDMARK DISCOVERED · ${item.discoveredAt ? new Date(item.discoveredAt).toLocaleDateString() : "DATE UNKNOWN"}</div>
        <h3>${escape(item.title)}</h3><p class="field-note-summary">${escape(item.description)}</p>
        <p class="field-note-lore">${escape(item.lore || item.description).replace(/\n\n/g,"</p><p class=\"field-note-lore\">")}</p>
      </div>
    </article>`).join("");
}
renderFieldNotes();
