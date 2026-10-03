// GeoJSON polygons are [longitude, latitude]. Natural Earth splits at the dateline.
export function geometryPolygons(geometry){
 if(geometry?.type==='Polygon')return [geometry.coordinates];
 if(geometry?.type==='MultiPolygon')return geometry.coordinates;
 throw Error('A Polygon or MultiPolygon is required');
}
export function ringBounds(ring){let w=180,s=90,e=-180,n=-90;for(const [x,y] of ring){w=Math.min(w,x);e=Math.max(e,x);s=Math.min(s,y);n=Math.max(n,y);}return [w,s,e,n];}
function inBox(x,y,b){return x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3];}
function onSegment(x,y,a,b){const cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);return Math.abs(cross)<1e-10&&x>=Math.min(a[0],b[0])-1e-10&&x<=Math.max(a[0],b[0])+1e-10&&y>=Math.min(a[1],b[1])-1e-10&&y<=Math.max(a[1],b[1])+1e-10;}
function compileRing(ring,box){
 const bands=128,height=box[3]-box[1]||1,buckets=Array.from({length:bands},()=>[]);
 const band=y=>Math.max(0,Math.min(bands-1,Math.floor((y-box[1])/height*bands)));
 for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];for(let j=band(Math.min(a[1],b[1]));j<=band(Math.max(a[1],b[1]));j++)buckets[j].push(i);}
 return (x,y)=>{let inside=false;for(const i of buckets[band(y)]){const a=ring[i],b=ring[(i+1)%ring.length];if(onSegment(x,y,a,b))return true;if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
}
export function compileGeometry(geometry){
 // Latitude-band indices avoid rescanning thousands of coast segments for every detection.
 const polygons=geometryPolygons(geometry).map(rings=>rings.map(ring=>{const box=ringBounds(ring);return {box,contains:compileRing(ring,box)};}));
 const cells=new Map(),x=lon=>Math.max(0,Math.min(71,Math.floor((lon+180)/5))),y=lat=>Math.max(0,Math.min(35,Math.floor((lat+90)/5)));
 for(const rings of polygons){const b=rings[0].box;for(let cy=y(b[1]);cy<=y(b[3]);cy++)for(let cx=x(b[0]);cx<=x(b[2]);cx++){const key=cy*72+cx;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(rings);}}
 return row=>(cells.get(y(row.lat)*72+x(row.lon))||[]).some(rings=>inBox(row.lon,row.lat,rings[0].box)&&rings[0].contains(row.lon,row.lat)&&!rings.slice(1).some(hole=>inBox(row.lon,row.lat,hole.box)&&hole.contains(row.lon,row.lat)));
}
export function focusBounds(geometry){
 // Focus on the principal landmass rather than remote dependencies.
 const boxes=geometryPolygons(geometry).map(rings=>ringBounds(rings[0]));
 return boxes.sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0];
}
