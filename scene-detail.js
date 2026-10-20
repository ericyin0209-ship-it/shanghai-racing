import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
// Screen-size LOD for repeated scene furniture only. The car never enters this controller.
const cache=new WeakMap();
function variants(g){
 if(cache.has(g))return cache.get(g);let mid=null,far=null;const p=g.parameters;
 if(g.userData.environmentLOD){[mid,far]=g.userData.environmentLOD;}else if(g.userData.seatShell&&p?.shapes){
  mid=new THREE.ExtrudeGeometry(p.shapes,{depth:.46,bevelEnabled:false,steps:1,curveSegments:3});mid.translate(0,0,-.23);mid.rotateY(Math.PI/2);
  const seat=new THREE.BoxGeometry(.46,.07,.50).translate(0,-.025,-.005),back=new THREE.BoxGeometry(.46,.49,.07).translate(0,.185,-.235);far=mergeGeometries([seat,back],false);seat.dispose();back.dispose();
 }else if(g.type==='TorusGeometry'&&p.tubularSegments>=24){mid=new THREE.TorusGeometry(p.radius,p.tube,6,16,p.arc);far=new THREE.TorusGeometry(p.radius,p.tube,4,12,p.arc);
  // Preserve the template's plane; some rings are rotated in geometry, others by their mesh.
  g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3());if(Math.abs(size.y-p.tube*2)<1e-5){mid.rotateX(Math.PI/2);far.rotateX(Math.PI/2);}
 }else if(g.type==='CylinderGeometry'&&p.radialSegments>12){
  // Only untransformed vertical primitives can be rebuilt from parameters safely.
  g.computeBoundingBox();const b=g.boundingBox;if(Math.abs(b.min.y+p.height/2)<1e-5&&Math.abs(b.max.y-p.height/2)<1e-5&&Math.abs(b.min.x+b.max.x)<1e-5&&Math.abs(b.min.z+b.max.z)<1e-5){mid=new THREE.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,12,1,p.openEnded,p.thetaStart,p.thetaLength);far=new THREE.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,8,1,p.openEnded,p.thetaStart,p.thetaLength);}
 }
 const result=mid?[g,mid,far]:null;cache.set(g,result);return result;
}
export function createSceneDetail(root){
 root.updateWorldMatrix(true,true);const entries=[],stats={groups:0,lodGroups:0,hiddenSubpixelGroups:0,high:0,medium:0,low:0,changes:0};const matrix=new THREE.Matrix4(),scale=new THREE.Vector3();
 root.traverse(mesh=>{if(!mesh.isInstancedMesh||mesh.userData.dynamic||mesh.material?.isShaderMaterial||mesh.material?.transparent)return;
  const geometry=mesh.geometry;geometry.computeBoundingSphere();geometry.computeBoundingBox();const lod=variants(geometry);let size=geometry.boundingSphere.radius*2,maxScale=0;
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);scale.setFromMatrixScale(matrix);maxScale=Math.max(maxScale,scale.x,scale.y,scale.z);}size=(geometry.userData.lodMetricSize||size)*maxScale;
  // Bolts, drain slots and hidden sub-pixel fittings may be omitted only once no instance can resolve.
  const micro=size<.35&&!/lens|lamp|light|luminous|signal|glow/i.test(mesh.name);if(!lod&&!micro)return;
  mesh.computeBoundingBox();entries.push({mesh,lod,size,box:mesh.boundingBox.clone(),worldBox:new THREE.Box3(),level:0,hidden:false,canHide:micro,originalVisible:mesh.visible});
 });
 const transform=new THREE.Matrix4();transform.elements.fill(NaN);
 function refresh(){root.updateWorldMatrix(true,false);if(!root.matrixWorld.equals(transform)){root.updateWorldMatrix(true,true);transform.copy(root.matrixWorld);for(const e of entries)e.worldBox.copy(e.box).applyMatrix4(e.mesh.matrixWorld);}}
 refresh();stats.groups=entries.length;stats.lodGroups=entries.filter(e=>e.lod).length;
 function update(camera,height=720){refresh();const projection=height/(2*Math.tan(camera.fov*Math.PI/360));stats.high=stats.medium=stats.low=stats.hiddenSubpixelGroups=0;
  for(const e of entries){const d=Math.max(.1,e.worldBox.distanceToPoint(camera.position)),px=e.size*projection/d;let level=e.level;
   if(e.lod){if(level===0&&px<18)level=1;else if(level===1&&px>22)level=0;else if(level===1&&px<4.5)level=2;else if(level===2&&px>6)level=1;if(level!==e.level){e.mesh.geometry=e.lod[level];e.level=level;stats.changes++;}stats[['high','medium','low'][level]]++;}
   const hidden=e.canHide&&(e.hidden?px<.85:px<.55);if(hidden!==e.hidden){e.hidden=hidden;stats.changes++;}e.mesh.visible=e.originalVisible&&!hidden;if(hidden)stats.hiddenSubpixelGroups++;
  }return stats;
 }
 return {update,stats};
}
// Scene-specific near planes avoid wasting nearly the entire depth buffer on cockpit distances.
export function updateSceneDepth(camera,{mode='garage',distance=10,cameraMode=0,photo=false}={}){
 const near=photo?.02:mode==='track'?(camera.position.y>20?Math.min(24,Math.max(.4,distance*.025)):.2):mode==='drive'?((cameraMode===1||cameraMode===3)?.06:cameraMode===2?.8:.30):mode==='wind'?.05:.025;
 const far=mode==='track'?Math.max(6000,distance+3200):mode==='drive'?4000:mode==='wind'?100:2400;
 if(camera.near!==near||camera.far!==far){camera.near=near;camera.far=far;camera.updateProjectionMatrix();return true;}return false;
}
