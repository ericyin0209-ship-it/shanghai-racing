import * as THREE from 'three';
// Swept camera sphere against the actual room fittings; all coordinates are
// local to the stationary wind-tunnel room. No collision work while stationary.
export function createTunnelCameraConstraint(colliders){
 let radius=.24;const min=new THREE.Vector3(-6.65,.38,-6.65),max=new THREE.Vector3(6.65,7.35,6.65),last=new THREE.Vector3(),wanted=new THREE.Vector3(),stepVector=new THREE.Vector3(),point=new THREE.Vector3(),local=new THREE.Vector3(),closest=new THREE.Vector3(),delta=new THREE.Vector3();let initialized=false;
 function project(p){
  p.clamp(min,max);
  for(let pass=0;pass<3;pass++){
   for(const c of colliders){
    if(c.kind==='capsule'){
     const length=c.lengthSq,t=length?THREE.MathUtils.clamp(delta.subVectors(p,c.a).dot(c.axis)/length,0,1):0;closest.copy(c.a).addScaledVector(c.axis,t);delta.subVectors(p,closest);const d2=delta.lengthSq(),r=radius+c.radius;if(d2>=r*r)continue;if(d2>1e-12)p.addScaledVector(delta,(r-Math.sqrt(d2))/Math.sqrt(d2));else p.x+=r;
    }else{
     local.copy(p).applyMatrix4(c.inverse);closest.copy(local).clamp(c.halfNegative,c.half);delta.subVectors(local,closest);const d2=delta.lengthSq();if(d2>=radius*radius)continue;
     if(d2>1e-12)local.addScaledVector(delta,(radius-Math.sqrt(d2))/Math.sqrt(d2));else{const dx=c.half.x-Math.abs(local.x),dy=c.half.y-Math.abs(local.y),dz=c.half.z-Math.abs(local.z);if(dx<=dy&&dx<=dz)local.x=(local.x<0?-1:1)*(c.half.x+radius);else if(dy<=dz)local.y=(local.y<0?-1:1)*(c.half.y+radius);else local.z=(local.z<0?-1:1)*(c.half.z+radius);}
     p.copy(local).applyMatrix4(c.matrix);
    }
   }p.clamp(min,max);
  }return p;
 }
 function constrain(camera,target){
  const t=Math.tan((camera.fov||44)*Math.PI/360),nextRadius=Math.max(.24,(camera.near||.12)*Math.sqrt(1+t*t*(1+(camera.aspect||1)**2))+.05);if(Math.abs(nextRadius-radius)>1e-6){radius=nextRadius;initialized=false;}
  wanted.copy(camera.position).clamp(min,max);
  if(!initialized){project(wanted);last.copy(wanted);initialized=true;}
  const distance=last.distanceTo(wanted);if(distance>1e-7){const steps=Math.max(1,Math.ceil(distance/.12));stepVector.subVectors(wanted,last).divideScalar(steps);point.copy(last);for(let i=0;i<steps;i++){point.add(stepVector);project(point);}last.copy(point);}
  camera.position.copy(last);target.x=THREE.MathUtils.clamp(target.x,-2,2);target.y=THREE.MathUtils.clamp(target.y,.15,2.4);target.z=THREE.MathUtils.clamp(target.z,-3,3);camera.lookAt(target);
 }
 constrain.reset=()=>{initialized=false;};return constrain;
}
export function boxCameraCollider(matrix,half){return {kind:'box',matrix:matrix.clone(),inverse:matrix.clone().invert(),half:half.clone(),halfNegative:half.clone().negate()};}
export function capsuleCameraCollider(a,b,radius){return {kind:'capsule',a:a.clone(),axis:b.clone().sub(a),lengthSq:a.distanceToSquared(b),radius};}
