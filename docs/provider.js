import {demo} from './core.js';
export async function getData(region,live){
  if(document.documentElement.dataset.host==='static')return {data:demo(),source:'demo',message:live?'GitHub Pages demo • live FIRMS requires the local server. Showing synthetic data.':'Synthetic September 2026 scenario • not observed NASA data'};
  const response=await fetch(`./api/data?region=${encodeURIComponent(region)}&live=${live?1:0}`);
  if(!response.ok)throw Error('Data request failed');
  return response.json();
}
