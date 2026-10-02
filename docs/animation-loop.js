// No scheduled frame remains when motion is disabled or the tab is hidden.
export function createAnimationLoop({enabled,visible,tick,request=requestAnimationFrame,cancel=cancelAnimationFrame}){
 let frame=null;
 function start(){if(frame===null&&enabled()&&visible())frame=request(run);}
 function run(time){frame=null;if(!enabled()||!visible())return;tick(time);start();}
 function stop(){if(frame!==null)cancel(frame);frame=null;}
 return {start,stop,sync(){stop();start();}};
}
