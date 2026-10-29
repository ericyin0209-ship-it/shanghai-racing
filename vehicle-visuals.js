import * as THREE from 'three';
import {pitLanding} from './pit-dynamics.js?v=232';
import {wheelAngles} from './vehicle-kinematics.js?v=229release';
export {wheelAngles} from './vehicle-kinematics.js?v=229release';
export function applyWheelPose(car,steer,distance,wheelStates=null){
  const angles=wheelAngles(steer,car.userData.wheelbase||3.4,car.userData.trackWidth||1.527);for(const pivot of car.userData.frontWheels){pivot.userData.steeringAngle=pivot.position.x>0?angles.left:angles.right;pivot.rotation.y=pivot.userData.steeringAngle;}
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
 // preview.28: pit-stop jacks raise the front and rear axle lines (v.serviceLift, metres). The body follows both jack
 // heights (rise at the origin plus nose-up/down pitch over the 3.6 m wheelbase); a wheel stays on the ground until its
 // axle has risen past the suspension droop, then hangs with the upright.
 const lift=v.serviceLift,lf=lift?.front||0,lr=lift?.rear||0,droop=.016,liftAt0=lr+(lf-lr)*(1.93/3.6),liftPitch=lift?-Math.atan2(lf-lr,3.6):0;
 const landing=pitLanding(v.service?.pit);const height=Number.isFinite(v.y)?v.y:.035;car.position.y=height+liftAt0+landing.heave;data.pitLanding=landing;
 for(let i=0;i<4;i++){const pivot=pivots[i],w=v.wheels?.[i];if(!pivot||!w)continue;
  const squash=lift?1:Math.max(.987,Math.min(1,1-Math.max(0,w.load-1800)*.0000012));pivot.scale.y=squash;const axleLift=i<2?lf:lr,wanted=.36*squash+w.roadHeight+Math.max(0,axleLift-droop)-car.position.y;pivot.position.y+=(wanted-pivot.position.y)*(lift?1:follow);
  pivot.rotation.z=(pivot.position.x>0?-1:1)*(.025+Math.min(.012,Math.max(0,w.load-1800)*.0000015));
 }
 // Body attitude is the physics attitude (same limits); only frame-rate smoothing is applied.
 m.roll+=(Math.max(-.016,Math.min(.016,v.roll||0))-m.roll)*follow;m.pitch+=(Math.max(-.02,Math.min(.02,v.pitch||0))-m.pitch)*follow;m.heave=landing.heave;
 if(lift){m.pitch=liftPitch+Math.max(-.02,Math.min(.02,v.pitch||0));}
 data.chassis.rotation.set(m.pitch+landing.pitch,0,m.roll);data.chassis.position.y=0;data.updateSuspension?.();return m;
}
