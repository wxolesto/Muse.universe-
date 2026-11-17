const MOOD_LABELS={bright:"Bright",calm:"Calm",curious:"Curious",tender:"Tender",restless:"Restless",heavy:"Heavy",hopeful:"Hopeful",uncertain:"Uncertain"};
const MOOD_SYMBOLS={bright:"☀",calm:"◒",curious:"✧",tender:"❀",restless:"〰",heavy:"☁",hopeful:"✦",uncertain:"◇"};
const CHECKIN_KEY="muse.inner.checkins.v1",MUSIC_KEY="muse.music.tracks.v1";
const $=s=>document.querySelector(s);
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=key=>{try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[];}catch{return [];}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const makeId=()=>globalThis.crypto?.randomUUID?.()||"muse-"+Date.now()+"-"+Math.random().toString(16).slice(2);
function renderCheckins(){
 const items=read(CHECKIN_KEY),list=$("#mood-history");
 $("#mood-count").textContent=items.length+" MOMENT"+(items.length===1?"":"S");
 list.innerHTML=items.length?items.map(item=>`<article class="mood-entry"><div class="mood-entry-symbol">${MOOD_SYMBOLS[item.mood]||"✧"}</div><div class="mood-entry-main"><div class="mood-entry-meta">${new Date(item.createdAt).toLocaleString()} · ${MOOD_LABELS[item.mood]||"A moment"}</div><p>${escapeHTML(item.note)||'<span class="quiet-note">No words needed.</span>'}</p></div><button type="button" data-delete-checkin="${escapeHTML(item.id)}" aria-label="Delete check-in">×</button></article>`).join(""):'<p class="empty-state">Your first check-in will appear here whenever you\'re ready.</p>';
}
function renderMusic(){
 const items=read(MUSIC_KEY),list=$("#music-list");
 $("#music-count").textContent=items.length+" TRACK"+(items.length===1?"":"S");
 list.innerHTML=items.length?items.map(item=>{
  let link="";
  try{const url=new URL(item.link);if(["http:","https:"].includes(url.protocol))link=`<a class="music-listen-link" href="${escapeHTML(url.href)}" target="_blank" rel="noopener noreferrer">OPEN LISTENING LINK ↗</a>`;}catch{}
  return `<article class="music-track"><div class="track-art"><span>♫</span><i></i></div><div class="track-main"><div class="track-meta">${escapeHTML(item.artist||"ARTIST UNKNOWN")}${item.album?" · "+escapeHTML(item.album):""}</div><h3>${escapeHTML(item.title)}</h3>${item.mood?`<span class="track-mood">${escapeHTML(item.mood)}</span>`:""}${item.note?`<p>${escapeHTML(item.note)}</p>`:""}<div class="track-actions">${link}<span>ADDED ${new Date(item.createdAt).toLocaleDateString()}</span></div></div><button type="button" class="track-delete" data-delete-track="${escapeHTML(item.id)}" aria-label="Remove track">×</button></article>`;
 }).join(""):'<p class="empty-state">The first song is waiting to be added.</p>';
}
export function initInnerWorld(){
 let selectedMood="";
 const choices=$("#mood-choices");
 choices.addEventListener("click",event=>{
  const button=event.target.closest("[data-mood]");if(!button)return;
  selectedMood=button.dataset.mood;
  choices.querySelectorAll(".mood-choice").forEach(node=>node.classList.toggle("selected",node===button));
  $("#mood-selected-label").textContent="TODAY FEELS "+MOOD_LABELS[selectedMood].toUpperCase();
 });
 $("#mood-form").addEventListener("submit",event=>{
  event.preventDefault();
  const note=$("#mood-note").value.trim();
  if(!selectedMood&&!note){$("#mood-selected-label").textContent="CHOOSE A FEELING OR ADD A FEW WORDS FIRST";return;}
  const items=read(CHECKIN_KEY);items.unshift({id:makeId(),mood:selectedMood,note,createdAt:Date.now()});
  try{write(CHECKIN_KEY,items);$("#mood-note").value="";selectedMood="";choices.querySelectorAll(".mood-choice").forEach(node=>node.classList.remove("selected"));$("#mood-selected-label").textContent="CHOOSE WHATEVER FEELS CLOSEST — OR SKIP THE LABEL";renderCheckins();window.dispatchEvent(new CustomEvent("muse:toast",{detail:"CHECK-IN SAVED TO YOUR INNER WORLD"}));}
  catch{window.dispatchEvent(new CustomEvent("muse:toast",{detail:"STORAGE IS FULL — EXPORT A BACKUP"}));}
 });
 $("#mood-history").addEventListener("click",event=>{
  const button=event.target.closest("[data-delete-checkin]");if(!button)return;
  write(CHECKIN_KEY,read(CHECKIN_KEY).filter(item=>item.id!==button.dataset.deleteCheckin));renderCheckins();
 });
 $("#music-form").addEventListener("submit",event=>{
  event.preventDefault();
  const title=$("#music-title").value.trim();if(!title)return;
  const rawLink=$("#music-link").value.trim();let link="";
  if(rawLink){try{const url=new URL(rawLink);if(!["http:","https:"].includes(url.protocol))throw new Error();link=url.href;}catch{$("#music-link").setCustomValidity("Enter a valid http or https link.");$("#music-link").reportValidity();return;}}
  $("#music-link").setCustomValidity("");
  const items=read(MUSIC_KEY);items.unshift({id:makeId(),title,artist:$("#music-artist").value.trim(),album:$("#music-album").value.trim(),mood:$("#music-mood").value,note:$("#music-note").value.trim(),link,createdAt:Date.now()});
  try{write(MUSIC_KEY,items);$("#music-form").reset();renderMusic();window.dispatchEvent(new CustomEvent("muse:toast",{detail:"TRACK ADDED TO YOUR MUSIC ROOM"}));}
  catch{window.dispatchEvent(new CustomEvent("muse:toast",{detail:"STORAGE IS FULL — EXPORT A BACKUP"}));}
 });
 $("#music-list").addEventListener("click",event=>{
  const button=event.target.closest("[data-delete-track]");if(!button)return;
  write(MUSIC_KEY,read(MUSIC_KEY).filter(item=>item.id!==button.dataset.deleteTrack));renderMusic();
 });
 renderCheckins();renderMusic();
}
