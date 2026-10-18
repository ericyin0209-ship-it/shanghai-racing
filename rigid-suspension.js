import * as THREE from 'three';
const up=new THREE.Vector3(0,1,0),one=new THREE.Vector3(1,1,1);
// Solve the two chassis-pickup spheres at a prescribed ball-joint height.
// Reuse vectors throughout: suspension motion must not create per-frame garbage.
function triangleAtHeight(a,b,la,lb,y,reference,out){
 const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),ra2=la*la-(y-a.y)**2,rb2=lb*lb-(y-b.y)**2;
 if(d<1e-8||ra2<0||rb2<0)return false;
 const along=(ra2-rb2+d*d)/(2*d),h2=ra2-along*along;if(h2<-.0000001)return false;
 const h=Math.sqrt(Math.max(0,h2)),ux=dx/d,uz=dz/d,x=a.x+along*ux,z=a.z+along*uz,px=x-h*uz,pz=z+h*ux,qx=x+h*uz,qz=z-h*ux;
 const first=(px-reference.x)**2+(pz-reference.z)**2<=(qx-reference.x)**2+(qz-reference.z)**2;
 out.set(first?px:qx,y,first?pz:qz);return true;
}
export function createRigidSuspension(root,chassis,parts,entries){
 const groups=[],metrics={maxLinkError:0,maxUprightError:0,maxContactHeightError:0,infeasible:0};
 for(const axle of ['front','rear'])for(const side of ['left','right']){
  const pivot=parts[axle+'-'+side].pivot,items=entries.filter(e=>e.definition.axle===axle&&e.definition.side===side),upper=items.filter(e=>/rigid upper/.test(e.definition.name)),lower=items.filter(e=>/rigid lower/.test(e.definition.name));
  if(upper.length!==2||lower.length!==2)continue;
  const upperRest=upper[0].definition.outer.clone(),lowerRest=lower[0].definition.outer.clone(),mid=upperRest.clone().add(lowerRest).multiplyScalar(.5),base=pivot.position.clone();
  for(const e of items){e.anchor=new THREE.Vector3();e.outerPoint=new THREE.Vector3();e.isUpper=/rigid upper/.test(e.definition.name);e.isLower=/rigid lower/.test(e.definition.name);e.isRack=/track rod|toe link/.test(e.definition.name);}
  groups.push({pivot,items,upper,lower,upperRest,lowerRest,base,offset:base.clone().sub(mid),upright:upperRest.distanceTo(lowerRest),upperPoint:upperRest.clone(),lowerPoint:lowerRest.clone(),cachedPosition:base.clone(),lastScale:NaN,lastY:NaN,lastSteer:NaN,lastMatrix:new Float64Array(16),mat:new THREE.Matrix4(),baseInverse:new THREE.Matrix4().makeTranslation(-base.x,-base.y,-base.z),quat:new THREE.Quaternion(),evalU:new THREE.Vector3(),evalL:new THREE.Vector3(),mid:new THREE.Vector3(),linkError:0,uprightError:0,contactError:0,infeasible:0});
 }
 const scratch=new THREE.Vector3(),direction=new THREE.Vector3(),quaternion=new THREE.Quaternion();
 function update(){
  chassis.updateMatrix();metrics.maxLinkError=metrics.maxUprightError=metrics.maxContactHeightError=metrics.infeasible=0;
  for(const g of groups){
   const wantedY=g.pivot.position.y,steer=g.pivot.userData.steeringAngle||0,matrix=chassis.matrix.elements;let changed=wantedY!==g.lastY||steer!==g.lastSteer||g.pivot.scale.y!==g.lastScale;for(let i=0;i<16&&!changed;i++)changed=matrix[i]!==g.lastMatrix[i];
   if(changed){
    g.lastY=wantedY;g.lastSteer=steer;g.lastScale=g.pivot.scale.y;g.lastMatrix.set(matrix);g.linkError=g.uprightError=g.contactError=g.infeasible=0;
    for(const e of g.items)e.anchor.copy(e.definition.inner).applyMatrix4(chassis.matrix);
    const evaluate=(mean,half)=>{
     const a=g.upper,b=g.lower;
     if(!triangleAtHeight(a[0].anchor,a[1].anchor,a[0].definition.length,a[1].definition.length,mean+half,g.upperRest,g.evalU)||!triangleAtHeight(b[0].anchor,b[1].anchor,b[0].definition.length,b[1].definition.length,mean-half,g.lowerRest,g.evalL))return NaN;
     return g.evalU.distanceTo(g.evalL);
    };
    let mean=wantedY-g.offset.y,solved=false,gap=NaN;
    for(let contact=0;contact<6;contact++){
     let lo=0,hi=g.upright*.5,low=evaluate(mean,lo),high=evaluate(mean,hi);
     if(!Number.isFinite(low)||!Number.isFinite(high)||low>g.upright+.0001||high<g.upright-.0001){g.infeasible++;gap=evaluate(mean,g.upright*.499);if(!Number.isFinite(gap))gap=evaluate(mean,hi);if(!Number.isFinite(gap))gap=evaluate(mean,lo);solved=Number.isFinite(gap);break;}
     for(let n=0;n<22;n++){const half=(lo+hi)/2,s=evaluate(mean,half);if(!Number.isFinite(s)){hi=half;continue;}if(s<g.upright)lo=half;else hi=half;}
     gap=evaluate(mean,(lo+hi)/2);solved=Number.isFinite(gap);if(!solved)break;
     g.quat.setFromUnitVectors(up,direction.subVectors(g.evalU,g.evalL).normalize());quaternion.setFromAxisAngle(up,steer);g.quat.multiply(quaternion);mean=wantedY-scratch.copy(g.offset).applyQuaternion(g.quat).y;
    }
    if(solved){
     g.upperPoint.copy(g.evalU);g.lowerPoint.copy(g.evalL);g.mid.copy(g.evalU).add(g.evalL).multiplyScalar(.5);
     g.pivot.quaternion.copy(g.quat);g.pivot.position.copy(g.mid).add(scratch.copy(g.offset).applyQuaternion(g.quat));g.contactError=Math.abs(g.pivot.position.y-wantedY);g.pivot.position.y=wantedY;g.cachedPosition.copy(g.pivot.position);g.pivot.updateMatrix();g.mat.copy(g.pivot.matrix).multiply(g.baseInverse);g.uprightError=Math.abs(gap-g.upright);
     for(const e of g.items){const d=e.definition,inner=e.anchor,outer=e.outerPoint;
      if(e.isUpper)outer.copy(g.upperPoint);else if(e.isLower)outer.copy(g.lowerPoint);else outer.copy(d.outer).applyMatrix4(g.mat);
      if(!e.isUpper&&!e.isLower){if(e.isRack){const yy=outer.y-inner.y,zz=outer.z-inner.z,xx=Math.sqrt(Math.max(1e-8,d.length*d.length-yy*yy-zz*zz));inner.x=outer.x+(inner.x>outer.x?xx:-xx);}else{direction.subVectors(inner,outer).normalize().multiplyScalar(d.length);inner.copy(outer).add(direction);}}
      g.linkError=Math.max(g.linkError,Math.abs(inner.distanceTo(outer)-d.length));e.mesh.position.copy(inner).add(outer).multiplyScalar(.5);e.mesh.quaternion.setFromUnitVectors(up,direction.subVectors(outer,inner).normalize());e.mesh.scale.copy(one);e.mesh.updateMatrix();
     }
    }
   }
   if(!changed){g.pivot.position.copy(g.cachedPosition);g.pivot.quaternion.copy(g.quat);g.pivot.updateMatrix();}
   metrics.maxLinkError=Math.max(metrics.maxLinkError,g.linkError);metrics.maxUprightError=Math.max(metrics.maxUprightError,g.uprightError);metrics.maxContactHeightError=Math.max(metrics.maxContactHeightError,g.contactError);metrics.infeasible+=g.infeasible;
  }
 }
 return {update,metrics,groups};
}
