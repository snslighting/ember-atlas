import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./navigation.js',import.meta.url),'utf8');
function setup({native=false,reduced=false,off=false,travel=null}={}){
 const handlers={},classes=new Set(),storage=new Map(),timers=[],visits=[],events=[];
 if(travel)storage.set('atlas-travel',JSON.stringify(travel));
 const root={dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
 const window={atlasMotion:{enabled:!off&&!reduced},addEventListener:(name,fn)=>handlers[name]=fn,dispatchEvent:e=>events.push(e.type)};if(native)window.onpagereveal=null;
 const context={URL,Date,Event,window,document:{documentElement:root,addEventListener:(name,fn)=>handlers[name]=fn},location:{href:'https://example.org/ember-atlas/index.html',origin:'https://example.org',pathname:'/ember-atlas/index.html',assign:url=>visits.push(url)},CSS:{supports:()=>native},matchMedia:()=>({matches:reduced}),sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:fn=>timers.push(fn)};
 vm.runInNewContext(source,context);
 function click(href,extra={}){let prevented=false;const link={href:new URL(href,context.location.href).href,target:'',hasAttribute:()=>false};handlers.click({target:{closest:()=>link},button:0,preventDefault:()=>prevented=true,...extra});return prevented;}
 return {click,classes,storage,timers,visits,events,root,handlers};
}
test('fallback swipes before navigating and preserves scene orientation',()=>{
 const s=setup();assert.equal(s.click('./observatory.html'),true);assert.ok(s.classes.has('page-leave'));assert.equal(s.visits.length,0);assert.ok(s.events.includes('atlas-navigation'));s.timers[0]();assert.equal(s.visits[0],'https://example.org/ember-atlas/observatory.html');assert.equal(JSON.parse(s.storage.get('atlas-travel')).direction,'forward');
});
test('disabled animations and reduced motion navigate without waiting',()=>{
 for(const options of [{off:true},{reduced:true}]){const s=setup(options);assert.equal(s.click('./method.html'),false);assert.equal(s.timers.length,0);}
});
test('modified, external and same-document links are never intercepted',()=>{
 const s=setup();for(const [href,extra] of [['./method.html',{ctrlKey:true}],['./method.html',{button:1}],['https://elsewhere.org/method.html',{}],['#mission',{}]])assert.equal(s.click(href,extra),false);assert.equal(s.timers.length,0);assert.equal(s.storage.size,0);
});
test('incoming fallback starts the sheet entrance and consumes the travel marker',()=>{
 const s=setup({travel:{to:'/ember-atlas/index.html',direction:'back',time:Date.now()}});assert.ok(s.classes.has('page-enter'));assert.equal(s.root.dataset.direction,'back');assert.equal(s.storage.has('atlas-travel'),false);
});

test('the old sheet leaves immediately even with native transition support',()=>{const s=setup({native:true});assert.equal(s.click('./observatory.html'),true);assert.ok(s.classes.has('page-leave'));assert.equal(s.visits.length,0);s.timers[0]();assert.equal(s.visits.length,1);});
test('a second click cannot start a competing departure',()=>{const s=setup();s.click('./observatory.html');assert.equal(s.click('./method.html'),true);assert.equal(s.timers.length,1);});
