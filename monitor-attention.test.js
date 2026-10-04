import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';
import {latestPixelLocation,pixelCoordinates,createAttentionCard,worldwideAttention,focusAttention} from './monitor-attention.js';
const native=(lat,lon,time)=>({lat,lon,date:'2024-08-01',time,sensor:'VIIRS',satellite:'NOAA-20',scan:.42,track:.38,confidenceRaw:'n'});
test('attention coordinates preserve a native pixel rather than a support centroid and resolve same-time ties deterministically',()=>{
 const records=new Map([['old',native(41,65,'00:00')],['b',native(41.12345,65.54321,'08:00')],['a',native(41.23456,65.65432,'08:00')]]);
 const location=latestPixelLocation(['old','b','a'],records);assert.equal(pixelCoordinates(location),'41.23456, 65.65432');assert.equal(location.sourceID,'a');assert.equal(location.acquiredAt,'2024-08-01T08:00:00Z');assert.equal(location.scan,.42);assert.deepEqual(latestPixelLocation(['a','old','b'],records),location);
 assert.equal(latestPixelLocation(['missing'],records),null);assert.equal(pixelCoordinates(null),null);
});
test('worldwide attention includes other regions even when archived-area groups dominate, without changing evidence states',()=>{
 const make=(id,center,state='Insufficient history')=>({id,center,state,stale:false,sensors:['MODIS','VIIRS'],acquisitionGroups:3,latestTime:100,durationHours:8,trend:{state:'Stable'},context:{available:state==='Elevated'}});
 const local=Array.from({length:300},(_,i)=>make('uz-'+i,[41,65],'Elevated')),other=[make('america',[39,-120]),make('amazon',[-12,-62]),make('africa',[0,25]),make('australia',[-25,135])],events=[...local,...other],before=JSON.stringify(events),queue=worldwideAttention(events,10);
 for(const e of other)assert.ok(queue.some(item=>item.id===e.id),e.id);assert.equal(queue.length,10);assert.equal(new Set(queue.map(e=>e.id)).size,10);assert.equal(JSON.stringify(events),before);assert.deepEqual(worldwideAttention([...events].reverse(),10).map(e=>e.id),queue.map(e=>e.id));
});
test('activity focus synchronously points to a source pixel, or labels a missing-source representative center',()=>{
 const calls=[],map={select:id=>calls.push(['select',id]),locate:location=>calls.push(['locate',location])},location={lat:40.12345,lon:68.54321};focusAttention({id:'a',location,center:[0,0]},map);assert.deepEqual(calls,[['select','a'],['locate',location]]);calls.length=0;focusAttention({id:'b',location:null,center:[41,65]},map);assert.deepEqual(calls,[['select','b'],['locate',{lat:41,lon:65,kind:'group'}]]);
});
test('attention cards have independent inspect, locate and copy actions without nested buttons',()=>{
 const {document}=parseHTML('<html><body></body></html>'),location=latestPixelLocation(['a'],new Map([['a',native(-12.12345,65.54321,'08:00')]]));
 const e={id:'EA-1',state:'Watch',harmonizedCells:8,trend:{state:'Stable'},context:{available:false},freshness:'Fresh',durationHours:4,center:[0,0],location};let inspected=null,located=null,copied=null;
 const card=createAttentionCard(e,{document,selected:e.id,onInspect:id=>inspected=id,onLocate:(id,l)=>located={id,l},onCopy:(b,c)=>copied=c});
 assert.equal(card.querySelectorAll('button button').length,0);assert.ok(card.classList.contains('selected'));assert.ok(card.textContent.includes('Latest reported pixel center'));assert.ok(card.textContent.includes('-12.12345, 65.54321'));
 card.querySelector('.event-inspect').click();card.querySelector('.event-quick-actions button').click();card.querySelector('.event-quick-actions button:last-child').click();assert.equal(inspected,e.id);assert.deepEqual(located,{id:e.id,l:location});assert.equal(copied,'-12.12345, 65.54321');
 const retained=createAttentionCard({...e,location:null},{document,onInspect(){},onLocate(){}});assert.ok(retained.textContent.includes('Representative group center'));assert.equal(retained.querySelectorAll('.event-quick-actions button').length,1);assert.ok(!retained.textContent.includes('Copy coordinates'));
});
