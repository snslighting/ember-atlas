import {unpackRows} from './data-codec.js';
const shardCache=new Map(),cacheName='ember-atlas-nasa-v1';
export async function getVersion(){const response=await fetch('./data/firms.json?check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Feed check failed');return response.json();}
async function persistentCache(){try{return await globalThis.caches?.open(cacheName);}catch{return null;}}
async function compressedRows(chunk,cache){
 const path='./data/'+chunk.transport.file+'?v='+chunk.transport.version;
 let response;try{response=await cache?.match(path);}catch{}
 if(!response){response=await fetch(path,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Compact NASA download unavailable');try{await cache?.put(path,response.clone());}catch{}}
 try{return unpackRows(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json());}
 catch(error){try{await cache?.delete(path);}catch{}throw error;}
}
export async function getData(metadata){
 metadata??=await getVersion();if(metadata.source!=='firms')throw Error('Only actual NASA observations are supported');
 let data=metadata.data;
 if(metadata.format==='firms-sharded-v1'){
  const active=new Set(metadata.chunks.map(c=>c.file+'?v='+c.version));for(const key of shardCache.keys())if(!active.has(key))shardCache.delete(key);
  const cache=await persistentCache(),arrays=new Array(metadata.chunks.length);let cursor=0;
  async function next(){
   while(cursor<metadata.chunks.length){
    const i=cursor++,c=metadata.chunks[i],key=c.file+'?v='+c.version;
    if(shardCache.has(key)){arrays[i]=shardCache.get(key);continue;}
    let rows;
    if(c.transport&&typeof DecompressionStream==='function')try{rows=await compressedRows(c,cache);}catch{}
    if(!rows){const r=await fetch('./data/'+key,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Global observations could not be loaded');rows=await r.json();}
    if(!Array.isArray(rows)||rows.length!==c.observations)throw Error('Incomplete NASA data file');
    shardCache.set(key,rows);arrays[i]=rows;
   }
  }
  // A shared queue starts the next download as soon as one finishes.
  await Promise.all([next(),next(),next(),next()]);
  data=arrays.flat();if(data.length!==metadata.observationCount)throw Error('Incomplete global dataset');
  if(cache)try{
   const activeURLs=new Set(metadata.chunks.filter(c=>c.transport).map(c=>new URL('./data/'+c.transport.file+'?v='+c.transport.version,globalThis.location.href).href));
   for(const request of await cache.keys())if(!activeURLs.has(request.url))await cache.delete(request);
  }catch{}
 }
 return {...metadata,data,message:`NASA FIRMS worldwide · ${metadata.dateStart}–${metadata.dateEnd} UTC · retrieved ${new Date(metadata.retrievedAt).toISOString().replace('T',' ').slice(0,16)} UTC · MODIS + NOAA-20 VIIRS`};
}
