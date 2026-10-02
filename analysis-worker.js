import {getData,getVersion} from './provider.js';
import {createAnalyzer,createViewportIndex,viewportBins,exportCSV} from './map-analysis.js';
let selected=[],analyze=createAnalyzer([]),index=createViewportIndex([]),checkedManifest=null;
self.onmessage=async({data:{id,type,args}})=>{try{
 let result;
 if(type==='version')result=checkedManifest=await getVersion();
 else if(type==='load'){const snapshot=await getData(checkedManifest);checkedManifest=null;analyze=createAnalyzer(snapshot.data);const {data,...metadata}=snapshot;result=metadata;}
 else if(type==='analyze'){const analysis=analyze(args);if(selected!==analysis.selected){selected=analysis.selected;index=createViewportIndex(selected);}result=analysis.summary;}
 else if(type==='points')result=viewportBins(index,args);
 else if(type==='export')result=exportCSV(selected);
 else throw Error('Unknown map request');
 self.postMessage({id,result});
}catch{self.postMessage({id,error:'NASA data processing or download failed.'});}};
