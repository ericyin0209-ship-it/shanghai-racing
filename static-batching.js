import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Preserve every triangle and material; combine only stationary opaque props.
export function batchStaticMeshes(root,cellSize=8){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map(),point=new THREE.Vector3();let sourceMeshes=0,drawGroups=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||mesh.isReflector||Array.isArray(mesh.material)||mesh.material.isShaderMaterial||mesh.material.transparent||mesh.material.transmission>0||mesh.userData.batchExclude||mesh.morphTargetInfluences)return;
  for(let node=mesh;node&&node!==root.parent;node=node.parent)if(!node.visible||node.userData.dynamic||node.userData.batchExclude)return;
  point.setFromMatrixPosition(mesh.matrixWorld).applyMatrix4(inverse);
  const attributes=Object.keys(mesh.geometry.attributes).sort().map(k=>k+':'+mesh.geometry.attributes[k].itemSize).join(',');
  const key=[mesh.material.uuid,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask,Math.floor(point.x/cellSize),Math.floor(point.z/cellSize),attributes].join('|');
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(mesh);
 });
 for(const meshes of buckets.values()){
  if(meshes.length<3)continue;const parts=[],indexed=meshes.every(mesh=>mesh.geometry.index);
  for(const mesh of meshes){let geometry=mesh.geometry.clone(),matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);geometry.applyMatrix4(matrix);
   if(matrix.determinant()<0){const tangent=geometry.attributes.tangent;if(tangent)for(let i=0;i<tangent.count;i++)tangent.setW(i,-tangent.getW(i));if(geometry.index){const index=geometry.index;for(let i=0;i<index.count;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b);}}else{for(const attribute of Object.values(geometry.attributes))for(let i=0;i<attribute.count;i+=3)for(let c=0;c<attribute.itemSize;c++){const a=(i+1)*attribute.itemSize+c,b=(i+2)*attribute.itemSize+c,v=attribute.array[a];attribute.array[a]=attribute.array[b];attribute.array[b]=v;}}}
   if(!indexed&&geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();geometry=expanded;}parts.push(geometry);
  }
  const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();const first=meshes[0],merged=new THREE.Mesh(geometry,first.material);merged.name='Static garage detailing';merged.castShadow=first.castShadow;merged.receiveShadow=first.receiveShadow;merged.renderOrder=first.renderOrder;merged.layers.mask=first.layers.mask;root.add(merged);
  for(const mesh of meshes)mesh.removeFromParent();sourceMeshes+=meshes.length;drawGroups++;
 }
 const stats={sourceMeshes,drawGroups,drawCallsSaved:sourceMeshes-drawGroups,geometryReduced:false};root.userData.staticBatches=stats;return stats;
}
