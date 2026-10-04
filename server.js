import {build} from 'esbuild';
import {execFile} from 'node:child_process';
import {appendLiveHistory} from './append-live-history.js';
import {leafletGlobalPlugin} from './vector-build-plugin.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,relative} from 'node:path';
import {regions,parseCSV} from './core.js';
const root=resolve('.');
let refreshing=false;
setInterval(()=>{if(refreshing)return;refreshing=true;execFile(process.execPath,['fetch-firms.js'],{cwd:root,timeout:240000},async error=>{try{if(!error)await appendLiveHistory();}catch{console.log('Historical append unavailable; previous data retained.');}finally{refreshing=false;}});},15*60*1000);
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
 if(['/vector-basemap.js','/global-history-worker.js'].includes(url.pathname)){const result=await build({entryPoints:[url.pathname.slice(1)],bundle:true,minify:true,format:'esm',target:'es2022',write:false,plugins:[leafletGlobalPlugin]});res.setHeader('Content-Type','text/javascript');return res.end(result.outputFiles[0].text);}
 let path=url.pathname==='/'||url.pathname==='/index.html'?'/index.html':decodeURIComponent(url.pathname);const file=resolve(root,'.'+path);
 if(!file.startsWith(root+'\\')&&!file.startsWith(root+'/')){res.writeHead(403);return res.end();}
 path='/'+relative(root,file).replaceAll('\\','/');
 if(!['/global-history.js','/global-history-worker.js','/monitor-attention.js','/monitor.html','/monitor-aoi.js','/monitor-app.js','/monitor-map.js','/monitor-storage.js','/monitor-engine.js','/monitor-worker.js','/monitor-provider.js','/monitor-preprocess.js','/event-tracking.js','/early-warning.js','/monitor.css','/history.html','/history-app.js','/history-core.js','/history-catalog.js','/history-provider.js','/history-engine.js','/history-worker.js','/history.css','/history-context.js','/boundary-geometry.js','/boundary-explorer.js','/map-shell.js','/index.html','/map.html','/observatory.html','/method.html','/area-bounds.js','/area-selection.js','/data-codec.js','/scene-layout.js','/earth.js','/motion.js','/animation-loop.js','/motion-settings.js','/navigation.js','/landing.js','/map-policy.js','/analysis-worker.js','/map-analysis.js','/hotspot-layer.js','/basemaps.js','/app.js','/provider.js','/refresh-state.js','/core.js','/harmonization.js','/seasonal-calibration.js','/experience.css','/site.css','/dashboard.css','/style.css','/data/firms.json'].includes(path)&&!path.startsWith('/data/chunks/')&&!path.startsWith('/data/history/')&&!path.startsWith('/data/monitor/')&&!path.startsWith('/node_modules/leaflet/dist/')&&!path.startsWith('/assets/')&&!path.startsWith('/vendor/maplibre/')&&!path.startsWith('/vendor/three/')&&!path.startsWith('/vendor/lenis/')){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(await readFile(path.startsWith('/vendor/maplibre/')?resolve(root,'node_modules/maplibre-gl/dist/'+path.split('/').at(-1)):path.startsWith('/vendor/lenis/')?resolve(root,'node_modules/lenis/dist/'+path.split('/').at(-1)):path.startsWith('/vendor/three/')?resolve(root,'node_modules/three/build/'+path.split('/').at(-1)):file));
 }catch{res.writeHead(500);res.end('Unable to load NASA observations or resource');}}).listen(process.env.PORT||3000,'127.0.0.1',()=>console.log('Ember Atlas: http://localhost:3000'));
