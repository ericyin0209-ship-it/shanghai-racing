import * as THREE from 'three';
const right=new THREE.Vector3(),up=new THREE.Vector3(),vertical=new THREE.Vector3(0,1,0);
// Keep the directional shadow grid stationary between whole shadow texels.
export function snapShadowFocus(focus,lightDirection,span,resolution,out=new THREE.Vector3()){
 right.crossVectors(vertical,lightDirection);if(right.lengthSq()<1e-8)right.set(1,0,0);else right.normalize();
 up.crossVectors(lightDirection,right).normalize();const texel=span/Math.max(1,resolution);
 const x=focus.dot(right),y=focus.dot(up);
 return out.copy(focus).addScaledVector(right,Math.round(x/texel)*texel-x).addScaledVector(up,Math.round(y/texel)*texel-y);
}
