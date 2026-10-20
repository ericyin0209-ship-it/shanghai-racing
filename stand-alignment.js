import * as THREE from 'three';
export function fitStandToStraight(track){
 const samples=track.points.filter(p=>p.z>-440&&p.z<-70&&Math.abs(p.x)<15),n=samples.length;
 if(n<8)throw Error('Cannot fit main straight');const z0=samples.reduce((s,p)=>s+p.z,0)/n,x0=samples.reduce((s,p)=>s+p.x,0)/n;
 let zz=0,xz=0;for(const p of samples){zz+=(p.z-z0)**2;xz+=(p.z-z0)*(p.x-x0);}const slope=xz/zz,yaw=Math.atan(slope),anchorZ=-255,anchorX=x0+slope*(anchorZ-z0);
 const matrix=new THREE.Matrix4().makeTranslation(anchorX,0,anchorZ).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeTranslation(0,0,-anchorZ));
 return {matrix,yaw,anchorX,samples:n,apply(object){object.applyMatrix4(matrix);}};
}
