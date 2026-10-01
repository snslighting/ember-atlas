export function nextDateRange(previous,incoming,followLatest){
 if(followLatest||!previous.start||!previous.end)return {start:incoming.dateStart,end:incoming.dateEnd};
 const start=previous.start<incoming.dateStart?incoming.dateStart:previous.start>incoming.dateEnd?incoming.dateEnd:previous.start;
 const end=previous.end>incoming.dateEnd?incoming.dateEnd:previous.end<incoming.dateStart?incoming.dateStart:previous.end;
 return {start,end};
}
export function feedHealth(retrievedAt,now=Date.now()){
 const age=Math.max(0,now-Date.parse(retrievedAt));
 return {age,stale:!Number.isFinite(age)||age>45*60*1000,ageLabel:age<60000?'just now':age<3600000?`${Math.floor(age/60000)} min ago`:`${Math.floor(age/3600000)} h ago`};
}
