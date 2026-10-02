import {normalizeArea,inArea} from './area-bounds.js';
import {inRegion,harmonize,calendar} from './core.js';
// Reuse the expensive daily grid when only the sensor or selected day changes.
export function createAnalyzer(data){
 let cached=null,key=null;
 return filters=>{
  const {region,start,end,confidence,view,day}=filters,area=normalizeArea(filters.area);
  if(filters.area&&!area)throw Error("Invalid selected area");
  const nextKey=JSON.stringify([region,start,end,confidence,area]);
  if(key!==nextKey){
   const raw=data.filter(r=>inRegion(r,region)&&inArea(r,area)&&r.date>=start&&r.date<=end&&r.confidence>=confidence);
   const merged=harmonize(raw),sensors={MODIS:[],VIIRS:[]};for(const r of raw)sensors[r.sensor]?.push(r);
   cached={raw,merged,sensors,summary:{raw:raw.length,cells:merged.length,overlap:merged.filter(r=>r.sensors.length>1).length,days:calendar(merged,start,end),bars:[['MODIS',sensors.MODIS.length],['VIIRS',sensors.VIIRS.length],['Harmonized',merged.length]]}};key=nextKey;
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
export function exportCSV(rows){const cols=['sensor','date','time','lat','lon','confidence','frp','frpRaw','observations','sensors','satellite','product','confidenceRaw','daynight','timeStart','timeEnd'];const escape=value=>'"'+String(Array.isArray(value)?value.join('+'):value??'').replaceAll('"','""')+'"';return [cols.join(','),...rows.map(r=>cols.map(c=>escape(r[c])).join(','))].join('\n');}
