import {fitSeasonalCalibration,calibrationFactor} from './seasonal-calibration.js';
import {fitCalibration,monthlyCalendar,decodeCells,dailyStatistics,cellsCSV,activity,seasonalContext} from './history-core.js';
import {compileGeometry,focusBounds} from './boundary-geometry.js';import {normalizeArea,inArea} from './area-bounds.js';
import {createViewportIndex,viewportBins} from './map-analysis.js';
export const intersects=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
export function createHistoryEngine(metadata,loadFiles){
 let context=null,selected=[],index=createViewportIndex([]),ticket=0,selectionTicket=0;
 const statsCache=new Map();
 async function yearCells(area,year,bounds){const entries=area.tiles.filter(t=>t.year===year&&(!bounds||intersects(t.bounds,bounds)));return (await loadFiles(entries)).flatMap(decodeCells);}
 async function analyze(args){
  const id=++ticket,area=metadata.cases.find(c=>c.id===args.caseID);if(!area)throw Error('No historical coverage for this case');
  const bounds=normalizeArea(args.area),predicate=args.boundary?compileGeometry(args.boundary.geometry):r=>inArea(r,bounds),clip=bounds||args.boundary&&focusBounds(args.boundary.geometry);
  if(args.area&&!bounds)throw Error('Invalid historical area');
  const key=JSON.stringify([area.id,bounds,args.boundary?.id]);let days=statsCache.get(key);
  if(!days){
   days=[];
   for(const entry of area.summary){
    const summary=(await loadFiles([entry]))[0];
    if(!bounds&&!args.boundary)days.push(...summary.days);
    else if(clip&&!intersects(clip,area.bounds))continue;
    else{const cells=(await yearCells(area,entry.year,clip)).filter(predicate);days.push(...dailyStatistics(cells,summary.coverage));}
   }
   statsCache.set(key,days);while(statsCache.size>4)statsCache.delete(statsCache.keys().next().value);
  }
  const historicalDays=days.filter(d=>d.processing!=='NRT'),archiveNRT=args.includeRecent?days.filter(d=>d.processing==='NRT'):[],model=fitSeasonalCalibration(historicalDays);let recentDays=[];
  if(args.includeRecent&&area.recent){const summary=(await loadFiles([area.recent.summary]))[0];if(!bounds&&!args.boundary)recentDays=summary.days;else if(!clip||intersects(clip,area.bounds)){const cells=decodeCells((await loadFiles([area.recent]))[0]).filter(predicate);recentDays=dailyStatistics(cells,summary.coverage);}}
  const knownDates=new Set(historicalDays.map(d=>d.date));days=[...historicalDays,...archiveNRT.filter(d=>!recentDays.some(r=>r.date===d.date)),...recentDays.filter(d=>!knownDates.has(d.date))].sort((a,b)=>a.date.localeCompare(b.date));
  const allMonths=monthlyCalendar(days,model),months=allMonths.filter(m=>Number(m.month.slice(0,4))>=args.fromYear&&Number(m.month.slice(0,4))<=args.toYear);
  if(id!==ticket)return {stale:true};
  context={area,days,historicalDays,includeRecent:args.includeRecent,model,months,allMonths,predicate,clip,key};selected=[];index=createViewportIndex([]);
  return {case:area,model,months,days:days.length,build:metadata.builtAt,quality:metadata.quality,coverage:metadata.grid,offline:!!metadata.offline};
 }
 async function select({month,view='Harmonized'}){
  const id=++selectionTicket,c=context;if(!c)throw Error('Load a history case first');
  const historical=await yearCells(c.area,Number(month.slice(0,4)),c.clip);const recent=c.includeRecent&&c.area.recent&&Number(month.slice(0,4))>=Number(c.area.recent.dateStart.slice(0,4))&&Number(month.slice(0,4))<=Number(c.area.recent.dateEnd.slice(0,4))?decodeCells((await loadFiles([c.area.recent]))[0]):[];if(!c.includeRecent){const allowed=new Set(c.historicalDays.map(d=>d.date));for(let i=historical.length-1;i>=0;i--)if(!allowed.has(historical[i].date))historical.splice(i,1);}
  const knownDates=new Set(c.historicalDays.map(d=>d.date)),recentDates=new Set(recent.map(d=>d.date));
  const cells=[...historical.filter(r=>!recentDates.has(r.date)||knownDates.has(r.date)),...recent.filter(r=>!knownDates.has(r.date))].filter(r=>r.date.startsWith(month)&&c.predicate(r));
  if(id!==selectionTicket||c!==context)return {stale:true};
  selected=cells;const visible=[];
  for(const r of cells){
   const base={...r,id:r.date+':'+r.cellID,time:r.timeStart,confidenceRaw:'fixed source quality rule',observations:r.m+r.s+r.j+r.n,sensors:[...(r.m?['MODIS']:[]),...(r.s+r.j+r.n?['VIIRS']:[])],sensor:'Harmonized',product:r.products.join('+'),satellite:r.satellites.join('+')};
   if(view==='Compare'){if(r.m)visible.push({...base,sensor:'MODIS',observations:r.m});if(r.s+r.j+r.n)visible.push({...base,sensor:'VIIRS',observations:r.s+r.j+r.n});}
   else if(view==='MODIS'){if(r.m)visible.push({...base,sensor:'MODIS',observations:r.m});}
   else if(view==='VIIRS'){if(r.s+r.j+r.n)visible.push({...base,sensor:'VIIRS',observations:r.s+r.j+r.n});}
   else visible.push(base);
  }
  index=createViewportIndex(visible);return {period:c.months.find(m=>m.month===month),cells:cells.length,symbolCells:visible.length};
 }
 function liveContext({monthDayStart,monthDayEnd,modisCells,viirsCells,dailyCounts,viirsSlot='j'}){
  if(!context)return {state:'History unavailable'};const model=context.model,factor=model.factors[viirsSlot]?.factor;
  if(factor===null||factor===undefined)return {state:'Insufficient calibration'};
  const value=dailyCounts?.length?dailyCounts.reduce((sum,d)=>sum+(d.modisCells+calibrationFactor(model,viirsSlot,d.date)*d.viirsCells)/2,0):(modisCells+factor*viirsCells)/2,groups=new Map(),wrap=monthDayStart>monthDayEnd;
  const expected=[];for(let date=new Date('2000-'+monthDayStart+'T00:00:00Z'),last=new Date((wrap?'2001-':'2000-')+monthDayEnd+'T00:00:00Z');date<=last;date.setUTCDate(date.getUTCDate()+1))expected.push(date.toISOString().slice(5,10));
  for(const d of context.historicalDays){const md=d.date.slice(5);if(wrap?(md<monthDayStart&&md>monthDayEnd):(md<monthDayStart||md>monthDayEnd))continue;const y=Number(d.date.slice(0,4))-(wrap&&md<=monthDayEnd?1:0);if(!groups.has(y))groups.set(y,{value:0,days:[]});const score=activity(d,model).value;if(score!==null){groups.get(y).value+=score;groups.get(y).days.push(md);}}
  const peers=[...groups.values()].filter(g=>g.days.join(',')===expected.join(',')).map(g=>g.value);
  return {...seasonalContext(value,peers),index:value,reference:viirsSlot,provisional:true};
 }
 return {analyze,select,points:args=>viewportBins(index,args),export:()=>cellsCSV(selected),liveContext};
}
