import * as THREE from 'three';
import {Reflector} from './vendor/Reflector.js';
const position=new THREE.Vector3(),eye=new THREE.Vector3(),rotation=new THREE.Matrix4(),normal=new THREE.Vector3(),target=new THREE.Vector3(),virtual=new THREE.PerspectiveCamera(),projection=new THREE.Matrix4(),point=new THREE.Vector4(),facing=new THREE.Vector3();

// Crop the virtual camera to the glass itself. A small mirror then receives
// the full reflection texture instead of a few texels from a full-screen image.
export function reflectionCrop(surface,camera,bounds,output=new THREE.Matrix4()){
 position.setFromMatrixPosition(surface);eye.setFromMatrixPosition(camera.matrixWorld);rotation.extractRotation(surface);normal.set(0,0,1).applyMatrix4(rotation);
 if(facing.subVectors(position,eye).dot(normal)>0)return false;
 rotation.extractRotation(camera.matrixWorld);target.set(0,0,-1).applyMatrix4(rotation).add(eye);
 virtual.position.copy(eye).sub(position).reflect(normal).add(position);virtual.up.set(0,1,0).applyMatrix4(rotation).reflect(normal);target.sub(position).reflect(normal).add(position);virtual.lookAt(target);virtual.updateMatrixWorld();
 projection.multiplyMatrices(camera.projectionMatrix,virtual.matrixWorldInverse);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let corner=0;corner<4;corner++){const x=corner&1?bounds.max.x:bounds.min.x,y=corner&2?bounds.max.y:bounds.min.y;
  point.set(x,y,bounds.min.z,1).applyMatrix4(surface).applyMatrix4(projection);if(point.w<1e-5)return false;
  const px=point.x/point.w,py=point.y/point.w;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
 }
 const width=(maxX-minX)*1.04,height=(maxY-minY)*1.04;if(width<1e-6||height<1e-6)return false;
 const centreX=(maxX+minX)/2,centreY=(maxY+minY)/2;
 output.set(2/width,0,0,-centreX*2/width,0,2/height,0,-centreY*2/height,0,0,1,0,0,0,0,1);return output;
}

export class SurfaceReflector extends Reflector{
 constructor(geometry,options){
  super(geometry,options);geometry.computeBoundingBox();const original=this.onBeforeRender,crop=new THREE.Matrix4(),input=new THREE.PerspectiveCamera();this.camera.userData.reflectionView=true;
  this.onBeforeRender=function(renderer,scene,camera){
   if(!reflectionCrop(this.matrixWorld,camera,geometry.boundingBox,crop))return;
   input.copy(camera,false);input.projectionMatrix.copy(camera.projectionMatrix).premultiply(crop);input.projectionMatrixInverse.copy(input.projectionMatrix).invert();input.viewport=camera.viewport;
   original.call(this,renderer,scene,input);
  };
 }
}
