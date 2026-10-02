import test from 'node:test';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';import {packRows} from './data-codec.js';
test('compressed data survives a page revisit without another shard download',async()=>{
 const original={fetch:globalThis.fetch,caches:globalThis.caches,location:globalThis.location},cache=new Map(),rows=[{id:'a',sensor:'VIIRS',lat:12,lon:34,frp:null,frpRaw:-1}],requests=[];
 const metadata={format:'firms-sharded-v1',source:'firms',dateStart:'2026-10-01',dateEnd:'2026-10-02',retrievedAt:'2026-10-02T00:00:00Z',observationCount:1,chunks:[{file:'chunks/test.json',version:'raw',observations:1,transport:{file:'chunks/test.gz',version:'zip'}}]};
 globalThis.location={href:'https://example.org/ember-atlas/analysis-worker.js'};
 const absolute=path=>new URL(path,globalThis.location.href).href;
 globalThis.caches={open:async()=>({match:async path=>cache.get(absolute(path))?.clone(),put:async(path,response)=>{cache.set(absolute(path),response);},delete:async path=>cache.delete(typeof path==='string'?absolute(path):path.url),keys:async()=>[...cache.keys()].map(url=>({url}))})};
 globalThis.fetch=async path=>{requests.push(path);if(path.includes('firms.json'))return Response.json(metadata);return new Response(gzipSync(JSON.stringify(packRows(rows))));};
 try{
  const first=await import('./provider.js?test=first');assert.deepEqual((await first.getData()).data,rows);
  const revisit=await import('./provider.js?test=revisit');assert.deepEqual((await revisit.getData()).data,rows);
  assert.equal(requests.filter(path=>path.includes('test.gz')).length,1);
  assert.equal(requests.filter(path=>path.includes('firms.json')).length,2);
 }finally{Object.assign(globalThis,original);}
});
test('an unavailable compact file falls back to the complete original observations',async()=>{
 const originalFetch=globalThis.fetch,rows=[{lat:1,lon:2,sensor:'MODIS'}];
 globalThis.fetch=async path=>path.includes('.gz')?new Response('unavailable',{status:503}):Response.json(rows);
 try{const provider=await import('./provider.js?test=fallback'),result=await provider.getData({source:'firms',format:'firms-sharded-v1',dateStart:'2026-10-01',dateEnd:'2026-10-02',retrievedAt:'2026-10-02T00:00:00Z',observationCount:1,chunks:[{file:'rows.json',version:'1',observations:1,transport:{file:'rows.gz',version:'1'}}]});assert.deepEqual(result.data,rows);}
 finally{globalThis.fetch=originalFetch;}
});
