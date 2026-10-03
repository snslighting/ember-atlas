// Slide the current document out immediately, before waiting for the next page.
const pages=['index.html','monitor.html','observatory.html','map.html','history.html','method.html'];
const pageIndex=url=>pages.indexOf(new URL(url,location.href).pathname.split('/').at(-1)||'index.html');
let arriving=false,leaving=false;
try{const travel=JSON.parse(sessionStorage.getItem('atlas-travel')||'null');if(travel&&travel.to===location.pathname&&Date.now()-travel.time<15000){document.documentElement.dataset.direction=travel.direction;arriving=true;}sessionStorage.removeItem('atlas-travel');}catch{}
const motionEnabled=()=>window.atlasMotion?.enabled??!matchMedia('(prefers-reduced-motion: reduce)').matches;
if(arriving&&motionEnabled())document.documentElement.classList.add('page-enter');
document.addEventListener('click',e=>{
 const link=e.target.closest('a[href]');if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
 const url=new URL(link.href);if(url.origin!==location.origin||pageIndex(url)<0||url.pathname===location.pathname)return;
 if(leaving){e.preventDefault();return;}
 const direction=pageIndex(url)>=pageIndex(location.href)?'forward':'back';document.documentElement.dataset.direction=direction;
 try{sessionStorage.setItem('atlas-travel',JSON.stringify({to:url.pathname,direction,time:Date.now()}));}catch{}
 window.dispatchEvent(new Event('atlas-navigation'));
 if(!motionEnabled())return;
 e.preventDefault();leaving=true;document.documentElement.classList.remove('page-enter');document.documentElement.classList.add('page-leave');
 setTimeout(()=>location.assign(url.href),460);
});
window.addEventListener('pageshow',()=>{leaving=false;document.documentElement.classList.remove('page-leave');});

document.addEventListener('animationend',e=>{if(e.target.tagName==='MAIN'&&e.animationName==='sheet-in')document.documentElement.classList.remove('page-enter');});

// Warm the next document only on navigation intent, respecting data saving.
const prefetched=new Set();
function warmDestination(event){
 const link=event.target.closest('a[href]');if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self')return;
 const url=new URL(link.href,location.href);url.hash='';
 if(url.origin!==location.origin||pageIndex(url)<0||url.pathname===location.pathname||prefetched.has(url.href)||globalThis.navigator?.connection?.saveData)return;
 prefetched.add(url.href);const hint=document.createElement('link');hint.rel='prefetch';hint.as='document';hint.href=url.href;document.head.append(hint);
}
document.addEventListener('pointerover',warmDestination,{passive:true});
document.addEventListener('focusin',warmDestination);
