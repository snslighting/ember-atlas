import test from 'node:test';
import assert from 'node:assert/strict';
import {minimumWorldZoom,mapOptions,tileOptions} from './map-policy.js';
test('the full world can fit in the map at its minimum zoom',()=>{
 for(const size of [{x:340,y:410},{x:1350,y:490},{x:2500,y:1100},{x:0,y:0}]){
  const zoom=minimumWorldZoom(size);assert.ok(zoom>=0);if(Math.min(size.x,size.y)>=256)assert.ok(256*2**zoom<=Math.min(size.x,size.y));
 }
});
test('tiles and panning share the same non-wrapping world boundary',()=>{
 assert.deepEqual(mapOptions.maxBounds,tileOptions.bounds);assert.equal(tileOptions.noWrap,true);assert.equal(mapOptions.maxBoundsViscosity,1);assert.equal(mapOptions.inertia,false);
});
