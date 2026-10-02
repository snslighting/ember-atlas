// Shared geometry for the WebGL globe, static fallback and star-field mask.
export function planetLayout({left=0,top=0,width,height},webgl=false){
 const mobile=width<700,diameter=width*(mobile?.94:.68);
 return {x:left+width*(mobile?.5:.68),y:top+height/2+(mobile?.12/2.9*diameter:0),radius:diameter/2};
}
export function syncStarMask(stage){
 const rect=stage.getBoundingClientRect(),webgl=stage.classList.contains('webgl-ready')&&window.atlasMotion.enabled;
 const planet=planetLayout(rect,webgl),style=document.documentElement.style;
 style.setProperty('--planet-x',planet.x+'px');style.setProperty('--planet-y',planet.y+'px');style.setProperty('--planet-radius',planet.radius+'px');
}
