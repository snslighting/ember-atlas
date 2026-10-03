import {evidenceGrid,confidenceClass,algorithmVersion} from './harmonization.js';
import {qualityRows} from './event-tracking.js';
import {dates} from './history-core.js';
export const slots={MODIS_SP:'m',MODIS_NRT:'m',VIIRS_SNPP_SP:'s',VIIRS_SNPP_NRT:'s',VIIRS_NOAA20_SP:'j',VIIRS_NOAA20_NRT:'j',VIIRS_NOAA21_NRT:'n'};
export const supportColumns=['cellID','date','lat','lon','m','s','j','n','frpMax','evidenceWeight','crossSensorCoincident','sourceObservationIDs','bySource','confidenceClasses','timeStart','timeEnd'];
export const rawColumns=['id','lat','lon','date','time','sensor','product','satellite','scan','track','confidence','confidenceRaw','daynight','frp','version','sourceChecksum'];
export function monitoringZone(lat,lon){const x=Math.floor(lon*4),y=Math.floor(lat*4);return {id:x+':'+y,bounds:[x/4,y/4,(x+1)/4,(y+1)/4]};}
export function supportRows(input){return evidenceGrid(qualityRows(input)).map(c=>({...c,m:+c.products.some(p=>slots[p]==='m'),s:+c.products.some(p=>slots[p]==='s'),j:+c.products.some(p=>slots[p]==='j'),n:+c.products.some(p=>slots[p]==='n'),frpMax:c.frp}));}
export function supportDaily(cells,coverage){const days=new Map();for(const c of coverage)for(const date of dates(c.start,c.end)){let d=days.get(date);if(!d){d={date,m:null,s:null,j:null,n:null,cells:0,frpMax:null,processing:'SP',shared:0};days.set(date,d);}if(slots[c.product])d[slots[c.product]]??=0;if(c.processing==='NRT')d.processing='NRT';}for(const c of cells){const d=days.get(c.date);if(!d)continue;d.cells++;for(const slot of ['m','s','j','n'])if(c[slot]&&d[slot]!==null)d[slot]++;if(c.crossSensorCoincident)d.shared++;if(c.frpMax>0)d.frpMax=Math.max(d.frpMax??0,c.frpMax);}return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));}
export function encodeSupport(cells){return {format:'atlas-support-v2',algorithmVersion,columns:supportColumns,rows:cells.map(c=>supportColumns.map(k=>c[k])),uncertainty:'Approximate scan/track support cells; not burned area or exact fire position. Source centers define AOI inclusion before footprint allocation.'};}
export function encodeRaw(rows){return {format:'atlas-observations-v1',columns:rawColumns,rows:rows.map(r=>rawColumns.map(k=>r[k]??null))};}
export function decodeRecords(value){if(!['atlas-support-v2','atlas-observations-v1'].includes(value.format))throw Error('Unsupported monitor partition');return value.rows.map(row=>Object.fromEntries(value.columns.map((k,i)=>[k,row[i]])));}
export const monitorCases={
 uzbekistan:{id:'uzbekistan',name:'Central Asia · Uzbekistan',bounds:[55.9,37.1,73.2,45.6],historyCase:'uzbekistan',demo:'2021-04',description:'Uzbekistan country archive; surrounding Central Asia has live data only'},
 california:{id:'california',name:'Northern California',bounds:[-123,38,-120,41],historyCase:'california',demo:'2023-09',description:'September SP case study, 2017–2024'},
 amazon:{id:'amazon',name:'Amazon · Rondônia',bounds:[-64,-13,-60,-8],historyCase:'amazon',demo:'2024-08',description:'August SP case study, 2017–2024'},
 australia:{id:'australia',name:'Eastern Australia',bounds:[145,-24,150,-20],demo:'2023-12',description:'Declared eastern-Australia area, 2018–2023 SP; six historical years'}
};

export function decodeSelectedRecords(value,contains,month=null){if(value.format!=='atlas-observations-v1')throw Error('Raw observation partition required');const lat=value.columns.indexOf('lat'),lon=value.columns.indexOf('lon'),date=value.columns.indexOf('date');return value.rows.filter(r=>(!month||r[date].startsWith(month))&&contains({lat:r[lat],lon:r[lon]})).map(r=>Object.fromEntries(value.columns.map((k,i)=>[k,r[i]])));}
