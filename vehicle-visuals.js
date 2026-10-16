import * as THREE from 'three';
import {wheelAngles} from './vehicle-kinematics.js';
export {wheelAngles} from './vehicle-kinematics.js';
export function applyWheelPose(car,steer,distance,wheelStates=null){
  const angles=wheelAngles(steer,car.userData.wheelbase||3.4,car.userData.trackWidth||1.527);for(const pivot of car.userData.frontWheels)pivot.rotation.y=pivot.position.x>0?angles.left:angles.right;
  for(let i=0;i<car.userData.wheels.length;i++)car.userData.wheels[i].rotation.x=wheelStates?.[i]?.spin??distance/(car.userData.wheelRadius||.329);
  // Forward is +Z: positive steering turns toward driver-left (+X).
  // Viewed from the cockpit, the wheel top must move toward that same side.
  car.userData.steering.rotation.z=-steer*2.2;return angles;
}

// Render the same wheel contact state and suspended-body pose used by physics.
export function applyChassisMotion(car,v,dt,track,wetness=0){
 const data=car.userData;if(!data.motion)data.motion={roll:0,pitch:0,heave:0};const m=data.motion;
 const pivots=data.motionPivots??(data.motionPivots=["front-left","front-right","rear-left","rear-right"].map(name=>car.children.find(o=>o.name===name)));
 const follow=dt>0?1-Math.exp(-dt*30):1;
 const height=Number.isFinite(v.y)?v.y:.035;car.position.y=height;
 for(let i=0;i<4;i++){const pivot=pivots[i],w=v.wheels?.[i];if(!pivot||!w)continue;
  const squash=Math.max(.987,Math.min(1,1-Math.max(0,w.load-1800)*.0000012));pivot.scale.y=squash;const wanted=.36*squash+w.roadHeight-height;pivot.position.y+=(wanted-pivot.position.y)*follow;
  pivot.rotation.z=(pivot.position.x>0?-1:1)*(.025+Math.min(.012,Math.max(0,w.load-1800)*.0000015));
 }
 m.roll+=( (v.roll||0)-m.roll)*follow;m.pitch+=((v.pitch||0)-m.pitch)*follow;m.heave=0;
 data.chassis.rotation.set(m.pitch,0,m.roll);data.chassis.position.y=0;data.updateSuspension?.();return m;
}
