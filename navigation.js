// Slide the current document out immediately, before waiting for the next page.
// Rank pages in their visible menu order. Calendar stays within Monitor.
const pageIndex=value=>{const url=new URL(value,location.href),page=url.pathname.split('/').at(-1)||'index.html';return ({'index.html':0,'monitor.html':1,'history.html':2,'observatory.html':3,'map.html':3,'method.html':4})[page]??-1;};
let arriving=false,leaving=false;
try{const travel=JSON.parse(sessionStorage.getItem('atlas-travel')||'null');if(travel&&travel.to===location.pathname&&(!travel.href||travel.href===location.href)&&Date.now()-travel.time<15000){document.documentElement.dataset.direction=travel.direction;arriving=true;}sessionStorage.removeItem('atlas-travel');}catch{}
const motionEnabled=()=>window.atlasMotion?.enabled??!matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!arriving&&globalThis.performance?.getEntriesByType?.('navigation')?.[0]?.type==='back_forward'){try{const previous=Number(sessionStorage.getItem('atlas-last-page'));document.documentElement.dataset.direction=pageIndex(location.href)>=previous?'forward':'back';arriving=true;}catch{}}
if(arriving&&motionEnabled())document.documentElement.classList.add('page-enter');
document.addEventListener('click',e=>{
 const link=e.target.closest('a[href]');if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
 const url=new URL(link.href);if(url.origin!==location.origin||pageIndex(url)<0||url.pathname===location.pathname&&pageIndex(url)===pageIndex(location.href))return;
 if(leaving){e.preventDefault();return;}
 const direction=pageIndex(url)>=pageIndex(location.href)?'forward':'back';document.documentElement.dataset.direction=direction;
 try{sessionStorage.setItem('atlas-travel',JSON.stringify({to:url.pathname,href:url.href,direction,time:Date.now()}));}catch{}
 window.dispatchEvent(new Event('atlas-navigation'));
 if(!motionEnabled())return;
 e.preventDefault();leaving=true;document.documentElement.classList.remove('page-enter');document.documentElement.classList.add('page-leave');
 setTimeout(()=>location.assign(url.href),460);
});
window.addEventListener('pageshow',event=>{leaving=false;document.documentElement.classList.remove('page-leave');try{if(event?.persisted){const previous=Number(sessionStorage.getItem('atlas-last-page'));document.documentElement.dataset.direction=pageIndex(location.href)>=previous?'forward':'back';if(motionEnabled())document.documentElement.classList.add('page-enter');}sessionStorage.setItem('atlas-last-page',String(pageIndex(location.href)));}catch{}});

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
