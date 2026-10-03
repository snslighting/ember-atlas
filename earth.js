import {createAnimationLoop} from './animation-loop.js';
import * as THREE from './vendor/three/three.module.js';
const stage=document.getElementById('earth-stage'),landing=document.body.classList.contains('landing');
if(stage)try{
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,landing?1.7:1));stage.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,2,-2,.1,100),group=new THREE.Group();scene.add(group);
 const texture=await new THREE.TextureLoader().loadAsync('./assets/earth.webp');texture.colorSpace=THREE.SRGBColorSpace;
 const earth=new THREE.Mesh(new THREE.SphereGeometry(1.45,64,64),new THREE.MeshPhongMaterial({map:texture,shininess:12,specular:0x3283b5}));earth.rotation.set(.12,-2.79,.12);group.add(earth);
 try{if(document.documentElement.dataset.direction){const saved=JSON.parse(sessionStorage.getItem('atlas-earth'));if(saved)earth.rotation.set(saved.x,saved.y,.12);}}catch{}
 window.addEventListener('atlas-navigation',()=>{try{sessionStorage.setItem('atlas-earth',JSON.stringify({x:earth.rotation.x,y:earth.rotation.y}));}catch{}});
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.49,64,64),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);vec4 v=modelViewMatrix*vec4(position,1.0);p=v.xyz;gl_Position=projectionMatrix*v;}',fragmentShader:'varying vec3 n;varying vec3 p;void main(){float rim=pow(1.0-abs(dot(normalize(n),normalize(-p))),2.8);gl_FragColor=vec4(.16,.62,1.,rim*.75);}'}));group.add(atmosphere);
 scene.add(new THREE.AmbientLight(0x9bc6ed,1.1));const sun=new THREE.DirectionalLight(0xe8f5ff,2.3);sun.position.set(-3,3,5);scene.add(sun);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.82,.0025,8,180),new THREE.MeshBasicMaterial({color:0x66bcff,transparent:true,opacity:.38}));ring.rotation.set(1.1,.2,.5);earth.add(ring);
 const bodyGeometry=new THREE.BoxGeometry(.08,.07,.07),panelGeometry=new THREE.BoxGeometry(.14,.004,.07),bodyMaterial=new THREE.MeshPhongMaterial({color:0xe3eaf3,shininess:40}),panelMaterial=new THREE.MeshPhongMaterial({color:0x276aa9,emissive:0x082540});
 const satellites=[];for(let i=0;i<4;i++){const orbitGroup=new THREE.Group();orbitGroup.rotation.set(.7+i*.7,.3+i*.8,.4);group.add(orbitGroup);const satellite=new THREE.Group();satellite.add(new THREE.Mesh(bodyGeometry,bodyMaterial));for(const sign of [-1,1]){const panel=new THREE.Mesh(panelGeometry,panelMaterial);panel.position.x=sign*.12;satellite.add(panel);}satellite.scale.setScalar(.35);orbitGroup.add(satellite);satellites.push({object:satellite,radius:1.73+i*.08,phase:i*Math.PI/2,speed:.10+i*.025});}
 const stars=[];for(let i=0;i<550;i++)stars.push((Math.random()-.5)*20,(Math.random()-.5)*14,-4-Math.random()*6);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));scene.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:0xb4ddff,size:.012,transparent:true,opacity:.65})));
 let ready=false;
 function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const ratio=(w<700?.94:.68)*w/h;camera.top=1.45/ratio;camera.bottom=-camera.top;camera.right=camera.top*w/h;camera.left=-camera.right;camera.position.z=6;group.position.x=w<700?0:camera.right*.36;group.position.y=w<700?-.12:0;camera.updateProjectionMatrix();stage.dataset.projectedWidth=w<700?'94%':'68%';window.dispatchEvent(new Event('atlas-scene-ready'));if(ready)renderer.render(scene,camera);}
 new ResizeObserver(resize).observe(stage);resize();
 await renderer.compileAsync(scene,camera);renderer.render(scene,camera);ready=true;stage.classList.add('webgl-ready');window.dispatchEvent(new Event('atlas-scene-ready'));
 renderer.domElement.setAttribute('aria-hidden','true');let last=performance.now();
 let mapVisible=false,lastRender=0;
 const loop=createAnimationLoop({enabled:()=>window.atlasMotion.enabled,visible:()=>!document.hidden&&!mapVisible,tick(time){if(time-lastRender<(landing?1000/60:1000/15))return;lastRender=time;const delta=Math.min((time-last)/1000,.12);last=time;earth.rotation.y+=delta*.027;for(const satellite of satellites){satellite.phase+=delta*satellite.speed;satellite.object.position.set(Math.cos(satellite.phase)*satellite.radius,Math.sin(satellite.phase)*satellite.radius,0);satellite.object.rotation.z=satellite.phase;}group.rotation.x=Math.min(scrollY/innerHeight,1)*.035;renderer.render(scene,camera);}});
 function syncLoop(){last=performance.now();loop.sync();}
 const mapElement=document.getElementById('map');if(mapElement)new IntersectionObserver(entries=>{mapVisible=entries[0].isIntersecting;stage.dataset.mapPaused=String(mapVisible);syncLoop();},{threshold:0}).observe(mapElement);
 window.addEventListener('atlas-motion-change',syncLoop);document.addEventListener('visibilitychange',syncLoop);window.addEventListener('pageshow',syncLoop);window.addEventListener('pagehide',()=>loop.stop());loop.start();
}catch{stage.classList.remove('webgl-ready');stage.classList.add('webgl-unavailable');}
