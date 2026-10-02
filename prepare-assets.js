import sharp from 'sharp';
import {Euler,Quaternion,Vector3} from 'three';
// Render a spherical preview using the globe's texture and initial orientation.
export async function prepareEarthAssets(){
 await sharp('assets/earth.jpg').webp({quality:88,effort:6}).toFile('assets/earth.webp');
 const {data,info}=await sharp('assets/earth.jpg').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const size=800,pixels=Buffer.alloc(size*size*4),inverse=new Quaternion().setFromEuler(new Euler(.12,-2.79,.12)).invert(),normal=new Vector3(),light=new Vector3(-3,3,5).normalize();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=(x+.5)/size*2-1,ny=1-(y+.5)/size*2,r2=nx*nx+ny*ny;if(r2>1)continue;
  const nz=Math.sqrt(1-r2),illumination=.4+.72*Math.max(0,nx*light.x+ny*light.y+nz*light.z);
  normal.set(nx,ny,nz).applyQuaternion(inverse);
  const u=((Math.atan2(normal.z,-normal.x)/(Math.PI*2))%1+1)%1,v=Math.acos(Math.max(-1,Math.min(1,normal.y)))/Math.PI;
  const sx=Math.min(info.width-1,Math.floor(u*info.width)),sy=Math.min(info.height-1,Math.floor(v*info.height)),source=(sy*info.width+sx)*info.channels,target=(y*size+x)*4,rim=Math.pow(1-nz,4)*.28;
  for(let c=0;c<3;c++)pixels[target+c]=Math.min(255,data[source+c]*illumination*(1-rim)+[45,145,225][c]*rim);
  pixels[target+3]=Math.min(255,(1-Math.sqrt(r2))*size*255);
 }
 await sharp(pixels,{raw:{width:size,height:size,channels:4}}).webp({quality:86,effort:6}).toFile('assets/earth-poster.webp');
}
if(process.argv[1]?.endsWith('prepare-assets.js'))await prepareEarthAssets();
