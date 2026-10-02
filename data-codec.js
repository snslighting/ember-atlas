// Lossless columns preserve original values, missing properties and metadata.
export function packRows(rows){
 const fields=[...new Set(rows.flatMap(row=>Object.keys(row)))],columns=[];
 for(const field of fields){
  const present=[];for(let i=0;i<rows.length;i++)if(Object.hasOwn(rows[i],field))present.push(i);
  if(present.length<rows.length/4){columns.push({field,sparse:present.map(i=>[i,rows[i][field]])});continue;}
  const values=rows.map(row=>Object.hasOwn(row,field)?row[field]:null),missing=present.length===rows.length?undefined:rows.flatMap((row,i)=>Object.hasOwn(row,field)?[]:[i]);
  if(values.every(value=>value===values[0])){columns.push({field,constant:values[0],missing});continue;}
  const dictionary=[...new Set(values)];
  if(dictionary.length<=256&&dictionary.length<rows.length/2){const lookup=new Map(dictionary.map((value,i)=>[value,i]));columns.push({field,dictionary,indexes:values.map(value=>lookup.get(value)),missing});}
  else columns.push({field,values,missing});
 }
 return {format:'firms-columns-v1',length:rows.length,columns};
}
export function unpackRows(packed){
 if(packed?.format!=='firms-columns-v1'||!Number.isInteger(packed.length)||packed.length<0||!Array.isArray(packed.columns))throw Error('Invalid compact NASA data');
 const rows=Array.from({length:packed.length},()=>({}));
 for(const column of packed.columns){
  const {field}=column;if(typeof field!=='string'||field==='__proto__')throw Error('Invalid NASA field');
  if(column.sparse){for(const [i,value] of column.sparse){if(!rows[i])throw Error('Invalid sparse row');rows[i][field]=value;}continue;}
  if(Object.hasOwn(column,'constant')){for(const row of rows)row[field]=column.constant;}
  else if(column.dictionary){if(column.indexes.length!==rows.length)throw Error('Incomplete NASA column');for(let i=0;i<rows.length;i++){const index=column.indexes[i];if(!Number.isInteger(index)||index<0||index>=column.dictionary.length)throw Error('Invalid dictionary index');rows[i][field]=column.dictionary[index];}}
  else{if(column.values?.length!==rows.length)throw Error('Incomplete NASA column');for(let i=0;i<rows.length;i++)rows[i][field]=column.values[i];}
  for(const i of column.missing||[])delete rows[i][field];
 }
 return rows;
}
