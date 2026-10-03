import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parseHTML} from 'linkedom';import {createAnalyzer} from './map-analysis.js';
test('observatory app starts, loads NASA summaries and registers a country polygon before filtering',async()=>{
 const {document,window}=parseHTML(await readFile('observatory.html','utf8'));Object.assign(globalThis,{document,window,location:{search:'',href:'http://local/observatory.html'},devicePixelRatio:1});window.atlasMotion={enabled:false};window.innerWidth=1200;
 for(const a of document.querySelectorAll('a[href]'))if(a.getAttribute('href').startsWith('./'))a.href=new URL(a.getAttribute('href'),location.href).href;
 function select(node){if(node.localName!=='select')return;Object.defineProperty(node,'value',{get(){return [...this.options].find(o=>o.selected)?.value||this.options[0]?.value||'';},set(value){for(const o of this.options)o.selected=o.value===String(value);},configurable:true});}
 document.querySelectorAll('select').forEach(select);
 const ctx={scale(){},setTransform(){},clearRect(){},beginPath(){},arc(){},fill(){},measureText:s=>({width:s.length*7}),strokeText(){},fillText(){}},create=document.createElement.bind(document);
 document.createElement=name=>{const node=create(name);select(node);if(name==='canvas')node.getContext=()=>ctx;return node;};
 globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;}observe(){queueMicrotask(this.callback);}};
 globalThis.requestAnimationFrame=fn=>queueMicrotask(fn);globalThis.localStorage={getItem:()=>null,setItem(){}};
 const originalInterval=globalThis.setInterval,oldFetch=globalThis.fetch;globalThis.setInterval=()=>1;globalThis.fetch=async url=>new Response(await readFile(url.split('?')[0].replace('./','')));
 const packets=[],rows=[{lon:69.24,lat:41.3,date:'2026-10-02',time:'12:00',confidence:90,frp:10,sensor:'VIIRS'},{lon:-77.04,lat:38.9,date:'2026-10-02',time:'11:00',confidence:90,frp:5,sensor:'MODIS'}],analyze=createAnalyzer(rows),registry=new Map();
 globalThis.Worker=class{postMessage(packet){packets.push(packet);queueMicrotask(()=>{let result;if(packet.type==='load')result={dateStart:'2026-10-02',dateEnd:'2026-10-02',retrievedAt:new Date().toISOString(),message:'NASA test fixture'};else if(packet.type==='boundary'){registry.set(packet.args.id,packet.args);result=true;}else if(packet.type==='analyze')result=analyze({...packet.args,boundary:registry.get(packet.args.boundaryID)}).summary;else if(packet.type==='points')result={bins:[],visible:0};this.onmessage({data:{id:packet.id,result}});});}};
 const panes=new Map(),events=new Map();let center={lat:0,lng:0},zoom=3;
 const map={options:{},getContainer:()=>document.getElementById('map'),createPane(n){panes.set(n,document.createElement('div'));},getPane:n=>panes.get(n),getSize:()=>({x:900,y:500}),getCenter:()=>center,getZoom:()=>zoom,getPixelBounds:()=>({min:{x:0,y:0}}),setView(c,z){center={lat:c[0],lng:c[1]};zoom=z;return this;},setMinZoom(){},invalidateSize(){},fitBounds(){zoom=6;},stop(){},closePopup(){},removeLayer(){},on(names,fn,context){for(const n of names.split(' ')){if(!events.has(n))events.set(n,[]);events.get(n).push(e=>fn.call(context,e));}},fire(n,e){events.get(n)?.forEach(fn=>fn(e));},off(){},containerPointToLayerPoint:()=>({x:0,y:0}),latLngToContainerPoint:()=>({x:-50,y:-50}),zoomControl:{setPosition(){}},attributionControl:{addAttribution(){},removeAttribution(){}}};
 for(const h of ['dragging','touchZoom','doubleClickZoom','boxZoom','keyboard','scrollWheelZoom'])map[h]={enabled:()=>true,enable(){},disable(){}};
 map.createPane('overlayPane');const layer=()=>({addTo(){return this;},on(){return this;},setBounds(){}});
 globalThis.L={map:()=>map,canvas:o=>o,svg:o=>o,geoJSON:layer,polygon:layer,rectangle:layer,tileLayer:layer,DomUtil:{create:(name,cls)=>{const el=document.createElement(name);el.className=cls;return el;},setPosition(){}},Layer:{extend(spec){return class{constructor(){Object.assign(this,spec);}addTo(){this.onAdd?.();return this;}}}}};
 try{
 await import('./app.js');await new Promise(resolve=>setTimeout(resolve,80));assert.ok(packets.some(p=>p.type==='analyze'));assert.ok(document.getElementById('metrics').textContent.includes('2'));
 document.getElementById('country-search').value='Uzbekistan';document.getElementById('country-search-form').onsubmit({preventDefault(){}});await new Promise(resolve=>setTimeout(resolve,80));
 assert.ok(packets.some(p=>p.type==='boundary'&&p.args.id==='UZB'));assert.ok(document.getElementById('boundary-info').textContent.includes('Uzbekistan'));assert.equal(packets.filter(p=>p.type==='analyze').at(-1).args.boundaryID,'UZB');
 assert.ok(document.getElementById('map-page-link').href.includes('country=UZB'));assert.ok(!document.getElementById('status').textContent.includes('failed'));
 document.getElementById('enlarge-map').click();assert.ok(document.querySelector('.map-panel').classList.contains('explorer-full'));document.getElementById('map-exit').click();assert.ok(!document.body.classList.contains('map-expanded'));
 }finally{globalThis.setInterval=originalInterval;globalThis.fetch=oldFetch;}
});
