import {footprintWeights} from './harmonization.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArea,parseArea,areaFromCorners,inArea} from './area-bounds.js';
import {createAnalyzer,exportCSV} from './map-analysis.js';
import {createAreaSelection} from './area-selection.js';
test('area corners normalize in both drag directions and include boundaries',()=>{
 const a={lng:-125,lat:32},b={lng:-114,lat:42},bounds=[-125,32,-114,42];
 assert.deepEqual(areaFromCorners(a,b),bounds);assert.deepEqual(areaFromCorners(b,a),bounds);
 assert.deepEqual(parseArea(String(bounds)),bounds);
 assert.ok(inArea({lon:-125,lat:32},bounds));assert.ok(!inArea({lon:-126,lat:32},bounds));
 for(const bad of [[0,0,0,1],[-181,0,1,1],[0,0,1,86],[0,0,NaN,1]])assert.equal(normalizeArea(bad),null);
});
test('area filters observations, statistics and export, and clearing restores global records',()=>{
 const rows=[{lat:35,lon:-120,date:'2026-10-01',confidence:90,frp:1,sensor:'MODIS'},{lat:0,lon:0,date:'2026-10-01',confidence:90,frp:2,sensor:'VIIRS'}];
 const analyze=createAnalyzer(rows),filters={region:'World',start:'2026-10-01',end:'2026-10-01',confidence:40,view:'Compare'};
 const selected=analyze({...filters,area:[-125,32,-114,42]});
 assert.equal(selected.summary.raw,1);assert.equal(selected.summary.selected,1);assert.equal(selected.summary.cells,footprintWeights(rows[0]).length);
 assert.deepEqual(selected.summary.bars.slice(0,2),[['MODIS',1],['VIIRS',0]]);
 assert.equal(exportCSV(selected.selected).split('\n').length,2);
 assert.equal(analyze({...filters,area:[10,10,20,20]}).summary.raw,0);
 assert.equal(analyze(filters).summary.raw,2);
 assert.throws(()=>analyze({...filters,area:[0,0,0,0]}));
});
test('drag and two-click selection restore map controls; Escape preserves the previous area',()=>{
 function element(){const listeners={};return {hidden:false,textContent:'',classList:{add(){},remove(){}},setAttribute(){},focus(){},setPointerCapture(){},releasePointerCapture(){},addEventListener(n,fn){listeners[n]=fn;},fire(n,event={}){listeners[n]?.(event);}};}
 const container=element(),button=element(),clearButton=element(),status=element(),doc=element(),layers=new Set(),pane={style:{}},changes=[];
 const oldDocument=globalThis.document,oldL=globalThis.L;globalThis.document=doc;
 globalThis.L={svg:()=>({}),point:(x,y)=>({x,y}),rectangle:()=>({addTo(){layers.add(this);return this;},setBounds(){}})};
 const map={getContainer:()=>container,createPane(){},getPane:()=>pane,stop(){},closePopup(){},getSize:()=>({x:360,y:170}),mouseEventToContainerPoint:e=>({x:e.clientX,y:e.clientY}),containerPointToLatLng:p=>({lng:p.x-180,lat:85-p.y}),removeLayer:l=>layers.delete(l)};
 for(const name of ['dragging','touchZoom','doubleClickZoom','boxZoom','keyboard','scrollWheelZoom']){let enabled=name!=='keyboard';map[name]={enabled:()=>enabled,enable(){enabled=true;},disable(){enabled=false;}};}
 const event=(x,y)=>({clientX:x,clientY:y,isPrimary:true,button:0,pointerId:1,target:{closest:()=>null},preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
 try{
 const selection=createAreaSelection(map,{button,clearButton,status,onChange:b=>changes.push(b)});
 button.fire('click');assert.equal(map.dragging.enabled(),false);
 container.fire('pointerdown',event(55,53));container.fire('pointermove',event(66,43));container.fire('pointerup',event(66,43));
 assert.deepEqual(selection.bounds,[-125,32,-114,42]);assert.equal(map.dragging.enabled(),true);assert.equal(map.keyboard.enabled(),false);assert.equal(changes.length,1);
 button.fire('click');doc.fire('keydown',{key:'Escape',preventDefault(){},stopImmediatePropagation(){}});
 assert.deepEqual(selection.bounds,[-125,32,-114,42]);assert.equal(changes.length,1);
 clearButton.fire('click');assert.equal(selection.bounds,null);assert.equal(clearButton.hidden,true);
 button.fire('click');container.fire('pointerdown',event(180,85));container.fire('pointerup',event(180,85));
 assert.equal(selection.active,true);
 container.fire('pointerdown',event(190,75));container.fire('pointerup',event(190,75));
 assert.deepEqual(selection.bounds,[0,0,10,10]);assert.equal(selection.active,false);assert.equal(layers.size,1);
 }finally{globalThis.document=oldDocument;globalThis.L=oldL;}
});
