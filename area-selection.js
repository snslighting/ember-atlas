import {normalizeArea,areaFromCorners} from './area-bounds.js';
export function createAreaSelection(map,{button,clearButton,status,initialBounds=null,onChange}){
 const container=map.getContainer(),pane='areaSelection';map.createPane(pane);map.getPane(pane).style.zIndex='410';map.getPane(pane).style.pointerEvents='none';
 const renderer=L.svg({pane}),handlers=['dragging','touchZoom','doubleClickZoom','boxZoom','keyboard','scrollWheelZoom'];
 let bounds=normalizeArea(initialBounds),active=false,anchor=null,start=null,pointer=null,secondCorner=false,draft=null,outline=null,restore=[],count=null,ignoreClickUntil=0;
 const leafletBounds=b=>[[b[1],b[0]],[b[3],b[2]]];
 function rectangle(b,preview=false){return L.rectangle(leafletBounds(b),{renderer,pane,color:'#63b6ff',weight:2,fillColor:'#63b6ff',fillOpacity:preview?.10:.07,dashArray:preview?'6 5':null,interactive:false}).addTo(map);}
 function describe(){
  if(active){status.textContent=anchor?'Choose the opposite corner. Escape cancels.':'Drag a rectangle on the map, or click two opposite corners. Escape cancels.';return;}
  status.textContent=bounds?'Selected area: '+bounds[1].toFixed(3)+' to '+bounds[3].toFixed(3)+' latitude, '+bounds[0].toFixed(3)+' to '+bounds[2].toFixed(3)+' longitude'+(count===null?'':' \u00b7 '+count.toLocaleString()+' selected detections'):'Select area to show detections inside a rectangle.';
 }
 function removeDraft(){if(draft){map.removeLayer(draft);draft=null;}}
 function drawOutline(){if(outline)map.removeLayer(outline);outline=bounds?rectangle(bounds):null;clearButton.hidden=!bounds;describe();}
 function finishMode(){
  active=false;anchor=start=null;secondCorner=false;
  if(pointer!==null){try{container.releasePointerCapture(pointer);}catch{}pointer=null;}
  removeDraft();for(const [handler,wasEnabled] of restore)if(wasEnabled)handler.enable();restore=[];
  container.classList.remove('selecting-area');button.setAttribute('aria-pressed','false');button.textContent='Select area';describe();
 }
 function cancel(){finishMode();button.focus();}
 function begin(){
  if(active){cancel();return;}active=true;map.stop();map.closePopup();
  restore=handlers.map(name=>[map[name],Boolean(map[name]?.enabled())]).filter(([handler])=>handler);
  for(const [handler] of restore)handler.disable();
  container.classList.add('selecting-area');button.setAttribute('aria-pressed','true');button.textContent='Cancel selection';describe();container.focus({preventScroll:true});
 }
 function point(event){const p=map.mouseEventToContainerPoint(event),size=map.getSize();return {pixel:p,latlng:map.containerPointToLatLng(L.point(Math.max(0,Math.min(size.x,p.x)),Math.max(0,Math.min(size.y,p.y))))};}
 function preview(corner){const b=areaFromCorners(anchor,corner);if(!b)return;draft?draft.setBounds(leafletBounds(b)):draft=rectangle(b,true);}
 function down(event){
  if(!active||!event.isPrimary||event.button!==0||event.target.closest('.leaflet-control,.leaflet-popup'))return;
  event.preventDefault();event.stopPropagation();ignoreClickUntil=Date.now()+500;const current=point(event);secondCorner=Boolean(anchor);if(!anchor)anchor=current.latlng;
  start=current.pixel;pointer=event.pointerId;container.setPointerCapture(pointer);preview(current.latlng);describe();
 }
 function move(event){if(active&&anchor&&pointer===event.pointerId){event.preventDefault();preview(point(event).latlng);}}
 function up(event){
  if(!active||pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();const current=point(event),dragged=Math.hypot(current.pixel.x-start.x,current.pixel.y-start.y)>=6;
  try{container.releasePointerCapture(pointer);}catch{}pointer=null;
  if(!dragged&&!secondCorner){describe();return;}
  const next=areaFromCorners(anchor,current.latlng);
  if(!next){anchor=start=null;secondCorner=false;removeDraft();status.textContent='Choose a rectangle with some width and height over the map.';return;}
  bounds=next;count=null;ignoreClickUntil=Date.now()+500;finishMode();drawOutline();onChange(bounds);
 }
 function clear({notify=true}={}){const changed=Boolean(bounds);finishMode();bounds=null;count=null;drawOutline();if(changed&&notify)onChange(null);}
 button.addEventListener('click',begin);clearButton.addEventListener('click',()=>clear());
 container.addEventListener('pointerdown',down,true);container.addEventListener('pointermove',move);container.addEventListener('pointerup',up);
 container.addEventListener('click',event=>{if(!event.target.closest('.leaflet-control')&&(active||Date.now()<ignoreClickUntil)){event.preventDefault();event.stopImmediatePropagation();}},true);
 container.addEventListener('pointercancel',()=>{if(active)cancel();});
 document.addEventListener('keydown',event=>{if(active&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();}},true);
 drawOutline();
 return {get bounds(){return bounds;},get active(){return active;},clear,setCount(value){count=value;describe();}};
}
