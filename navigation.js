// Runs early for cross-document transitions, with a swipe fallback.
const pages=['index.html','observatory.html','method.html'];
const pageIndex=url=>pages.indexOf(new URL(url,location.href).pathname.split('/').at(-1)||'index.html');
let arriving=false;
try{const travel=JSON.parse(sessionStorage.getItem('atlas-travel')||'null');if(travel&&travel.to===location.pathname&&Date.now()-travel.time<10000){document.documentElement.dataset.direction=travel.direction;arriving=true;}sessionStorage.removeItem('atlas-travel');}catch{}
const nativeTransitions=CSS.supports('view-transition-name: page-content')&&'onpagereveal' in window;
if(arriving&&!nativeTransitions)document.documentElement.classList.add('page-enter');
document.addEventListener('click',e=>{
 const link=e.target.closest('a[href]');if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
 const url=new URL(link.href);if(url.origin!==location.origin||pageIndex(url)<0||url.pathname===location.pathname)return;
 const direction=pageIndex(url)>=pageIndex(location.href)?'forward':'back';document.documentElement.dataset.direction=direction;
 try{sessionStorage.setItem('atlas-travel',JSON.stringify({to:url.pathname,direction,time:Date.now()}));window.dispatchEvent(new Event('atlas-navigation'));}catch{}
 if(nativeTransitions||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 e.preventDefault();document.documentElement.classList.add('page-leave');setTimeout(()=>location.assign(url.href),340);
});
window.addEventListener('pageshow',()=>document.documentElement.classList.remove('page-leave'));
