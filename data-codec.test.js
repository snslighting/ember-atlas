import test from 'node:test';import assert from 'node:assert/strict';import {packRows,unpackRows} from './data-codec.js';import {readFile} from 'node:fs/promises';
test('compact transport preserves optional fields, nulls, numbers and original strings',()=>{
 const rows=Array.from({length:40},(_,i)=>({id:'id-'+i,sensor:i%2?'VIIRS':'MODIS',lat:i/1000,confidenceRaw:i%2?'nominal':'95',frp:i===2?null:12.34}));
 rows[2].frpRaw=-.94;rows[5].time='05:01';rows[8].time=null;
 assert.deepEqual(unpackRows(JSON.parse(JSON.stringify(packRows(rows)))),rows);
 assert.deepEqual(unpackRows(packRows([])),[]);
 assert.throws(()=>unpackRows({format:'firms-columns-v1',length:2,columns:[{field:'id',values:['one']}]}));
});
test('every actual NASA shard survives the compact encoding without losing a field',async()=>{
 const manifest=JSON.parse(await readFile('data/firms.json','utf8'));let count=0;
 for(const chunk of manifest.chunks){const rows=JSON.parse(await readFile('data/'+chunk.file,'utf8'));assert.deepEqual(unpackRows(JSON.parse(JSON.stringify(packRows(rows)))),rows);count+=rows.length;}
 assert.equal(count,manifest.observationCount);
});
