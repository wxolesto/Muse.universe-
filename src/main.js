import { createWorld } from "./world.js";
import { getEntries, saveEntry, deleteEntry, createId } from "./storage.js";
import { initPixelStudio } from "./pixel-studio.js";

const $ = (selector) => document.querySelector(selector);
const toast = (message) => {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
};

const views = ["world", "journal", "archive", "studio"];
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

$("#map-button").addEventListener("click", () => toast("THE ARCHIPELAGO MAP WILL UNFOLD AS YOU EXPLORE"));
$("#inspect-button").addEventListener("click", () => toast("YOU ARE AT THE FIRST SHORE"));
$("#settings-button").addEventListener("click", () => toast("WORLD SETTINGS ARE COMING IN THE NEXT BUILD"));
$("#sound-toggle").addEventListener("click", () => toast("AMBIENT SOUND SYSTEM — IN DEVELOPMENT"));

document.querySelectorAll(".touch-pad button").forEach(button => {
  const start = event => { event.preventDefault(); game?.events.emit("touch-move", button.dataset.dir, true); };
  const stop = () => game?.events.emit("touch-move", button.dataset.dir, false);
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointerleave", stop);
  button.addEventListener("pointercancel", stop);
});

window.addEventListener("muse:toast", event => toast(event.detail));
