import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnimationLoop} from './animation-loop.js';
test('turning animations off cancels the pending render and schedules no more work',()=>{
 let enabled=true,visible=true,id=0,ticks=0;const pending=new Map();
 const loop=createAnimationLoop({enabled:()=>enabled,visible:()=>visible,tick:()=>ticks++,request:fn=>{pending.set(++id,fn);return id;},cancel:id=>pending.delete(id)});
 loop.start();assert.equal(pending.size,1);const [first,fn]=pending.entries().next().value;pending.delete(first);fn(16);assert.equal(ticks,1);assert.equal(pending.size,1);
 enabled=false;loop.sync();assert.equal(pending.size,0);loop.start();assert.equal(pending.size,0);
 enabled=true;loop.sync();assert.equal(pending.size,1);visible=false;loop.sync();assert.equal(pending.size,0);visible=true;loop.sync();assert.equal(pending.size,1);loop.stop();assert.equal(pending.size,0);
});
test('starting with animations off performs no rendering or frame scheduling',()=>{let calls=0;const loop=createAnimationLoop({enabled:()=>false,visible:()=>true,tick:()=>calls++,request:()=>{calls++;return 1;},cancel:()=>calls++});loop.start();loop.sync();assert.equal(calls,0);});
