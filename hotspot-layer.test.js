import test from 'node:test';import assert from 'node:assert/strict';import {createHotspotLayer} from './hotspot-layer.js';
test('canvas survives same-size redraws and drag hit testing follows the map',()=>{
 let allocations=0,zoom=3,pan=0,inspected=null;const ctx={setTransform(){},clearRect(){},beginPath(){},arc(){},fill(){},fillText(){}};
 const canvas={style:{},getContext:()=>ctx,remove(){},_width:0,_height:0,set width(v){allocations++;this._width=v;},get width(){return this._width;},set height(v){allocations++;this._height=v;},get height(){return this._height;}};
 globalThis.devicePixelRatio=2;
 globalThis.L={Layer:{extend:methods=>class{constructor(){Object.assign(this,methods);}addTo(){this.onAdd();return this;}}},DomUtil:{create:()=>canvas,setPosition(){}}};
 const map={getPane:()=>({append(){}}),on(){},off(){},getSize:()=>({x:800,y:500}),getZoom:()=>zoom,containerPointToLayerPoint:()=>({x:0,y:0}),layerPointToContainerPoint:p=>({x:p.x+pan,y:p.y})};
 const layer=createHotspotLayer(map,bin=>inspected=bin),bin={x:100,y:100,count:2,sensor:'VIIRS'};
 layer.paint([bin]);assert.equal(allocations,2);layer.paint([bin]);assert.equal(allocations,2);
 pan=50;layer.click({containerPoint:{x:150,y:100}});assert.equal(inspected,bin);
 inspected=null;zoom=4;layer.zoomEnd();layer.click({containerPoint:{x:150,y:100}});assert.equal(inspected,null);assert.equal(canvas.style.visibility,'hidden');
 layer.paint([bin]);assert.equal(canvas.style.visibility,'');layer.onRemove();
});
