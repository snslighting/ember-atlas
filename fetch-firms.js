import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {regions,parseCSV} from './core.js';
let key=process.env.FIRMS_MAP_KEY;
if(!key){try{key=(await readFile('.env','utf8')).match(/^FIRMS_MAP_KEY=(.+)$/m)?.[1].trim();}catch{}}
if(!key)throw Error('Set FIRMS_MAP_KEY in the environment or ignored .env file.');
const retrievedAt=new Date().toISOString(),days=5,data=[],requests=[];
for(const [region,{bounds}] of Object.entries(regions)){
  for(const product of ['MODIS_NRT','VIIRS_NOAA20_NRT']){
    let csv;
    try{const response=await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${product}/${bounds.join(',')}/${days}`,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error();csv=await response.text();}catch{throw Error(`NASA request failed for ${region} / ${product}. No snapshot was replaced.`);}
    let rows;try{rows=parseCSV(csv,product.startsWith('MODIS')?'MODIS':'VIIRS');}catch{throw Error(`NASA returned an invalid CSV for ${region} / ${product}. Check your key and data availability. No snapshot was replaced.`);}
    const valid=rows.filter(r=>r.lat>=bounds[1]&&r.lat<=bounds[3]&&r.lon>=bounds[0]&&r.lon<=bounds[2]);
    data.push(...valid.map(r=>({...r,id:`${region}-${product}-${r.id}`,region,product})));
    requests.push({region,product,bounds,observations:valid.length});
    console.log(`${region} / ${product}: ${valid.length} NASA observations`);
  }
}
const dates=data.map(r=>r.date).sort();
const snapshot={source:'firms',retrievedAt,requestedDays:days,dateStart:dates[0]||null,dateEnd:dates.at(-1)||null,requests,data,documentation:'https://firms.modaps.eosdis.nasa.gov/api/area/'};
await mkdir('data',{recursive:true});
await writeFile('data/firms.json',JSON.stringify(snapshot));
console.log(`Saved ${data.length} actual NASA observations (${snapshot.dateStart} to ${snapshot.dateEnd}), retrieved ${retrievedAt}.`);
