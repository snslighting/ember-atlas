export async function getData(region,live){
  const isStatic=document.documentElement.dataset.host==='static';
  const response=await fetch(isStatic?'./data/firms.json':`./api/data?region=${encodeURIComponent(region)}&live=${live?1:0}`,{cache:'no-cache'});
  if(!response.ok)throw Error('NASA observations could not be loaded');
  const result=await response.json();
  if(result.source!=='firms')throw Error('Only actual NASA observations are supported');
  return {...result,message:result.message||`NASA FIRMS snapshot • ${result.dateStart}–${result.dateEnd} UTC • retrieved ${new Date(result.retrievedAt).toISOString().replace('T',' ').slice(0,16)} UTC • MODIS + NOAA-20 VIIRS${isStatic&&live?' • refresh requires the local server':''}`};
}
