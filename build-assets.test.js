import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseVersion,versionHTML,versionModules} from './build-assets.js';
test('style or module changes invalidate a cached release together',()=>{
 assert.equal(releaseVersion(['a\r\nb']),releaseVersion(['a\nb']));const original=releaseVersion(['html','css','js']);assert.equal(original,releaseVersion(['html','css','js']));assert.notEqual(original,releaseVersion(['html','blue-css','js']));assert.notEqual(original,releaseVersion(['html','css','drag-js']));
});
test('release URLs update styles and scripts without disrupting navigation or data',()=>{
 const input='<link href="./site.css"><script src="./motion.js"></script><a href="./method.html#details">Method</a><a href="https://example.org/a.css">External</a>';
 const output=versionHTML(input,'new');assert.ok(output.includes('./site.css?v=new'));assert.ok(output.includes('./motion.js?v=new'));assert.ok(output.includes('./method.html?v=new#details'));assert.ok(output.includes('https://example.org/a.css'));
});
test('the same release propagates through nested local module imports',()=>{
 const input="import {x} from './core.js'; import './earth.js'; import Lenis from './vendor/lenis/lenis.mjs'; fetch('./data/status.json'); import('./earth.js');";
 const output=versionModules(input,'new');for(const path of ['core.js','earth.js','vendor/lenis/lenis.mjs'])assert.ok(output.includes(path+'?v=new'));assert.ok(output.includes("fetch('./data/status.json')"));assert.ok(output.includes("import('./earth.js?v=new')"));
});
