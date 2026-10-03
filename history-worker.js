import {getHistoryMetadata,loadHistoryFiles} from './history-provider.js';
import {createHistoryEngine} from './history-engine.js';
let metadata=null,engine=null;const ready=(async()=>{metadata=await getHistoryMetadata();engine=createHistoryEngine(metadata,loadHistoryFiles);})();
// Keep a rejection handled until the UI asks; errors are returned to the requester.
ready.catch(()=>{});
self.onmessage=async({data:{id,type,args}})=>{try{await ready;let result;
 if(type==='metadata')result=metadata;
 else if(type==='refresh'){const next=await getHistoryMetadata();const changed=next.builtAt!==metadata.builtAt||next.recentSnapshot?.retrievedAt!==metadata.recentSnapshot?.retrievedAt;if(changed){metadata=next;engine=createHistoryEngine(metadata,loadHistoryFiles);}result={changed,offline:!!next.offline,metadata};}
 else if(type==='analyze')result=await engine.analyze(args);
 else if(type==='select')result=await engine.select(args);
 else if(type==='points')result=engine.points(args);
 else if(type==='export')result=engine.export();
 else if(type==='live-context')result=engine.liveContext(args);
 else throw Error('Unknown history request');
 self.postMessage({id,result});
}catch(error){self.postMessage({id,error:error.message||'Historical NASA data unavailable'});}};
