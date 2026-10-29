import * as THREE from 'three';
// Keep every instance and its material, but cull distant groups independently.
export function partitionStaticInstances(scene,cellSize=100){
 scene.updateMatrixWorld(true);const originals=[];scene.traverse(o=>{if(o.isInstancedMesh&&o.count>=64&&!o.userData.dynamic&&!o.userData.spatialChunk&&!Object.values(o.geometry.attributes).some(a=>a.isInstancedBufferAttribute))originals.push(o);});
 const local=new THREE.Matrix4(),world=new THREE.Matrix4(),point=new THREE.Vector3(),color=new THREE.Color();let instances=0,chunks=0,emptyInstancesRemoved=0;
 for(const mesh of originals){const span=mesh.geometry.userData.mainSeat?24:cellSize;const groups=new Map();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,local);if(Math.abs(local.determinant())<1e-12){emptyInstancesRemoved++;continue;}world.multiplyMatrices(mesh.matrixWorld,local);point.setFromMatrixPosition(world);const key=Math.floor(point.x/span)+','+Math.floor(point.z/span);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}if(groups.size<2&&[...groups.values()].reduce((n,a)=>n+a.length,0)===mesh.count)continue;
  for(const [key,indices]of groups){const chunk=new THREE.InstancedMesh(mesh.geometry,mesh.material,indices.length);chunk.name=mesh.name+' / '+key;chunk.position.copy(mesh.position);chunk.quaternion.copy(mesh.quaternion);chunk.scale.copy(mesh.scale);chunk.castShadow=mesh.castShadow;chunk.receiveShadow=mesh.receiveShadow;chunk.visible=mesh.visible;chunk.renderOrder=mesh.renderOrder;chunk.layers.mask=mesh.layers.mask;chunk.userData={...mesh.userData,spatialChunk:true};indices.forEach((index,i)=>{mesh.getMatrixAt(index,local);chunk.setMatrixAt(i,local);if(mesh.instanceColor){mesh.getColorAt(index,color);chunk.setColorAt(i,color);}});chunk.computeBoundingBox();chunk.computeBoundingSphere();mesh.parent.add(chunk);chunks++;}instances+=mesh.count;mesh.removeFromParent();mesh.dispose();
 }
 return {instances,chunks,emptyInstancesRemoved};
}
