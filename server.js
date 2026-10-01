import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {regions,parseCSV} from './core.js';
const root=resolve('.');
let key=process.env.FIRMS_MAP_KEY;
if(!key){try{key=(await readFile('.env','utf8')).match(/^FIRMS_MAP_KEY=(.+)$/m)?.[1].trim();}catch{}}
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/data'){
 const region=url.searchParams.get('region')||'Amazon';
 if(!regions[region]){res.writeHead(400);return res.end('Unknown region');}
 const snapshot=JSON.parse(await readFile('data/firms.json','utf8'));let result=snapshot;
 if(url.searchParams.get('live')==='1'){
 if(!key)result={...snapshot,message:'Live refresh is not configured. Showing the saved actual NASA snapshot.'};
 else try{
 const bounds=regions[region].bounds.join(',');
 const data=(await Promise.all(['MODIS_NRT','VIIRS_NOAA20_NRT'].map(async product=>{
 const response=await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${product}/${bounds}/5`,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error();
 return parseCSV(await response.text(),product.startsWith('MODIS')?'MODIS':'VIIRS').map(r=>({...r,region,product}));
 }))).flat();const dates=data.map(r=>r.date).sort();
 result={source:'firms',data,retrievedAt:new Date().toISOString(),dateStart:dates[0]||snapshot.dateStart,dateEnd:dates.at(-1)||snapshot.dateEnd,message:'NASA FIRMS live retrieval • latest 5 days • MODIS + NOAA-20 VIIRS'};
 }catch{result={...snapshot,message:`Live retrieval failed. Showing actual NASA snapshot retrieved ${snapshot.retrievedAt}.`};}}
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify(result));}
 const path=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname),file=resolve(root,'.'+path);
 if(!file.startsWith(root+'\\')&&!file.startsWith(root+'/')){res.writeHead(403);return res.end();}
 if(!['/index.html','/app.js','/provider.js','/core.js','/style.css','/data/firms.json'].includes(path)&&!path.startsWith('/node_modules/leaflet/dist/')){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(500);res.end('Unable to load NASA observations or resource');}}).listen(process.env.PORT||3000,'127.0.0.1',()=>console.log('Ember Atlas: http://localhost:3000'));
