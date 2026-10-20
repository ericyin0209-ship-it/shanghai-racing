import * as THREE from 'three';
// Metric, derivative-filtered construction finishes. Detail fades before it can alias.
export function constructionFinish(material,kind='concrete'){
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 builtWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 builtPoint=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 builtPoint=instanceMatrix*builtPoint;
 #endif
 builtWorld=(modelMatrix*builtPoint).xyz;`);
  shader.fragmentShader='varying vec3 builtWorld;\nfloat builtHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\n'+shader.fragmentShader;
  const code=kind==='roof'?`
 vec2 panel=vec2(builtWorld.x/3.0,builtWorld.z/7.6),fw=fwidth(panel);vec2 dist=min(fract(panel),1.-fract(panel));vec2 joint=1.-smoothstep(vec2(.003),vec2(.003)+fw,dist);float visible=1.-smoothstep(.015,.10,max(fw.x,fw.y));diffuseColor.rgb*=1.-max(joint.x,joint.y)*.33*visible;
 `:kind==='glass'?`
 vec2 paneUV=builtWorld.zy;float room=builtHash(vec3(floor(paneUV.x/3.6),floor(paneUV.y/3.2),1.));
 float interior=mix(.65,1.04,room);diffuseColor.rgb*=interior;
 diffuseColor.rgb*=.90+.10*smoothstep(0.,1.,fract(paneUV.y/3.2));
 `:kind==='metal'?`
 float filterGrain=1.-smoothstep(.002,.03,length(fwidth(builtWorld)));
 float brushing=builtHash(floor(builtWorld*vec3(120.,900.,7.)));
 diffuseColor.rgb*=mix(1.,.94+brushing*.10,filterGrain);
 `:`
 float distanceFilter=1.-smoothstep(.012,.08,length(fwidth(builtWorld)));
 float aggregate=builtHash(floor(builtWorld*110.));
 float cloud=builtHash(floor(builtWorld*2.));
 diffuseColor.rgb*=.95+cloud*.07+distanceFilter*(aggregate-.5)*.08;
 `;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+code);
 };
 material.customProgramCacheKey=()=> 'circuit-construction-218-'+kind;material.userData.constructionFinish=kind;return material;
}
export function landmarkMaterials(){
 return {
  concrete:constructionFinish(new THREE.MeshStandardMaterial({color:'#aeb4ae',roughness:.87})),
  paving:constructionFinish(new THREE.MeshStandardMaterial({color:'#929c99',roughness:.91})),
  alloy:constructionFinish(new THREE.MeshStandardMaterial({color:'#aab6b8',metalness:.73,roughness:.34}),'metal'),
  ivory:constructionFinish(new THREE.MeshStandardMaterial({color:'#ced1c7',metalness:.37,roughness:.40}),'metal'),
  dark:new THREE.MeshStandardMaterial({color:'#263536',metalness:.38,roughness:.60}),
  glass:constructionFinish(new THREE.MeshPhysicalMaterial({color:'#658991',metalness:.50,roughness:.16,clearcoat:.85,clearcoatRoughness:.12,emissive:'#d7c2a0',emissiveIntensity:0}),'glass'),
  interior:new THREE.MeshStandardMaterial({color:'#b7afa0',roughness:.85}),
  glow:new THREE.MeshStandardMaterial({color:'#b9c5bc',emissive:'#ffdeb0',emissiveIntensity:0,roughness:.5}),
  warmGlass:constructionFinish(new THREE.MeshStandardMaterial({color:'#526e73',metalness:.45,roughness:.20,emissive:'#b9ae8e',emissiveIntensity:0}),'glass'),
  rubber:new THREE.MeshStandardMaterial({color:'#252e2b',roughness:.94}),
  foliage:new THREE.MeshStandardMaterial({color:'#536b43',roughness:1})
 };
}
export function createLandmarkBuilder(root){
 const buckets=new Map(),pose=new THREE.Object3D(),identity=new THREE.Matrix4(),boxGeo=new THREE.BoxGeometry(1,1,1),rodGeo=new THREE.CylinderGeometry(1,1,1,10),yAxis=new THREE.Vector3(0,1,0);let total=0;
 function add(name,geometry,mat,p,scale=[1,1,1],rotation=[0,0,0],frame=identity,q=null){const key=name+'|'+mat.uuid;if(!buckets.has(key))buckets.set(key,{name,geometry,mat,items:[]});pose.position.set(...p);pose.scale.set(...scale);pose.rotation.set(...rotation);if(q)pose.quaternion.copy(q);pose.updateMatrix();buckets.get(key).items.push(new THREE.Matrix4().multiplyMatrices(frame,pose.matrix));}
 function box(name,size,p,mat,rotation=0,frame=identity){add(name,boxGeo,mat,p,size,[0,rotation,0],frame);}
 function beam(name,a,b,r,mat,frame=identity){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);add(name,rodGeo,mat,from.add(to).multiplyScalar(.5).toArray(),[r,delta.length(),r],[0,0,0],frame,new THREE.Quaternion().setFromUnitVectors(yAxis,delta.normalize()));}
 function finish(){const drawGroups=new Map();for(const b of buckets.values()){const cast=!/inlay|lens|seam|paint|drain|light/.test(b.name),key=[b.geometry.uuid,b.mat.uuid,cast].join('|');if(!drawGroups.has(key))drawGroups.set(key,{geometry:b.geometry,mat:b.mat,cast,names:[],items:[]});const group=drawGroups.get(key);group.names.push(b.name);group.items.push(...b.items);}
  for(const b of drawGroups.values()){const mesh=new THREE.InstancedMesh(b.geometry,b.mat,b.items.length);mesh.name='Environment218 / '+b.names.join(' + ');mesh.castShadow=b.cast;mesh.receiveShadow=true;mesh.userData.environment218=true;mesh.userData.detailTypes=b.names;b.items.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);total+=b.items.length;}root.userData.instances=total;return {instances:total,batches:drawGroups.size,detailCategories:buckets.size};}

 return {box,beam,add,finish};
}
