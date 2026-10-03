import {calibrationFactor} from './seasonal-calibration.js';
import {historyProducts,historyColumns,historyQuality} from './history-catalog.js';
export function gridLocation(lat,lon){const y=Math.floor(lat*111.32),centerLat=(y+.5)/111.32,x=Math.floor(lon*111.32*Math.cos(centerLat*Math.PI/180));return {id:x+':'+y,lat:centerLat,lon:(x+.5)/(111.32*Math.cos(centerLat*Math.PI/180))};}
export function addHistoricalObservation(cells,row,product){
 const p=historyProducts[product];if(!p||!Number.isFinite(row.confidence)||row.confidence<historyQuality[p.sensor])return false;
 const grid=gridLocation(row.lat,row.lon),id=row.date+':'+grid.id;let c=cells.get(id);
 if(!c){c={cellID:grid.id,date:row.date,lat:grid.lat,lon:grid.lon,m:0,s:0,j:0,n:0,frp:null,confidence:row.confidence,timeStart:row.time,timeEnd:row.time,satellites:[],products:[],contributions:{}};cells.set(id,c);}
 c.contributions??={};const detail=c.contributions[p.slot]??={frp:null,confidence:row.confidence,timeStart:row.time,timeEnd:row.time,satellites:[],products:[]};
 if(Number.isFinite(row.frp)&&row.frp>=0)detail.frp=detail.frp===null?row.frp:Math.max(detail.frp,row.frp);
 detail.confidence=Math.max(detail.confidence,row.confidence);detail.timeStart=detail.timeStart<row.time?detail.timeStart:row.time;detail.timeEnd=detail.timeEnd>row.time?detail.timeEnd:row.time;
 if(!detail.satellites.includes(row.satellite||p.satellite))detail.satellites.push(row.satellite||p.satellite);if(!detail.products.includes(product))detail.products.push(product);
 c[p.slot]++;c.confidence=Math.max(c.confidence,row.confidence);
 if(Number.isFinite(row.frp)&&row.frp>=0)c.frp=c.frp===null?row.frp:Math.max(c.frp,row.frp);
 c.timeStart=c.timeStart<row.time?c.timeStart:row.time;c.timeEnd=c.timeEnd>row.time?c.timeEnd:row.time;
 if(!c.satellites.includes(row.satellite||p.satellite))c.satellites.push(row.satellite||p.satellite);
 if(!c.products.includes(product))c.products.push(product);return true;
}
export function rebuildCellMetadata(c){const parts=Object.entries(c.contributions||{}).filter(([slot])=>c[slot]).map(([,part])=>part);if(!parts.length)return c;c.frp=parts.reduce((max,p)=>p.frp===null?max:max===null?p.frp:Math.max(max,p.frp),null);c.confidence=Math.max(...parts.map(p=>p.confidence));c.timeStart=parts.map(p=>p.timeStart).sort()[0];c.timeEnd=parts.map(p=>p.timeEnd).sort().at(-1);c.satellites=[...new Set(parts.flatMap(p=>p.satellites))];c.products=[...new Set(parts.flatMap(p=>p.products))];return c;}
export function dates(start,end){const out=[];for(let time=Date.parse(start+'T00:00:00Z'),last=Date.parse(end+'T00:00:00Z');time<=last;time+=86400000)out.push(new Date(time).toISOString().slice(0,10));return out;}
export function dailyStatistics(cells,coverage){
 const days=new Map();for(const e of coverage){const slot=historyProducts[e.product]?.slot;if(!slot)continue;for(const date of dates(e.start,e.end)){let d=days.get(date);if(!d){d={date,m:null,s:null,j:null,n:null,mRaw:0,sRaw:0,jRaw:0,nRaw:0,cells:0,viirsCells:0,shared:0,processing:'SP'};days.set(date,d);}d[slot]??=0;if(e.processing==='NRT')d.processing='NRT';}}
 for(const c of cells){const d=days.get(c.date);if(!d)throw Error('Observation outside declared coverage');d.cells++;for(const slot of ['m','s','j','n'])if(c[slot]){if(d[slot]===null)throw Error('Missing source coverage');d[slot]++;d[slot+'Raw']+=c[slot];}if(c.s||c.j||c.n)d.viirsCells++;if(c.m&&(c.s||c.j||c.n))d.shared++;}
 return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function fitCalibration(days,{throughYear=2020,minDays=30,minYears=3}={}){
 const factors={};for(const slot of ['s','j','n']){
  const training=days.filter(d=>Number(d.date.slice(0,4))<=throughYear&&d.processing!=='NRT'&&d.m!==null&&d[slot]!==null);
  const years=new Set(training.map(d=>d.date.slice(0,4))),sumM=training.reduce((n,d)=>n+d.m,0),sumV=training.reduce((n,d)=>n+d[slot],0);
  if(training.length<minDays||years.size<minYears||sumM<=0||sumV<=0){factors[slot]={factor:null,pairedDays:training.length,trainingYears:[...years],reason:'Insufficient paired historical coverage'};continue;}
  const factor=sumM/sumV,holdout=days.filter(d=>Number(d.date.slice(0,4))>throughYear&&d.processing!=='NRT'&&d.m!==null&&d[slot]!==null);
  const rmse=holdout.length?Math.sqrt(holdout.reduce((n,d)=>n+(factor*d[slot]-d.m)**2,0)/holdout.length):null;
  const bias=holdout.length?holdout.reduce((n,d)=>n+factor*d[slot]-d.m,0)/holdout.length:null;
  factors[slot]={factor,pairedDays:training.length,trainingYears:[...years],holdoutDays:holdout.length,rmse,bias};
 }
 return {name:'Baseline harmonization model',method:'Ratio of summed paired daily occupied cells: sum(MODIS) / sum(VIIRS product). No intercept; no FRP summation.',throughYear,factors};
}
export function activity(d,model){
 const slot=['s','j','n'].find(s=>d[s]!==null&&model.factors[s]?.factor!==null&&model.factors[s]?.factor!==undefined);
 const modis=d.m,viirs=slot?d[slot]*calibrationFactor(model,slot,d.date):null;
 return {value:modis!==null&&viirs!==null?(modis+viirs)/2:modis??viirs,reference:slot||null,modis,viirs};
}
export function seasonalContext(value,values){
 const n=values.length;if(value===null||n<5)return {state:'Insufficient history',n,percentile:null,median:null,ratio:null,z:null};
 const sorted=[...values].sort((a,b)=>a-b),median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
 const percentile=100*(values.filter(v=>v<value).length+.5*values.filter(v=>v===value).length)/n,mean=values.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/(n-1));
 const state=percentile>=99&&n>=20?'Critical activity':percentile>=95?'Unusual':percentile>=80?'Elevated':'Normal';
 return {state,n,percentile,median,ratio:median>0?value/median:null,z:sd>0?(value-mean)/sd:null};
}
export function monthlyCalendar(days,model){
 const groups=new Map();for(const d of days){const score=activity(d,model);if(score.value===null)continue;const key=d.date.slice(0,7);if(!groups.has(key))groups.set(key,{month:key,index:0,modisRaw:0,viirsRaw:0,modisCells:0,viirsCells:0,allViirsCells:0,shared:0,cells:0,coveredDates:[],scores:[],provisional:false,references:[],reference:score.reference});const g=groups.get(key);
  if(score.reference&&!g.references.includes(score.reference))g.references.push(score.reference);g.reference??=score.reference;g.index+=score.value;if(d.processing==='NRT')g.provisional=true;g.modisRaw+=d.mRaw;g.viirsRaw+=d.sRaw+d.jRaw+d.nRaw;g.modisCells+=d.m||0;g.viirsCells+=score.reference?d[score.reference]:(d.s??d.j??d.n??0);g.allViirsCells+=d.viirsCells||0;g.shared+=d.shared;g.cells+=d.cells;g.coveredDates.push(d.date.slice(8));g.scores.push(score.value);
 }
 const values=[...groups.values()];for(const g of values){const peers=values.filter(p=>!p.provisional&&p.month.slice(5)===g.month.slice(5)&&p.month.slice(0,4)!==g.month.slice(0,4)&&g.coveredDates.every(date=>p.coveredDates.includes(date))).map(p=>g.coveredDates.reduce((sum,date)=>sum+p.scores[p.coveredDates.indexOf(date)],0));Object.assign(g,seasonalContext(g.index,peers));g.coveredDays=g.coveredDates.length;g.daysInMonth=new Date(Date.UTC(Number(g.month.slice(0,4)),Number(g.month.slice(5)),0)).getUTCDate();g.complete=g.coveredDays===g.daysInMonth;}
 return values;
}
export function encodeCells(cells){return {format:'atlas-history-cells-v1',columns:historyColumns,rows:cells.map(c=>historyColumns.map(k=>c[k]))};}
export function decodeCells(value){if(value.format!=='atlas-history-cells-v1'||!Array.isArray(value.rows))throw Error('Invalid historical cells');return value.rows.map(row=>Object.fromEntries(value.columns.map((k,i)=>[k,row[i]])));}
export function cellsCSV(cells){const columns=[...historyColumns,'sourceObservations'];const quote=v=>'"'+String(Array.isArray(v)?v.join('+'):v&&typeof v==='object'?JSON.stringify(v):v??'').replaceAll('"','""')+'"';return [columns.join(','),...cells.map(c=>columns.map(k=>quote(k==='sourceObservations'?c.m+c.s+c.j+c.n:c[k])).join(','))].join('\n');}
