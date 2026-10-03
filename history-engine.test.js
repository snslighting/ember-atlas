import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHistoryEngine} from './history-engine.js';import {liveHistoryCase} from './history-context.js';
import {dailyStatistics,encodeCells,addHistoricalObservation} from './history-core.js';
const metadata=JSON.parse(await readFile('data/history/metadata.json','utf8')),loads=[];
const load=async entries=>Promise.all(entries.map(async e=>{loads.push(e.file);return JSON.parse(await readFile('data/history/'+e.file,'utf8'));}));
test('real NASA history spans the sensor transition and lazily loads selected year/map tiles',async()=>{
 const engine=createHistoryEngine(metadata,load);loads.length=0;
 const r=await engine.analyze({caseID:'uzbekistan',fromYear:2000,toYear:2026,includeRecent:true});
 assert.ok(r.months.some(m=>m.month==='2000-11'));assert.ok(r.months.some(m=>m.month==='2026-10'&&m.provisional));assert.ok(r.model.factors.s.factor>0);assert.ok(r.model.factors.j.holdoutDays>0);
 assert.ok(loads.every(file=>file.endsWith('summary.json')));loads.length=0;
 const s=await engine.select({month:'2024-08',view:'MODIS'});assert.ok(s.cells>0);assert.ok(s.symbolCells<=s.cells);assert.ok(loads.filter(f=>!f.includes('/recent/')).every(f=>f.includes('/2024/')));
 const csv=engine.export();assert.equal(csv.split('\n').length,s.cells+1);assert.match(csv,/sourceObservations/);
 const current=engine.liveContext({monthDayStart:'09-29',monthDayEnd:'10-03',modisCells:10,viirsCells:20});assert.ok(current.n>=20);assert.ok(Number.isFinite(current.index));
 const wrap=engine.liveContext({monthDayStart:'12-30',monthDayEnd:'01-02',modisCells:10,viirsCells:20});assert.ok(wrap.n>=20);
});
test('real case presets show genuine gaps and recalibrate geographically; out-of-coverage does not become zero',async()=>{
 const e=createHistoryEngine(metadata,load),r=await e.analyze({caseID:'california',fromYear:2017,toYear:2024,includeRecent:false});
 assert.equal(r.months.length,8);assert.ok(r.months.every(m=>m.month.endsWith('-09')));assert.ok(r.months.find(m=>m.month==='2020-09').index>r.months.find(m=>m.month==='2019-09').index);
 assert.equal((await e.select({month:'2020-09',view:'Compare'})).symbolCells>0,true);
 const empty=await e.analyze({caseID:'california',fromYear:2017,toYear:2024,area:[60,40,61,41],includeRecent:true});assert.equal(empty.months.length,0);assert.equal(empty.model.factors.j.factor,null);
});
test('live context is offered only where this archive covers the selected geography',()=>{
 assert.equal(liveHistoryCase({}),null);assert.equal(liveHistoryCase({country:{id:'UZB'}}),'uzbekistan');assert.equal(liveHistoryCase({area:[-123,38,-120,41]}),'california');assert.equal(liveHistoryCase({area:[-125,30,-110,44]}),null);
});
test('Standard Processing supersedes overlapping NRT in both metrics and the selected map',async()=>{
 const cells=new Map();addHistoricalObservation(cells,{date:'2020-08-01',lat:41.3,lon:69.24,time:'12:00',confidence:80,frp:10,satellite:'T'},'MODIS_SP');const values=[...cells.values()],coverage=[{product:'MODIS_SP',start:'2020-08-01',end:'2020-08-01',processing:'SP'}];
 const files={summary:{days:dailyStatistics(values,coverage),coverage},tile:encodeCells(values),recent:encodeCells([]),recentSummary:{days:dailyStatistics([],[{...coverage[0],product:'MODIS_NRT',processing:'NRT'}]),coverage:[]}},m={cases:[{id:'test',bounds:[60,40,70,45],summary:[{file:'summary',year:2020}],tiles:[{file:'tile',year:2020,bounds:[60,40,70,45]}],recent:{file:'recent',summary:{file:'recentSummary'},dateStart:'2020-08-01',dateEnd:'2020-08-01'}}]};
 const e=createHistoryEngine(m,async entries=>entries.map(entry=>files[entry.file]));const r=await e.analyze({caseID:'test',fromYear:2020,toYear:2020,includeRecent:true});assert.equal(r.months[0].provisional,false);assert.equal((await e.select({month:'2020-08'})).cells,1);await assert.rejects(e.analyze({caseID:'test',area:[2,3,1,0]}),/Invalid/);
});
