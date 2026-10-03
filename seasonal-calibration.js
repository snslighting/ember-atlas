// Regional MODIS-equivalent occupied-cell activity. Not calibrated fire probability.
function metric(days,factor,slot){const errors=days.map(d=>factor*d[slot]-d.m);return {days:days.length,rmse:errors.length?Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/errors.length):null,mae:errors.length?errors.reduce((s,e)=>s+Math.abs(e),0)/errors.length:null,bias:errors.length?errors.reduce((s,e)=>s+e,0)/errors.length:null};}
export function fitSeasonalCalibration(days,{throughYear=2020,minDays=30,minYears=3,priorDays=60}={}){
 const factors={},months={};
 for(const slot of ['s','j','n']){
  const paired=days.filter(d=>d.processing!=='NRT'&&Number.isFinite(d.m)&&Number.isFinite(d[slot]));
  const train=paired.filter(d=>+d.date.slice(0,4)<=throughYear),test=paired.filter(d=>+d.date.slice(0,4)>throughYear),years=[...new Set(train.map(d=>d.date.slice(0,4)))];
  const sm=train.reduce((s,d)=>s+d.m,0),sv=train.reduce((s,d)=>s+d[slot],0),global=train.length>=minDays&&years.length>=minYears&&sv>0&&sm>0?sm/sv:null;
  factors[slot]={factor:global,pairedDays:train.length,trainingYears:years,holdoutDays:test.length,...(global!==null?metric(test,global,slot):{}),reason:global===null?'Insufficient paired historical coverage':undefined};months[slot]={};
  for(let month=1;month<=12;month++){
   const mm=String(month).padStart(2,'0'),t=train.filter(d=>d.date.slice(5,7)===mm),v=t.reduce((s,d)=>s+d[slot],0),m=t.reduce((s,d)=>s+d.m,0),ys=[...new Set(t.map(d=>d.date.slice(0,4)))];
   const eligible=global!==null&&t.length>=minDays&&ys.length>=minYears&&v>0;
   const strength=t.length/(t.length+priorDays),factor=eligible?strength*(m/v)+(1-strength)*global:global;
   // Leave-one-year-out factor range describes stability, not a confidence interval.
   const jackknife=eligible?ys.map(y=>{const rest=t.filter(d=>!d.date.startsWith(y));const vv=rest.reduce((s,d)=>s+d[slot],0);return vv?rest.reduce((s,d)=>s+d.m,0)/vv:null;}).filter(Number.isFinite):[];
   months[slot][mm]={factor,pairedDays:t.length,trainingYears:ys,shrinkageWeight:eligible?strength:0,fallback:!eligible,stabilityRange:jackknife.length?[Math.min(...jackknife),Math.max(...jackknife)]:null,...(factor!==null?metric(test.filter(d=>d.date.slice(5,7)===mm),factor,slot):{})};
  }
 }
 return {name:'Seasonal regional MODIS-equivalent activity',method:'Paired SP daily occupied cells, calendar-month ratios shrunk toward region-wide ratio; fixed training cutoff. Detection exposure not corrected.',throughYear,factors,months,uncertainty:'Year deletion ranges are model stability, not physical or probabilistic uncertainty; region/season calibration does not transfer automatically.'};
}
export function calibrationFactor(model,slot,date){return model.months?.[slot]?.[date.slice(5,7)]?.factor??model.factors[slot]?.factor??null;}
