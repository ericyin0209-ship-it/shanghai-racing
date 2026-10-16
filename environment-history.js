import {clamp} from './physics.js';
// Small per-sample conditions plus bounded, two-second drying-trail checkpoints.
export class EnvironmentHistory{
 constructor(){this.frames=[];this.lastTime=-Infinity;this.lastKey='';}
 record(time,state,fullCapture){const key=state.weather+':'+state.hour;if(time-this.lastTime>=2||key!==this.lastKey){this.frames.push({time,...fullCapture()});this.lastTime=time;this.lastKey=key;}if(this.frames.length>602)this.frames.shift();}
 at(time){const frames=this.frames;if(!frames.length)return null;let lo=0,hi=frames.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].time<=time)lo=mid;else hi=mid-1;}const a=frames[lo],b=frames[Math.min(lo+1,frames.length-1)];return {a,b,u:b.time>a.time?clamp((time-a.time)/(b.time-a.time),0,1):0};}
 clear(){this.frames=[];this.lastTime=-Infinity;this.lastKey='';}
}
export function interpolateEnvironment(a,b,u){if(!a)return null;if(!b||a.weather!==b.weather||a.hour!==b.hour)return {...a};return {...a,wetness:a.wetness+(b.wetness-a.wetness)*u,waterTime:a.waterTime+(b.waterTime-a.waterTime)*u};}
