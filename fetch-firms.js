import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {regions,parseCSV} from './core.js';
let key=process.env.FIRMS_MAP_KEY;
if(!key){try{key=(await readFile('.env','utf8')).match(/^FIRMS_MAP_KEY=(.+)$/m)?.[1].trim();}catch{}}
const usePublic=process.env.FIRMS_PUBLIC_DOWNLOADS==='1'||!key;
const retrievedAt=new Date().toISOString(),days=5,data=[],requests=[];
const today=retrievedAt.slice(0,10),cutoff=new Date(Date.parse(today+'T00:00:00Z')-(days-1)*86400000).toISOString().slice(0,10);
const products=[{product:'MODIS_NRT',sensor:'MODIS',url:'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_7d.csv'},{product:'VIIRS_NOAA20_NRT',sensor:'VIIRS',url:'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv'}];
async function retrieve(url,label){let csv;try{const response=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error();csv=await response.text();}catch{throw Error('NASA download failed for '+label+'. The last published observations remain available.');}return csv;}
for(const {product,sensor,url} of products){
 let globalRows;
 if(usePublic){try{globalRows=parseCSV(await retrieve(url,product),sensor);}catch{throw Error('Invalid NASA public CSV for '+product+'. No snapshot was replaced.');}}
 for(const [region,{bounds}] of Object.entries(regions)){
  let rows=globalRows;
  if(!usePublic){try{rows=parseCSV(await retrieve(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${product}/${bounds.join(',')}/${days}`,region+' / '+product),sensor);}catch{throw Error('Invalid NASA area response for '+region+' / '+product+'. No snapshot was replaced.');}}
  const valid=rows.filter(r=>r.date>=cutoff&&r.date<=today&&r.lat>=bounds[1]&&r.lat<=bounds[3]&&r.lon>=bounds[0]&&r.lon<=bounds[2]);
  data.push(...valid.map(r=>({...r,id:`${region}-${product}-${r.id}`,region,product})));
  requests.push({region,product,bounds,observations:valid.length,source:usePublic?url:'NASA FIRMS area API'});
  console.log(`${region} / ${product}: ${valid.length} NASA observations`);
 }
}
const snapshot={source:'firms',retrievedAt,requestedDays:days,dateStart:cutoff,dateEnd:today,retrievalMethod:usePublic?'NASA public rolling CSV downloads':'NASA FIRMS area API',requests,data,documentation:'https://firms.modaps.eosdis.nasa.gov/api/area/'};
if(data.some(r=>!Number.isFinite(r.confidence)||r.confidence<0||r.confidence>100||!Number.isFinite(r.frp)||r.frp<0))throw Error('NASA record validation failed. No snapshot was replaced.');
await mkdir('data',{recursive:true});await writeFile('data/firms.json',JSON.stringify(snapshot));
console.log(`Saved ${data.length} actual NASA observations (${cutoff} to ${today}), retrieved ${retrievedAt}.`);
