import {evidenceGrid,gridCell,uniqueObservations,timestamp,confidenceClass} from './harmonization.js';

export const eventMethod='activity-events-v1';
export const eventDefaults={groupMinutes:15,gapHours:24};
export function qualityRows(rows){return uniqueObservations(rows).filter(r=>Number.isFinite(timestamp(r))&&(r.sensor==='MODIS'?r.confidence>=40:['nominal','high'].includes(confidenceClass(r))));}
export function supportBounds(c){const [x,y]=c.cellID.split(':').map(Number),k=111.32,scale=k*Math.cos(c.lat*Math.PI/180);return [x/scale,y/k,(x+1)/scale,(y+1)/k];}
export function sourceID(r){return (r.product||r.sensor)+':'+r.id;}
function hash(text){let a=2166136261,b=5381;for(const c of text){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}return (a>>>0).toString(36)+(b>>>0).toString(36);}
function neighbors(c){const out=[];for(let dy=-1;dy<=1;dy++){const g=gridCell(c.lat+dy/111.32,c.lon);for(let dx=-1;dx<=1;dx++)out.push((g.x+dx)+':'+g.y);}return out;}
export function connectedSupport(cells){
 const map=new Map(cells.map(c=>[c.cellID,c])),seen=new Set(),out=[];
 for(const cell of cells){if(seen.has(cell.cellID))continue;const component=[],queue=[cell];seen.add(cell.cellID);for(let n=0;n<queue.length;n++){const c=queue[n];component.push(c);for(const id of neighbors(c)){const other=map.get(id);if(other&&!seen.has(id)){seen.add(id);queue.push(other);}}}out.push(component);}
 return out;
}
export function trackEvents(input,previous=[],options={}){
 const config={...eventDefaults,...options},rows=qualityRows(input),byID=new Map(rows.map(r=>[sourceID(r),r])),groups=new Map();
 for(const row of rows){const t=Math.floor(timestamp(row)/(config.groupMinutes*60000))*config.groupMinutes*60000;if(!groups.has(t))groups.set(t,[]);groups.get(t).push(row);}
 const ordered=[...groups].sort(([a],[b])=>a-b),events=[],oldSources=new Map(),oldByID=new Map(previous.map(e=>[e.id,e])),claimed=new Set();
 for(const e of previous)for(const id of e.sourceIDs||[])oldSources.set(id,e.id);
 let spatial=new Map();
 for(const [time,observations] of ordered){
  // Work's algorithm is used unchanged. Components follow observed support cells, never interpolated perimeters.
  const components=connectedSupport(evidenceGrid(observations)).sort((a,b)=>b.length-a.length),batch=new Set();
  for(const cells of components){
   const ids=[...new Set(cells.flatMap(c=>c.sourceObservationIDs))].sort(),sources=ids.map(id=>byID.get(id)).filter(Boolean),candidates=new Set();
   for(const c of cells)for(const key of neighbors(c))for(const e of spatial.get(key)||[])if(!e.mergedInto&&time-e.lastGroup<=config.gapHours*3600000)candidates.add(e);
   const matches=[...candidates].sort((a,b)=>a.firstTime-b.firstTime||a.id.localeCompare(b.id)),parent=matches[0];
   let event=matches.find(e=>!batch.has(e.id));
   if(!event){const prior=ids.map(id=>oldSources.get(id)).find(id=>id&&!claimed.has(id)),first=Math.min(...sources.map(timestamp));const id=prior||'EA-'+new Date(first).getUTCFullYear()+'-'+hash(ids[0]);const old=oldByID.get(id);event={id,firstTime:Math.min(first,old?.firstTime??first),latestTime:first,lastGroup:time,frames:[],sourceIDs:[],aliases:[],parentID:parent?.id||null,uncertainty:[],method:eventMethod};events.push(event);claimed.add(id);}
   const remembered=ids.map(id=>oldSources.get(id)).find(id=>id&&!claimed.has(id));if(remembered&&!oldByID.has(event.id)){const provisional=event.id;event.aliases.push(provisional,...(oldByID.get(remembered).aliases||[]));event.id=remembered;event.firstTime=Math.min(event.firstTime,oldByID.get(remembered).firstTime);claimed.add(remembered);for(const child of events)if(child.parentID===provisional)child.parentID=remembered;}
   if(parent&&event!==parent)event.parentID=parent.id;
   for(const other of matches)if(other!==event&&!batch.has(other.id)){other.mergedInto=event.id;event.aliases.push(other.id,...other.aliases);event.sourceIDs.push(...other.sourceIDs);event.frames.push(...other.frames);event.firstTime=Math.min(event.firstTime,other.firstTime);}
   batch.add(event.id);const first=Math.min(...sources.map(timestamp)),last=Math.max(...sources.map(timestamp));event.latestTime=Math.max(event.latestTime,last);event.lastGroup=time;event.sourceIDs.push(...ids);
   const positive=sources.map(r=>r.frp).filter(v=>Number.isFinite(v)&&v>0),sensorValues={};for(const sensor of ['MODIS','VIIRS']){const values=sources.filter(r=>r.sensor===sensor).map(r=>r.frp).filter(v=>Number.isFinite(v)&&v>0);sensorValues[sensor]=values.length?Math.max(...values):null;}
   const frpBySource={};for(const r of sources)if(r.frp>0){const key=r.product+':'+r.satellite;frpBySource[key]=Math.max(frpBySource[key]||0,r.frp);}
   const frame={frpBySource,time:first,end:last,group:time,cells,raw:ids.length,sensors:[...new Set(sources.map(r=>r.sensor))],satellites:[...new Set(sources.map(r=>r.satellite))],products:[...new Set(sources.map(r=>r.product))],frpMax:positive.length?Math.max(...positive):null,frpBySensor:sensorValues,nearTimeCells:cells.filter(c=>c.crossSensorCoincident).length};event.frames.push(frame);
   for(const c of cells){const list=spatial.get(c.cellID)||[];list.push(event);spatial.set(c.cellID,list);}
  }
  // Prune expired spatial references; gaps preserve registry entries, not active linking forever.
  if(spatial.size>50000){const next=new Map();for(const [key,list] of spatial){const active=[...new Set(list)].filter(e=>!e.mergedInto&&time-e.lastGroup<=config.gapHours*3600000);if(active.length)next.set(key,active);}spatial=next;}
 }
 const result=events.filter(e=>!e.mergedInto);
 for(const e of result){
  e.sourceIDs=[...new Set(e.sourceIDs)];e.aliases=[...new Set(e.aliases)];e.frames.sort((a,b)=>a.time-b.time);e.sensors=[...new Set(e.frames.flatMap(f=>f.sensors))];e.satellites=[...new Set(e.frames.flatMap(f=>f.satellites))];e.products=[...new Set(e.frames.flatMap(f=>f.products))];e.rawDetections=e.sourceIDs.length;e.acquisitionGroups=e.frames.length;e.durationHours=(e.latestTime-e.firstTime)/3600000;
  const union=new Map(e.frames.flatMap(f=>f.cells.map(c=>[c.cellID,c])));e.harmonizedCells=union.size;e.footprintKm2Approx=union.size;e.cellIDs=[...union.keys()];e.bounds=[180,90,-180,-90];for(const cell of union.values()){const b=supportBounds(cell);e.bounds=[Math.min(e.bounds[0],b[0]),Math.min(e.bounds[1],b[1]),Math.max(e.bounds[2],b[2]),Math.max(e.bounds[3],b[3])];}e.center=[(e.bounds[1]+e.bounds[3])/2,(e.bounds[0]+e.bounds[2])/2];
  e.frpMax=Math.max(...e.frames.map(f=>f.frpMax??0))||null;e.nearTimeCells=e.frames.reduce((n,f)=>n+f.nearTimeCells,0);e.uncertainty=['Approximate support geometry; activity group is not a confirmed wildfire','Acquisition groups are 15-minute time bins, not verified independent satellite passes','No cloud, clear-sky non-fire or exact swath coverage mask','Adjacent activities can merge; disconnected branches can split; lineage is retained','Footprint is approximate support-cell area, not burned area'];
 }
 // Retain unobserved entries across refreshes. Their observation age determines gap/stale state, never extinguishment.
 const latest=ordered.at(-1)?.[0]??config.now??Date.now();for(const old of previous)if(!claimed.has(old.id)&&!result.some(e=>e.aliases.includes(old.id))&&old.latestTime<=latest&&latest-old.latestTime<=7*86400000)result.push({...old,retained:true,frames:old.frames||[],uncertainty:[...(old.uncertainty||[]),'Retained last-known activity; contributing raw observations may be outside this snapshot']});
 return result;
}
export function eventTrend(event){
 const frames=event.frames;if(frames.length<3)return {state:'Unknown',reason:'At least three acquisition groups are required',growth:null,newCellRate:null,movementKm:null,frpTrend:'Unknown'};
 const f=frames.slice(-3),counts=f.map(g=>g.cells.length),changes=[counts[1]-counts[0],counts[2]-counts[1]],hours=(f[2].time-f[0].time)/3600000;
 if(hours<=0)return {state:'Unknown',reason:'Acquisition times cannot resolve a trend',growth:null};
 const growth=(counts[2]-counts[0])/Math.max(1,counts[0]),old=new Set(f[0].cells.map(c=>c.cellID)),newCells=f[2].cells.filter(c=>!old.has(c.cellID)).length;
 let state=changes.every(v=>v>0)?'Increasing':changes.every(v=>v<0)?'Decreasing':changes.every(v=>v===0)?'Stable':'Mixed';
 const centroid=cells=>({lat:cells.reduce((n,c)=>n+c.lat,0)/cells.length,lon:cells.reduce((n,c)=>n+c.lon,0)/cells.length});const a=centroid(f[0].cells),b=centroid(f[2].cells),movementKm=Math.hypot((a.lat-b.lat)*111.32,(((a.lon-b.lon+540)%360)-180)*111.32*Math.cos((a.lat+b.lat)*Math.PI/360));
 // FRP comparisons require a sensor common to all groups; report maximum pixel measurements only.
 const sharedSource=Object.keys(f[0].frpBySource||{}).find(s=>f.every(g=>Number.isFinite(g.frpBySource?.[s])));let frpTrend='Unknown';if(sharedSource){const values=f.map(g=>g.frpBySource[sharedSource]);frpTrend=values[2]>values[0]?'Rising maximum pixel FRP':values[2]<values[0]?'Falling maximum pixel FRP':'Stable maximum pixel FRP';}
 return {state,growth,deltaCells:counts[2]-counts[0],newCells,newCellRate:newCells/hours,movementKm,frpTrend,frpSensor:sharedSource||null,observationIntervalsHours:f.slice(1).map((g,i)=>(g.time-f[i].time)/3600000),reason:'Observed acquisition-group support changes; differing view geometry and sampling can affect the trend'};
}
