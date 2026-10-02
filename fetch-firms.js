import {readFile,mkdir,writeFile,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseCSV} from './core.js';
const retrievedAt=new Date().toISOString(),days=5,today=retrievedAt.slice(0,10),cutoff=new Date(Date.parse(today+'T00:00:00Z')-(days-1)*86400000).toISOString().slice(0,10);
const products=[{product:'MODIS_NRT',sensor:'MODIS',url:'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_7d.csv'},{product:'VIIRS_NOAA20_NRT',sensor:'VIIRS',url:'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv'}];
const chunks=[],requests=[],pending=[];
for(const {product,sensor,url} of products){
 let rows,error;
 for(let attempt=0;attempt<3;attempt++)try{const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('HTTP '+response.status);rows=parseCSV(await response.text(),sensor);break;}catch(e){error=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));}
 if(!rows)throw Error('NASA global download failed for '+product+'. Existing snapshot preserved.');
 rows=rows.filter(r=>r.date>=cutoff&&r.date<=today).map(r=>Number.isFinite(r.frp)&&r.frp>=0?r:{...r,frpRaw:r.frp,frp:null});
 const invalid=rows.find(r=>Math.abs(r.lat)>90||Math.abs(r.lon)>180||!Number.isFinite(r.confidence)||r.confidence<0||r.confidence>100||(r.frp!==null&&!Number.isFinite(r.frp)));if(!rows.length||invalid)throw Error('Invalid global NASA records. Snapshot preserved.');
 requests.push({product,bounds:[-180,-90,180,90],observations:rows.length,source:url});
 const byDate=new Map();for(const r of rows){r.product=product;const {id,...record}=r;r.id=product+'-'+createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0,24);if(!byDate.has(r.date))byDate.set(r.date,[]);byDate.get(r.date).push(r);}
 for(const [date,data] of byDate){const file=`chunks/${date}_${sensor}.json`,text=JSON.stringify(data.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)),version=createHash('sha256').update(text).digest('hex').slice(0,12);pending.push({file,text});chunks.push({file,date,sensor,observations:data.length,version});}
 console.log(`${product}: ${rows.length.toLocaleString()} actual observations worldwide`);
}
const observationCount=requests.reduce((sum,r)=>sum+r.observations,0);
const manifest={format:'firms-sharded-v1',source:'firms',coverage:'global',retrievedAt,requestedDays:days,dateStart:cutoff,dateEnd:today,retrievalMethod:'NASA public global rolling CSV downloads',observationCount,requests,chunks,documentation:'https://firms.modaps.eosdis.nasa.gov/api/area/'};
await mkdir('data/chunks',{recursive:true});for(const {file,text} of pending)await writeFile('data/'+file,text);
await writeFile('data/firms.json',JSON.stringify(manifest));
const active=new Set(chunks.map(c=>c.file.split('/').at(-1)));for(const file of await readdir('data/chunks'))if(/^\d{4}-\d{2}-\d{2}_(MODIS|VIIRS)[.]json$/.test(file)&&!active.has(file))await unlink('data/chunks/'+file);
console.log(`Published global manifest: ${observationCount.toLocaleString()} observations, ${chunks.length} daily sensor files, ${cutoff}–${today} UTC.`);
