import * as THREE from 'three';
import {createAccessBuilder,accessMaterials,addReturnStair} from './spectator-access.js?v=225b';
// Rear entrance architecture follows photographs; dimensions retain the existing site model.
export function createCircuitEnvelope(scene){
 const root=new THREE.Group();root.name='Main grandstand enclosed rear and spectator circulation';scene.add(root);
 const materials=accessMaterials(),{concrete,dark,metal,cladding,glass}=materials,builder=createAccessBuilder(root),{box,beam}=builder;
 const slabCentres=[4.8,10,15.2,20],levels=[.24,...slabCentres.map(y=>y+.14)],access=[];
 for(const z of [-410,-326,-242,-158,-86]){
  const stair=addReturnStair(builder,{x:75.4,z,levels,materials,name:'Main spectator stair'});access.push(stair);
  for(const level of levels){
   box('Main stair concourse bridge',[3.15,.24,1.86],[71.25,level-.12,stair.bridgeZ],concrete);
   for(const side of [-1,1])beam('Main bridge guard',[69.7,level+1.05,stair.bridgeZ+side*.93],[72.8,level+1.05,stair.bridgeZ+side*.93],.045,.045,metal);
  }
  for(const xx of [71.95,78.85])for(const zz of [z-4.25,z+4.25])box('Main stair tower corner',[.24,22.8,.24],[xx,11.6,zz],concrete);
  box('Main stair tower rear enclosure',[.20,22.65,8.6],[78.85,11.5,z],concrete);
  for(const zz of [z-4.3,z+4.3]){
   box('Main tower glazing',[6.75,19.3,.12],[75.4,12.65,zz],glass);
   box('Main tower ground wall',[6.75,2.5,.18],[75.4,1.5,zz],metal);
   for(const level of levels)box('Main tower floor bands',[6.8,.22,.20],[75.4,level-.1,zz],metal);
   for(const offset of [-2.25,-.75,.75,2.25])box('Main tower window mullions',[.08,19.3,.16],[75.4+offset,12.65,zz],metal);
  }
  box('Main access tower roof',[7.45,.22,9.1],[75.4,23.06,z],metal);
 }
 const floors=[{y:4.8,edge:36.8},{y:10,edge:46},{y:15.2,edge:54.7},{y:20,edge:62.575}];
 for(const {y,edge}of floors)box('Main enclosed concourse slab '+y,[69.8-edge,.28,372],[(69.8+edge)/2,y,-253],concrete);
 box('Main ground entry paving',[16,.16,378],[74,.08,-253],concrete);
 const portalIntervals=access.map(a=>[a.bridgeZ-1.24,a.bridgeZ+1.24]);
 function segments(a,b){let pieces=[[a,b]];for(const [lo,hi]of portalIntervals)pieces=pieces.flatMap(([x,y])=>hi<=x||lo>=y?[[x,y]]:[[x,Math.max(x,lo)],[Math.min(y,hi),y]].filter(([l,r])=>r-l>.02));return pieces;}
 const facadeLevels=[...levels,23.05];
 for(let floor=0;floor<facadeLevels.length-1;floor++){
  const bottom=facadeLevels[floor],top=facadeLevels[floor+1]-.28,height=top-bottom;
  for(let z=-439;z<-67;z+=12)for(const [a,b]of segments(z,Math.min(-67,z+12))){
   box('Main woven rear facade',[.16,height,b-a],[69.96,bottom+height/2,(a+b)/2],cladding);
   if(floor>0)box('Main rear clerestory glazing',[.17,1.05,Math.max(.1,b-a-.2)],[70.06,top-.8,(a+b)/2],glass);
  }
  for(const a of access){
   for(const side of [-1,1])box('Main spectator portal jamb',[.4,2.6,.18],[69.96,bottom+1.3,a.bridgeZ+side*1.24],concrete);
   box('Main spectator portal head',[.4,.20,2.66],[69.96,bottom+2.7,a.bridgeZ],concrete);
   if(height>2.8)box('Main portal upper screen',[.16,height-2.8,2.48],[69.96,bottom+2.8+(height-2.8)/2,a.bridgeZ],cladding);
  }
 }
 // Solid end walls close the space under the raked seats without covering seat rows.
 const section=new THREE.Shape();section.moveTo(29,.18);section.lineTo(70.1,.18);section.lineTo(70.1,23.05);section.lineTo(62.7,23.05);section.lineTo(62.7,20.5);section.lineTo(48,11.6);section.lineTo(29,.65);section.closePath();
 const endGeometry=new THREE.ExtrudeGeometry(section,{depth:.24,bevelEnabled:false});
 for(const z of [-439,-67.24]){const end=new THREE.Mesh(endGeometry,concrete);end.name='Main grandstand concrete end enclosure';end.position.z=z;end.castShadow=end.receiveShadow=true;root.add(end);}
 for(let z=-433;z<-73;z+=12){
  for(const y of [4.8,10,15.2,20])box('Main facade floor edge',[.28,.34,11.96],[70.1,y,z],metal);
  box('Main facade vertical seam',[.24,20,.11],[70.13,10.25,z-5.95],dark);
 }
 root.userData={surveyed:false,detailCount:builder.finish(),accessTowers:access.length,accessRoutes:access,floorTops:levels,roofUnderside:22.95,reference:'GKD Shanghai rear facade and entrance documentation'};return root;
}
export function capturePitVista(scene){scene.updateMatrixWorld(true);const vista=new THREE.Group();vista.name='Shared circuit pit-straight vista';const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),bounds=new THREE.Box3();let count=0;const materials=new Map(),geometries=new Map();function copyMaterial(source){if(!materials.has(source)){const copy=source.clone();copy.onBeforeCompile=source.onBeforeCompile;copy.customProgramCacheKey=source.customProgramCacheKey;materials.set(source,copy);}return materials.get(source);}function copyGeometry(source){if(!geometries.has(source))geometries.set(source,source.clone());return geometries.get(source);}const choose=(x,z)=>x>-25&&x<95&&z>-485&&z<-30;
 scene.traverse(o=>{if(!o.isMesh||o.isReflector||o.userData.dynamic||Array.isArray(o.material))return;if(o.isInstancedMesh){if(Object.values(o.geometry.attributes).some(a=>a.isInstancedBufferAttribute))return;const selected=[];for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);pos.setFromMatrixPosition(matrix);if(choose(pos.x,pos.z))selected.push({matrix:matrix.clone(),i});}if(!selected.length)return;const copy=new THREE.InstancedMesh(copyGeometry(o.geometry),copyMaterial(o.material),selected.length);selected.forEach((s,j)=>{copy.setMatrixAt(j,s.matrix);if(o.instanceColor){o.getColorAt(s.i,new THREE.Color());const c=new THREE.Color();o.getColorAt(s.i,c);copy.setColorAt(j,c);}});copy.castShadow=copy.receiveShadow=true;vista.add(copy);count+=selected.length;}else{bounds.setFromObject(o);bounds.getCenter(pos);if(bounds.getSize(new THREE.Vector3()).length()>650||!choose(pos.x,pos.z))return;const copy=new THREE.Mesh(copyGeometry(o.geometry),copyMaterial(o.material));copy.matrix.copy(o.matrixWorld);copy.matrixAutoUpdate=false;copy.castShadow=copy.receiveShadow=true;vista.add(copy);count++;}});vista.rotation.y=-Math.PI/2;vista.position.set(-255,0,45);vista.userData.detailCount=count;vista.userData.sharedMaterialCopies=materials.size;vista.userData.sharedGeometryCopies=geometries.size;return vista;}
