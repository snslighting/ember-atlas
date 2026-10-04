// Presentation helpers: native NASA pixel centers are never replaced with a group centroid.
export function latestPixelLocation(ids, records){
 let latest=null,latestID='';
 for(const id of ids){const r=records.get(id);if(!r||!Number.isFinite(r.lat)||!Number.isFinite(r.lon))continue;
  const acquiredAt=r.date+'T'+r.time+':00Z';
  if(!latest||acquiredAt>latest.acquiredAt||acquiredAt===latest.acquiredAt&&id<latestID){latestID=id;latest={lat:r.lat,lon:r.lon,acquiredAt,sensor:r.sensor,satellite:r.satellite,scan:r.scan,track:r.track,frp:r.frp,confidenceRaw:r.confidenceRaw,sourceID:id};}
 }
 return latest;
}
export const pixelCoordinates=location=>location?String(location.lat)+', '+String(location.lon):null;

// Global browsing has no uniform historical baseline. Use current evidence and
// geographic sampling, leaving every scientific state/percentile unchanged.
export function worldwideAttention(events,limit=250){
 const trend={ 'Rapidly increasing':3,Increasing:2,Mixed:1,Stable:0 };
 const compare=(a,b)=>Number(!!a.stale)-Number(!!b.stale)
  ||Number(b.acquisitionGroups>=2&&b.sensors.length>1)-Number(a.acquisitionGroups>=2&&a.sensors.length>1)
  ||(trend[b.trend?.state]??-1)-(trend[a.trend?.state]??-1)
  ||b.latestTime-a.latestTime||b.acquisitionGroups-a.acquisitionGroups||b.durationHours-a.durationHours||a.id.localeCompare(b.id);
 const buckets=new Map();
 for(const e of events){const key=Math.floor((e.center[0]+90)/20)+':'+Math.floor((e.center[1]+180)/20);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(e);}
 const groups=[...buckets.values()].map(list=>list.sort(compare)).sort((a,b)=>compare(a[0],b[0])),out=[];
 for(let round=0;out.length<limit;round++){let added=0;for(const list of groups)if(list[round]){out.push(list[round]);added++;if(out.length>=limit)break;}if(!added)break;}
 return out;
}
export function focusAttention(e,map){
 map.select(e.id);
 map.locate(e.location||{lat:e.center[0],lon:e.center[1],kind:'group'});
}

export function createAttentionCard(e,{document,selected,onInspect,onLocate,onCopy}){
 const card=document.createElement('article');card.className='event-item'+(e.id===selected?' selected':'');
 const inspect=document.createElement('button');inspect.className='event-inspect';inspect.setAttribute('aria-label','Inspect activity '+e.id);
 const badge=document.createElement('span');badge.className='state-badge';badge.dataset.state=e.state;badge.textContent=e.approaching?'Approaching critical':e.state;
 const id=document.createElement('strong');id.className='event-id';id.textContent=e.id;
 const line=text=>{const n=document.createElement('small');n.textContent=text;return n;};
 inspect.append(badge,id,line(e.harmonizedCells.toLocaleString()+' support cells · '+e.trend.state),line(e.context.available?e.context.percentile.toFixed(1)+'th seasonal percentile':'Comparable seasonal history unavailable'),line(e.freshness+' · '+e.durationHours.toFixed(1)+' h observed span'));
 inspect.onclick=()=>onInspect(e.id);card.append(inspect);
 const coordinates=pixelCoordinates(e.location),location=document.createElement('div');location.className='event-location';
 location.append(line(coordinates?'Latest reported pixel center · lat, lon':'Representative group center · lat, lon'));
 const value=document.createElement('strong');value.className='event-coordinates';value.textContent=coordinates||e.center.map(v=>v.toFixed(4)).join(', ');location.append(value);
 location.append(line(coordinates?e.location.sensor+' · '+e.location.acquiredAt.replace('T',' ').replace(':00Z',' UTC'):'Native pixel unavailable in this snapshot. This is an approximate group center.'));
 card.append(location);
 const actions=document.createElement('div');actions.className='event-quick-actions';
 const locate=document.createElement('button');locate.textContent='Locate on map ↗';locate.setAttribute('aria-label','Locate activity '+e.id+' on map');locate.onclick=()=>onLocate(e.id,e.location);actions.append(locate);
 if(coordinates){const copy=document.createElement('button');copy.textContent='Copy coordinates';copy.setAttribute('aria-label','Copy pixel coordinates for '+e.id);copy.onclick=()=>onCopy(copy,coordinates);actions.append(copy);}
 card.append(actions);return card;
}
