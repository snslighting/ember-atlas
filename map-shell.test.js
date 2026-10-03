import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parseHTML} from 'linkedom';import {createMapShell} from './map-shell.js';
test('embedded explorer moves and restores the same controls without losing listeners or duplicating IDs',async()=>{
 const {document,window}=parseHTML(await readFile('observatory.html','utf8'));globalThis.document=document;globalThis.window=window;globalThis.requestAnimationFrame=fn=>fn();
 const panel=document.querySelector('.map-panel'),filters=document.querySelector('.filters'),originalParent=filters.parentNode,exportButton=document.getElementById('export');
 let clicks=0;exportButton.onclick=()=>clicks++;const shell=createMapShell(panel);assert.ok(!panel.classList.contains('explorer-full'));
 shell.setExpanded(true);document.body.append(panel);assert.ok(filters.closest('.explorer-sidebar'));assert.ok(exportButton.closest('.explorer-sidebar'));exportButton.click();assert.equal(clicks,1);
 document.getElementById('sidebar-toggle').click();assert.ok(panel.classList.contains('sidebar-collapsed'));assert.equal(document.getElementById('sidebar-toggle').getAttribute('aria-expanded'),'false');
 shell.setExpanded(false);originalParent.insertBefore(panel,document.getElementById('activity'));assert.equal(filters.nextElementSibling.id,'metrics');assert.equal(document.getElementById('metrics').nextElementSibling,panel);assert.equal(filters.parentNode,originalParent);assert.equal(document.getElementById('export'),exportButton);exportButton.click();assert.equal(clicks,2);
 shell.setExpanded(true);shell.setExpanded(false);const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
});
test('full-page map starts with all observation controls in the sidebar',async()=>{
 const {document,window}=parseHTML(await readFile('map.html','utf8'));globalThis.document=document;globalThis.window=window;globalThis.requestAnimationFrame=fn=>fn();
 const shell=createMapShell(document.querySelector('.map-panel'));assert.equal(shell.expanded,true);
 for(const id of ['region','confidence','start','end','metrics','export','calendar'])assert.ok(document.getElementById(id).closest('.explorer-sidebar'),id);
});

test('on-map boundary Back and close stay available while the sidebar is collapsed',async()=>{
 const {document,window}=parseHTML(await readFile('observatory.html','utf8'));globalThis.document=document;globalThis.window=window;globalThis.requestAnimationFrame=fn=>fn();
 const panel=document.querySelector('.map-panel'),shell=createMapShell(panel);let back=0,clear=0;
 document.getElementById('boundary-back').onclick=()=>back++;document.getElementById('boundary-clear').onclick=()=>clear++;
 shell.showSelection('Bukhara',{backLabel:'Back to Uzbekistan'});
 const nav=panel.querySelector('.map-boundary-nav');assert.equal(nav.hidden,false);assert.ok(nav.closest('.explorer-stage'));assert.ok(!nav.closest('.explorer-sidebar'));
 assert.equal(document.getElementById('map-boundary-back').textContent,'← Back to Uzbekistan');
 document.getElementById('map-boundary-back').click();document.getElementById('map-boundary-close').click();assert.equal(back,1);assert.equal(clear,1);
 shell.setExpanded(true);document.getElementById('sidebar-toggle').click();assert.equal(nav.hidden,false);document.getElementById('map-boundary-close').click();assert.equal(clear,2);
 shell.showSelection(null);assert.equal(nav.hidden,true);
});


test('Analyze keeps its activity calendar below the normal map and out of the enlarged sidebar',async()=>{const {document,window}=parseHTML(await readFile('history.html','utf8'));globalThis.document=document;globalThis.window=window;globalThis.requestAnimationFrame=fn=>fn();const calendar=document.querySelector('.history-calendar-card'),activity=document.getElementById('activity'),comparison=document.getElementById('history-comparison'),shell=createMapShell(document.querySelector('.map-panel'),{keepOutside:[calendar]});shell.setExpanded(true);assert.equal(calendar.parentElement,activity);assert.ok(!calendar.closest('.explorer-sidebar'));assert.ok(comparison.closest('.explorer-sidebar'));shell.setExpanded(false);assert.equal(calendar.parentElement,activity);assert.equal(comparison.parentElement,activity);assert.equal(activity.firstElementChild,calendar);});
