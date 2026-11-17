const KEY = "muse.archive.entries.v1";
const LABELS = {soundtrack:"Soundtrack",people:"People",curiosities:"Curiosities",memories:"Memories"};
const $ = selector => document.querySelector(selector);
const safe = value => String(value).replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
let activeCollection = null;

function readAll(){try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch{return {};}}
function writeAll(data){localStorage.setItem(KEY,JSON.stringify(data));}
function render(){
  const all=readAll(), items=activeCollection?(all[activeCollection]||[]):[];
  $("#collection-title").textContent=activeCollection?LABELS[activeCollection]:"Choose a collection.";
  $("#collection-count").textContent=items.length+" ITEM"+(items.length===1?"":"S");
  $("#collection-items").innerHTML=activeCollection
    ? items.map(item=>`<article class="collection-item"><div><small>${new Date(item.createdAt).toLocaleDateString()}</small><h3>${safe(item.title)}</h3><p>${safe(item.note)}</p></div><button data-remove-collection-item="${safe(item.id)}" aria-label="Remove item">×</button></article>`).join("") || '<p class="collection-empty">Nothing here yet. Add the first piece.</p>'
    : '<p class="collection-empty">Select one of the collections above to begin.</p>';
  document.querySelectorAll("[data-remove-collection-item]").forEach(button=>button.addEventListener("click",()=>{
    const next=readAll();next[activeCollection]=(next[activeCollection]||[]).filter(item=>item.id!==button.dataset.removeCollectionItem);writeAll(next);render();
  }));
}
export function initArchive(){
  document.querySelectorAll("[data-collection]").forEach(card=>{
    const choose=()=>{activeCollection=card.dataset.collection;document.querySelectorAll("[data-collection]").forEach(node=>node.classList.toggle("selected",node===card));render();};
    card.addEventListener("click",choose);
    card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();choose();}});
  });
  $("#collection-form").addEventListener("submit",event=>{
    event.preventDefault();
    if(!activeCollection)return;
    const title=$("#collection-entry-title").value.trim(),note=$("#collection-entry-note").value.trim();
    if(!title)return;
    const all=readAll();all[activeCollection]??=[];
    all[activeCollection].unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),title,note,createdAt:Date.now()});
    try{writeAll(all);$("#collection-entry-title").value="";$("#collection-entry-note").value="";render();}
    catch{$("#collection-items").insertAdjacentHTML("afterbegin",'<p class="collection-empty">Storage is full. Export or remove older items.</p>');}
  });
  render();
}
