export function englishStyle(source){
 const style=structuredClone(source);
 for(const layer of style.layers||[]){
  if(layer.layout?.['text-field']&&JSON.stringify(layer.layout['text-field']).includes('name')){
   layer.layout['text-field']=['case',['!=',['coalesce',['get','name_en'],''],''],['get','name_en'],['coalesce',['get','name:latin'],'']];
  }
 }
 return style;
}
