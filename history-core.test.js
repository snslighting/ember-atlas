import test from 'node:test';import assert from 'node:assert/strict';
import {addHistoricalObservation,dailyStatistics,fitCalibration,activity,seasonalContext,monthlyCalendar,encodeCells,decodeCells,cellsCSV} from './history-core.js';
import {parseCSV} from './core.js';import {historyLiveCounts} from './map-analysis.js';
const day=(date,m,s,j=null,processing='SP')=>({date,m,s,j,n:null,mRaw:m||0,sRaw:s||0,jRaw:j||0,nRaw:0,cells:Math.max(m||0,s||0,j||0),viirsCells:Math.max(s||0,j||0),shared:Math.min(m||0,s||0),processing});
const model={factors:{s:{factor:.5},j:{factor:.25},n:{factor:null}}};
test('common cells retain source counts, product, timing and FRP without inventing missing measurements',()=>{
 const cells=new Map(),row={date:'2020-08-01',time:'12:10',lat:41.30,lon:69.24,confidence:70,frp:null,satellite:'N'};
 assert.equal(addHistoricalObservation(cells,row,'VIIRS_SNPP_SP'),true);addHistoricalObservation(cells,{...row,time:'13:20',frp:12},'VIIRS_SNPP_SP');addHistoricalObservation(cells,{...row,satellite:'Terra',frp:-1},'MODIS_SP');
 assert.equal(addHistoricalObservation(cells,{...row,confidence:30},'VIIRS_SNPP_SP'),false);
 const c=[...cells.values()][0];assert.equal(c.s,2);assert.equal(c.m,1);assert.equal(c.frp,12);assert.equal(c.timeEnd,'13:20');assert.deepEqual(decodeCells(encodeCells([c])),[c]);assert.match(cellsCSV([c]),/"3"$/);
});
test('missing product coverage stays null, while a covered day with no detections stays zero',()=>{
 const days=dailyStatistics([],[{product:'MODIS_SP',start:'2001-01-01',end:'2001-01-02',processing:'SP'}]);assert.equal(days.length,2);assert.equal(days[0].m,0);assert.equal(days[0].s,null);assert.equal(activity(days[0],model).value,0);
 assert.throws(()=>dailyStatistics([{date:'2001-01-03'}],[]),/outside/);
});
test('paired calibration uses training years only, reports held-out errors and excludes NRT from both',()=>{
 const days=[];for(let y=2018;y<=2022;y++)for(let d=1;d<=10;d++)days.push(day(y+'-08-'+String(d).padStart(2,'0'),10,y<=2020?20:40,40));
 days.push(day('2026-08-01',99999,1,1,'NRT'));const m=fitCalibration(days);
 assert.equal(m.factors.s.factor,.5);assert.equal(m.factors.s.pairedDays,30);assert.equal(m.factors.s.holdoutDays,20);assert.equal(m.factors.s.rmse,10);assert.equal(m.factors.s.bias,10);
 assert.equal(fitCalibration(days.slice(0,20)).factors.s.factor,null);assert.equal(m.factors.n.factor,null);
});
test('sensor eras and a zero reference count do not masquerade as a missing sensor',()=>{
 assert.equal(activity(day('2005-08-01',10,null),model).value,10);
 assert.equal(activity(day('2020-08-01',10,0,400),model).value,5);
 assert.equal(activity(day('2020-08-01',null,null,40),model).value,10);
 assert.equal(activity(day('2020-08-01',null,null),model).value,null);
});
test('seasonal categories require enough actual years, use explicit thresholds and handle zero medians',()=>{
 assert.equal(seasonalContext(10,[1,2,3,4]).state,'Insufficient history');
 assert.equal(seasonalContext(10,[1,2,3,4,5]).state,'Unusual');
 assert.equal(seasonalContext(100,Array.from({length:20},(_,i)=>i)).state,'Critical activity');
 assert.equal(seasonalContext(0,[0,0,0,0,0]).percentile,50);assert.equal(seasonalContext(10,[0,0,0,0,0]).ratio,null);
});
test('monthly context excludes the selected year and provisional NRT, matches partial calendar dates and preserves gaps',()=>{
 const days=[];for(let y=2010;y<=2020;y++){days.push(day(y+'-08-01',y-2000,null));days.push(day(y+'-08-02',999,null));}
 days.push(day('2021-08-01',100,null));days.push(day('2022-08-01',100000,null,null,'NRT'));const months=monthlyCalendar(days,model),p=months.find(m=>m.month==='2021-08');
 assert.equal(p.n,11);assert.equal(p.median,15);assert.equal(p.complete,false);assert.equal(p.coveredDays,1);assert.ok(!months.some(m=>m.month==='2021-09'));assert.equal(months.find(m=>m.month==='2022-08').provisional,true);
});
test('blank NASA FRP remains unavailable and current baseline counts use fixed historical quality rules',()=>{
 const row=parseCSV('latitude,longitude,acq_date,acq_time,confidence,frp\n41.3,69.24,2026-10-03,1210,n,','VIIRS')[0];assert.equal(row.frp,null);
 const rows=[{...row,product:'VIIRS_NOAA20_NRT'},{...row,confidence:30},{...row,sensor:'MODIS',product:'MODIS_NRT',confidence:40}];
 const c=historyLiveCounts(rows,{start:'2026-10-03',end:'2026-10-03',region:'World',confidence:99});assert.equal(c.modisCells,1);assert.equal(c.viirsCells,1);
});
