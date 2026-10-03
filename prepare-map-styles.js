import {mkdir,writeFile} from 'node:fs/promises';
import {englishStyle} from './english-style.js';
await mkdir('assets/maps',{recursive:true});
for(const [local,remote] of [['street','liberty'],['dark','dark']]){
 const response=await fetch('https://tiles.openfreemap.org/styles/'+remote,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('OpenFreeMap style unavailable: '+remote);
 await writeFile('assets/maps/'+local+'.json',JSON.stringify(englishStyle(await response.json())));
}
