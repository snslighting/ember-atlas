import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('./motion-settings.js',import.meta.url),'utf8');
function setup({saved=null,reduced=false,brokenStorage=false}={}){
 const storage=new Map(saved?[['atlas-motion',saved]]:[]),attrs={},handlers={},events=[];const root={dataset:{}};
 const button={textContent:'',setAttribute:(key,value)=>attrs[key]=value,addEventListener:(name,fn)=>handlers[name]=fn};
 const media={matches:reduced,addEventListener:(name,fn)=>handlers.media=fn};
 const window={dispatchEvent:event=>events.push(event.detail)};
 vm.runInNewContext(code,{window,document:{documentElement:root,readyState:'complete',getElementById:()=>button},matchMedia:()=>media,CustomEvent:class{constructor(type,{detail}){this.detail=detail;}},localStorage:{getItem:key=>{if(brokenStorage)throw Error();return storage.get(key)||null;},setItem:(key,value)=>{if(brokenStorage)throw Error();storage.set(key,value);}}});
 return {window,root,button,attrs,handlers,storage,events,media};
}
test('saved off is applied before scene code loads and stays off on another page',()=>{const s=setup({saved:'off'});assert.equal(s.window.atlasMotion.enabled,false);assert.equal(s.root.dataset.motion,'off');assert.equal(s.attrs['aria-pressed'],'false');assert.equal(s.button.textContent,'Animations: off');});
test('the button switches live state, accessibility labels, and saved preference',()=>{const s=setup();s.handlers.click();assert.equal(s.window.atlasMotion.enabled,false);assert.equal(s.storage.get('atlas-motion'),'off');assert.equal(s.attrs['aria-label'],'Turn animations on');assert.deepEqual(s.events,[false]);s.handlers.click();assert.equal(s.window.atlasMotion.enabled,true);assert.equal(s.storage.get('atlas-motion'),'on');});
test('system reduced motion defaults to off but an explicit choice is honored',()=>{assert.equal(setup({reduced:true}).window.atlasMotion.enabled,false);assert.equal(setup({reduced:true,saved:'on'}).window.atlasMotion.enabled,true);const s=setup();s.media.matches=true;s.handlers.media();assert.equal(s.window.atlasMotion.enabled,false);});
test('unavailable storage never prevents the button working',()=>{const s=setup({brokenStorage:true});s.handlers.click();assert.equal(s.root.dataset.motion,'off');assert.equal(s.attrs['aria-pressed'],'false');});
