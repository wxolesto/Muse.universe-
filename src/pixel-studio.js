const PALETTE = ["#17252a","#31443b","#536d50","#7b8964","#b8c6a2","#d8c7a2","#b98e78","#8d6870","#b7a6c8","#6c8790","#dce0d2","#f0eadb","#26344a","#8d9aab","#c18e4d","#e2bd78"];
const STORAGE_KEY = "muse.pixel.gallery.v1";

export function initPixelStudio() {
  const canvas = document.querySelector("#pixel-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha:false });
  const sizeSelect = document.querySelector("#pixel-size");
  const colorInput = document.querySelector("#pixel-color");
  const status = document.querySelector("#pixel-status");
  const gallery = document.querySelector("#pixel-gallery");
  let size = 32;
  let pixels = Array(size * size).fill(null);
  let color = colorInput.value;
  let tool = "pencil";
  let drawing = false;
  let undoStack = [];
  let redoStack = [];

  const snapshot = () => pixels.slice();
  const remember = () => {
    undoStack.push(snapshot());
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
  };
  const render = () => {
    const cell = canvas.width / size;
    ctx.fillStyle = "#11191b";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    pixels.forEach((value,index) => {
      if (!value) return;
      ctx.fillStyle = value;
      ctx.fillRect((index % size)*cell,Math.floor(index/size)*cell,cell,cell);
    });
    ctx.strokeStyle = "rgba(225,230,211,.09)";
    ctx.lineWidth = 1;
    for(let i=0;i<=size;i++){
      const p=i*cell+.5;
      ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,canvas.height);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(canvas.width,p);ctx.stroke();
    }
    status.textContent = size+" × "+size+" · "+pixels.filter(Boolean).length+" PIXELS";
  };
  const coords = event => {
    const rect=canvas.getBoundingClientRect();
    return {
      x:Math.max(0,Math.min(size-1,Math.floor((event.clientX-rect.left)/rect.width*size))),
      y:Math.max(0,Math.min(size-1,Math.floor((event.clientY-rect.top)/rect.height*size)))
    };
  };
  const indexAt = (x,y)=>y*size+x;
  const paint = (x,y) => {
    const index=indexAt(x,y);
    if(tool==="eyedropper"){
      if(pixels[index]){color=pixels[index];colorInput.value=color;selectPalette(color);}
      return;
    }
    if(tool==="fill"){floodFill(x,y);render();return;}
    pixels[index]=tool==="eraser"?null:color;
    render();
  };
  const floodFill = (x,y) => {
    const target=pixels[indexAt(x,y)];
    if(target===color)return;
    const stack=[[x,y]], seen=new Set();
    while(stack.length){
      const [cx,cy]=stack.pop(),idx=indexAt(cx,cy);
      if(cx<0||cy<0||cx>=size||cy>=size||seen.has(idx)||pixels[idx]!==target)continue;
      seen.add(idx);pixels[idx]=color;
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
  };
  const selectPalette = value => {
    document.querySelectorAll(".palette-swatch").forEach(node=>node.classList.toggle("selected",node.dataset.color===value));
  };
  const setTool = next => {
    tool=next;
    document.querySelectorAll("[data-tool]").forEach(node=>node.classList.toggle("active",node.dataset.tool===tool));
    status.textContent=tool.toUpperCase()+" TOOL · "+size+" × "+size;
  };
  const setSize = next => {
    size=next;pixels=Array(size*size).fill(null);undoStack=[];redoStack=[];render();
  };
  const exportPNG = () => {
    const out=document.createElement("canvas");out.width=size;out.height=size;
    const outCtx=out.getContext("2d");
    pixels.forEach((value,index)=>{if(value){outCtx.fillStyle=value;outCtx.fillRect(index%size,Math.floor(index/size),1,1);}});
    const link=document.createElement("a");link.download="muse-pixel-art-"+Date.now()+".png";link.href=out.toDataURL("image/png");link.click();
  };
  const loadGallery = () => {
    let items=[];
    try {
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      items=Array.isArray(stored)?stored.filter(item=>item&&typeof item==="object"):[];
    } catch {}
    const safe = value => String(value??"").replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
    const safeImage = value => typeof value==="string" && value.length<=5*1024*1024 && /^data:image\\/png;base64,[A-Za-z0-9+/]+=*$/.test(value) ? value : "";
    gallery.innerHTML=items.map(item=>{
      const image=safeImage(item.image);
      return `<article class="gallery-tile">${image?`<img src="${image}" alt="${safe(item.title)}">`:'<div class="gallery-image-placeholder" aria-label="Image unavailable">▧</div>'}<div><strong>${safe(item.title)}</strong><small>${Number.isFinite(item.createdAt)?new Date(item.createdAt).toLocaleDateString():"DATE UNKNOWN"}</small></div><button data-remove-art="${safe(item.id)}" aria-label="Delete artwork">×</button></article>`;
    }).join("") || '<p class="gallery-empty">Your first tiny masterpiece will live here.</p>';
    gallery.querySelectorAll("[data-remove-art]").forEach(button=>button.addEventListener("click",()=>{
      let stored=[];
      try { const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");stored=Array.isArray(value)?value:[]; } catch {}
      const list=stored.filter(item=>item?.id!==button.dataset.removeArt);
      localStorage.setItem(STORAGE_KEY,JSON.stringify(list));loadGallery();
    }));
  };

  const palette=document.querySelector("#pixel-palette");
  palette.innerHTML=PALETTE.map(value=>`<button class="palette-swatch ${value===color?"selected":""}" data-color="${value}" style="--swatch:${value}" title="${value}"></button>`).join("");
  palette.querySelectorAll("[data-color]").forEach(button=>button.addEventListener("click",()=>{
    color=button.dataset.color;colorInput.value=color;selectPalette(color);
  }));
  document.querySelectorAll("[data-tool]").forEach(button=>button.addEventListener("click",()=>setTool(button.dataset.tool)));
  colorInput.addEventListener("input",()=>{color=colorInput.value;selectPalette(color);});
  sizeSelect.addEventListener("change",()=>setSize(Number(sizeSelect.value)));
  canvas.addEventListener("pointerdown",event=>{
    event.preventDefault();drawing=true;canvas.setPointerCapture(event.pointerId);remember();
    const {x,y}=coords(event);paint(x,y);
  });
  canvas.addEventListener("pointermove",event=>{
    if(!drawing||tool==="fill"||tool==="eyedropper")return;
    const {x,y}=coords(event);pixels[indexAt(x,y)]=tool==="eraser"?null:color;render();
  });
  const stop=()=>{drawing=false;};
  canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);canvas.addEventListener("lostpointercapture",stop);
  document.querySelector("#pixel-undo").addEventListener("click",()=>{
    if(!undoStack.length)return;redoStack.push(snapshot());pixels=undoStack.pop();render();
  });
  document.querySelector("#pixel-redo").addEventListener("click",()=>{
    if(!redoStack.length)return;undoStack.push(snapshot());pixels=redoStack.pop();render();
  });
  document.querySelector("#pixel-clear").addEventListener("click",()=>{
    remember();pixels=Array(size*size).fill(null);render();
  });
  document.querySelector("#pixel-export").addEventListener("click",exportPNG);
  document.querySelector("#pixel-save").addEventListener("click",()=>{
    const title=prompt("Name your artwork:");
    if(!title?.trim())return;
    const out=document.createElement("canvas");out.width=size;out.height=size;
    const outCtx=out.getContext("2d");
    pixels.forEach((value,index)=>{if(value){outCtx.fillStyle=value;outCtx.fillRect(index%size,Math.floor(index/size),1,1);}});
    const items=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    items.unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),title:title.trim(),image:out.toDataURL("image/png"),createdAt:Date.now(),size});
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,24)));loadGallery();status.textContent="SAVED TO YOUR LOCAL GALLERY";}catch{status.textContent="GALLERY STORAGE FULL — EXPORT PNG INSTEAD";}
  });
  render();loadGallery();
}
