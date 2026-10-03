import {compileGeometry} from './boundary-geometry.js';
import {normalizeArea,inArea} from './area-bounds.js';
import {inRegion,harmonize,calendar} from './core.js';
import {addHistoricalObservation} from './history-core.js';
export function historyLiveCounts(data,filters){
 const inside=filters.boundary?compileGeometry(filters.boundary.geometry):()=>true,cells=new Map(),start=filters.day||filters.start,end=filters.day||filters.end;
 for(const r of data)if(r.date>=start&&r.date<=end&&inRegion(r,filters.region)&&inArea(r,normalizeArea(filters.area))&&inside(r))addHistoricalObservation(cells,r,r.product||(r.sensor==='MODIS'?'MODIS_NRT':'VIIRS_NOAA20_NRT'));
 const values=[...cells.values()];const byDate=new Map();for(const c of values){byDate.set(c.date,byDate.get(c.date)||{date:c.date,modisCells:0,viirsCells:0});const d=byDate.get(c.date);if(c.m)d.modisCells++;if(c.j)d.viirsCells++;}return {dailyCounts:[...byDate.values()],modisCells:values.filter(c=>c.m).length,viirsCells:values.filter(c=>c.j).length,monthDayStart:start.slice(5),monthDayEnd:end.slice(5),viirsSlot:'j'};
}
// Reuse the expensive daily grid when only the sensor or selected day changes.
export function createAnalyzer(data){
 let cached=null,key=null,boundaryID=null,geographic=data;
 return filters=>{
  const {region,start,end,confidence,view,day}=filters,area=normalizeArea(filters.area);
  if(filters.area&&!area)throw Error("Invalid selected area");
  const id=filters.boundary?.id||null;
  if(id!==boundaryID){geographic=filters.boundary?data.filter(compileGeometry(filters.boundary.geometry)):data;boundaryID=id;}
  const nextKey=JSON.stringify([region,start,end,confidence,area,id]);
  if(key!==nextKey){
   const raw=geographic.filter(r=>inRegion(r,region)&&inArea(r,area)&&r.date>=start&&r.date<=end&&r.confidence>=confidence);
   let latest=null,maxFrp=null;for(const r of raw){const acquired=r.date+' '+(r.time||'00:00');if(!latest||acquired>latest)latest=acquired;if(Number.isFinite(r.frp))maxFrp=maxFrp===null?r.frp:Math.max(maxFrp,r.frp);}
   const merged=harmonize(raw),sensors={MODIS:[],VIIRS:[]};for(const r of raw)sensors[r.sensor]?.push(r);
   cached={raw,merged,sensors,summary:{latest,maxFrp,raw:raw.length,cells:merged.length,modisCells:merged.filter(r=>r.sensors.includes('MODIS')).length,viirsCells:merged.filter(r=>r.sensors.includes('VIIRS')).length,overlap:merged.filter(r=>r.crossSensorCoincident).length,days:calendar(merged,start,end),bars:[['MODIS',sensors.MODIS.length],['VIIRS',sensors.VIIRS.length],['Harmonized',merged.length]]}};key=nextKey;
  }
  let selected=view==='Harmonized'?cached.merged:view==='Compare'?cached.raw:cached.sensors[view]||[];
  if(day)selected=selected.filter(r=>r.date===day);
  return {selected,summary:{...cached.summary,selected:selected.length}};
 };
}
export function analyzeRows(data,filters){return createAnalyzer(data)(filters);}

// Project once per selection; pans query only intersecting geographic buckets.
export function createViewportIndex(rows){
 const x=new Float64Array(rows.length),y=new Float64Array(rows.length),buckets=new Map(),divisions=128;
 for(let i=0;i<rows.length;i++){
  const r=rows[i];if(Math.abs(r.lat)>85.0511){x[i]=y[i]=NaN;continue;}
  const sine=Math.sin(r.lat*Math.PI/180);x[i]=(r.lon+180)/360;y[i]=.5-Math.log((1+sine)/(1-sine))/(4*Math.PI);
  const key=Math.min(divisions-1,Math.max(0,Math.floor(y[i]*divisions)))*divisions+Math.min(divisions-1,Math.max(0,Math.floor(x[i]*divisions)));
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);
 }
 return {rows,x,y,buckets,divisions};
}
export function viewportBins(source,{zoom,origin,width,height,cellSize}){
 const index=Array.isArray(source)?createViewportIndex(source):source,{rows,x:px,y:py,divisions}=index;
 const scale=256*2**zoom,bins=new Map();let visible=0;
 const minX=Math.max(0,Math.floor((origin.x-12)/scale*divisions)),maxX=Math.min(divisions-1,Math.floor((origin.x+width+12)/scale*divisions));
 const minY=Math.max(0,Math.floor((origin.y-12)/scale*divisions)),maxY=Math.min(divisions-1,Math.floor((origin.y+height+12)/scale*divisions));
 let candidates;
 if((maxX-minX+1)*(maxY-minY+1)>divisions*divisions/4)candidates=rows.keys();
 else{candidates=[];for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const bucket=index.buckets.get(y*divisions+x);if(bucket)for(const i of bucket)candidates.push(i);}candidates.sort((a,b)=>a-b);}
 for(const i of candidates){
  const r=rows[i],x=px[i]*scale-origin.x,y=py[i]*scale-origin.y;if(!Number.isFinite(x)||x<-12||y<-12||x>width+12||y>height+12)continue;
  visible++;const key=Math.floor(x/cellSize)+':'+Math.floor(y/cellSize)+':'+r.sensor;
  if(!bins.has(key))bins.set(key,{x:0,y:0,lat:0,lon:0,count:0,observations:0,sensor:r.sensor,bounds:[r.lat,r.lon,r.lat,r.lon],sample:r});
  const b=bins.get(key);b.x+=x;b.y+=y;b.lat+=r.lat;b.lon+=r.lon;b.count++;b.observations+=r.observations||1;b.bounds[0]=Math.min(b.bounds[0],r.lat);b.bounds[1]=Math.min(b.bounds[1],r.lon);b.bounds[2]=Math.max(b.bounds[2],r.lat);b.bounds[3]=Math.max(b.bounds[3],r.lon);
 }
 return {visible,bins:[...bins.values()].map(b=>({...b,x:b.x/b.count,y:b.y/b.count,lat:b.lat/b.count,lon:b.lon/b.count}))};
}
export function exportCSV(rows){const cols=['sensor','date','time','lat','lon','confidence','frp','frpRaw','observations','sensors','satellite','product','confidenceRaw','daynight','timeStart','timeEnd','derived','algorithmVersion','cellID','evidenceWeight','sourceObservationIDs','bySource','confidenceClasses','uncertainty','frpStatistic','crossSensorCoincident'];const escape=value=>'"'+String(value&&typeof value==='object'?JSON.stringify(value):value??'').replaceAll('"','""')+'"';return [cols.join(','),...rows.map(r=>cols.map(c=>escape(r[c])).join(','))].join('\n');}
