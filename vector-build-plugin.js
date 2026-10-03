export const leafletGlobalPlugin={name:'leaflet-global',setup(build){
 build.onResolve({filter:/^leaflet$/},()=>({path:'leaflet',namespace:'atlas-global'}));
 build.onLoad({filter:/.*/,namespace:'atlas-global'},()=>({contents:'export default globalThis.L;',loader:'js'}));
}};
