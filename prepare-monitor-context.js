import {readFile,writeFile} from 'node:fs/promises';import {gunzipSync,gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {supportDaily} from './monitor-preprocess.js';import {fitSeasonalCalibration} from './seasonal-calibration.js';import {seasonalBaseline} from './early-warning.js';
const root='data/monitor/',manifest=JSON.parse(await readFile(root+'manifest.json','utf8'));
async function save(file,value){const json=JSON.stringify(value),bytes=gzipSync(json,{level:9});await writeFile(root+file+'.gz',bytes);return {file,gzip:file+'.gz',version:createHash('sha256').update(bytes).digest('hex').slice(0,12),bytes:bytes.length};}
for(const area of manifest.cases){
 console.log('Preparing cached seasonal context: '+area.id);const summary=JSON.parse(gunzipSync(await readFile(root+area.summary.gzip)));summary.calendars={};
 for(const seasonDays of [0,7,14])summary.calendars[seasonDays]=summary.days.map(d=>{const c=seasonalBaseline(summary.days,d,{seasonDays});return {...d,value:c.value,percentile:c.available?c.percentile:null,reference:c.reference};});
 area.summary=await save(area.summary.file,summary);const tiles=new Map();for(const p of area.partitions){const key=p.bounds.join(',');if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(p);}
 area.zoneArchives=[];
 for(const [key,parts] of tiles){const zoneMap=new Map();for(const p of parts){const source=JSON.parse(gunzipSync(await readFile(root+p.zones.gzip)));for(const r of source.rows){if(!zoneMap.has(r[0]))zoneMap.set(r[0],new Map());zoneMap.get(r[0]).set(r[1],r.slice(1));}}
  const empty=supportDaily([],summary.coverage),zones={};for(const [id,sparse] of zoneMap){const rows=[...sparse.values()],days=empty.map(d=>{const r=sparse.get(d.date);return r?{...d,m:r[1],s:r[2],j:r[3],n:r[4],cells:r[5],frpMax:r[6],shared:r[7]}:d;}),model=fitSeasonalCalibration(days.filter(d=>d.processing==='SP'&&d.date<'2021-01-01'),{throughYear:2020});zones[id]={rows,model};}
  const bounds=key.split(',').map(Number),file=area.id+'/zones-'+bounds[0]+'-'+bounds[1]+'.json';area.zoneArchives.push({bounds,entry:await save(file,{coverage:summary.coverage,zones})});
 }
 console.log(area.id+': '+area.zoneArchives.length+' compressed context tiles');
}
await writeFile(root+'manifest.json',JSON.stringify(manifest));
