import * as THREE from './vendor/three/three.module.js';
const stage=document.getElementById('earth-stage'),landing=document.body.classList.contains('landing'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(stage)try{
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));stage.append(renderer.domElement);stage.classList.add('webgl-ready');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100),group=new THREE.Group();scene.add(group);
 const texture=new THREE.TextureLoader().load('./assets/earth.jpg');texture.colorSpace=THREE.SRGBColorSpace;
 const earth=new THREE.Mesh(new THREE.SphereGeometry(1.45,64,64),new THREE.MeshPhongMaterial({map:texture,shininess:12,specular:0x3283b5}));earth.rotation.set(.12,-2.79,.12);group.add(earth);
 try{if(document.documentElement.dataset.direction){const saved=JSON.parse(sessionStorage.getItem('atlas-earth'));if(saved)earth.rotation.set(saved.x,saved.y,.12);}}catch{}
 window.addEventListener('atlas-navigation',()=>{try{sessionStorage.setItem('atlas-earth',JSON.stringify({x:earth.rotation.x,y:earth.rotation.y}));}catch{}});
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.49,64,64),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);vec4 v=modelViewMatrix*vec4(position,1.0);p=v.xyz;gl_Position=projectionMatrix*v;}',fragmentShader:'varying vec3 n;varying vec3 p;void main(){float rim=pow(1.0-abs(dot(normalize(n),normalize(-p))),2.8);gl_FragColor=vec4(.16,.62,1.,rim*.75);}'}));group.add(atmosphere);
 scene.add(new THREE.AmbientLight(0x9bc6ed,1.1));const sun=new THREE.DirectionalLight(0xe8f5ff,2.3);sun.position.set(-3,3,5);scene.add(sun);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.82,.0025,8,180),new THREE.MeshBasicMaterial({color:0x66bcff,transparent:true,opacity:.38}));ring.rotation.set(1.1,.2,.5);group.add(ring);
 const stars=[];for(let i=0;i<550;i++)stars.push((Math.random()-.5)*20,(Math.random()-.5)*14,-4-Math.random()*6);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));scene.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:0xb4ddff,size:.012,transparent:true,opacity:.65})));
 function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;const ratio=Math.min((w<700?.95:.70)*w/h,1.3);camera.position.z=Math.sqrt(1.45**2+(1.45/(ratio*Math.tan(35*Math.PI/360)))**2);group.position.x=w<700?0:camera.position.z*Math.tan(35*Math.PI/360)*camera.aspect*.40;group.position.y=w<700?-.35:0;camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(stage);resize();
 const canvas=renderer.domElement,ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let drag=null,velocity=0,pausedUntil=performance.now()+10000,last=performance.now();
 function publish(){stage.dataset.rotation=earth.rotation.y.toFixed(3);}publish();
 if(landing){canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Interactive Earth, initially facing Eurasia. Drag to rotate or use arrow keys.');
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);scene.updateMatrixWorld();ray.setFromCamera(pointer,camera);if(!ray.intersectObject(earth).length)return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};velocity=0;canvas.setPointerCapture(e.pointerId);stage.classList.add('dragging');});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;velocity=(e.clientX-drag.x)*.005;earth.rotation.y+=velocity;earth.rotation.x=Math.max(-.65,Math.min(.65,earth.rotation.x+(e.clientY-drag.y)*.003));drag.x=e.clientX;drag.y=e.clientY;pausedUntil=performance.now()+8000;publish();});
 const release=()=>{drag=null;stage.classList.remove('dragging');};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')earth.rotation.set(.12,-2.79,.12);else if(e.key==='ArrowLeft'||e.key==='ArrowRight')earth.rotation.y+=e.key==='ArrowLeft'?-.15:.15;else earth.rotation.x=Math.max(-.65,Math.min(.65,earth.rotation.x+(e.key==='ArrowUp'?-.1:.1)));pausedUntil=performance.now()+8000;velocity=0;publish();});
 }
 function animate(time){const delta=Math.min((time-last)/1000,.05);last=time;if(!document.hidden){if(!reduced){if(!drag){earth.rotation.y+=velocity*delta*60;velocity*=Math.exp(-delta*8);if(time>pausedUntil)earth.rotation.y+=delta*.016;}ring.rotation.z+=delta*.018;group.rotation.x=Math.min(scrollY/innerHeight,1)*.035;}renderer.render(scene,camera);}requestAnimationFrame(animate);}requestAnimationFrame(animate);
}catch{stage.classList.add('webgl-unavailable');}
