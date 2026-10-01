import {getData,getVersion} from './provider.js';
import {nextDateRange,feedHealth} from './refresh-state.js';
import {regions,harmonize,calendar} from './core.js';
const $=id=>document.getElementById(id);let data=[],view='Harmonized',day=null,current=[],request=0,busy=false,snapshot=null,lastCheck=null,failed=false;
const map=L.map('map',{preferCanvas:true}).setView(regions.Amazon.center,5);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);const layer=L.layerGroup().addTo(map);const colors={MODIS:'#ff965c',VIIRS:'#77bfff',Harmonized:'#a5e6bc'};
function render(){const start=$('start').value,end=$('end').value;if(!start||!end||start>end){$('status').textContent='Choose a valid date range (From must be before To).';return;}const raw=data.filter(r=>r.region===$('region').value&&r.date>=start&&r.date<=end&&r.confidence>=+$('confidence').value);const merged=harmonize(raw),days=calendar(merged,start,end);let visible=view==='Harmonized'?merged:view==='Compare'?raw:raw.filter(r=>r.sensor===view);current=visible.filter(r=>!day||r.date===day);$('confidence-value').textContent=$('confidence').value+'%';const metrics=[['Raw observations',raw.length,'Across both sensors'],['Daily occupied cells',merged.length,'Approximate 1 km grid'],['Multi-sensor cells',merged.filter(r=>r.sensors.length>1).length,'Observed by MODIS + VIIRS'],['Critical days',days.filter(d=>d.critical).length,'Window-relative activity peaks']];$('metrics').innerHTML=metrics.map(([label,n,hint])=>`<div class="metric"><span>${label}</span><strong>${n.toLocaleString()}</strong><small>${hint}</small></div>`).join('');layer.clearLayers();for(const r of current){const el=document.createElement('div');const title=document.createElement('strong');title.textContent=r.sensor+' detection';el.append(title);for(const line of [`${r.date} ${r.time} UTC`,`${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}`,`Confidence: ${r.confidence}% · ${r.frp} MW FRP`,r.sensors?`Sensors: ${r.sensors.join(' + ')} · ${r.observations} observations · ${r.timeStart}–${r.timeEnd} UTC`:`Satellite: ${r.satellite} · ${r.product} · original confidence: ${r.confidenceRaw}`]){const p=document.createElement('p');p.textContent=line;el.append(p);}L.circleMarker([r.lat,r.lon],{radius:view==='Harmonized'?5:4,color:colors[r.sensor],weight:1,fillOpacity:.7}).bindPopup(el).addTo(layer);}const max=Math.max(1,...days.map(d=>d.count));$('calendar').replaceChildren(...days.map(d=>{const b=document.createElement('button');b.className='day'+(d.critical?' critical':'')+(day===d.date?' picked':'');b.style.background=`rgba(165,230,188,${.06+.55*d.count/max})`;b.innerHTML=`<span>${d.date.slice(5)}</span><b>${d.count}</b>${d.critical?'<small>PEAK</small>':''}`;b.title=d.date+': '+d.count+' occupied cells';b.onclick=()=>{day=day===d.date?null:d.date;render();};return b;}));$('calendar-note').textContent=day?`Showing ${current.length} map detections on ${day}.`:`${current.length} map detections in selected view. Peaks exceed mean + 1.5σ for this date window. Latest UTC day may be incomplete.`;const bars=[['MODIS',raw.filter(r=>r.sensor==='MODIS').length],['VIIRS',raw.filter(r=>r.sensor==='VIIRS').length],['Harmonized',merged.length]];const bm=Math.max(1,...bars.map(b=>b[1]));$('comparison').innerHTML=bars.map(([name,count])=>`<div class="bar-label"><span>${name}</span><b>${count}</b></div><div class="bar-track"><div style="width:${count/bm*100}%;background:${colors[name]}"></div></div>`).join('');}

function updateFreshness(){
 if(!snapshot)return;
 const health=feedHealth(snapshot.retrievedAt);
 $('freshness').textContent='Retrieved '+health.ageLabel+' · NASA near-real-time';
 $('feed-state').textContent=failed?'Update unavailable':health.stale?'Data is stale':'Auto-updating';
 document.querySelector('.feed-bar').classList.toggle('stale',health.stale);
 document.querySelector('.feed-bar').classList.toggle('failed',failed);
 $('last-check').textContent=lastCheck?'Last checked '+lastCheck.toLocaleTimeString()+' · checks every 60s':'Checks every 60s';
}
async function load(auto=false){
 if(busy&&auto)return;
 const id=++request;busy=true;if(!auto)$('status').textContent='Connecting to NASA observations…';
 try{
  if(auto&&snapshot){const version=await getVersion();if(version&&version.retrievedAt===snapshot.retrievedAt){lastCheck=new Date();failed=false;updateFreshness();return;}}
  const result=await getData($('region').value,$('provider').value==='live');if(id!==request)return;
  const range=nextDateRange({start:$('start').value,end:$('end').value},result,$('follow-latest').checked);
  snapshot=result;data=result.data;failed=false;lastCheck=new Date();
  $('status').textContent=result.message;
  $('start').value=range.start;$('end').value=range.end;
  $('start').min=$('end').min=result.dateStart;$('start').max=$('end').max=result.dateEnd;
  if(!auto)day=null;else if(day&&(day<range.start||day>range.end))day=null;
  if(!auto){const bounds=regions[$('region').value].bounds;map.fitBounds([[bounds[1],bounds[0]],[bounds[3],bounds[2]]]);}
  render();updateFreshness();
 }catch{failed=true;lastCheck=new Date();$('status').textContent=snapshot?'Latest check failed. Keeping your last actual NASA observations; automatic retries continue.':'NASA observations are unavailable. Automatic retries continue. No synthetic fallback is used.';updateFreshness();}
 finally{if(id===request)busy=false;}
}
for(const id of ['start','end','confidence'])$(id).addEventListener('input',()=>{day=null;if(id!=='confidence')$('follow-latest').checked=false;render();});for(const id of ['region','provider'])$(id).addEventListener('change',()=>load(false));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('selected',x===b));render();});$('reset').onclick=()=>{day=null;render();};$('export').onclick=()=>{const cols=['sensor','date','time','lat','lon','confidence','frp','observations','sensors','satellite','product','confidenceRaw','daynight','timeStart','timeEnd'];const csv=[cols.join(','),...current.map(r=>cols.map(c=>JSON.stringify(Array.isArray(r[c])?r[c].join('+'):r[c]??'')).join(','))].join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`ember-atlas-${view.toLowerCase()}.csv`;a.click();URL.revokeObjectURL(url);};
$('check-now').onclick=()=>load(true);
$('follow-latest').onchange=()=>{if(snapshot&&$('follow-latest').checked){$('start').value=snapshot.dateStart;$('end').value=snapshot.dateEnd;day=null;render();}};
setInterval(()=>{if(!document.hidden)load(true);},60000);
setInterval(updateFreshness,10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true);});
if(document.documentElement.dataset.host==='static')document.querySelector('.provider-label').hidden=true;
load();
