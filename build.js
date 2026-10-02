import {mkdir,readFile,writeFile,copyFile,cp} from 'node:fs/promises';
import {releaseVersion,versionHTML,versionModules} from './build-assets.js';
const pages=['index.html','observatory.html','map.html','method.html'];
const files=['scene-layout.js','analysis-worker.js','map-analysis.js','hotspot-layer.js','basemaps.js','animation-loop.js','motion-settings.js','map-policy.js','app.js','core.js','provider.js','refresh-state.js','site.css','experience.css','dashboard.css','landing.js','earth.js','motion.js','navigation.js'];
const version=releaseVersion(await Promise.all([...pages,...files,'build-assets.js'].map(p=>readFile(p,'utf8'))));
await mkdir('docs',{recursive:true});
for(const page of pages){let html=await readFile(page,'utf8');html=html.replace('<html lang="en">','<html lang="en" data-host="static">').replaceAll('./node_modules/leaflet/dist/','./vendor/leaflet/');await writeFile('docs/'+page,versionHTML(html,version));}
await mkdir('docs/data',{recursive:true});await copyFile('data/firms.json','docs/data/firms.json');const manifest=JSON.parse(await readFile('data/firms.json','utf8'));if(manifest.chunks){await mkdir('docs/data/chunks',{recursive:true});for(const chunk of manifest.chunks)await copyFile('data/'+chunk.file,'docs/data/'+chunk.file);}await copyFile('NASA-DATA-ANALYSIS.md','docs/data/analysis.md');
const snapshot=JSON.parse(await readFile('data/firms.json','utf8'));const {data,...metadata}=snapshot;await writeFile('docs/data/status.json',JSON.stringify({...metadata,observations:snapshot.observationCount??data?.length??0}));
for(const file of files){const source=await readFile(file,'utf8');await writeFile('docs/'+file,file.endsWith('.js')?versionModules(source,version):source);}
await cp('node_modules/leaflet/dist','docs/vendor/leaflet',{recursive:true});await copyFile('node_modules/leaflet/LICENSE','docs/vendor/leaflet/LICENSE');
await mkdir('docs/vendor/three',{recursive:true});for(const file of ['three.module.js','three.core.js'])await copyFile('node_modules/three/build/'+file,'docs/vendor/three/'+file);await copyFile('node_modules/three/LICENSE','docs/vendor/three/LICENSE');
await mkdir('docs/vendor/lenis',{recursive:true});await copyFile('node_modules/lenis/dist/lenis.mjs','docs/vendor/lenis/lenis.mjs');await copyFile('node_modules/lenis/LICENSE','docs/vendor/lenis/LICENSE');
await cp('assets','docs/assets',{recursive:true});await writeFile('docs/.nojekyll','');
console.log('Built all pages with release '+version+' and actual NASA data.');
