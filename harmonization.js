// FIRMS detection evidence, not fire perimeter or burned area. See HARMONIZATION.md.
export const algorithmVersion='evidence-grid-v2';
const K=111.32, rad=Math.PI/180;
export function confidenceClass(r){
 const raw=String(r.confidenceRaw??'').trim().toLowerCase();
 if(r.sensor==='VIIRS')return ({l:'low',low:'low',n:'nominal',nominal:'nominal',h:'high',high:'high'})[raw]??(r.confidence===30?'low':r.confidence===70?'nominal':r.confidence===95?'high':'unknown');
 return Number.isFinite(r.confidence)?r.confidence<30?'low':r.confidence<80?'nominal':'high':'unknown';
}
export function footprint(r){
 const fallback=r.sensor==='MODIS'?1:.375;
 return {width:Number.isFinite(r.scan)&&r.scan>0?r.scan:fallback,height:Number.isFinite(r.track)&&r.track>0?r.track:fallback,approximate:true,assumption:'North-aligned rectangle; FIRMS CSV lacks footprint corners and scan azimuth'};
}
export function observationKey(r){return JSON.stringify([r.product,r.sensor,r.satellite,r.version,r.date,r.time,r.lat,r.lon,r.scan,r.track,r.confidenceRaw??r.confidence,r.frp,r.daynight]);}
export function uniqueObservations(rows){const seen=new Set();return rows.filter(r=>{const k=observationKey(r);if(seen.has(k))return false;seen.add(k);return true;});}
export function gridCell(lat,lon){const y=Math.floor(lat*K),clat=(y+.5)/K,scale=K*Math.max(Math.cos(clat*rad),1e-6),x=Math.floor(lon*scale);return {x,y,id:x+':'+y,lat:clat,lon:(x+.5)/scale};}
export function footprintWeights(r){
 const f=footprint(r),latMin=Math.max(-90,r.lat-f.height/(2*K)),latMax=Math.min(90-1e-9,r.lat+f.height/(2*K)),out=[];
 // Polar CSV lacks geometry suitable for this approximation: explicit center fallback.
 if(Math.abs(r.lat)>85)return [{...gridCell(r.lat,r.lon),weight:1,fallback:'polar-center'}];
 const dl=f.width/(2*K*Math.cos(r.lat*rad));
 for(let y=Math.floor(latMin*K);y<=Math.floor(latMax*K);y++){
  const lat=(y+.5)/K,scale=K*Math.cos(lat*rad),dy=Math.max(0,Math.min(latMax,(y+1)/K)-Math.max(latMin,y/K))*K;
  const left=(r.lon-dl)*scale,right=(r.lon+dl)*scale;
  for(let x=Math.floor(left);x<=Math.floor(right);x++){
   const dx=Math.max(0,Math.min(right,x+1)-Math.max(left,x));if(!dx||!dy)continue;
   let lon=(x+.5)/scale;lon=((lon+180)%360+360)%360-180;
   const canonicalX=Math.floor(lon*scale);out.push({x:canonicalX,y,id:canonicalX+':'+y,lat,lon,weight:dx*dy});
  }
 }
 const sum=out.reduce((s,c)=>s+c.weight,0);return out.map(c=>({...c,weight:c.weight/sum}));
}
export function timestamp(r){return /^\d{2}:\d{2}$/.test(r.time||'')?Date.parse(r.date+'T'+r.time+':00Z'):NaN;}
export function compatible(a,b,{minutes=15,marginKm=.25}={}){
 const ta=timestamp(a),tb=timestamp(b);if(!Number.isFinite(ta)||!Number.isFinite(tb)||Math.abs(ta-tb)>minutes*60000)return false;
 if(a.daynight&&b.daynight&&a.daynight!=='Unknown'&&b.daynight!=='Unknown'&&a.daynight!==b.daynight)return false;
 const fa=footprint(a),fb=footprint(b),dx=Math.abs(((a.lon-b.lon+540)%360)-180)*K*Math.cos((a.lat+b.lat)*rad/2),dy=Math.abs(a.lat-b.lat)*K;
 return dx<=(fa.width+fb.width)/2+marginKm&&dy<=(fa.height+fb.height)/2+marginKm;
}
// Many VIIRS pixels may support one MODIS detection. No one-to-one constraint.
export function matchSensors(rows,options={}){
 const unique=uniqueObservations(rows),modis=unique.filter(r=>r.sensor==='MODIS'),viirs=unique.filter(r=>r.sensor==='VIIRS'),bins=new Map(),edges=[];
 const bucket=r=>[Math.floor(timestamp(r)/3600000),Math.floor(r.lat),Math.floor(r.lon)];
 for(let j=0;j<viirs.length;j++){const [t,y,x]=bucket(viirs[j]);if(!Number.isFinite(t))continue;const k=t+':'+y+':'+x;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(j);}
 const matchedM=new Set(),matchedV=new Set();
 for(let i=0;i<modis.length;i++){const a=modis[i],[t,y,x]=bucket(a);if(!Number.isFinite(t))continue;
  for(let dt=-1;dt<=1;dt++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const bx=((x+dx+180)%360+360)%360-180;
   for(const j of bins.get((t+dt)+':'+(y+dy)+':'+bx)||[])if(compatible(a,viirs[j],options)){edges.push({modis:i,viirs:j,minutes:Math.abs(timestamp(a)-timestamp(viirs[j]))/60000});matchedM.add(i);matchedV.add(j);}
  }
 }
 return {modis,viirs,edges,matchedModis:matchedM.size,matchedViirs:matchedV.size,unmatchedModis:modis.length-matchedM.size,unmatchedViirs:viirs.length-matchedV.size,interpretation:'Association consistency, not omission/commission error; clear-sky non-fire exposure unavailable'};
}
export function evidenceGrid(rows){
 const groups=new Map();
 for(const r of uniqueObservations(rows)){
  if(!Number.isFinite(r.lat)||!Number.isFinite(r.lon)||Math.abs(r.lat)>90||Math.abs(r.lon)>180)continue;
  const identity=r.id===undefined?observationKey(r):(r.product||r.sensor)+':'+r.id,category=confidenceClass(r);
  for(const g of footprintWeights(r)){
   const key=r.date+':'+g.id;let c=groups.get(key);
   if(!c){c={id:key,cellID:g.id,date:r.date,time:r.time,lat:g.lat,lon:g.lon,sensor:'Harmonized',derived:true,crossSensorCoincident:false,_rows:[],algorithmVersion,product:'derived-detection-evidence',sensors:[],satellites:[],products:[],observations:0,sourceObservationIDs:[],confidence:0,confidenceClasses:{},frp:null,frpStatistic:'maximum single observed pixel FRP (MW), not total or energy',evidenceWeight:0,bySource:{},timeStart:r.time,timeEnd:r.time,uncertainty:{footprint:'Approximate north-aligned scan/track rectangle; no cloud or non-fire exposure',calibratedProbability:null,position:'Cell center is a support coordinate, not estimated fire location'}};groups.set(key,c);}
   if(!c.crossSensorCoincident&&c._rows.some(other=>other.sensor!==r.sensor&&compatible(other,r)))c.crossSensorCoincident=true;c._rows.push(r);
   c.observations++;c.sourceObservationIDs.push(identity);c.evidenceWeight+=g.weight;
   c.confidence=Math.max(c.confidence,Number.isFinite(r.confidence)?r.confidence:0); // Legacy UI filter score only.
   const source=[r.product||r.sensor,r.satellite||'Unknown',r.daynight||'Unknown'].join(':');
   c.bySource[source]??={weight:0,observations:0,confidenceClasses:{},frpMax:null};const s=c.bySource[source];s.weight+=g.weight;s.observations++;s.confidenceClasses[category]=(s.confidenceClasses[category]||0)+1;
   c.confidenceClasses[category]=(c.confidenceClasses[category]||0)+1;
   for(const [field,value] of [['sensors',r.sensor],['satellites',r.satellite],['products',r.product]])if(value&&!c[field].includes(value))c[field].push(value);
   if(r.time&&(!c.timeStart||r.time<c.timeStart))c.timeStart=r.time;if(r.time&&(!c.timeEnd||r.time>c.timeEnd))c.timeEnd=r.time;
   if(Number.isFinite(r.frp)&&r.frp>0){c.frp=c.frp===null?r.frp:Math.max(c.frp,r.frp);s.frpMax=s.frpMax===null?r.frp:Math.max(s.frpMax,r.frp);}
   if(g.fallback)c.uncertainty.footprint=g.fallback;
  }
 }
 return [...groups.values()].map(c=>{delete c._rows;return c;});
}
