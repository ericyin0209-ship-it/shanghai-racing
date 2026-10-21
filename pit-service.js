import {clamp,angle,steeringLimit} from './physics.js?v=224';
export function createPitService(track){let phase='idle',index=0,remaining=0;const entry=[[-6,-560],[-23,-533],[-25,-488],[-25,-190]],exit=[[-25,-12],[-22,18],[-6,43],[0,70]];
 function drive(v,point,parking=false){const dx=point[0]-v.x,dz=point[1]-v.z,d=Math.hypot(dx,dz),error=angle(Math.atan2(dx,dz)-v.yaw-Math.atan2(v.lateralSpeed,Math.max(3,v.speed))*.6),target=Math.min(10,Math.max(parking?0:2,d*(parking?.8:.45)))*(Math.abs(error)>.7?.45:1);const steer=clamp(Math.atan2(7.2*Math.sin(error),Math.max(6,Math.min(30,d)))/steeringLimit(v.speed),-1,1),traction=clamp(1-Math.abs(v.rearSlip||0)*5-Math.abs(v.slip||0)*3,.1,1);return {steer,throttle:clamp((target-v.speed)*.35,0,.25)*traction,brake:clamp((v.speed-target)*.5,0,1)};}

 return {request(){if(phase==='idle')phase='requested';},cancel(v){if(v&&['entry','service','exit'].includes(phase))v.pitLimiter=false;phase='idle';index=remaining=0;if(v)v.service=null;},get phase(){return phase;},get remaining(){return remaining;},get active(){return ['entry','service','exit'].includes(phase);},update(dt,v,repair){
  if(phase==='requested'){const near=track.nearest(v.x,v.z);if(near.s>track.length-750&&near.s<track.length-600&&v.speed<50){phase='entry';index=0;v.pitLimiter=true;}}
  if(phase==='entry'||phase==='exit'){const route=phase==='entry'?entry:exit,target=route[index];const parking=phase==='entry'&&index===route.length-1;if(Math.hypot(v.x-target[0],v.z-target[1])<(parking?.6:6)&&(!parking||v.speed<.8)){index++;if(index===route.length){if(phase==='entry'){phase='service';remaining=7;v.speed=0;v.lateralSpeed=0;v.yawRate=0;v.x=-25;v.z=-190;v.yaw=0;}else{phase='idle';v.pitLimiter=false;}return {throttle:0,brake:1,steer:0};}}return drive(v,route[Math.min(index,route.length-1)],phase==='entry'&&index===route.length-1);}
  if(phase==='service'){remaining-=dt;if(remaining<=0){repair(v);phase='exit';index=0;}return {throttle:0,brake:1,steer:0};}return null;
 }};
}
