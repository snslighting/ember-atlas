export async function getVersion(){
 if(document.documentElement.dataset.host!=='static')return null;
 const response=await fetch('./data/status.json?check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Feed check failed');return response.json();
}
export async function getData(region,live){
 const isStatic=document.documentElement.dataset.host==='static';
 const response=await fetch(isStatic?'./data/firms.json?check='+Date.now():`./api/data?region=${encodeURIComponent(region)}&live=1`,{cache:'no-store',signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error('NASA observations could not be loaded');const result=await response.json();
 if(result.source!=='firms')throw Error('Only actual NASA observations are supported');
 return {...result,message:result.message||`NASA FIRMS · ${result.dateStart}–${result.dateEnd} UTC · retrieved ${new Date(result.retrievedAt).toISOString().replace('T',' ').slice(0,16)} UTC · MODIS + NOAA-20 VIIRS`};
}
