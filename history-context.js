import {historyCases} from './history-catalog.js';
import {focusBounds} from './boundary-geometry.js';
const contained=(b,a)=>b&&b[0]>=a[0]&&b[1]>=a[1]&&b[2]<=a[2]&&b[3]<=a[3];
export function liveHistoryCase({area,boundary,country}){
 if(country?.id==='UZB'||boundary?.id==='UZB')return 'uzbekistan';
 const bounds=area||boundary&&focusBounds(boundary.geometry);
 return ['california','amazon'].find(id=>contained(bounds,historyCases[id].bounds))||null;
}
export function createLiveHistoryContext(element,askLive){
 if(!element)return {update(){}};let worker=null,rpc=0,ticket=0,pending=new Map();
 function ask(type,args){if(!worker){worker=new Worker(new URL('./history-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data.result);};worker.onerror=()=>{for(const p of pending.values())p.reject(Error('History worker unavailable'));pending.clear();};}return new Promise((resolve,reject)=>{const id=++rpc;pending.set(id,{resolve,reject});worker.postMessage({id,type,args});});}
 function links(message){element.replaceChildren();const p=document.createElement('p');p.textContent=message;element.append(p);for(const [id,c] of Object.entries(historyCases)){const a=document.createElement('a');a.textContent='Live · '+c.name;a.href=id==='uzbekistan'?'./observatory.html?country=UZB':'./observatory.html?area='+c.bounds.join(',');element.append(a);}const a=document.createElement('a');a.textContent='Explore the historical calendar ↗';a.href='./history.html';element.append(a);}
 return {async update(filters,{boundary,country,snapshot}){
  const id=++ticket,caseID=liveHistoryCase({area:filters.area,boundary,country});
  if(!caseID){links('Historical context is available for three prepared case studies. Select one to compare current activity with its archived seasonal record.');return;}
  const start=filters.day||filters.start,end=filters.day||filters.end;
  if(start<snapshot.dateStart||end>snapshot.dateEnd){links('Current data does not cover this whole date range. Choose dates within the NASA snapshot before comparing with history.');return;}
  element.textContent='Comparing current activity with real historical seasons…';
  try{
   const checked=await ask('refresh');if(!checked?.metadata)throw Error('History metadata unavailable');if(id!==ticket)return;
   const r=await ask('analyze',{caseID,fromYear:2000,toYear:2026,area:filters.area,boundary,includeRecent:false});if(id!==ticket||r.stale)return;
   const counts=await askLive('history-counts',filters);if(id!==ticket)return;
   const context=await ask('live-context',counts);if(id!==ticket)return;
   links('Provisional NRT activity · '+(context.index?.toFixed(1)??'unavailable')+' MODIS-scale index. '+context.state+(context.percentile===null||context.percentile===undefined?'':'; '+context.percentile.toFixed(0)+'th seasonal percentile across '+context.n+' fully covered comparison years; '+(context.ratio===null?'seasonal median is zero':context.ratio.toFixed(2)+'× seasonal median'))+'. Fixed historical quality rules apply here: MODIS ≥40; VIIRS nominal/high. Display confidence changes do not alter this comparison. Latest UTC day may be incomplete.');
  }catch{if(id===ticket)links('Historical comparison is unavailable for this selection. Current NASA observations remain available; no synthetic baseline is substituted.');}
 }};
}
