import {appendLiveHistory} from './append-live-history.js';
import {leafletGlobalPlugin} from './vector-build-plugin.js';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,writeFile,copyFile,cp,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build,transform} from 'esbuild';
import {releaseVersion,versionHTML,versionModules} from './build-assets.js';
import {packRows} from './data-codec.js';
const pages=['index.html','observatory.html','map.html','history.html','monitor.html','method.html'];
await appendLiveHistory();
const modules=["global-history-worker.js","global-history.js","monitor-attention.js","monitor-aoi.js","monitor-app.js","monitor-map.js","monitor-storage.js","monitor-engine.js","monitor-worker.js","monitor-provider.js","monitor-preprocess.js","event-tracking.js","early-warning.js","history-context.js","history-app.js","history-core.js","history-catalog.js","history-provider.js","history-engine.js","history-worker.js","vector-basemap.js","english-style.js","boundary-geometry.js","boundary-explorer.js","map-shell.js","area-bounds.js","area-selection.js","scene-layout.js","analysis-worker.js","map-analysis.js","hotspot-layer.js","basemaps.js","animation-loop.js","map-policy.js","app.js","core.js","harmonization.js","seasonal-calibration.js","provider.js","refresh-state.js","landing.js","earth.js","motion.js","data-codec.js"];
const styles=['site.css','dashboard.css','experience.css','fonts.css','history.css','monitor.css'],classic=['motion-settings.js','navigation.js'];
const inputs=[...pages,...modules,...styles,...classic,'build.js','vector-build-plugin.js','build-assets.js','package-lock.json'];
const version=releaseVersion(await Promise.all(inputs.map(p=>readFile(p,'utf8'))));
await mkdir('docs',{recursive:true});
const compressedClassic=await Promise.all(classic.map(async file=>(await transform(await readFile(file,'utf8'),{minify:true,target:'es2022'})).code));
const fontCSS=await readFile('fonts.css','utf8'),fontFaces=fontCSS.split('/* latin */').slice(1),fontPreloads=[...new Set(fontFaces.map(face=>face.match(/url\(([^)]+)\)/)?.[1]).filter(Boolean))].map(href=>'<link rel="preload" as="font" type="font/woff2" crossorigin href="'+href+'">').join('');
for(const page of pages){
 let html=await readFile(page,'utf8');
 html=html.replace('<html lang="en">','<html lang="en" data-host="static">').replaceAll('./node_modules/leaflet/dist/','./vendor/leaflet/');
 html=html.replace(/<link[^>]*href="\.\/monitor\.css"[^>]*>/g,'');
 const dashboard=page==='observatory.html'||page==='map.html'||page==='history.html'||page==='monitor.html';
 html=html.replace(/<link[^>]*href="\.\/history\.css"[^>]*>/g,'').replace('<link rel="stylesheet" href="./experience.css">','').replace('<link rel="stylesheet" href="./history.css">','');
 if(dashboard)html=html.replace('<link rel="stylesheet" href="./site.css">','');
 html=html.replace('<script src="./motion-settings.js"></script>','<script>'+compressedClassic[0]+'</script>').replace('<script src="./navigation.js"></script>','<script>'+compressedClassic[1]+'</script>');
 const preload='<link rel="preload" as="image" fetchpriority="high" href="./assets/earth-poster.webp">'+fontPreloads+'<link rel="modulepreload" href="./motion.js?v='+version+'"><script>if(window.atlasMotion.enabled){for(const [rel,href,as] of [["modulepreload","./earth.js?v='+version+'",""],["preload","./assets/earth.webp","image"]]){const link=document.createElement("link");link.rel=rel;link.href=href;if(as)link.as=as;document.head.append(link);}}</script>';
 html=html.replace('</head>',preload+'</head>');
 await writeFile('docs/'+page,versionHTML(html,version));
}
const aliases={name:'local-vendor',setup(build){build.onResolve({filter:/vendor\/three\/three.module.js$/},()=>({path:fileURLToPath(new URL('./node_modules/three/build/three.module.js',import.meta.url))}));build.onResolve({filter:/vendor\/lenis\/lenis.mjs$/},()=>({path:fileURLToPath(new URL('./node_modules/lenis/dist/lenis.mjs',import.meta.url))}));}};
for(const file of modules){
 const result=await build({entryPoints:[file],bundle:true,minify:true,format:'esm',target:'es2022',write:false,external:file==='motion.js'?['./earth.js']:(file==='app.js'||file==='history-app.js'||file==='monitor-map.js')?['./vector-basemap.js']:[],plugins:[aliases,leafletGlobalPlugin],legalComments:'inline'});
 await writeFile('docs/'+file,versionModules(result.outputFiles[0].text,version));
}
for(const file of classic)await writeFile('docs/'+file,(await transform(await readFile(file,'utf8'),{minify:true,target:'es2022'})).code);
const site=(await readFile('site.css','utf8')).replace(/^@import[^\r\n]*(?:\r?\n|$)/,'');
const vectorCSS=await readFile('node_modules/maplibre-gl/dist/maplibre-gl.css','utf8');
const experience=await readFile('experience.css','utf8'),dashboard=await readFile('dashboard.css','utf8')+await readFile('history.css','utf8')+await readFile('monitor.css','utf8');
for(const [file,source] of [['site.css',fontCSS+site+experience],['dashboard.css',fontCSS+site+vectorCSS+dashboard+experience],['experience.css',experience]]){
 await writeFile('docs/'+file,(await transform(source,{loader:'css',minify:true,target:'es2022'})).code);
}
await mkdir('docs/data/chunks',{recursive:true});
const manifest=JSON.parse(await readFile('data/firms.json','utf8'));let originalBytes=0,transportBytes=0;
if(manifest.chunks)for(const chunk of manifest.chunks){
 const raw=await readFile('data/'+chunk.file);originalBytes+=raw.length;
 const packed=gzipSync(JSON.stringify(packRows(JSON.parse(raw))),{level:9}),file=chunk.file.replace('.json','.compact.json.gz');
 transportBytes+=packed.length;await writeFile('docs/data/'+file,packed);
 chunk.transport={file,version:createHash('sha256').update(packed).digest('hex').slice(0,12),bytes:packed.length};
 await copyFile('data/'+chunk.file,'docs/data/'+chunk.file);
}
const active=new Set(manifest.chunks?.flatMap(c=>[c.file.split('/').at(-1),c.transport.file.split('/').at(-1)])||[]);
for(const file of await readdir('docs/data/chunks'))if(/^\d{4}-\d{2}-\d{2}_(MODIS|VIIRS)(\.compact)?\.json(\.gz)?$/.test(file)&&!active.has(file))await unlink('docs/data/chunks/'+file);
await writeFile('docs/data/firms.json',JSON.stringify(manifest));
const {data,...metadata}=manifest;await writeFile('docs/data/status.json',JSON.stringify({...metadata,observations:manifest.observationCount??data?.length??0}));
await copyFile('NASA-DATA-ANALYSIS.md','docs/data/analysis.md');
await cp('node_modules/leaflet/dist','docs/vendor/leaflet',{recursive:true});await copyFile('node_modules/leaflet/LICENSE','docs/vendor/leaflet/LICENSE');
await mkdir('docs/vendor/three',{recursive:true});await copyFile('node_modules/three/LICENSE','docs/vendor/three/LICENSE');
await mkdir('docs/vendor/lenis',{recursive:true});await copyFile('node_modules/lenis/LICENSE','docs/vendor/lenis/LICENSE');
await mkdir('docs/vendor/maplibre',{recursive:true});for(const file of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs'])await copyFile('node_modules/maplibre-gl/dist/'+file,'docs/vendor/maplibre/'+file);await copyFile('node_modules/maplibre-gl/LICENSE.txt','docs/vendor/maplibre/LICENSE.txt');
await cp('data/history','docs/data/history',{recursive:true});
await cp('data/monitor','docs/data/monitor',{recursive:true});
await copyFile('HISTORY-ANALYSIS.md','docs/data/history/analysis.md');
await cp('assets','docs/assets',{recursive:true});await writeFile('docs/.nojekyll','');
console.log(JSON.stringify({version,dataOriginalBytes:originalBytes,dataCompressedBytes:transportBytes,dataReduction:Math.round((1-transportBytes/originalBytes)*100)+'%'}));
