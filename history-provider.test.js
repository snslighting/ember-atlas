import test from 'node:test';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';import {getHistoryMetadata,loadHistoryFile} from './history-provider.js';
test('history caches genuine metadata and gzip partitions, and falls back when transport is unavailable',async()=>{
 const original=fetch,old=globalThis.caches,entries=new Map();globalThis.caches={open:async()=>({put:async(k,r)=>entries.set(k,r),match:async k=>entries.get(k)?.clone()})};
 const value={format:'atlas-history-v1',cases:[]};let requests=0;
 try{
 globalThis.fetch=async url=>{requests++;return new Response(url.includes('metadata')?JSON.stringify(value):url.includes('bad.gz')?'bad':url.includes('.gz')?gzipSync(JSON.stringify({rows:[1,2]})):JSON.stringify({rows:[3]}));};
 assert.deepEqual(await getHistoryMetadata(),value);const before=requests;
 const p={file:'test-provider/cells.json',gzip:'test-provider/cells.json.gz',version:'a'};assert.deepEqual(await loadHistoryFile(p),{rows:[1,2]});await loadHistoryFile(p);assert.equal(requests,before+1);
 assert.deepEqual(await loadHistoryFile({file:'test-provider/fallback.json',gzip:'test-provider/bad.gz',version:'b'}),{rows:[3]});
 globalThis.fetch=async()=>{throw Error('Offline');};assert.equal((await getHistoryMetadata()).offline,true);
 await assert.rejects(loadHistoryFile({file:'test-provider/missing.json',version:'c'}),/Offline/);
 }finally{globalThis.fetch=original;globalThis.caches=old;}
});
