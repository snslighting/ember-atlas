import Lenis from './vendor/lenis/lenis.mjs';
import './earth.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced&&!document.body.classList.contains('dashboard'))new Lenis({autoRaf:true,anchors:{offset:-100},duration:1.15,smoothWheel:true});
document.querySelectorAll('.method-card,.method-note,.workspace-heading,.filters,.map-panel,.lower,.context-card').forEach(el=>el.classList.add('reveal'));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.08});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
let pending=false;
function scrollFrame(){pending=false;const y=scrollY,max=Math.max(1,document.documentElement.scrollHeight-innerHeight);document.documentElement.style.setProperty('--scroll-progress',y/max);document.documentElement.style.setProperty('--hero-depth',Math.min(y/innerHeight,1));document.documentElement.style.setProperty('--scene-opacity',Math.max(.10,1-y/Math.max(1,innerHeight*.72)));const canvas=document.querySelector('#earth-stage canvas');if(canvas&&document.body.classList.contains('landing')){canvas.style.pointerEvents=y>innerHeight*.75?'none':'auto';canvas.tabIndex=y>innerHeight*.75?-1:0;}
 if(!reduced)document.querySelectorAll('.orbital-illustration,.section-heading').forEach(el=>{const r=el.getBoundingClientRect();el.style.setProperty('--drift',`${Math.max(-20,Math.min(20,(r.top-innerHeight*.5)*-.035))}px`);});}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(scrollFrame);}},{passive:true});scrollFrame();
if(!reduced&&matchMedia('(pointer: fine)').matches)document.querySelectorAll('.feature,.sensor-card,.method-card').forEach(card=>{
 card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--shine-x',`${(e.clientX-r.left)/r.width*100}%`);card.style.setProperty('--shine-y',`${(e.clientY-r.top)/r.height*100}%`);});
});
