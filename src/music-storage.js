const DB_NAME="muse-music-files";
const STORE="audio";
let databasePromise;
function database(){
 if(databasePromise)return databasePromise;
 databasePromise=new Promise((resolve,reject)=>{
  if(!("indexedDB" in window)){reject(new Error("IndexedDB is unavailable"));return;}
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
 return databasePromise;
}
export async function saveAudioFile(id,file){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).put({id,blob:file,name:file.name,type:file.type,size:file.size});
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
}
export async function getAudioFile(id){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const request=db.transaction(STORE,"readonly").objectStore(STORE).get(id);
  request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);
 });
}
export async function deleteAudioFile(id){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });
}
export async function getAllAudioFiles(){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const request=db.transaction(STORE,"readonly").objectStore(STORE).getAll();
  request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>reject(request.error);
 });
}
