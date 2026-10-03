import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {compileGeometry,focusBounds} from './boundary-geometry.js';import {createAnalyzer,exportCSV} from './map-analysis.js';import {englishStyle} from './english-style.js';
const square=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
test('polygon filter handles concavity, holes, multipolygons and dateline islands',()=>{
 const g={type:'MultiPolygon',coordinates:[[square(0,0,10,10),square(3,3,7,7)],[square(170,-10,180,0)],[square(-180,-10,-170,0)]]},contains=compileGeometry(g);
 assert.ok(contains({lon:0,lat:0}));assert.ok(contains({lon:2,lat:2}));assert.ok(!contains({lon:5,lat:5}));assert.ok(!contains({lon:11,lat:5}));
 assert.ok(contains({lon:179,lat:-5}));assert.ok(contains({lon:-179,lat:-5}));assert.ok(!contains({lon:0,lat:-5}));
 const concave=compileGeometry({type:'Polygon',coordinates:[[[0,0],[10,0],[10,3],[3,3],[3,10],[0,10],[0,0]]]});assert.ok(!concave({lon:8,lat:8}));
 assert.deepEqual(focusBounds(g),[0,0,10,10]);
});
test('boundary summaries and exports exclude detections inside the bounding box but outside the border',()=>{
 const boundary={id:'test',geometry:{type:'Polygon',coordinates:[square(0,0,10,10),square(3,3,7,7)]}};
 const rows=[{lon:1,lat:1,sensor:'MODIS',date:'2026-10-01',time:'12:00',confidence:80,frp:20},{lon:5,lat:5,sensor:'VIIRS',date:'2026-10-01',confidence:90,frp:500},{lon:9,lat:9,sensor:'VIIRS',date:'2026-10-02',time:'13:00',confidence:90,frp:null}];
 const analyze=createAnalyzer(rows),f={region:'World',start:'2026-10-01',end:'2026-10-02',confidence:40,view:'Compare',boundary};
 const result=analyze(f);assert.equal(result.summary.raw,2);assert.equal(result.summary.maxFrp,20);assert.equal(result.summary.latest,'2026-10-02 13:00');assert.equal(result.summary.bars[1][1],1);
 assert.equal(exportCSV(result.selected).split('\n').length,3);assert.equal(analyze({...f,view:'VIIRS',day:'2026-10-02'}).selected.length,1);
 assert.equal(analyze({...f,boundary:null}).summary.raw,3);
});
test('actual country and region geometry distinguishes known capitals and preserves all administrative units',async()=>{
 const world=JSON.parse(await readFile('assets/boundaries/world.json','utf8'));assert.equal(world.features.length,258);
 for(const [id,inside,outside,count] of [['UZB',[69.24,41.3],[71.45,51.17],14],['JPN',[139.76,35.68],[126.98,37.57],47],['USA',[-77.04,38.90],[-79.38,43.65],51]]){
  const data=JSON.parse(await readFile('assets/boundaries/countries/'+id+'.json','utf8')),contains=compileGeometry(data.country.geometry);
  assert.ok(contains({lon:inside[0],lat:inside[1]}),id);assert.ok(!contains({lon:outside[0],lat:outside[1]}),id);assert.equal(data.regions.features.length,count);
  assert.ok(data.regions.features.some(f=>compileGeometry(f.geometry)({lon:inside[0],lat:inside[1]})));
 }
});
test('vector labels explicitly choose English and Latin names and preserve road references',()=>{
 const original={layers:[{layout:{'text-field':['get','name']}},{layout:{'text-field':['get','ref']}}]},style=englishStyle(original);
 assert.deepEqual(original.layers[0].layout['text-field'],['get','name']);assert.deepEqual(style.layers[1],original.layers[1]);
 const expression=JSON.stringify(style.layers[0].layout['text-field']);assert.ok(expression.includes('name_en'));assert.ok(!expression.includes('"name"'));assert.ok(!expression.includes('name:nonlatin'));
});
