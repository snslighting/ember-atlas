import {getData,getVersion} from './provider.js';
import {analyzeRows,viewportBins,exportCSV} from './map-analysis.js';
let rows=[],selected=[];
self.onmessage=async({data:{id,type,args}})=>{try{
 let result;
 if(type==='version')result=await getVersion();
 else if(type==='load'){const snapshot=await getData();rows=snapshot.data;const {data,...metadata}=snapshot;result=metadata;}
 else if(type==='analyze'){const analysis=analyzeRows(rows,args);selected=analysis.selected;result=analysis.summary;}
 else if(type==='points')result=viewportBins(selected,args);
 else if(type==='export')result=exportCSV(selected);
 else throw Error('Unknown map request');
 self.postMessage({id,result});
}catch{self.postMessage({id,error:'NASA data processing or download failed.'});}};
