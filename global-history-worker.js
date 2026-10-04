import {loadGlobalHistory} from './global-history.js';
let latest=0;
self.onmessage=async({data:{id,args}})=>{latest=id;try{const result=await loadGlobalHistory(args);if(id===latest)self.postMessage({id,result});}catch(error){if(id===latest)self.postMessage({id,error:error.message});}};
