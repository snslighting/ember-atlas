import {getData,getVersion} from './provider.js';
import {createAnalyzer,createViewportIndex,viewportBins,exportCSV,historyLiveCounts} from './map-analysis.js';
const boundaries=new Map();
let selected=[],currentData=[],analyze=createAnalyzer([]),index=createViewportIndex([]),checkedManifest=null;
self.onmessage=async({data:{id,type,args}})=>{try{
 let result;
 if(type==='version')result=checkedManifest=await getVersion();
 else if(type==='load'){const snapshot=await getData(checkedManifest);checkedManifest=null;currentData=snapshot.data;analyze=createAnalyzer(snapshot.data);const {data,...metadata}=snapshot;result=metadata;}
 else if(type==='history-counts')result=historyLiveCounts(currentData,{...args,boundary:boundaries.get(args.boundaryID)});
 else if(type==='boundary'){if(!args?.id||!args.geometry)throw Error('Invalid boundary');boundaries.set(args.id,args);result=true;}
 else if(type==='analyze'){const boundary=args.boundaryID?boundaries.get(args.boundaryID):null;if(args.boundaryID&&!boundary)throw Error('Missing boundary');const analysis=analyze({...args,boundary});if(selected!==analysis.selected){selected=analysis.selected;index=createViewportIndex(selected);}result=analysis.summary;}
 else if(type==='points')result=viewportBins(index,args);
 else if(type==='export')result=exportCSV(selected);
 else throw Error('Unknown map request');
 self.postMessage({id,result});
}catch{self.postMessage({id,error:'NASA data processing or download failed.'});}};
