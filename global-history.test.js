import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {availableOn,historyTiles,decodeHistory} from './global-history.js';import {PbfWriter} from 'pbf';
test('global historical coverage retains sensor eras and explicit missing days',async()=>{
 const catalog=JSON.parse(await readFile('assets/maps/nasa-history-catalog.json','utf8'));
 assert.ok(catalog.some(s=>availableOn(s,'2000-11-01')));assert.ok(!catalog.some(s=>availableOn(s,'2000-10-31')));
 assert.ok(!catalog.filter(s=>s.id.startsWith('VIIRS')).some(s=>availableOn(s,'2011-08-01')));
 assert.ok(catalog.filter(s=>s.id.startsWith('VIIRS')).some(s=>availableOn(s,'2012-02-01')));
 assert.ok(!availableOn({ranges:['2024-01-01/2024-01-02/P1D','2024-01-04/2024-01-05/P1D']},'2024-01-03'));
});
test('geographic archive requests cover both halves of the world and narrow to visible tiles',()=>{
 assert.deepEqual(historyTiles([-180,-90,180,90],1),[{z:0,x:0,y:0},{z:0,x:1,y:0}]);
 const local=historyTiles([64,40,65,41],10);assert.ok(local.length<=4);assert.ok(local.every(t=>t.z===7));
 assert.ok(historyTiles([-180,-85,180,85],2).every(t=>t.x>=0&&t.y>=0));
});
test('archive decoding preserves reported coordinates and native confidence instead of quantized geometry',()=>{
 const p={LATITUDE:-12.12345,LONGITUDE:-62.54321,ACQ_DATE:'2024-08-01',ACQ_TIME:'03:15',CONFIDENCE:'nominal',SATELLITE:'N',FRP:12.5,SCAN:.42,TRACK:.38,VERSION:'2.0NRT',UID:5},keys=Object.keys(p),values=Object.values(p),writer=new PbfWriter();
 writer.writeMessage(3,(_,layer)=>{layer.writeStringField(1,'VIIRS_SNPP_Thermal_Anomalies_375m_All_v2_NRT');layer.writeVarintField(15,2);layer.writeVarintField(5,4096);for(const key of keys)layer.writeStringField(3,key);for(const value of values)layer.writeMessage(4,(_,w)=>{typeof value==='number'?w.writeDoubleField(3,value):w.writeStringField(1,value);},null);layer.writeMessage(2,(_,f)=>{f.writePackedVarint(2,keys.flatMap((_,i)=>[i,i]));f.writeVarintField(3,1);f.writePackedVarint(4,[9,0,0]);},null);},null);
 const source={id:'VIIRS_SNPP_Thermal_Anomalies_375m_All'},bytes=writer.finish(),rows=decodeHistory(bytes,source,'2024-08-01');assert.equal(rows.length,1);assert.equal(rows[0].lat,p.LATITUDE);assert.equal(rows[0].lon,p.LONGITUDE);assert.equal(rows[0].confidence,'nominal');assert.equal(rows[0].frp,12.5);assert.equal(rows[0].version,'2.0NRT');assert.equal(decodeHistory(bytes,source,'2024-08-02').length,0);
});
