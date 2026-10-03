import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parseHTML} from 'linkedom';
import {createMapShell} from './map-shell.js';import {createBoundaryExplorer} from './boundary-explorer.js';
test('double-click country then region focuses boundaries and updates the summary box; clearing cancels pending drill-down',async()=>{
 const {document,window}=parseHTML(await readFile('observatory.html','utf8'));Object.assign(globalThis,{document,window,devicePixelRatio:1});window.atlasMotion={enabled:true};globalThis.requestAnimationFrame=fn=>fn();createMapShell(document.querySelector('.map-panel'));
 const picker=document.getElementById('region-picker');Object.defineProperty(picker,'value',{get(){return [...this.options].find(o=>o.selected)?.value||'';},set(value){for(const o of this.options)o.selected=o.value===value;}});
 const canvasContext={scale(){},measureText:s=>({width:s.length*7}),strokeText(){},fillText(){}};
 const oldCreate=document.createElement.bind(document);document.createElement=name=>{const node=oldCreate(name);if(name==='canvas')node.getContext=()=>canvasContext;return node;};
 const panes=new Map(),events=new Map(),layers=new Set(),calls=[],requests=[];let zoom=3,blocked=null;
 const fakeLayer=options=>({options,addTo(){layers.add(this);return this;}});
 const map={getContainer:()=>document.getElementById('map'),createPane(name){const el=document.createElement('div');panes.set(name,el);},getPane:name=>panes.get(name),doubleClickZoom:{disable(){}},attributionControl:{addAttribution(){}},on(names,fn,context){for(const n of names.split(' '))events.set(n,e=>fn.call(context,e));},getSize:()=>({x:900,y:700}),getZoom:()=>zoom,containerPointToLayerPoint:()=>[0,0],latLngToContainerPoint:()=>({x:-100,y:-100}),closePopup(){},fitBounds(bounds){zoom=6;calls.push(bounds);},removeLayer:l=>layers.delete(l)};
 globalThis.L={canvas:o=>o,svg:o=>o,geoJSON:(g,o)=>fakeLayer(o),polygon:(g,o)=>fakeLayer(o),DomUtil:{create:name=>document.createElement(name),setPosition(){}},Layer:{extend(spec){return class{constructor(){Object.assign(this,spec);}addTo(){this.onAdd();return this;}}}}};
 const oldFetch=globalThis.fetch;globalThis.fetch=async url=>{requests.push(url);if(blocked&&url.endsWith('JPN.json'))await blocked.promise;return new Response(await readFile(url.replace('./','')));};
 const selections=[],notices=[];let cleared=0;
 try{
 const explorer=createBoundaryExplorer(map,{isDrawing:()=>false,onSelect:f=>selections.push(f),onClear:()=>cleared++,onNotice:n=>notices.push(n),getPadding:()=>[30,40]});assert.equal(await explorer.ready,true);
 assert.ok(!requests.some(u=>u.includes('/countries/')));
 await events.get('dblclick')({latlng:{lng:69.24,lat:41.3}});assert.equal(explorer.country.properties.name,'Uzbekistan');assert.equal(explorer.selected.id,'UZB');
 assert.equal(document.getElementById('region-picker').querySelectorAll('option').length,15);assert.equal(selections.length,1);
 await events.get('dblclick')({latlng:{lng:69.24,lat:41.3}});assert.notEqual(explorer.selected.id,'UZB');assert.equal(explorer.selected.properties.name,'Tashkent');assert.equal(selections.length,2);
 explorer.showSummary({selected:17,raw:23,cells:19,overlap:3,bars:[['MODIS',6],['VIIRS',17]],maxFrp:42,latest:'2026-10-02 12:00'},{start:'2026-09-28',end:'2026-10-02',confidence:40,view:'VIIRS',day:null});
 assert.ok(document.getElementById('boundary-info').textContent.includes('17'));assert.ok(document.getElementById('boundary-info').textContent.includes('42 MW'));
 assert.ok([...layers].some(l=>l.options?.pane==='boundaryMask'));assert.equal(calls.length,2);
 blocked={};blocked.promise=new Promise(resolve=>blocked.resolve=resolve);const pending=explorer.selectCountry('JPN');await Promise.resolve();explorer.clear();blocked.resolve();await pending;
 assert.equal(explorer.selected,null);assert.equal(cleared,1);assert.equal(notices.at(-1),null);assert.ok(![...layers].some(l=>l.options?.pane==='boundaryMask'));
 }finally{globalThis.fetch=oldFetch;}
});
