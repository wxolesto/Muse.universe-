const KEY = "muse.archive.entries.v1";
const LABELS = {soundtrack:"Soundtrack",people:"People",curiosities:"Curiosities",memories:"Memories"};
const $ = selector => document.querySelector(selector);
const safe = value => String(value ?? "").replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
let activeCollection = null;
let editingId = null;
let collectionSubmit;
let collectionCancel;

function readAll(){try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch{return {};}}
function writeAll(data){localStorage.setItem(KEY,JSON.stringify(data));}
function cancelCollectionEdit(){
  editingId=null;$("#collection-form").reset();
  collectionSubmit.textContent="ADD TO COLLECTION ↗";collectionCancel.hidden=true;
}
function render(){
  const all=readAll(), items=activeCollection?(all[activeCollection]||[]):[];
  $("#collection-title").textContent=activeCollection?LABELS[activeCollection]:"Choose a collection.";
  $("#collection-count").textContent=items.length+" ITEM"+(items.length===1?"":"S");
  $("#collection-items").innerHTML=activeCollection
    ? items.map(item=>`<article class="collection-item"><div><small>${new Date(item.createdAt).toLocaleDateString()}</small><h3>${safe(item.title)}</h3><p>${safe(item.note)}</p><div class="collection-item-actions"><button type="button" data-edit-collection-item="${safe(item.id)}">EDIT ↗</button><button type="button" data-remove-collection-item="${safe(item.id)}">DELETE ×</button></div></div></article>`).join("") || '<p class="collection-empty">Nothing here yet. Add the first piece.</p>'
    : '<p class="collection-empty">Select one of the collections above to begin.</p>';
  document.querySelectorAll("[data-edit-collection-item]").forEach(button=>button.addEventListener("click",()=>{
    const item=(readAll()[activeCollection]||[]).find(entry=>entry.id===button.dataset.editCollectionItem);
    if(!item)return;
    editingId=item.id;$("#collection-entry-title").value=item.title;$("#collection-entry-note").value=item.note||"";
    collectionSubmit.textContent="UPDATE COLLECTION ↗";collectionCancel.hidden=false;
    $("#collection-entry-title").focus();$("#collection-form").scrollIntoView({behavior:"smooth",block:"center"});
  }));
  document.querySelectorAll("[data-remove-collection-item]").forEach(button=>button.addEventListener("click",()=>{
    const next=readAll();next[activeCollection]=(next[activeCollection]||[]).filter(item=>item.id!==button.dataset.removeCollectionItem);writeAll(next);render();
  }));
}
export function initArchive(){
  collectionSubmit=$("#collection-form button[type=submit]");
  collectionCancel=document.createElement("button");collectionCancel.type="button";collectionCancel.className="secondary-button edit-cancel";collectionCancel.textContent="CANCEL EDIT";collectionCancel.hidden=true;
  $("#collection-form").append(collectionCancel);
  collectionCancel.addEventListener("click",cancelCollectionEdit);
  document.querySelectorAll("[data-collection]").forEach(card=>{
    const choose=()=>{if(editingId)cancelCollectionEdit();activeCollection=card.dataset.collection;document.querySelectorAll("[data-collection]").forEach(node=>node.classList.toggle("selected",node===card));render();};
    card.addEventListener("click",choose);
    card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();choose();}});
  });
  $("#collection-form").addEventListener("submit",event=>{
    event.preventDefault();if(!activeCollection)return;
    const title=$("#collection-entry-title").value.trim(),note=$("#collection-entry-note").value.trim();if(!title)return;
    const all=readAll();all[activeCollection]??=[];
    if(editingId){const index=all[activeCollection].findIndex(item=>item.id===editingId);if(index>=0)all[activeCollection][index]={...all[activeCollection][index],title,note,updatedAt:Date.now()};}
    else all[activeCollection].unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),title,note,createdAt:Date.now()});
    try{writeAll(all);cancelCollectionEdit();render();}
    catch{$("#collection-items").insertAdjacentHTML("afterbegin",'<p class="collection-empty">Storage is full. Export or remove older items.</p>');}
  });
  render();
}
