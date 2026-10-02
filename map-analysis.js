import {inRegion,harmonize,calendar} from './core.js';
export function analyzeRows(data,{region,start,end,confidence,view,day}){
 const raw=data.filter(r=>inRegion(r,region)&&r.date>=start&&r.date<=end&&r.confidence>=confidence),merged=harmonize(raw),days=calendar(merged,start,end);
 let selected=view==='Harmonized'?merged:view==='Compare'?raw:raw.filter(r=>r.sensor===view);if(day)selected=selected.filter(r=>r.date===day);
 return {selected,summary:{raw:raw.length,cells:merged.length,overlap:merged.filter(r=>r.sensors.length>1).length,days,selected:selected.length,bars:[['MODIS',raw.filter(r=>r.sensor==='MODIS').length],['VIIRS',raw.filter(r=>r.sensor==='VIIRS').length],['Harmonized',merged.length]]}};
}
export function viewportBins(rows,{zoom,origin,width,height,cellSize}){
 const scale=256*2**zoom,bins=new Map();let visible=0;
 for(const r of rows){if(Math.abs(r.lat)>85.0511)continue;const sine=Math.sin(r.lat*Math.PI/180),x=(r.lon+180)/360*scale-origin.x,y=(.5-Math.log((1+sine)/(1-sine))/(4*Math.PI))*scale-origin.y;if(x<-12||y<-12||x>width+12||y>height+12)continue;visible++;const key=Math.floor(x/cellSize)+':'+Math.floor(y/cellSize)+':'+r.sensor;
  if(!bins.has(key))bins.set(key,{x:0,y:0,lat:0,lon:0,count:0,observations:0,sensor:r.sensor,bounds:[r.lat,r.lon,r.lat,r.lon],sample:r});
  const b=bins.get(key);b.x+=x;b.y+=y;b.lat+=r.lat;b.lon+=r.lon;b.count++;b.observations+=r.observations||1;b.bounds[0]=Math.min(b.bounds[0],r.lat);b.bounds[1]=Math.min(b.bounds[1],r.lon);b.bounds[2]=Math.max(b.bounds[2],r.lat);b.bounds[3]=Math.max(b.bounds[3],r.lon);
 }
 return {visible,bins:[...bins.values()].map(b=>({...b,x:b.x/b.count,y:b.y/b.count,lat:b.lat/b.count,lon:b.lon/b.count}))};
}
export function exportCSV(rows){const cols=['sensor','date','time','lat','lon','confidence','frp','frpRaw','observations','sensors','satellite','product','confidenceRaw','daynight','timeStart','timeEnd'];const escape=value=>'"'+String(Array.isArray(value)?value.join('+'):value??'').replaceAll('"','""')+'"';return [cols.join(','),...rows.map(r=>cols.map(c=>escape(r[c])).join(','))].join('\n');}
