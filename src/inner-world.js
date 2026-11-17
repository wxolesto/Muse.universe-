import {saveAudioFile,getAudioFile,deleteAudioFile} from "./music-storage.js";
const MOOD_LABELS={bright:"Bright",calm:"Calm",curious:"Curious",tender:"Tender",restless:"Restless",heavy:"Heavy",hopeful:"Hopeful",uncertain:"Uncertain"};
const MOOD_SYMBOLS={bright:"☀",calm:"◒",curious:"✧",tender:"❀",restless:"〰",heavy:"☁",hopeful:"✦",uncertain:"◇"};
const CHECKIN_KEY="muse.inner.checkins.v1",MUSIC_KEY="muse.music.tracks.v1";
const $=s=>document.querySelector(s);
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=key=>{try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[];}catch{return [];}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const makeId=()=>globalThis.crypto?.randomUUID?.()||"muse-"+Date.now()+"-"+Math.random().toString(16).slice(2);

let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),selectedCalendarDay="";
function dayKey(date){return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");}
function renderCalendar(){
 const items=read(CHECKIN_KEY),year=calendarMonth.getFullYear(),month=calendarMonth.getMonth(),offset=(new Date(year,month,1).getDay()+6)%7,total=new Date(year,month+1,0).getDate();
 $("#mood-calendar-month").textContent=calendarMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"});
 const counts={};items.forEach(item=>{const key=dayKey(new Date(item.createdAt));counts[key]=(counts[key]||0)+1;});
 const cells=[];const length=Math.ceil((offset+total)/7)*7;
 for(let i=0;i<length;i++){const day=i-offset+1;if(day<1||day>total){cells.push('<span class="calendar-empty-day"></span>');continue;}
  const key=dayKey(new Date(year,month,day)),count=counts[key]||0,syms=items.filter(item=>dayKey(new Date(item.createdAt))===key).map(item=>MOOD_SYMBOLS[item.mood]||"✧").slice(0,3).join(" ");
  const classes=["calendar-day",count?"has-moments":"",key===dayKey(new Date())?"today":"",key===selectedCalendarDay?"selected":""].filter(Boolean).join(" ");
  cells.push('<button type="button" class="'+classes+'" data-calendar-day="'+key+'"><span>'+day+'</span><small>'+syms+'</small></button>');
 }
 $("#mood-calendar-grid").innerHTML=cells.join("");
 const monthCount=items.filter(item=>{const d=new Date(item.createdAt);return d.getFullYear()===year&&d.getMonth()===month;}).length;
 $("#calendar-month-count").textContent=monthCount+" CHECK-IN"+(monthCount===1?"":"S")+" THIS MONTH";
 const chosen=selectedCalendarDay?items.filter(item=>dayKey(new Date(item.createdAt))===selectedCalendarDay):[];
 $("#calendar-selected").innerHTML=!selectedCalendarDay?'<p class="empty-state">Choose a day to see its moments.</p>':chosen.length?chosen.map(item=>'<article class="calendar-moment"><span>'+(MOOD_SYMBOLS[item.mood]||"✧")+'</span><div><small>'+new Date(item.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+' · '+(MOOD_LABELS[item.mood]||"A moment")+'</small><p>'+(escapeHTML(item.note)||'<i>No words needed.</i>')+'</p></div></article>').join(""):'<p class="empty-state">No check-ins on this day. An empty square is part of the story, too.</p>';
}

function renderCheckins(){
 const items=read(CHECKIN_KEY),list=$("#mood-history");
 $("#mood-count").textContent=items.length+" MOMENT"+(items.length===1?"":"S");
 renderCalendar();
 list.innerHTML=items.length?items.map(item=>`<article class="mood-entry"><div class="mood-entry-symbol">${MOOD_SYMBOLS[item.mood]||"✧"}</div><div class="mood-entry-main"><div class="mood-entry-meta">${new Date(item.createdAt).toLocaleString()} · ${MOOD_LABELS[item.mood]||"A moment"}</div><p>${escapeHTML(item.note)||'<span class="quiet-note">No words needed.</span>'}</p></div><button type="button" data-delete-checkin="${escapeHTML(item.id)}" aria-label="Delete check-in">×</button></article>`).join(""):'<p class="empty-state">Your first check-in will appear here whenever you\'re ready.</p>';
}
let musicQueue=[],musicIndex=-1,shuffleMusic=false;
const audioUrls=new Map();
function playQueueIndex(index){
 const player=$("#music-player");if(!musicQueue.length)return;
 musicIndex=(index+musicQueue.length)%musicQueue.length;
 const item=musicQueue[musicIndex];let source=audioUrls.get(item.id)||item.audioUrl||"";
 if(!source){window.dispatchEvent(new CustomEvent("muse:toast",{detail:"THIS TRACK HAS NO AUDIO FILE ATTACHED"}));return;}
 player.src=source;$("#player-title").textContent=item.title;$("#player-artist").textContent=item.artist||"ARTIST UNKNOWN";
 $("#player-art").innerHTML=item.cover?'<img src="'+escapeHTML(item.cover)+'" alt="">':"♫";
 player.play().catch(()=>window.dispatchEvent(new CustomEvent("muse:toast",{detail:"TAP PLAY TO START THIS TRACK"})));
}
function playNext(){if(!musicQueue.length)return;if(shuffleMusic&&musicQueue.length>1){let next=musicIndex;while(next===musicIndex)next=Math.floor(Math.random()*musicQueue.length);playQueueIndex(next);}else playQueueIndex(musicIndex+1);}
async function renderMusic(){
 const items=read(MUSIC_KEY),list=$("#music-list");
 $("#music-count").textContent=items.length+" TRACK"+(items.length===1?"":"S");
 const cards=await Promise.all(items.map(async item=>{
  let audioUrl=audioUrls.get(item.id)||"";
  if(!audioUrl){try{const saved=await getAudioFile(item.id);if(saved?.blob){audioUrl=URL.createObjectURL(saved.blob);audioUrls.set(item.id,audioUrl);}}catch{}}
  let link="";
  try{const url=new URL(item.link);if(["http:","https:"].includes(url.protocol))link='<a class="music-listen-link" href="'+escapeHTML(url.href)+'" target="_blank" rel="noopener noreferrer">OPEN LISTENING LINK ↗</a>';}catch{}
  const playable=!!audioUrl||!!item.audioUrl;
  return '<article class="music-track"><div class="track-art">'+(item.cover?'<img src="'+escapeHTML(item.cover)+'" alt="" loading="lazy">':'<span>♫</span><i></i>')+'</div><div class="track-main"><div class="track-meta">'+escapeHTML(item.artist||"ARTIST UNKNOWN")+(item.album?" · "+escapeHTML(item.album):"")+'</div><h3>'+escapeHTML(item.title)+'</h3>'+(item.mood?'<span class="track-mood">'+escapeHTML(item.mood)+'</span>':"")+(item.note?'<p>'+escapeHTML(item.note)+'</p>':"")+'<div class="track-actions">'+(playable?'<button type="button" class="music-play-button" data-play-track="'+escapeHTML(item.id)+'">▶ PLAY</button>':'<span>NO AUDIO FILE ATTACHED</span>')+link+'<span>ADDED '+new Date(item.createdAt).toLocaleDateString()+'</span></div></div><button type="button" class="track-delete" data-delete-track="'+escapeHTML(item.id)+'" aria-label="Remove track">×</button></article>';
 }));
 list.innerHTML=cards.length?cards.join(""):'<p class="empty-state">The first song is waiting to be added.</p>';
 musicQueue=items.filter(item=>audioUrls.has(item.id)||item.audioUrl);
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
  const createdAt=Date.now();const items=read(CHECKIN_KEY);items.unshift({id:makeId(),mood:selectedMood,note,createdAt});selectedCalendarDay=dayKey(new Date(createdAt));calendarMonth=new Date(new Date(createdAt).getFullYear(),new Date(createdAt).getMonth(),1);
  try{write(CHECKIN_KEY,items);$("#mood-note").value="";selectedMood="";choices.querySelectorAll(".mood-choice").forEach(node=>node.classList.remove("selected"));$("#mood-selected-label").textContent="CHOOSE WHATEVER FEELS CLOSEST — OR SKIP THE LABEL";renderCheckins();window.dispatchEvent(new CustomEvent("muse:toast",{detail:"CHECK-IN SAVED TO YOUR INNER WORLD"}));}
  catch{window.dispatchEvent(new CustomEvent("muse:toast",{detail:"STORAGE IS FULL — EXPORT A BACKUP"}));}
 });
 $("#mood-calendar-grid").addEventListener("click",event=>{const button=event.target.closest("[data-calendar-day]");if(!button)return;selectedCalendarDay=button.dataset.calendarDay;renderCalendar();});
 $("#mood-prev-month").addEventListener("click",()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar();});
 $("#mood-next-month").addEventListener("click",()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar();});
 $("#mood-history").addEventListener("click",event=>{
  const button=event.target.closest("[data-delete-checkin]");if(!button)return;
  write(CHECKIN_KEY,read(CHECKIN_KEY).filter(item=>item.id!==button.dataset.deleteCheckin));renderCheckins();
 });
 $("#music-form").addEventListener("submit",async event=>{
  event.preventDefault();
  const title=$("#music-title").value.trim();if(!title)return;
  const rawLink=$("#music-link").value.trim();let link="";
  if(rawLink){try{const url=new URL(rawLink);if(!["http:","https:"].includes(url.protocol))throw new Error();link=url.href;}catch{$("#music-link").setCustomValidity("Enter a valid http or https link.");$("#music-link").reportValidity();return;}}
  $("#music-link").setCustomValidity("");
  const coverFile=$("#music-cover").files?.[0];let cover="";
  if(coverFile){$("#music-cover").setCustomValidity("");if(!coverFile.type.startsWith("image/")||coverFile.size>5*1024*1024){$("#music-cover").setCustomValidity("Choose an image smaller than 5 MB.");$("#music-cover").reportValidity();return;}
   try{cover=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const canvas=document.createElement("canvas"),size=420;canvas.width=size;canvas.height=size;const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;canvas.getContext("2d").drawImage(img,(size-w)/2,(size-h)/2,w,h);resolve(canvas.toDataURL("image/jpeg",.78));};img.onerror=reject;img.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(coverFile);});}catch{return;}
  }
  const audioFile=$("#music-audio-file").files?.[0];
  if(audioFile&&(!audioFile.type.startsWith("audio/")||audioFile.size>40*1024*1024)){$("#music-audio-file").setCustomValidity("Choose an audio file smaller than 40 MB.");$("#music-audio-file").reportValidity();return;}
  const id=makeId(),item={id,title,artist:$("#music-artist").value.trim(),album:$("#music-album").value.trim(),mood:$("#music-mood").value,note:$("#music-note").value.trim(),link,cover,hasAudio:!!audioFile,createdAt:Date.now()};
  try{
   if(audioFile)await saveAudioFile(id,audioFile);
   const items=read(MUSIC_KEY);items.unshift(item);write(MUSIC_KEY,items);
   $("#music-form").reset();await renderMusic();
   window.dispatchEvent(new CustomEvent("muse:toast",{detail:"TRACK ADDED TO YOUR MUSIC ROOM"}));
  }catch(error){if(audioFile)try{await deleteAudioFile(id);}catch{}window.dispatchEvent(new CustomEvent("muse:toast",{detail:"TRACK COULD NOT BE SAVED — CHECK DEVICE STORAGE"}));}
 });
 $("#music-list").addEventListener("click",async event=>{
  const play=event.target.closest("[data-play-track]");
  if(play){const id=play.dataset.playTrack;const index=musicQueue.findIndex(item=>item.id===id);if(index>=0)playQueueIndex(index);return;}
  const button=event.target.closest("[data-delete-track]");if(!button)return;
  const id=button.dataset.deleteTrack;
  const player=$("#music-player");if(musicQueue[musicIndex]?.id===id){player.pause();player.removeAttribute("src");musicIndex=-1;}
  const url=audioUrls.get(id);if(url){URL.revokeObjectURL(url);audioUrls.delete(id);}
  write(MUSIC_KEY,read(MUSIC_KEY).filter(item=>item.id!==id));try{await deleteAudioFile(id);}catch{}
  await renderMusic();
 });
 $("#player-prev").addEventListener("click",()=>playQueueIndex(musicIndex-1));
 $("#player-next").addEventListener("click",playNext);
 $("#player-shuffle").addEventListener("click",event=>{shuffleMusic=!shuffleMusic;event.currentTarget.setAttribute("aria-pressed",String(shuffleMusic));event.currentTarget.textContent=shuffleMusic?"SHUFFLE ON":"SHUFFLE OFF";});
 $("#music-player").addEventListener("ended",playNext);
 renderCheckins();renderMusic();
}
