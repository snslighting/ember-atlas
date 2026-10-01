import Lenis from './vendor/lenis/lenis.mjs';
import * as THREE from './vendor/three/three.module.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced)new Lenis({autoRaf:true,anchors:{offset:-100},duration:1.05,smoothWheel:true});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
let scroll=window.scrollY;
window.addEventListener('scroll',()=>{scroll=window.scrollY;document.querySelector('.scroll-progress').style.transform=`scaleX(${scroll/Math.max(1,document.documentElement.scrollHeight-innerHeight)})`;},{passive:true});
async function freshness(){try{const r=await fetch('./data/firms.json',{cache:'no-cache'});if(!r.ok)return;const s=await r.json();document.getElementById('landing-freshness').textContent=`${s.data.length.toLocaleString()} observations · ${s.dateStart} — ${s.dateEnd} UTC`;}catch{document.getElementById('landing-freshness').textContent='Actual NASA FIRMS observation record';}}freshness();
const stage=document.getElementById('earth-stage');
try{
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0,0);stage.append(renderer.domElement);stage.classList.add('webgl-ready');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,0,5.4);
 const group=new THREE.Group();scene.add(group);
 const texture=new THREE.TextureLoader().load('./assets/earth.jpg');texture.colorSpace=THREE.SRGBColorSpace;
 const earth=new THREE.Mesh(new THREE.SphereGeometry(1.45,64,64),new THREE.MeshPhongMaterial({map:texture,shininess:9,specular:0x1b4770}));earth.rotation.z=.18;group.add(earth);
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.49,64,64),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);vPosition=p.xyz;gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 vNormal; varying vec3 vPosition; void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(-vPosition))),3.0);gl_FragColor=vec4(0.12,0.48,0.85,rim*0.6);}'}));group.add(atmosphere);
 scene.add(new THREE.AmbientLight(0x819aba,.7));const sun=new THREE.DirectionalLight(0xffeed8,2.4);sun.position.set(-3,3,4);scene.add(sun);
 const orbit=new THREE.Mesh(new THREE.TorusGeometry(1.8,.0025,8,180),new THREE.MeshBasicMaterial({color:0x557f96,transparent:true,opacity:.35}));orbit.rotation.set(1.1,.2,.5);group.add(orbit);
 const stars=[];for(let i=0;i<450;i++){stars.push((Math.random()-.5)*18,(Math.random()-.5)*12,-2-Math.random()*6);}const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xaabccc,size:.009,transparent:true,opacity:.45})));
 const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(stage);resize();
 let pointerX=0,pointerY=0;window.addEventListener('pointermove',e=>{pointerX=(e.clientX/innerWidth-.5)*.15;pointerY=(e.clientY/innerHeight-.5)*.1;},{passive:true});
 let last=performance.now();const animate=time=>{const delta=Math.min((time-last)/1000,.05);last=time;if(!document.hidden){if(!reduced){earth.rotation.y+=delta*.035;group.rotation.y+=(pointerX-group.rotation.y)*.025;group.rotation.x+=(pointerY-group.rotation.x)*.025;group.position.y=-Math.min(scroll/innerHeight,1.5)*.12;}renderer.render(scene,camera);}requestAnimationFrame(animate);};requestAnimationFrame(animate);
}catch{stage.classList.add('webgl-unavailable');}
