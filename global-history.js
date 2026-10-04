// NASA GIBS geographic MVT tiles retain the original reported pixel coordinates.
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
export function availableOn(source,date){return source.ranges.some(range=>{const [start,end=start]=range.split('/');return date>=start&&date<=end;});}
export function historyTiles(bounds,zoom){
 const z=Math.max(0,Math.min(7,Math.floor(zoom)-1)),span=288/2**z;
 const west=Math.max(-180,bounds[0]),east=Math.min(180,bounds[2]),south=Math.max(-90,bounds[1]),north=Math.min(90,bounds[3]);
 const out=[];for(let y=Math.max(0,Math.floor((90-north)/span));y<=Math.floor((90-south-1e-9)/span);y++)for(let x=Math.max(0,Math.floor((west+180)/span));x<=Math.floor((east+180-1e-9)/span);x++)out.push({z,x,y});return out;
}
export function decodeHistory(bytes,source,date){
 const tile=new VectorTile(new PbfReader(bytes)),rows=[];
 for(const [layer,values] of Object.entries(tile.layers))for(let i=0;i<values.length;i++){const p=values.feature(i).properties;
  if(p.ACQ_DATE!==date||!Number.isFinite(p.LATITUDE)||!Number.isFinite(p.LONGITUDE))continue;
  rows.push({id:[source.id,layer,p.UID,p.LATITUDE,p.LONGITUDE,p.ACQ_DATE,p.ACQ_TIME].join(':'),lat:p.LATITUDE,lon:p.LONGITUDE,sensor:source.id.startsWith('MODIS')?'MODIS':'VIIRS',satellite:p.SATELLITE,date:p.ACQ_DATE,time:p.ACQ_TIME,frp:p.FRP,confidence:p.CONFIDENCE,scan:p.SCAN,track:p.TRACK,version:p.VERSION,source:source.id});
 }return rows;
}
const cache=new Map();let catalog,freshCatalog;
export function parseNASACatalog(xml,ids){return [...xml.matchAll(/<Layer>([\s\S]*?)<\/Layer>/g)].flatMap(match=>{const s=match[1],id=s.match(/<ows:Identifier>(.*?)<\/ows:Identifier>/)?.[1];if(!ids.includes(id))return [];const time=s.match(/<Dimension>([\s\S]*?)<\/Dimension>/)?.[1]||'';return [{id,ranges:[...time.matchAll(/<Value>(.*?)<\/Value>/g)].map(m=>m[1])}];});}

async function tileRows(source,date,tile){const key=[source.id,date,tile.z,tile.x,tile.y].join('/');if(cache.has(key)){const rows=cache.get(key);cache.delete(key);cache.set(key,rows);return rows;}
 const matrix=source.id.startsWith('MODIS')?'1km':'500m';const response=await fetch(`https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${source.id}/default/${date}/${matrix}/${tile.z}/${tile.y}/${tile.x}.mvt`,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('NASA archive tile unavailable ('+response.status+')');const rows=decodeHistory(new Uint8Array(await response.arrayBuffer()),source,date);cache.set(key,rows);while(cache.size>32)cache.delete(cache.keys().next().value);return rows;
}
export async function loadGlobalHistory({date,bounds,zoom,polygon}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))throw Error('Choose a valid UTC date');
 catalog??=fetch('./assets/maps/nasa-history-catalog.json').then(r=>{if(!r.ok)throw Error('Archive coverage unavailable');return r.json();});
 let coverage=await catalog;const last=coverage.flatMap(s=>s.ranges.map(r=>r.split('/')[1]||r)).sort().at(-1);if(date>last){freshCatalog??=fetch('https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml',{signal:AbortSignal.timeout(20000)}).then(async r=>{if(!r.ok)throw Error('Latest archive coverage unavailable');return parseNASACatalog(await r.text(),coverage.map(s=>s.id));});coverage=await freshCatalog;}const sources=coverage.filter(s=>availableOn(s,date));if(!sources.length)return {rows:[],sources:[],failed:0,unavailable:true};
 const tiles=historyTiles(bounds,zoom),jobs=sources.flatMap(source=>tiles.map(tile=>({source,tile}))),records=new Map();let failed=0,next=0;
 // Bounded parallel retrieval and a small LRU; never download a global archive on every pan.
 await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{while(next<jobs.length){const job=jobs[next++];try{for(const row of await tileRows(job.source,date,job.tile))if(row.lon>=bounds[0]&&row.lon<=bounds[2]&&row.lat>=bounds[1]&&row.lat<=bounds[3])records.set(row.id,row);}catch{failed++;}}}));
 let rows=[...records.values()];if(polygon){const {compileGeometry}=await import('./boundary-geometry.js');rows=rows.filter(compileGeometry(polygon));}
 return {rows,sources:sources.map(s=>s.id),failed,unavailable:false};
}
