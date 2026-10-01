import {test} from 'node:test';import assert from 'node:assert/strict';import {nextDateRange,feedHealth} from './refresh-state.js';
test('rolling dates follow new NASA records and manual dates are preserved',()=>{
const next={dateStart:'2026-09-28',dateEnd:'2026-10-02'};assert.deepEqual(nextDateRange({start:'2026-09-27',end:'2026-10-01'},next,true),{start:'2026-09-28',end:'2026-10-02'});assert.deepEqual(nextDateRange({start:'2026-09-29',end:'2026-09-30'},next,false),{start:'2026-09-29',end:'2026-09-30'});assert.deepEqual(nextDateRange({start:'2026-09-27',end:'2026-09-27'},next,false),{start:'2026-09-28',end:'2026-09-28'});
});
test('old or invalid timestamps are visibly stale',()=>{assert.equal(feedHealth('2026-10-01T08:00:00Z',Date.parse('2026-10-01T08:46:00Z')).stale,true);assert.equal(feedHealth('2026-10-01T08:00:00Z',Date.parse('2026-10-01T08:10:00Z')).stale,false);assert.equal(feedHealth('invalid').stale,true);});
