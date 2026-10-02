import {readFile} from 'node:fs/promises';
export async function readSnapshot(root='data'){const metadata=JSON.parse(await readFile(root+'/firms.json','utf8'));if(metadata.format==='firms-sharded-v1'){const arrays=await Promise.all(metadata.chunks.map(c=>readFile(root+'/'+c.file,'utf8').then(JSON.parse)));return {...metadata,data:arrays.flat()};}return metadata;}
