// Apply saved preferences before the page paints or animation modules load.
(()=>{
 const media=matchMedia('(prefers-reduced-motion: reduce)');let preference=null;
 try{preference=localStorage.getItem('atlas-motion');}catch{}
 let enabled=preference==='on'||(preference!=='off'&&!media.matches);
 function updateButton(){const button=document.getElementById('motion-toggle');if(!button)return;button.textContent='Animations: '+(enabled?'on':'off');button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label','Turn animations '+(enabled?'off':'on'));}
 function apply(){document.documentElement.dataset.motion=enabled?'on':'off';updateButton();window.dispatchEvent(new CustomEvent('atlas-motion-change',{detail:enabled}));}
 window.atlasMotion={get enabled(){return enabled;},setEnabled(value){enabled=Boolean(value);preference=enabled?'on':'off';try{localStorage.setItem('atlas-motion',preference);}catch{}apply();}};
 document.documentElement.dataset.motion=enabled?'on':'off';
 function bind(){updateButton();document.getElementById('motion-toggle')?.addEventListener('click',()=>window.atlasMotion.setEnabled(!enabled));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
 media.addEventListener('change',()=>{if(preference!=='on'&&preference!=='off'){enabled=!media.matches;apply();}});
})();
