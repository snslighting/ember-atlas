import {syncStarMask} from './scene-layout.js';
import Lenis from './vendor/lenis/lenis.mjs';
let lenis=null,earthLoading=false;
const enabled=()=>window.atlasMotion.enabled;
const stage=document.getElementById('earth-stage');
if(stage){const mask=()=>syncStarMask(stage);new ResizeObserver(mask).observe(stage);window.addEventListener('resize',mask);window.addEventListener('atlas-motion-change',mask);window.addEventListener('atlas-scene-ready',mask);mask();}
document.querySelectorAll('.method-card,.method-note,.workspace-heading,.filters,.map-panel,.lower,.context-card').forEach(el=>el.classList.add('reveal'));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.08});
function syncMotion(){
 if(enabled()){
  if(!lenis&&!document.body.classList.contains('dashboard'))lenis=new Lenis({autoRaf:true,anchors:{offset:-100},duration:1.15,smoothWheel:true});
  document.querySelectorAll('.reveal:not(.visible)').forEach(el=>observer.observe(el));
  if(!earthLoading){earthLoading=true;import('./earth.js').catch(()=>{document.getElementById('earth-stage')?.classList.add('webgl-unavailable');});}
 }else{
  lenis?.destroy();lenis=null;observer.disconnect();document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
  document.querySelectorAll('.orbital-illustration,.section-heading').forEach(el=>el.style.removeProperty('--drift'));
 }
 scrollFrame();
}
let pending=false;
function scrollFrame(){pending=false;const y=scrollY,max=Math.max(1,document.documentElement.scrollHeight-innerHeight);document.documentElement.style.setProperty('--scroll-progress',y/max);document.documentElement.style.setProperty('--hero-depth',Math.min(y/innerHeight,1));document.documentElement.style.setProperty('--scene-opacity',enabled()?Math.max(.10,1-y/Math.max(1,innerHeight*.72)):(y<innerHeight*.75?1:.10));
 if(enabled())document.querySelectorAll('.orbital-illustration,.section-heading').forEach(el=>{const r=el.getBoundingClientRect();el.style.setProperty('--drift',`${Math.max(-20,Math.min(20,(r.top-innerHeight*.5)*-.035))}px`);});}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(scrollFrame);}},{passive:true});
window.addEventListener('atlas-motion-change',syncMotion);syncMotion();
if(matchMedia('(pointer: fine)').matches)document.querySelectorAll('.feature,.sensor-card,.method-card').forEach(card=>{
 card.addEventListener('pointermove',e=>{if(!enabled())return;const r=card.getBoundingClientRect();card.style.setProperty('--shine-x',`${(e.clientX-r.left)/r.width*100}%`);card.style.setProperty('--shine-y',`${(e.clientY-r.top)/r.height*100}%`);});
});
