export const worldBounds=[[-85.0511,-180],[85.0511,180]];
export const mapOptions={preferCanvas:true,maxBounds:worldBounds,maxBoundsViscosity:1,minZoom:0,inertia:false};
export const tileOptions={maxZoom:18,noWrap:true,bounds:worldBounds,attribution:'© OpenStreetMap contributors'};
export function minimumWorldZoom({x,y}){return Math.max(0,Math.floor(Math.log2(Math.max(1,Math.min(x,y))/256)));}
