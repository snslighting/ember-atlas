import test from 'node:test';import assert from 'node:assert/strict';
import {mergeCellSnapshots} from './append-live-history.js';import {addHistoricalObservation} from './history-core.js';
const rows=(date,products)=>{const cells=new Map();for(const [product,frp,time] of products)addHistoricalObservation(cells,{date,lat:41.3,lon:69.24,time,confidence:80,satellite:product,frp},product);return [...cells.values()];};
test('new NRT replaces its product/date, preserves other satellites and earlier dates, and updates provenance',()=>{
 const old=[...rows('2026-10-01',[['MODIS_NRT',20,'10:00'],['VIIRS_SNPP_NRT',8,'11:00'],['VIIRS_NOAA20_NRT',100,'12:00']]),...rows('2026-09-30',[['MODIS_NRT',3,'10:00']])];
 const fresh=rows('2026-10-01',[['MODIS_NRT',5,'13:00']]),coverage=['MODIS_NRT','VIIRS_NOAA20_NRT'].map(product=>({product,start:'2026-10-01',end:'2026-10-01',processing:'NRT'}));
 const merged=mergeCellSnapshots(old,fresh,coverage),c=merged.find(c=>c.date==='2026-10-01');
 assert.equal(c.m,1);assert.equal(c.s,1);assert.equal(c.j,0);assert.equal(c.frp,8);assert.equal(c.timeStart,'11:00');assert.equal(c.timeEnd,'13:00');assert.ok(!c.products.includes('VIIRS_NOAA20_NRT'));assert.equal(merged.length,2);
 assert.deepEqual(mergeCellSnapshots(merged,fresh,coverage),merged);assert.equal(old[0].j,1);
});
