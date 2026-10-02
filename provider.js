const shardCache=new Map();
export async function getVersion(){const response=await fetch('./data/firms.json?check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Feed check failed');return response.json();}
export async function getData(){
 const metadata=await getVersion();if(metadata.source!=='firms')throw Error('Only actual NASA observations are supported');
 let data=metadata.data;
 if(metadata.format==='firms-sharded-v1'){
  const active=new Set(metadata.chunks.map(c=>c.file+'?v='+c.version));for(const key of shardCache.keys())if(!active.has(key))shardCache.delete(key);
  const arrays=[]; // Limit concurrent downloads and peak parsing memory.
  for(let i=0;i<metadata.chunks.length;i+=2){const batch=metadata.chunks.slice(i,i+2);arrays.push(...await Promise.all(batch.map(async c=>{const key=c.file+'?v='+c.version;if(shardCache.has(key))return shardCache.get(key);const r=await fetch('./data/'+key,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Global observations could not be loaded');const rows=await r.json();if(!Array.isArray(rows)||rows.length!==c.observations)throw Error('Incomplete NASA data file');shardCache.set(key,rows);return rows;})));}
  data=arrays.flat();if(data.length!==metadata.observationCount)throw Error('Incomplete global dataset');
 }
 return {...metadata,data,message:`NASA FIRMS worldwide · ${metadata.dateStart}–${metadata.dateEnd} UTC · retrieved ${new Date(metadata.retrievedAt).toISOString().replace('T',' ').slice(0,16)} UTC · MODIS + NOAA-20 VIIRS`};
}
