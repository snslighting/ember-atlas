const root='./data/history/',memory=new Map();
async function cache(){try{return await globalThis.caches?.open('ember-atlas-history-v1');}catch{return null;}}
export async function getHistoryMetadata(){
 const storage=await cache(),path=root+'metadata.json';let response;
 try{response=await fetch(path+'?check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('History metadata unavailable');const value=await response.clone().json();if(value.format!=='atlas-history-v1')throw Error('Invalid history metadata');try{await storage?.put(path,response.clone());const active=new Set([new URL(path,globalThis.location.href).href,...value.cases.flatMap(c=>[...c.summary,...c.tiles,...(c.recent?[c.recent,c.recent.summary]:[])].filter(e=>e.gzip).map(e=>new URL(root+e.gzip+'?v='+e.version,globalThis.location.href).href))]);for(const request of await storage.keys())if(!active.has(request.url))await storage.delete(request);}catch{}return value;}
 catch(error){try{response=await storage?.match(path);if(response){const value=await response.json();if(value.format==='atlas-history-v1')return {...value,offline:true};}}catch{}throw error;}
}
export async function loadHistoryFile(entry){
 const key=entry.file+'?v='+entry.version;if(memory.has(key)){const value=memory.get(key);memory.delete(key);memory.set(key,value);return value;}
 const storage=await cache();let value;
 if(entry.gzip&&typeof DecompressionStream==='function')try{
  const path=root+entry.gzip+'?v='+entry.version;let response;try{response=await storage?.match(path);}catch{}
  if(!response){response=await fetch(path,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('History partition unavailable');try{await storage?.put(path,response.clone());}catch{}}
  value=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
 }catch{}
 if(!value){const response=await fetch(root+key,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Historical data unavailable; no synthetic records are substituted');value=await response.json();}
 memory.set(key,value);while(memory.size>48)memory.delete(memory.keys().next().value);return value;
}
export async function loadHistoryFiles(entries){
 let cursor=0;const out=new Array(entries.length);async function next(){while(cursor<entries.length){const i=cursor++;out[i]=await loadHistoryFile(entries[i]);}}
 await Promise.all(Array.from({length:Math.min(4,entries.length)},next));return out;
}
