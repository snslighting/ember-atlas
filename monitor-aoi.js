export function validBounds(b){return Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]>=-180&&b[2]<=180&&b[1]>=-90&&b[3]<=90&&b[0]<b[2]&&b[1]<b[3];}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function validateDrawnPolygon(points){
 if(points.length<3)throw Error('Choose at least three different polygon vertices.');
 if(points.some(p=>p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90))throw Error('Choose vertices within the Earth map.');
 let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(a[0]===b[0]&&a[1]===b[1])throw Error('Choose different polygon vertices.');area+=a[0]*b[1]-b[0]*a[1];
  for(let j=i+2;j<points.length;j++){if(i===0&&j===points.length-1)continue;const c=points[j],d=points[(j+1)%points.length];if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1])))throw Error('Polygon edges cross. Draw a simple outline.');}}
 if(Math.abs(area)<1e-10)throw Error('Choose an area with width and height.');return true;
}
