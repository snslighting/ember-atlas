import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';
import {compileGeometry} from './boundary-geometry.js';
import {addHistoricalObservation,dailyStatistics,encodeCells,decodeCells,rebuildCellMetadata} from './history-core.js';
import {historyProducts} from './history-catalog.js';
export function mergeCellSnapshots(existing,incoming,coverage){
 const replacement=new Map(dailyStatistics([],coverage).map(d=>[d.date,new Set(['m','s','j','n'].filter(slot=>d[slot]!==null))])),cells=new Map();
 for(const row of existing){const c=structuredClone(row),slots=replacement.get(c.date);if(slots)for(const slot of slots){c[slot]=0;if(c.contributions)delete c.contributions[slot];}if(c.m||c.s||c.j||c.n)cells.set(c.date+':'+c.cellID,rebuildCellMetadata(c));}
 for(const row of incoming){const key=row.date+':'+row.cellID;let c=cells.get(key);if(!c){cells.set(key,structuredClone(row));continue;}c.contributions??={};for(const slot of ['m','s','j','n'])if(row[slot]){c[slot]=row[slot];if(row.contributions?.[slot])c.contributions[slot]=structuredClone(row.contributions[slot]);}rebuildCellMetadata(c);}
 return [...cells.values()];
}
const root='data/history';
async function save(file,value){const text=JSON.stringify(value);await mkdir(root+'/'+file.slice(0,file.lastIndexOf('/')),{recursive:true});await writeFile(root+'/'+file,text);const gzip=gzipSync(text,{level:9});await writeFile(root+'/'+file+'.gz',gzip);return {file,gzip:file+'.gz',version:createHash('sha256').update(text).digest('hex').slice(0,12),bytes:gzip.length};}
// Derived archives are sufficient for a scheduled build: private download caches are optional.
export async function appendLiveHistory(metadata){
 const result=metadata||JSON.parse(await readFile(root+'/metadata.json','utf8'));
 const snapshot=JSON.parse(await readFile('data/firms.json','utf8'));
 const raw=(await Promise.all(snapshot.chunks.map(async e=>JSON.parse(await readFile('data/'+e.file,'utf8'))))).flat();
 const freshCoverage=snapshot.requests.map(p=>({product:p.product,start:snapshot.dateStart,end:snapshot.dateEnd,processing:'NRT'}));
 for(const area of result.cases){
  let inside=r=>r.lon>=area.bounds[0]&&r.lon<=area.bounds[2]&&r.lat>=area.bounds[1]&&r.lat<=area.bounds[3];
  if(area.country)inside=compileGeometry(JSON.parse(await readFile('assets/boundaries/countries/UZB.json','utf8')).country.geometry);
  let old=[],coverage=[],seed=[],seedCoverage=[];
  if(metadata)for(const entry of area.summary){const summary=JSON.parse(await readFile(root+'/'+entry.file,'utf8'));const nrt=summary.coverage.filter(c=>c.processing==='NRT');if(!nrt.length)continue;seedCoverage.push(...nrt);const dates=new Set(dailyStatistics([],nrt).map(d=>d.date));for(const tile of area.tiles.filter(t=>t.year===entry.year))seed.push(...decodeCells(JSON.parse(await readFile(root+'/'+tile.file,'utf8'))).filter(c=>dates.has(c.date)));}
  try{old=decodeCells(JSON.parse(await readFile(root+'/'+(area.recent?.file||area.id+'/recent/cells.json'),'utf8')));coverage=JSON.parse(await readFile(root+'/'+(area.recent?.summary.file||area.id+'/recent/summary.json'),'utf8')).coverage.map(c=>({...c,processing:'NRT'}));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(seed.length)old=mergeCellSnapshots(seed,old,coverage);
  const fresh=new Map();for(const row of raw)if(inside(row))addHistoricalObservation(fresh,row,row.product);
  const all=mergeCellSnapshots(old,[...fresh.values()],freshCoverage);
  coverage=[...seedCoverage,...coverage,...freshCoverage];
  // Compact repeated, overlapping daily product coverage into continuous ranges.
  const daily=new Map();for(const d of dailyStatistics([],coverage))for(const [slot,product] of [['m','MODIS_NRT'],['s','VIIRS_SNPP_NRT'],['j','VIIRS_NOAA20_NRT'],['n','VIIRS_NOAA21_NRT']])if(d[slot]!==null){if(!daily.has(product))daily.set(product,[]);daily.get(product).push(d.date);}
  coverage=[];for(const [product,dates] of daily){let range=null;for(const date of dates){if(range&&Date.parse(date)-Date.parse(range.end)===86400000)range.end=date;else{range={product,start:date,end:date,processing:'NRT'};coverage.push(range);}}}
  const days=dailyStatistics(all,coverage);
  area.recent={...await save(area.id+'/recent/cells.json',encodeCells(all)),summary:await save(area.id+'/recent/summary.json',{days,coverage}),dateStart:days[0]?.date||snapshot.dateStart,dateEnd:days.at(-1)?.date||snapshot.dateEnd,retrievedAt:snapshot.retrievedAt,processing:'NRT',provisional:true};
 }
 result.recentSnapshot={dateStart:snapshot.dateStart,dateEnd:snapshot.dateEnd,retrievedAt:snapshot.retrievedAt,processing:'NRT'};
 await writeFile(root+'/metadata.tmp.json',JSON.stringify(result));await rename(root+'/metadata.tmp.json',root+'/metadata.json');return result;
}
