import test from 'node:test';import assert from 'node:assert/strict';import {planetLayout} from './scene-layout.js';
test('star mask follows desktop globe silhouette across viewport sizes',()=>{
 for(const width of [700,1440,2560]){const layout=planetLayout({width,height:900});assert.equal(layout.x,width*.68);assert.equal(layout.y,450);assert.equal(layout.radius,width*.34);}
});
test('mobile mask respects the landing stage offset and WebGL vertical placement',()=>{
 const rect={left:0,top:360,width:390,height:540},staticGlobe=planetLayout(rect),webgl=planetLayout(rect,true);
 assert.equal(staticGlobe.x,195);assert.equal(staticGlobe.y,630);assert.equal(staticGlobe.radius,390*.94/2);
 assert.ok(Math.abs(webgl.y-(630+.12/2.9*390*.94))<1e-9);
});
