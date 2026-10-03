import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';
import {compileGeometry} from './boundary-geometry.js';
import {parseCSV} from './core.js';import {historyCases,historyProducts,historyQuality,historySources} from './history-catalog.js';
import {addHistoricalObservation,dailyStatistics,encodeCells} from './history-core.js';
const input=process.argv[2]||'.history-source/manifest.json',base=input.slice(0,input.lastIndexOf('/'))||'.',manifest=JSON.parse(await readFile(input,'utf8'));
if(manifest.format!=='firms-history-input-v1')throw Error('Expected a historical input manifest');
const output='data/history';await mkdir(output,{recursive:true});const result={format:'atlas-history-v1',builtAt:new Date().toISOString(),sources:historySources,quality:historyQuality,grid:'Approximate 1 km daily latitude-adjusted grid; selection by cell center',products:historyProducts,cases:[],sourceRecords:0,acceptedRecords:0,sourceFiles:[]};
async function save(file,value){const text=JSON.stringify(value),packed=gzipSync(text,{level:9});await mkdir(output+'/'+file.slice(0,file.lastIndexOf('/')),{recursive:true});await writeFile(output+'/'+file,text);await writeFile(output+'/'+file+'.gz',packed);return {file,gzip:file+'.gz',version:createHash('sha256').update(text).digest('hex').slice(0,12),bytes:packed.length};}
for(const [id,config] of Object.entries(historyCases)){
 const entries=manifest.entries.filter(e=>e.caseID===id&&['SP','NRT'].includes(e.processing));if(!entries.length)continue;
 const years=[...new Set(entries.map(e=>e.year))].sort((a,b)=>a-b),area={...config,years,summary:[],tiles:[]};
 for(const year of years){
  const sources=entries.filter(e=>e.year===year),countryFilter=config.country?compileGeometry(JSON.parse(await readFile('assets/boundaries/countries/UZB.json','utf8')).country.geometry):()=>true,cells=new Map(),seen=new Set();let original=0,accepted=0;
  for(const e of sources){
   if(!historyProducts[e.product]||!e.file||e.file.includes('..')||e.file.includes('/')||e.file.includes('\\'))throw Error('Invalid source manifest entry');
   const csv=await readFile(base+'/'+e.file,'utf8');if(createHash('sha256').update(csv).digest('hex')!==e.sha256)throw Error('Historical source checksum mismatch');
   const rows=parseCSV(csv,historyProducts[e.product].sensor);
   for(const row of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||row.date<e.start||row.date>e.end||Math.abs(row.lat)>90||Math.abs(row.lon)>180)throw Error('Invalid historical observation date or coordinate');original++;if(!countryFilter(row))continue;const fingerprint=JSON.stringify([e.product,row.lat,row.lon,row.date,row.time,row.scan,row.track,row.satellite,row.confidenceRaw,row.frp]);if(seen.has(fingerprint))continue;seen.add(fingerprint);if(addHistoricalObservation(cells,row,e.product))accepted++;}
   const {file,sha256,source,product,start,end,retrievedAt,processing}=e;result.sourceFiles.push({file,sha256,source,product,start,end,retrievedAt,processing,records:rows.length});
  }
  const all=[...cells.values()],stats=dailyStatistics(all,sources);
  area.summary.push({...await save(id+'/'+year+'/summary.json',{year,days:stats,coverage:sources.map(e=>({product:e.product,start:e.start,end:e.end,processing:e.processing})),original,accepted}),year});
  const tiles=new Map();for(const cell of all){const x=Math.floor((cell.lon+180)/5),y=Math.floor((cell.lat+90)/5),key=x+'_'+y;if(!tiles.has(key))tiles.set(key,{bounds:[x*5-180,y*5-90,(x+1)*5-180,(y+1)*5-90],cells:[]});tiles.get(key).cells.push(cell);}
  for(const [key,tile] of tiles)area.tiles.push({...await save(id+'/'+year+'/'+key+'.json',encodeCells(tile.cells)),year,bounds:tile.bounds,cells:tile.cells.length});
  result.sourceRecords+=original;result.acceptedRecords+=accepted;console.log(id+' '+year+': '+original+' source records, '+all.length+' daily cells');
 }
 result.cases.push(area);
}

const {appendLiveHistory}=await import('./append-live-history.js');await appendLiveHistory(result);console.log(JSON.stringify({cases:result.cases.length,sourceRecords:result.sourceRecords,acceptedRecords:result.acceptedRecords}));
