const KEY = "muse.library.items.v1";
const $ = selector => document.querySelector(selector);
const TYPES = { book:"BOOK", movie:"MOVIE", series:"SERIES" };
const STATUSES = { want:"WANT TO READ / WATCH", "in-progress":"IN PROGRESS", finished:"FINISHED", paused:"ON HOLD", dropped:"DROPPED" };
let items = readItems();

function readItems() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter(item => item && typeof item.id === "string") : [];
  } catch { return []; }
}
function saveItems() { localStorage.setItem(KEY, JSON.stringify(items)); }
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function makeId() { return globalThis.crypto?.randomUUID?.() || `library-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function fileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("The cover image could not be read."));
    reader.readAsDataURL(file);
  });
}
function updateOverview() {
  $("#library-total").textContent = String(items.length).padStart(2,"0");
  $("#library-books-total").textContent = String(items.filter(item => item.type === "book").length).padStart(2,"0");
  $("#library-screen-total").textContent = String(items.filter(item => item.type !== "book").length).padStart(2,"0");
  const homeCount = $("#home-library-count");
  if (homeCount) homeCount.textContent = String(items.length).padStart(2,"0");
}
function render() {
  const query = $("#library-search").value.trim().toLocaleLowerCase();
  const type = $("#library-filter").value;
  const status = $("#library-status-filter").value;
  const filtered = items.filter(item => (type === "all" || item.type === type) &&
    (status === "all" || item.status === status) &&
    [item.title,item.creator,item.genre,item.note,item.year].some(value => String(value || "").toLocaleLowerCase().includes(query)));
  $("#library-results-count").textContent = `${filtered.length} ${filtered.length === 1 ? "ITEM" : "ITEMS"}`;
  $("#library-list").innerHTML = filtered.length ? filtered.map(item => `
    <article class="library-item" data-library-id="${escapeHTML(item.id)}">
      <div class="library-cover">${item.cover ? `<img src="${item.cover}" alt="">` : `<span>${item.type === "book" ? "▤" : "▣"}</span>`}</div>
      <div class="library-item-main">
        <div class="library-item-meta"><span>${TYPES[item.type] || "STORY"}</span><span>${STATUSES[item.status] || "UNSORTED"}</span></div>
        <h3>${escapeHTML(item.title)}</h3>
        <p class="library-creator">${escapeHTML(item.creator || "Creator not added")}${item.year ? ` · ${escapeHTML(item.year)}` : ""}</p>
        ${item.genre ? `<span class="library-genre">${escapeHTML(item.genre)}</span>` : ""}
        ${item.rating ? `<span class="library-rating" aria-label="Rating">${"★".repeat(item.rating)}${"☆".repeat(5-item.rating)}</span>` : ""}
        ${item.note ? `<p class="library-note">${escapeHTML(item.note)}</p>` : ""}
        <div class="library-item-actions"><button type="button" data-library-delete="${escapeHTML(item.id)}">REMOVE FROM LIBRARY ×</button><time>${new Date(item.createdAt).toLocaleDateString()}</time></div>
      </div>
    </article>`).join("") : '<p class="empty-state">No stories match this shelf yet. Try another filter or add a new one.</p>';
  updateOverview();
  document.querySelectorAll("[data-library-delete]").forEach(button => button.addEventListener("click", () => {
    items = items.filter(item => item.id !== button.dataset.libraryDelete);
    saveItems(); render();
    window.dispatchEvent(new CustomEvent("muse:toast", { detail:"REMOVED FROM YOUR LIBRARY" }));
  }));
}
export function getLibraryItems() { return items; }
export function setLibraryItems(next) { items = Array.isArray(next) ? next : []; saveItems(); render(); }
export function initLibrary() {
  $("#library-form").addEventListener("submit", async event => {
    event.preventDefault();
    const title = $("#library-title").value.trim();
    if (!title) return;
    const file = $("#library-cover").files?.[0];
    if (file && file.size > 5 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent("muse:toast", { detail:"COVER IMAGE MUST BE 5 MB OR LESS" }));
      return;
    }
    try {
      const type = $("#library-type").value;
      const yearValue = $("#library-year").value;
      const ratingValue = $("#library-rating").value;
      const item = {
        id:makeId(), type, title, creator:$("#library-creator").value.trim(),
        year:yearValue ? Number(yearValue) : null, genre:$("#library-genre").value.trim(),
        status:$("#library-status").value, rating:ratingValue ? Number(ratingValue) : null,
        note:$("#library-note").value.trim(), cover:file ? await fileAsDataURL(file) : "",
        createdAt:Date.now()
      };
      items.unshift(item); saveItems();
      event.target.reset(); render();
      window.dispatchEvent(new CustomEvent("muse:toast", { detail:"SAVED TO YOUR LIBRARY" }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("muse:toast", { detail:error.message || "LIBRARY ITEM COULD NOT BE SAVED" }));
    }
  });
  ["#library-search","#library-filter","#library-status-filter"].forEach(selector => {
    $(selector).addEventListener(selector === "#library-search" ? "input" : "change", render);
  });
  render();
}
