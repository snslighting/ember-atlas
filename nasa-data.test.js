import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {regions,harmonize,parseCSV,inRegion} from './core.js';
import {readSnapshot} from './read-snapshot.js';
const snapshot=await readSnapshot();
test('NASA snapshot includes both products for every region with traceable observations',()=>{
  assert.equal(snapshot.source,'firms');assert.equal(snapshot.requests.length,2);assert.ok(snapshot.data.length>0);
  assert.equal(snapshot.requests.reduce((s,r)=>s+r.observations,0),snapshot.data.length);
  for(const r of snapshot.data){assert.ok(inRegion(r,'World'));assert.match(r.date,/^\d{4}-\d{2}-\d{2}$/);assert.match(r.time,/^\d{2}:\d{2}$/);assert.ok(Number.isFinite(r.confidence)&&r.confidence>=0&&r.confidence<=100);assert.ok((Number.isFinite(r.frp)&&r.frp>=0)||(r.frp===null&&'frpRaw' in r));assert.ok(r.product&&r.confidenceRaw!==undefined&&r.satellite);}
});
test('NASA aggregation preserves all observation counts, time bounds, and product provenance',()=>{
  const rows=snapshot.data.filter(r=>inRegion(r,'California'));const cells=harmonize(rows);
  assert.ok(Math.abs(cells.reduce((s,r)=>s+r.evidenceWeight,0)-rows.length)<1e-7);
  assert.equal(new Set(cells.flatMap(r=>r.sourceObservationIDs)).size,rows.length);
  assert.ok(cells.every(r=>r.timeStart<=r.timeEnd&&r.products.length&&r.satellites.length));
});
test('FIRMS parser preserves original confidence, satellite, and dimensions',()=>{
 const [r]=parseCSV('latitude,longitude,acq_date,acq_time,confidence,frp,satellite,daynight,scan,track,version\n40,65,2026-09-27,530,h,12,N20,D,0.4,0.5,2.0NRT','VIIRS');
 assert.equal(r.confidenceRaw,'h');assert.equal(r.satellite,'N20');assert.equal(r.scan,.4);assert.equal(r.daynight,'D');
});
test('official public CSV full confidence labels normalize like API codes',()=>{
 const rows=parseCSV('latitude,longitude,acq_date,acq_time,confidence,frp\n40,65,2026-09-27,530,nominal,12\n40,65,2026-09-27,530,high,12\n40,65,2026-09-27,530,low,12','VIIRS');
 assert.deepEqual(rows.map(r=>r.confidence),[70,95,30]);assert.equal(rows[0].confidenceRaw,'nominal');
});
