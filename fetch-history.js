import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {historyCases,historyProducts} from './history-catalog.js';
const option=name=>process.argv.find(s=>s.startsWith('--'+name+'='))?.split('=').slice(1).join('=');
const selected=(option('cases')||'uzbekistan,california,amazon').split(',');
const directory='.history-source';await mkdir(directory,{recursive:true});
let manifest;try{manifest=JSON.parse(await readFile(directory+'/manifest.json','utf8'));}catch{manifest={format:'firms-history-input-v1',entries:[]};}
let key=process.env.FIRMS_MAP_KEY;try{key||=(await readFile('.env','utf8')).match(/^FIRMS_MAP_KEY=(.+)$/m)?.[1].trim();}catch{}
const catalog=(await fetch('https://firms.modaps.eosdis.nasa.gov/data/country/yearly_summary_files.txt').then(r=>{if(!r.ok)throw Error('NASA archive catalog unavailable');return r.text();})).split('\n');
let availability={};if(key){const response=await fetch('https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/'+encodeURIComponent(key)+'/ALL');if(response.ok){const lines=(await response.text()).trim().split(/\r?\n/);for(const line of lines.slice(1)){const [product,start,end]=line.split(',');availability[product]={start,end};}}}
const jobs=[];
for(const id of selected){
 const area=historyCases[id];if(!area)throw Error('Unknown case study: '+id);
 const years=option('years')?.split('-').map(Number)||[area.startYear,area.endYear];
 for(let year=Math.max(area.startYear,years[0]);year<=Math.min(area.endYear,years[1]??years[0]);year++){
  for(const [product,p] of Object.entries(historyProducts)){
   if(year<Number(p.start.slice(0,4))||p.processing==='NRT'&&(!area.country||p.slot==='n'))continue;
   if(area.country){
    const name=p.countryProduct+'_'+year+'_'+area.country+'.csv';if(!p.processing&&catalog.some(s=>s.startsWith(name+','))){
    jobs.push({caseID:id,year,product,start:[year+'-01-01',p.start].sort().at(-1),end:year+'-12-31',bounds:area.bounds,url:'https://firms.modaps.eosdis.nasa.gov/data/country/'+p.countryProduct+'/'+year+'/'+name,method:'NASA annual country archive',processing:'SP',file:id+'_'+name});
    }else if(key&&availability[product]){const available=availability[product],start=[year+'-01-01',available.start].sort().at(-1),end=[year+'-12-31',available.end].sort()[0];for(let time=Date.parse(start+'T00:00:00Z'),last=Date.parse(end+'T00:00:00Z');time<=last;time+=5*86400000){const date=new Date(time).toISOString().slice(0,10),days=Math.min(5,Math.round((last-time)/86400000)+1),finish=new Date(time+(days-1)*86400000).toISOString().slice(0,10),path=product+'/'+area.bounds.join(',')+'/'+days+'/'+date;jobs.push({caseID:id,year,product,start:date,end:finish,bounds:area.bounds,url:'https://firms.modaps.eosdis.nasa.gov/api/area/csv/'+encodeURIComponent(key)+'/'+path,publicURL:'https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/'+path,method:'NASA area API; country polygon applied offline',processing:p.processing||'SP',file:id+'_'+product+'_'+date+'.csv'});}}

   }else{
    if(!key)throw Error('Set FIRMS_MAP_KEY for historical area API retrieval; country archives need no key.');
    const month=String(area.month).padStart(2,'0'),days=new Date(Date.UTC(year,area.month,0)).getUTCDate();
    for(let day=1;day<=days;day+=5){const start=year+'-'+month+'-'+String(day).padStart(2,'0'),end=year+'-'+month+'-'+String(Math.min(days,day+4)).padStart(2,'0');
     if(end<p.start)continue;
     const path=product+'/'+area.bounds.join(',')+'/'+(Math.min(days,day+4)-day+1)+'/'+start;
     jobs.push({caseID:id,year,product,start,end,bounds:area.bounds,url:'https://firms.modaps.eosdis.nasa.gov/api/area/csv/'+encodeURIComponent(key)+'/'+path,publicURL:'https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/'+path,method:'NASA Standard Processing area API',processing:'SP',file:id+'_'+product+'_'+start+'.csv'});
    }
   }
  }
 }
}
let cursor=0,done=0,failed=0,save=Promise.resolve();
async function runner(){
 while(cursor<jobs.length){
  const job=jobs[cursor++];const existing=manifest.entries.find(e=>e.file===job.file);
  if(existing){try{const raw=await readFile(directory+'/'+job.file);if(createHash('sha256').update(raw).digest('hex')===existing.sha256){done++;continue;}}catch{}}
  let csv=null;for(let attempt=0;attempt<3;attempt++)try{const r=await fetch(job.url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error('NASA returned HTTP '+r.status);const text=await r.text();if(!/^latitude,longitude,/.test(text.trim()))throw Error('NASA did not return a valid observation table');csv=text;break;}catch{if(attempt<2)await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
  if(!csv){failed++;console.log('Unavailable: '+job.caseID+' '+job.product+' '+job.start);continue;}
  await writeFile(directory+'/'+job.file,csv);
  const {url,publicURL,...entry}=job;entry.source=publicURL||url;entry.processing=job.processing||'SP';entry.retrievedAt=new Date().toISOString();entry.sha256=createHash('sha256').update(csv).digest('hex');
  manifest.entries=manifest.entries.filter(e=>e.file!==entry.file);manifest.entries.push(entry);
  save=save.then(async()=>{await writeFile(directory+'/manifest.tmp.json',JSON.stringify(manifest));await rename(directory+'/manifest.tmp.json',directory+'/manifest.json');});await save;
  done++;if(done%10===0)console.log('Historical downloads: '+done+'/'+jobs.length);
 }
}
await Promise.all([runner(),runner()]);await save;console.log(JSON.stringify({complete:done,failed,total:jobs.length,sourceFiles:manifest.entries.length}));
if(failed)process.exitCode=1;
