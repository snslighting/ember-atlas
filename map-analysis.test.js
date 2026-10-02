import test from 'node:test';import assert from 'node:assert/strict';import {analyzeRows,createAnalyzer,createViewportIndex,viewportBins,exportCSV} from './map-analysis.js';
const rows=[{lat:0,lon:0,date:'2026-10-01',time:'12:00',confidence:90,confidenceRaw:'h',frp:12,sensor:'VIIRS',product:'VIIRS_NOAA20_NRT',satellite:'N20'},{lat:40,lon:-120,date:'2026-10-01',time:'13:00',confidence:80,frp:20,sensor:'MODIS',product:'MODIS_NRT',satellite:'Terra'},{lat:-20,lon:130,date:'2026-10-02',time:'14:00',confidence:70,frp:9,sensor:'VIIRS',product:'VIIRS_NOAA20_NRT',satellite:'N20'}];
const filters={region:'World',start:'2026-10-01',end:'2026-10-02',confidence:40,view:'Compare',day:null};
test('worldwide data includes records outside every original study area',()=>{const result=analyzeRows(rows,filters);assert.equal(result.summary.raw,3);assert.equal(result.selected.length,3);const region=analyzeRows(rows,{...filters,region:'California'});assert.equal(region.selected.length,1);assert.equal(region.selected[0].lon,-120);});
test('global date, confidence, sensor and selected-day filters retain exact counts',()=>{const result=analyzeRows(rows,{...filters,view:'VIIRS',day:'2026-10-01',confidence:85});assert.equal(result.selected.length,1);assert.equal(result.selected[0].confidenceRaw,'h');assert.equal(result.summary.days.reduce((sum,d)=>sum+d.count,0),1);});
test('display grouping includes every visible detection without altering exported rows',()=>{const close=[rows[0],{...rows[0],lon:.001},{...rows[0],lon:90}];const result=viewportBins(close,{zoom:3,origin:{x:900,y:900},width:300,height:300,cellSize:28});assert.equal(result.visible,2);assert.equal(result.bins.reduce((sum,b)=>sum+b.count,0),2);assert.equal(result.bins.length,1);assert.equal(exportCSV(close).split('\n').length,4);});
test('CSV export safely escapes original metadata',()=>{assert.ok(exportCSV([{...rows[0],satellite:'A,"B"'}]).includes('"A,""B"""'));});

test('sensor and day switches reuse the daily grid, and changed filters invalidate it',()=>{
 const analyze=createAnalyzer(rows),first=analyze(filters),sensor=analyze({...filters,view:'VIIRS'}),day=analyze({...filters,day:'2026-10-02'});
 assert.equal(sensor.summary.days,first.summary.days);assert.equal(day.summary.days,first.summary.days);
 assert.equal(sensor.selected.length,2);assert.equal(day.selected.length,1);
 assert.notEqual(analyze({...filters,confidence:85}).summary.days,first.summary.days);
 const newData=createAnalyzer([rows[0]]);assert.equal(newData(filters).summary.raw,1);
});
test('spatial queries match unindexed projection at world, regional and street zooms',()=>{
 let seed=7;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 const points=Array.from({length:5000},(_,i)=>({...rows[i%3],lat:rand()*180-90,lon:rand()*360-180,observations:i%4+1}));
 points.push({...rows[0],lat:85.0511,lon:180},{...rows[0],lat:-85.0511,lon:-180},{...rows[0],lat:37,lon:-120});
 const index=createViewportIndex(points);
 for(const zoom of [0,3,8,18]){
  const scale=256*2**zoom,origin=zoom<8?{x:0,y:0}:{x:60/360*scale-600,y:(.5-Math.log((1+Math.sin(37*Math.PI/180))/(1-Math.sin(37*Math.PI/180)))/(4*Math.PI))*scale-300};
  const viewport={zoom,origin,width:1200,height:600,cellSize:16},expected=new Map();let visible=0;
  for(const row of points){
   if(Math.abs(row.lat)>85.0511)continue;
   const sine=Math.sin(row.lat*Math.PI/180),x=(row.lon+180)/360*scale-origin.x,y=(.5-Math.log((1+sine)/(1-sine))/(4*Math.PI))*scale-origin.y;
   if(x<-12||y<-12||x>1212||y>612)continue;visible++;
   const key=Math.floor(x/16)+':'+Math.floor(y/16)+':'+row.sensor;
   const item=expected.get(key)||{count:0,observations:0,bounds:[row.lat,row.lon,row.lat,row.lon],sample:row};
   item.count++;item.observations+=row.observations||1;item.bounds=[Math.min(item.bounds[0],row.lat),Math.min(item.bounds[1],row.lon),Math.max(item.bounds[2],row.lat),Math.max(item.bounds[3],row.lon)];expected.set(key,item);
  }
  const actual=viewportBins(index,viewport);assert.equal(actual.visible,visible);assert.equal(actual.bins.length,expected.size);
  for(const bin of actual.bins){const key=Math.floor(bin.x/16)+':'+Math.floor(bin.y/16)+':'+bin.sensor;const reference=expected.get(key);assert.ok(reference);assert.equal(bin.count,reference.count);assert.equal(bin.observations,reference.observations);assert.deepEqual(bin.bounds,reference.bounds);assert.equal(bin.sample,reference.sample);}
 }
});
