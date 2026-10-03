import {compileGeometry,geometryPolygons,focusBounds} from './boundary-geometry.js';
const root='./assets/boundaries/';
export function createBoundaryExplorer(map,{isDrawing,onSelect,onClear,onNotice,getPadding}){
 const $=id=>document.getElementById(id),cache=new Map();let countries=[],country=null,selected=null,regions=[],ticket=0,outline=null,subdivisions=null,mask=null,places=null,placesJob=null;
 const pane=(name,z)=>{map.createPane(name);map.getPane(name).style.zIndex=String(z);map.getPane(name).style.pointerEvents='none';};
 pane('boundaryMask',320);pane('countryBorders',330);pane('regionBorders',340);pane('boundaryHighlight',350);pane('englishLabels',450);
 const renderer=L.canvas({pane:'countryBorders',padding:.3}),regionRenderer=L.canvas({pane:'regionBorders',padding:.3}),highlightRenderer=L.svg({pane:'boundaryHighlight'}),maskRenderer=L.svg({pane:'boundaryMask'});
 const pathStyle={color:'#8cbfe4',weight:1,opacity:.65,fillOpacity:0,interactive:false};
 map.doubleClickZoom.disable();
 map.attributionControl.addAttribution('Boundaries & labels <a href="https://www.naturalearthdata.com/">Natural Earth</a>');
 async function json(file){const response=await fetch(root+file);if(!response.ok)throw Error('Boundary data unavailable');return response.json();}
 function details(id){if(!cache.has(id)){const request=json('countries/'+id+'.json').catch(error=>{cache.delete(id);throw error;});cache.set(id,request);}return cache.get(id);}
 function fit(feature){const b=focusBounds(feature.geometry),padding=getPadding();map.fitBounds([[Math.max(-85,b[1]),b[0]],[Math.min(85,b[3]),b[2]]],{maxZoom:feature.properties.kind==='Country / territory'?9:12,...(Array.isArray(padding)?{padding}:padding),animate:window.atlasMotion.enabled});}
 function shade(feature){
  if(mask)map.removeLayer(mask);if(outline)map.removeLayer(outline);
  if(!feature){mask=outline=null;return;}
  const rings=[[[85.0511,-180],[85.0511,180],[-85.0511,180],[-85.0511,-180],[85.0511,-180]],...geometryPolygons(feature.geometry).flatMap(poly=>poly.map(ring=>ring.map(([x,y])=>[Math.max(-85.0511,Math.min(85.0511,y)),x])))];
  mask=L.polygon(rings,{renderer:maskRenderer,pane:'boundaryMask',stroke:false,fillColor:'#020912',fillOpacity:.52,fillRule:'evenodd',interactive:false}).addTo(map);
  outline=L.geoJSON(feature,{renderer:highlightRenderer,pane:'boundaryHighlight',style:{color:'#7bc8ff',weight:2.4,opacity:1,fillColor:'#63b6ff',fillOpacity:.09},interactive:false}).addTo(map);
 }
 function breadcrumbs(){
  const node=$('boundary-breadcrumb');node.replaceChildren();const world=document.createElement('button');world.textContent='World';world.onclick=()=>backToWorld();node.append(world);
  if(country){const c=document.createElement('button');c.textContent=country.properties.name;c.onclick=()=>selectCountry(country.properties.country);node.append(' / ',c);}
  if(selected&&selected.id!==country?.id){const label=document.createElement('span');label.textContent=selected.properties.name;node.append(' / ',label);}
  $('boundary-clear').hidden=!selected;$('boundary-back').hidden=!selected;$('boundary-back').textContent=selected&&selected.id!==country?.id?'← Back to '+country.properties.name:'← Back to world';
 }
 async function commit(feature){selected=feature;shade(feature);breadcrumbs();onNotice(feature.properties.name,{backLabel:feature.id===country?.id?'Back to world':'Back to '+country.properties.name});$('boundary-info').replaceChildren();const h=document.createElement('h3');h.textContent=feature.properties.name;const p=document.createElement('p');p.textContent='Analyzing NASA observations inside this border…';$('boundary-info').append(h,p);fit(feature);labels.paint();try{await onSelect(feature);}catch{if(selected?.id===feature.id)$('boundary-status').textContent='Boundary selected; NASA analysis unavailable. Check the data connection.';}}
 async function selectCountry(id){
  const idTicket=++ticket;const overview=countries.find(f=>f.properties.country===id);if(!overview)return;
  $('boundary-status').textContent='Loading '+overview.properties.name+' regions…';map.closePopup();
  try{const detail=await details(id);if(ticket!==idTicket)return;country=detail.country;regions=detail.regions.features.map(f=>({...f,contains:compileGeometry(f.geometry)}));
   if(subdivisions)map.removeLayer(subdivisions);
   subdivisions=L.geoJSON(detail.regions,{renderer:regionRenderer,pane:'regionBorders',style:{color:'#b6d6ed',weight:1,opacity:.7,fillOpacity:0},interactive:false}).addTo(map);
   $('region-picker').replaceChildren();const first=document.createElement('option');first.value='';first.textContent='Choose a region';$('region-picker').append(first);
   for(const f of [...regions].sort((a,b)=>a.properties.name.localeCompare(b.properties.name,'en'))){const option=document.createElement('option');option.value=f.id;option.textContent=f.properties.name;$('region-picker').append(option);}
   $('region-picker').disabled=!regions.length;
   $('boundary-status').textContent=regions.length?regions.length+' administrative regions · double-click one to focus': 'No first-level subdivisions available for this territory.';
   await commit(country);
  }catch{$('boundary-status').textContent='Could not load borders. Try selecting this country again.';}
 }
 async function selectRegion(feature){++ticket;map.closePopup();$('region-picker').value=feature.id;await commit(feature);}
 function backToWorld(){clear();map.closePopup();map.fitBounds([[-80,-180],[80,180]],{...(Array.isArray(getPadding())?{padding:getPadding()}:getPadding()),animate:window.atlasMotion.enabled});}
 async function back(){if(!selected)return;if(country&&selected.id!==country.id){++ticket;$('region-picker').value='';await commit(country);}else backToWorld();}
 function clear({notify=true}={}){
  ++ticket;country=selected=null;regions=[];if(subdivisions)map.removeLayer(subdivisions);subdivisions=null;shade(null);breadcrumbs();
  const empty=document.createElement('option');empty.textContent='Select a country first';empty.value='';$('region-picker').replaceChildren(empty);$('region-picker').disabled=true;
  $('boundary-info').innerHTML='<h3>Explore the world</h3><p>Double-click a country, then a region, to inspect observations inside its border.</p>';
  $('boundary-status').textContent='Country borders ready · double-click to explore';onNotice(null);labels.paint();if(notify)onClear();
 }
 const LabelLayer=L.Layer.extend({
  onAdd(){this.canvas=L.DomUtil.create('canvas','english-label-canvas leaflet-zoom-hide');this.canvas.style.pointerEvents='none';map.getPane('englishLabels').append(this.canvas);map.on('moveend zoomend resize basemapchange',this.paint,this);this.paint();},
  paint(){
   if(!this.canvas)return;const size=map.getSize(),ratio=Math.min(devicePixelRatio||1,1.5),canvas=this.canvas;canvas.width=Math.round(size.x*ratio);canvas.height=Math.round(size.y*ratio);canvas.style.width=size.x+'px';canvas.style.height=size.y+'px';L.DomUtil.setPosition(canvas,map.containerPointToLayerPoint([0,0]));
   const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';const zoom=map.getZoom(),vector=map.getContainer().dataset.vectorReady==='true',occupied=[];let count=0;
   const candidates=[];
   if(!vector&&(zoom<7||country))for(const f of countries){if(country&&f.id!==country.id)continue;candidates.push({name:f.properties.name,point:f.properties.label,size:zoom<3?10:12,kind:'country'});}
   if(country&&zoom>=4)for(const f of regions)candidates.push({name:f.properties.name,point:f.properties.label,size:11,kind:'region'});
   if(!vector&&places&&zoom>=4)for(const p of places){if(p.minZoom>zoom||country&&p.country!==country.properties.country)continue;candidates.push({name:p.name,point:p.point,size:p.capital?12:10,kind:'city'});}
   for(const item of candidates){if(count>=150)break;const p=map.latLngToContainerPoint([item.point[1],item.point[0]]);if(p.x<20||p.y<20||p.x>size.x-20||p.y>size.y-20)continue;
    ctx.font=(item.kind==='country'?'600 ':'500 ')+item.size+'px "DM Sans",system-ui';const width=ctx.measureText(item.name).width,box=[p.x-width/2-7,p.y-10,p.x+width/2+7,p.y+10];
    if(occupied.some(b=>b[0]<box[2]&&b[2]>box[0]&&b[1]<box[3]&&b[3]>box[1]))continue;occupied.push(box);count++;
    ctx.lineWidth=3.5;ctx.strokeStyle='#041020';ctx.strokeText(item.name,p.x,p.y);ctx.fillStyle=item.kind==='country'?'#d7edff':item.kind==='region'?'#b5d7ef':'#edf4f8';ctx.fillText(item.name,p.x,p.y);
   }
   if(!vector&&zoom>=4&&!places&&!placesJob){placesJob=json('places.json').then(data=>{places=data;this.paint();}).catch(()=>{placesJob=null;});}
  }
 });
 const labels=new LabelLayer().addTo(map);
 map.on('dblclick',event=>{
  if(isDrawing())return;map.closePopup();const row={lon:event.latlng.lng,lat:event.latlng.lat};
  const region=regions.find(f=>f.contains(row));if(region)return selectRegion(region);
  const feature=countries.find(f=>f.contains(row));if(feature)return selectCountry(feature.properties.country);
 });
 $('boundary-clear').onclick=()=>clear();$('boundary-back').onclick=back;
 $('region-picker').onchange=()=>{const feature=regions.find(f=>f.id===$('region-picker').value);if(feature)selectRegion(feature);};
 $('country-search-form').onsubmit=event=>{event.preventDefault();const value=$('country-search').value.trim().toLowerCase(),feature=countries.find(f=>f.properties.name.toLowerCase()===value)||countries.find(f=>f.properties.name.toLowerCase().startsWith(value));if(feature&&value)selectCountry(feature.properties.country);else $('boundary-status').textContent='Choose a country from the English name suggestions.';};
 const ready=json('world.json').then(data=>{
  countries=data.features.map(f=>({...f,contains:compileGeometry(f.geometry)}));L.geoJSON(data,{renderer,pane:'countryBorders',style:pathStyle,interactive:false}).addTo(map);
  $('country-names').replaceChildren(...[...countries].sort((a,b)=>a.properties.name.localeCompare(b.properties.name,'en')).map(f=>{const option=document.createElement('option');option.value=f.properties.name;return option;}));
  $('boundary-status').textContent='Country borders ready · double-click to explore';labels.paint();return true;
 }).catch(()=>{$('boundary-status').textContent='Country borders unavailable. Reload to retry; map detections still work.';return false;});
 return {ready,selectCountry,selectRegion,clear,back,get selected(){return selected;},get country(){return country;},showSummary(result,{start,end,confidence,view,day}){
  if(!selected)return;const node=$('boundary-info');node.replaceChildren();const title=document.createElement('h3');title.textContent=selected.properties.name;node.append(title);
  const type=document.createElement('p');type.className='boundary-kind';type.textContent=selected.properties.kind+(country&&selected.id!==country.id?' · '+country.properties.name:'');node.append(type);
  const values=[['Selected detections',result.selected.toLocaleString()],['MODIS observations',result.bars[0][1].toLocaleString()],['VIIRS observations',result.bars[1][1].toLocaleString()],['Daily occupied cells',result.cells.toLocaleString()],['Multi-sensor cells',result.overlap.toLocaleString()],['Highest observed FRP',result.maxFrp===null?'Unavailable':result.maxFrp+' MW'],['Latest observation',result.latest?result.latest+' UTC':'No detections in window']];
  const dl=document.createElement('dl');for(const [label,value] of values){const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;dl.append(dt,dd);}node.append(dl);
  const note=document.createElement('p');note.textContent=start+'–'+end+' UTC · confidence ≥ '+confidence+'% · '+view+(day?' · '+day:'')+'. Sensor totals cover this date window; selected detections follow the view and day filters. These are thermal anomalies, not counts of unique fires.';node.append(note);
 }};
}
