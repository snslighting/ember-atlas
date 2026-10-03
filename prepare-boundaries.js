import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {geometryPolygons,focusBounds} from './boundary-geometry.js';
const revision='ca96624a56bd078437bca8184e78163e5039ad19';
await mkdir('.boundary-source',{recursive:true});
const load=async name=>{const file='.boundary-source/'+name+'.json';let text;try{text=await readFile(file,'utf8');}catch{const response=await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/'+revision+'/geojson/'+name+'.geojson');if(!response.ok)throw Error('Natural Earth download failed: '+name);text=await response.text();await writeFile(file,text);}return JSON.parse(text);};
const countries=await load('ne_10m_admin_0_countries'),overview=await load('ne_50m_admin_0_countries'),regions=await load('ne_10m_admin_1_states_provinces'),places=await load('ne_10m_populated_places');

// Baikonur is a lease within Kazakhstan, not a separate country. Natural Earth
// encodes the leased polygon as KAB; restore only its matching hole, preserving
// every unrelated hole/island and retaining the lease as a selectable subdivision.
const ringKey=ring=>JSON.stringify([...new Set(ring.map(p=>p.map(n=>n.toFixed(5)).join(',')))].sort());
const lease=countries.features.find(f=>f.properties.ADM0_A3==='KAB');
if(!lease||lease.properties.SOVEREIGNT!=='Kazakhstan'||lease.properties.TYPE!=='Lease')throw Error('Unexpected Baikonur source classification');
const leaseRings=new Set(geometryPolygons(lease.geometry).map(p=>ringKey(p[0])));
for(const collection of [countries,overview]){
 const kaz=collection.features.find(f=>f.properties.ADM0_A3==='KAZ');
 const polys=geometryPolygons(kaz.geometry).map(p=>[p[0],...p.slice(1).filter(r=>!leaseRings.has(ringKey(r)))]);
 kaz.geometry={type:kaz.geometry.type,coordinates:kaz.geometry.type==='Polygon'?polys[0]:polys};
 collection.features=collection.features.filter(f=>f.properties.ADM0_A3!=='KAB');
}
for(const f of regions.features)if(f.properties.adm0_a3==='KAB'){f.properties.adm0_a3='KAZ';f.properties.name_en='Baikonur';f.properties.type_en='Leased area';f.properties.note='Part of Kazakhstan; leased to Russia. Included in Kazakhstan detection totals.';}
for(const f of places.features)if(f.properties.ADM0_A3==='KAB')f.properties.ADM0_A3='KAZ';

const folder='assets/boundaries';await mkdir(folder+'/countries',{recursive:true});
function simplify(ring,tolerance){
 // Closed-ring Douglas-Peucker; retain tiny islands and every polygon/hole.
 const points=ring.map(p=>p.map(n=>Math.round(n*1e5)/1e5)),sq=tolerance*tolerance,kept=new Set([0,points.length-1]),stack=[[0,points.length-1]];
 while(stack.length){const [first,last]=stack.pop(),a=points[first],b=points[last],dx=b[0]-a[0],dy=b[1]-a[1];let max=sq,index=-1;
 for(let i=first+1;i<last;i++){const p=points[i],t=dx||dy?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>max){max=d;index=i;}}
 if(index>=0){kept.add(index);stack.push([first,index],[index,last]);}}
 const result=[...kept].sort((a,b)=>a-b).map(i=>points[i]);return result.length>=4?result:points;
}
function geometry(g,tolerance){const coords=geometryPolygons(g).map(p=>p.map(r=>simplify(r,tolerance)));return {type:g.type,coordinates:g.type==='Polygon'?coords[0]:coords};}
function labelPoint(g,x,y){if(Number.isFinite(x)&&Number.isFinite(y))return [x,y];const b=focusBounds(g);return [(b[0]+b[2])/2,(b[1]+b[3])/2];}
function country(f,tolerance){const p=f.properties,g=geometry(f.geometry,tolerance);return {type:'Feature',id:p.ADM0_A3,properties:{id:p.ADM0_A3,country:p.ADM0_A3,name:p.NAME_EN||p.ADMIN,kind:'Country / territory',label:labelPoint(g,p.LABEL_X,p.LABEL_Y)},geometry:g};}
const detailed=new Map(countries.features.map(f=>[f.properties.ADM0_A3,country(f,.001)])),small=new Map(overview.features.map(f=>[f.properties.ADM0_A3,country(f,.012)]));
for(const [id,f] of detailed)if(!small.has(id))small.set(id,f);
const groups=new Map();let missing=0;
for(const f of regions.features){const p=f.properties,id=p.adm0_a3;if(!detailed.has(id))continue;
 const name=p.name_en||p.name||p.woe_name||p.gn_name||('Region '+p.adm1_code);if(!p.name_en)missing++;
 const g=geometry(f.geometry,.001),region={type:'Feature',id:p.adm1_code,properties:{id:p.adm1_code,country:id,name,kind:p.type_en||'Region',...(p.adm1_code==='KAB+00?'?{note:p.note}:{}),label:labelPoint(g,p.longitude,p.latitude)},geometry:g};
 if(!groups.has(id))groups.set(id,[]);groups.get(id).push(region);
}
let bytes=0;for(const [id,c] of detailed){const data=JSON.stringify({country:c,regions:{type:'FeatureCollection',features:groups.get(id)||[]}});bytes+=data.length;await writeFile(folder+'/countries/'+id+'.json',data);}
await writeFile(folder+'/world.json',JSON.stringify({type:'FeatureCollection',features:[...small.values()]}));
await writeFile(folder+'/places.json',JSON.stringify(places.features.map(f=>{const p=f.properties;return {name:p.NAME_EN||p.NAMEASCII,country:p.ADM0_A3,point:f.geometry.coordinates,minZoom:Math.max(3,p.MIN_ZOOM||3),capital:!!p.ADM0CAP};}).filter(p=>p.name)));
await writeFile(folder+'/source.json',JSON.stringify({source:'Natural Earth',revision,license:'Public domain',countryCount:detailed.size,regionCount:[...groups.values()].reduce((n,a)=>n+a.length,0),leaseGrouping:'Baikonur (KAB) grouped under Kazakhstan (KAZ)',detailToleranceDegrees:.001,overviewToleranceDegrees:.012,documentation:'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/'}));
await writeFile(folder+'/README.md','Boundary and English label data: Natural Earth, public domain. Source revision '+revision+'. Prepared from 50m countries and 10m countries, states/provinces and populated places. Border summaries use generalized polygons (0.001 degree simplification), not cadastral boundaries. First-level administrative coverage varies, and some tiny territories have no subdivisions. Natural Earth uses de facto boundaries. This explorer groups the Baikonur lease under Kazakhstan, restores its country polygon, and retains the lease as a selectable special area. Kazakhstan summaries include detections there. Regenerate with prepare-boundaries.js from the pinned source files.\n');
console.log(JSON.stringify({countries:detailed.size,regions:[...groups.values()].reduce((n,a)=>n+a.length,0),detailBytes:bytes,fallbackNames:missing}));
