export const regions = {World:{bounds:[-180,-90,180,90],center:[20,0]},Africa:{bounds:[-20,-36,55,38],center:[1,18]},Asia:{bounds:[25,-12,180,80],center:[35,95]},Europe:{bounds:[-25,34,45,72],center:[53,15]},'North America':{bounds:[-170,5,-50,83],center:[42,-105]},'South America':{bounds:[-85,-57,-33,15],center:[-18,-60]},Oceania:{bounds:[110,-50,180,10],center:[-22,145]},Amazon:{bounds:[-65,-16,-45,0],center:[-8,-55]},California:{bounds:[-125,32,-114,42],center:[37,-120]},'Central Asia':{bounds:[55,35,75,48],center:[41,65]}};
export function harmonize(rows){
 const groups=new Map();
 for(const r of rows){
  const y=Math.floor(r.lat*111.32),rowLatitude=(y+.5)/111.32,x=Math.floor(r.lon*111.32*Math.cos(rowLatitude*Math.PI/180)),key=`${r.date}:${x}:${y}`;
  let cell=groups.get(key);
  if(!cell){cell={...r,sensor:'Harmonized',sensors:[r.sensor],observations:1,timeStart:r.time,timeEnd:r.time,satellites:r.satellite?[r.satellite]:[],products:r.product?[r.product]:[],frp:Number.isFinite(r.frp)&&r.frp>=0?r.frp:null};groups.set(key,cell);continue;}
  cell.lat+=r.lat;cell.lon+=r.lon;cell.observations++;
  if(!cell.sensors.includes(r.sensor))cell.sensors.push(r.sensor);
  if(r.satellite&&!cell.satellites.includes(r.satellite))cell.satellites.push(r.satellite);
  if(r.product&&!cell.products.includes(r.product))cell.products.push(r.product);
  if(cell.timeStart===undefined||(r.time!==undefined&&r.time<cell.timeStart))cell.timeStart=r.time;
  cell.timeEnd=cell.timeEnd===undefined||r.time===undefined?undefined:cell.timeEnd>r.time?cell.timeEnd:r.time;
  if(Number.isFinite(r.frp)&&r.frp>=0)cell.frp=cell.frp===null?r.frp:Math.max(cell.frp,r.frp);
  cell.confidence=Math.max(cell.confidence,r.confidence);
 }
 const result=[...groups.values()];for(const cell of result){cell.lat/=cell.observations;cell.lon/=cell.observations;}return result;
}
export function calendar(rows,start,end){const counts=new Map();for(const r of rows)counts.set(r.date,(counts.get(r.date)||0)+1);const days=[];for(let d=new Date(start+'T00:00:00Z');d<=new Date(end+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1))days.push({date:d.toISOString().slice(0,10),count:counts.get(d.toISOString().slice(0,10))||0});const mean=days.reduce((s,d)=>s+d.count,0)/(days.length||1),sd=Math.sqrt(days.reduce((s,d)=>s+(d.count-mean)**2,0)/(days.length||1));return days.map(d=>({...d,critical:sd>0&&d.count>mean+1.5*sd}));}
export function parseCSV(csv,sensor){const lines=csv.trim().split(/\r?\n/),head=lines.shift().split(',');if(!head.includes('latitude'))throw Error('Invalid FIRMS response');return lines.filter(Boolean).map((line,id)=>{const r=Object.fromEntries(line.split(',').map((v,i)=>[head[i],v]));const t=(r.acq_time||'0000').padStart(4,'0');return {id,lat:+r.latitude,lon:+r.longitude,sensor,satellite:r.satellite||'Unknown',confidenceRaw:r.confidence,daynight:r.daynight||'Unknown',scan:+r.scan||null,track:+r.track||null,version:r.version||null,type:r.type||null,date:r.acq_date,time:t.slice(0,2)+':'+t.slice(2),confidence:({h:95,high:95,n:70,nominal:70,l:30,low:30})[r.confidence.trim().toLowerCase()]??+r.confidence,frp:+r.frp};}).filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon));}

export function inRegion(row,name){const b=regions[name]?.bounds;if(!b)return false;return row.lon>=b[0]&&row.lon<=b[2]&&row.lat>=b[1]&&row.lat<=b[3];}
