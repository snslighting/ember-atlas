import {maplibreGL} from '@maplibre/maplibre-gl-leaflet';
import {setWorkerUrl,setWorkerCount} from 'maplibre-gl';
setWorkerUrl(new URL('./vendor/maplibre/maplibre-gl-worker.mjs',import.meta.url).href);
setWorkerCount(2);
export async function createVectorBasemap(name){
 const response=await fetch('./assets/maps/'+(name==='dark'?'dark':'street')+'.json');
 if(!response.ok)throw Error('English vector style unavailable');
 return maplibreGL({style:await response.json(),renderWorldCopies:false,attributionControl:false,interactive:false,padding:.1,updateInterval:32,pixelRatio:Math.min(devicePixelRatio||1,1.5)});
}
