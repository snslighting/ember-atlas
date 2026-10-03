import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parseHTML} from 'linkedom';import {createMapShell} from './map-shell.js';
test('map occupies a nonzero grid track when embedded, enlarged, or its sidebar is closed',async()=>{
 const {document,window}=parseHTML(await readFile('observatory.html','utf8'));Object.assign(globalThis,{document,window});globalThis.requestAnimationFrame=fn=>fn();
 const style=document.createElement('style');style.textContent=await readFile('dashboard.css','utf8');document.head.append(style);
 const panel=document.querySelector('.map-panel'),shell=createMapShell(panel),stage=panel.querySelector('.explorer-stage'),frame=panel.querySelector('.explorer-frame'),sidebar=panel.querySelector('.explorer-sidebar');
 function resolved(element,property,width){let value='',priority=-1;
  function visit(rules){for(const rule of rules){if(rule.cssRules){const max=rule.media?.mediaText.match(/max-width:\s*(\d+)px/);if(!max||width<=Number(max[1]))visit(rule.cssRules);continue;}
   const declaration=rule.style?.getPropertyValue(property);if(!declaration)continue;
   for(const selector of rule.selectorText.split(',')){if(/::|:(?:before|after)\b/.test(selector)||!element.matches(selector.trim()))continue;const score=(selector.match(/#[\w-]+/g)||[]).length*100+(selector.match(/\.[\w-]+|\[[^\]]*\]/g)||[]).length*10;
    if(score>=priority){priority=score;value=declaration;}
   }
  }}visit(style.sheet.cssRules);return value;
 }
 for(const width of [390,1200]){
  shell.setExpanded(false);
  for(const mode of ['embedded','expanded','closed-sidebar']){
   if(mode==='expanded')shell.setExpanded(true);if(mode==='closed-sidebar')document.getElementById('sidebar-toggle').click();
   const columns=resolved(frame,'grid-template-columns',width).replace(/\([^)]*\)/g,x=>x.replace(/\s/g,'')).split(/\s+/),column=Number(resolved(stage,'grid-column',width));
   assert.ok(column>=1&&column<=columns.length,width+' '+mode+' has a valid map column');
   assert.ok(!['0','0px'].includes(columns[column-1]),width+' '+mode+' map track has width');
   if(resolved(sidebar,'display',width)==='none')assert.equal(columns.length,1,width+' '+mode+' uses the full frame');
   if(mode==='closed-sidebar')document.getElementById('sidebar-toggle').click();
  }
 }
});
