import {fitSeasonalCalibration} from './seasonal-calibration.js';

import {activity} from './history-core.js';

import {eventTrend} from './event-tracking.js';



export const warningMethod='monitoring-rules-v1';

export const warningDefaults={watch:80,elevated:95,critical:99,minYears:5,criticalYears:20,seasonDays:7,staleHours:48};

export function quantile(values,q){if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),at=(a.length-1)*q,i=Math.floor(at);return a[i]+(a[Math.ceil(at)]-a[i])*(at-i);}

const distributionCache=new WeakMap();

export function distribution(value,values,minYears=5){

 let stats=distributionCache.get(values);if(!stats){const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b),n=sorted.length,median=quantile(sorted,.5),mad=median===null?null:quantile(sorted.map(v=>Math.abs(v-median)),.5);stats={sorted,n,median,mad,mean:n?sorted.reduce((s,v)=>s+v,0)/n:null,q25:quantile(sorted,.25),q75:quantile(sorted,.75),q90:quantile(sorted,.9),q95:quantile(sorted,.95),q99:quantile(sorted,.99),minimum:sorted[0]??null,maximum:sorted.at(-1)??null};distributionCache.set(values,stats);}

 const {sorted,n,median,mad,...metrics}=stats;if(!Number.isFinite(value)||n<minYears)return {available:false,n,percentile:null,median:null,ratio:null,robustZ:null};

 function position(strict){let lo=0,hi=n;while(lo<hi){const mid=(lo+hi)>>1;if(strict?sorted[mid]<value:sorted[mid]<=value)lo=mid+1;else hi=mid;}return lo;}

 const less=position(true),equal=position(false)-less;

 return {...metrics,available:true,n,median,percentile:100*(less+.5*equal)/n,iqr:metrics.q75-metrics.q25,ratio:median>0?value/median:null,robustZ:mad>0?(value-median)/(1.4826*mad):null,similarFrequency:(n-less)/n};

}

const dayTime=date=>Date.parse(date+'T00:00:00Z');

const fittedModels=new WeakMap();

const calendarIndexes=new WeakMap();

const preparedModels=new WeakMap();

export function primeSeasonalModel(days,model){if(model?.throughYear===2020)preparedModels.set(days,model);}

function calendarDistance(a,b){const x=dayTime('2000-'+a.slice(5)),y=dayTime('2000-'+b.slice(5)),d=Math.abs(x-y)/86400000;return Math.min(d,366-d);}

export function seasonalBaseline(days,current,{asOf=current.date,seasonDays=7,minYears=5}={}){

 // All calibration inputs and reference years precede the replay/current timestamp. NRT is excluded.

 const year=+asOf.slice(0,4);let cache=fittedModels.get(days);if(!cache){cache=new Map();fittedModels.set(days,cache);}let model=cache.get(year);if(!model){model=year>2020&&preparedModels.has(days)?preparedModels.get(days):fitSeasonalCalibration(days.filter(d=>d.processing==='SP'&&+d.date.slice(0,4)<year),{throughYear:Math.min(2020,year-1)});cache.set(year,model);}

 let index=calendarIndexes.get(days);if(!index){index=new Map();for(const d of days)if(d.processing==='SP'){const md=d.date.slice(5);if(!index.has(md))index.set(md,[]);index.get(md).push(d);}calendarIndexes.set(days,index);}const train=[];for(let offset=-seasonDays;offset<=seasonDays;offset++){const time=dayTime('2000-'+current.date.slice(5))+offset*86400000,md=new Date(time).toISOString().slice(5,10);for(const d of index.get(md)||[])if(+d.date.slice(0,4)<year)train.push(d);}

 const yearGroups=new Map(),reference=current.reference||['s','j','n'].find(s=>current[s]!==null&&Number.isFinite(model.factors[s]?.factor))||null;

 for(const d of train){if(calendarDistance(d.date,current.date)>seasonDays)continue;if(reference&&d[reference]===null)continue;if(current.m!==null&&d.m===null)continue;const v=reference?activity({...d,m:current.m===null?null:d.m,s:reference==='s'?d.s:null,j:reference==='j'?d.j:null,n:reference==='n'?d.n:null},model).value:activity({...d,s:null,j:null,n:null},model).value;if(v===null)continue;const year=d.date.slice(0,4);if(!yearGroups.has(year))yearGroups.set(year,[]);yearGroups.get(year).push({date:d.date,value:v,frp:d.frpMax,footprint:d.cells});}

 // One seasonal median per year prevents pseudoreplication by treating adjacent days as independent years.

 const values=[...yearGroups.values()].map(g=>quantile(g.map(d=>d.value),.5));

 const value=activity({...current,s:reference==='s'?current.s:null,j:reference==='j'?current.j:null,n:reference==='n'?current.n:null},model).value;

 const viirsObserved=['s','j','n'].some(s=>current[s]>0),calibrated=reference!==null?Number.isFinite(model.factors[reference]?.factor):!viirsObserved,result=distribution(value,values,minYears);

 return {...result,available:result.available&&calibrated,value,model,reference,seasonDays,years:[...yearGroups.keys()],unit:reference?'MODIS-equivalent footprint-support cells/day':'MODIS footprint-support cells/day'+(viirsObserved?' · VIIRS calibration unavailable':''),source:'Work evidence-grid-v2 + Work seasonal calibration',calibrationAvailable:calibrated,references:[...yearGroups.entries()].map(([year,g])=>({year,value:quantile(g.map(d=>d.value),.5),dates:g.map(d=>d.date)})),footprint:distribution(current.cells,[...yearGroups.values()].map(g=>quantile(g.map(d=>d.footprint),.5)),minYears),frp:{available:false,reason:'No sensor/geometry-stratified FRP anomaly calibration; maximum pixel FRP remains descriptive'}};

}

export function monitoringState(context,{trend={state:'Unknown'},persistent=false,multiSensor=false,ageHours=0,previousPercentile=null,quality='Limited evidence'}={},options={}){

 const rules={...warningDefaults,...options},reasons=[],p=context?.percentile;let state='Insufficient history',approaching=false;

 if(context?.available){state='Normal';reasons.push(p.toFixed(1)+'th seasonal percentile across '+context.n+' previous years');if(p>=rules.watch)state='Watch';if(p>=rules.elevated)state='Elevated';if(p>=rules.critical&&context.n>=rules.criticalYears&&persistent&&multiSensor&&quality!=='Limited evidence'&&ageHours<=rules.staleHours)state='Critical';approaching=state!=='Critical'&&p>=rules.elevated&&trend.state==='Rapidly increasing'&&Number.isFinite(previousPercentile)&&p>previousPercentile&&ageHours<=rules.staleHours;}

 else reasons.push('Comparable seasonal history is unavailable or has fewer than '+rules.minYears+' years');

 if(persistent)reasons.push('Repeated activity across separated acquisition groups');if(trend.state!=='Unknown')reasons.push('Support footprint trend: '+trend.state.toLowerCase());if(multiSensor)reasons.push('Both MODIS and VIIRS contributed');if(ageHours>rules.staleHours)reasons.push('Latest observation is old; current status needs a new satellite observation');if(approaching)reasons.push('Rising percentile and historically rapid footprint growth: approaching critical conditions');

 return {state,approaching,reasons,stale:ageHours>rules.staleHours,method:warningMethod};

}

export function assessEvent(event,context,{now=Date.now(),growthDistribution=[],persistenceDistribution=[],previousPercentile=null}={}){

 const trend=eventTrend(event),ageHours=Math.max(0,(now-event.latestTime)/3600000),persistent=event.acquisitionGroups>=3&&event.durationHours>=3,multiSensor=event.sensors.length>=2;

 const growth=distribution(trend.growth,growthDistribution),persistence=distribution(event.durationHours,persistenceDistribution);

 if(trend.state==='Increasing'&&growth.available&&growth.percentile>=95)trend.state='Rapidly increasing';

 const quality=multiSensor&&event.nearTimeCells>0&&persistent?'High evidence':persistent||multiSensor?'Moderate evidence':'Limited evidence';

 const status=monitoringState(context,{trend,persistent,multiSensor,ageHours,previousPercentile,quality});

 return {...event,...status,previousPercentile,percentileChange:Number.isFinite(previousPercentile)&&context.available?context.percentile-previousPercentile:null,trend,context,growthContext:growth,persistenceContext:persistence,quality,ageHours,freshness:ageHours>48?'Observation gap — await new observations':ageHours>12?'Awaiting next observation':'Recent observation',emberIndex:context?.available?{value:context.percentile,name:'Ember seasonal activity percentile',components:{historicalAnomaly:context.percentile,persistence:persistence.percentile,expansion:growth.percentile,sensorEvidence:quality,freshnessHours:ageHours},interpretation:'0–100 empirical seasonal percentile, not a weighted risk score or fire probability'}:null};

}

export function priorityQueue(events){const rank={Critical:4,Elevated:3,Watch:2,'Insufficient history':1,Normal:0};return [...events].sort((a,b)=>(a.stale?1:0)-(b.stale?1:0)||(rank[b.state]??0)-(rank[a.state]??0)||(b.approaching?1:0)-(a.approaching?1:0)||(b.context?.percentile??-1)-(a.context?.percentile??-1)||b.durationHours-a.durationHours||a.ageHours-b.ageHours||a.id.localeCompare(b.id));}

export function criticalPeriods(days,{options={},asOf=null}={}){

 const rules={...warningDefaults,...options},periods=[];let current=null;

 for(const day of [...days].filter(d=>!asOf||d.date<=asOf).sort((a,b)=>a.date.localeCompare(b.date))){const c=seasonalBaseline(days,day,{...rules,asOf:day.date}),unusual=c.available&&c.percentile>=rules.elevated;if(unusual){if(!current||dayTime(day.date)-dayTime(current.end)>86400000){current={start:day.date,end:day.date,days:1,peak:c.value,percentile:c.percentile,sensors:[],provisional:day.processing==='NRT'};periods.push(current);}else{current.end=day.date;current.days++;current.peak=Math.max(current.peak,c.value);current.percentile=Math.max(current.percentile,c.percentile);}for(const slot of ['m','s','j','n'])if(day[slot]!==null&&!current.sensors.includes(slot))current.sensors.push(slot);}else current=null;}

 return periods.filter(p=>p.days>=2).map(p=>({...p,state:'Sustained unusual period',method:'At least two consecutive covered days at or above the previous-years 95th seasonal percentile'}));

}

