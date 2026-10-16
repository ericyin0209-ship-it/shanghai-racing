import * as THREE from 'three';
// Outer suspension mounts follow the upright; inner mounts follow the chassis.
export function skinSuspension(mesh,chassis,pivot){
 const uniforms={suspensionBody:{value:new THREE.Matrix4()},suspensionUpright:{value:new THREE.Matrix4()}};
 const origin=pivot.position.clone(),undo=new THREE.Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z);
 const patch=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='attribute float suspensionWeight;uniform mat4 suspensionBody;uniform mat4 suspensionUpright;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=mix((suspensionBody*vec4(position,1.)).xyz,(suspensionUpright*vec4(position,1.)).xyz,suspensionWeight);');
 shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>','objectNormal=normalize(mix(mat3(suspensionBody)*objectNormal,mat3(suspensionUpright)*objectNormal,suspensionWeight));\n#include <defaultnormal_vertex>');};
 mesh.material=mesh.material.clone();mesh.material.onBeforeCompile=patch;mesh.material.customProgramCacheKey=()=> 'amr-suspension-skin-111';
 mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});mesh.customDistanceMaterial=new THREE.MeshDistanceMaterial();for(const m of [mesh.customDepthMaterial,mesh.customDistanceMaterial]){m.onBeforeCompile=patch;m.customProgramCacheKey=()=> 'amr-suspension-shadow-111';}mesh.frustumCulled=false;
 return ()=>{chassis.updateMatrix();pivot.updateMatrix();uniforms.suspensionBody.value.copy(chassis.matrix);uniforms.suspensionUpright.value.multiplyMatrices(pivot.matrix,undo);};
}
