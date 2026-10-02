export function normalizeArea(bounds){
 if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite))return null;
 const [west,south,east,north]=bounds;
 return west>=-180&&east<=180&&south>=-85.0511&&north<=85.0511&&west<east&&south<north?[west,south,east,north]:null;
}
export function parseArea(value){return typeof value==='string'&&value.trim()?normalizeArea(value.split(',').map(Number)):null;}
export function areaFromCorners(a,b){
 return normalizeArea([Math.max(-180,Math.min(a.lng,b.lng)),Math.max(-85.0511,Math.min(a.lat,b.lat)),Math.min(180,Math.max(a.lng,b.lng)),Math.min(85.0511,Math.max(a.lat,b.lat))]);
}
export function inArea(row,bounds){return !bounds||row.lon>=bounds[0]&&row.lon<=bounds[2]&&row.lat>=bounds[1]&&row.lat<=bounds[3];}
