// One retained canvas; Leaflet moves it with the map while the worker queries.
export function createHotspotLayer(map,onInspect){
 const Layer=L.Layer.extend({
  onAdd(){this.canvas=L.DomUtil.create('canvas','hotspot-canvas leaflet-zoom-hide');this.canvas.style.pointerEvents='none';map.getPane('overlayPane').append(this.canvas);this.bins=[];map.on('click',this.click,this);map.on('zoomend',this.zoomEnd,this);},
  onRemove(){this.canvas.remove();map.off('click',this.click,this);map.off('zoomend',this.zoomEnd,this);},
  zoomEnd(){if(this.zoom!==map.getZoom())this.canvas.style.visibility='hidden';},
  click(e){
   if(this.zoom!==map.getZoom()||!this.position)return;
   const offset=map.layerPointToContainerPoint(this.position);let best=null,distance=Infinity;
   for(const b of this.bins){const d=Math.hypot(b.x+offset.x-e.containerPoint.x,b.y+offset.y-e.containerPoint.y);if(d<Math.max(12,b.radius)&&d<distance){best=b;distance=d;}}
   if(best)onInspect(best);
  },
  paint(bins){
   const size=map.getSize(),ratio=Math.min(devicePixelRatio,1.5),width=Math.round(size.x*ratio),height=Math.round(size.y*ratio);
   if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
   this.canvas.style.width=size.x+'px';this.canvas.style.height=size.y+'px';
   this.position=map.containerPointToLayerPoint([0,0]);this.zoom=map.getZoom();L.DomUtil.setPosition(this.canvas,this.position);this.canvas.style.visibility='';
   const ctx=this.canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size.x,size.y);
   const colors={MODIS:'#ff965c',VIIRS:'#77bfff',Harmonized:'#a5e6bc'};this.bins=bins;
   ctx.font='600 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
   for(const b of bins){
    b.radius=b.count>1?Math.min(16,5+Math.log2(b.count)*1.3):4;
    ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fillStyle=colors[b.sensor];ctx.globalAlpha=.85;ctx.fill();
    if(b.count>1){ctx.globalAlpha=1;ctx.fillStyle='#061322';ctx.fillText(b.count>999?'1k+':String(b.count),b.x,b.y);}
   }
  }
 });
 return new Layer().addTo(map);
}
