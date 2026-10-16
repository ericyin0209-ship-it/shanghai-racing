import * as THREE from 'three';
// Open service bays, chamfered piers, shutter mechanics and pit-wall stations.
// Mapped footprint retained; details are photograph-informed estimates, not CAD.
export function createPitArchitecture(scene){
 const root=new THREE.Group();root.name='Shanghai open pit bays / photographic construction';scene.add(root);
 const concrete=new THREE.MeshStandardMaterial({color:'#b9bab2',roughness:.82});
 const alloy=new THREE.MeshStandardMaterial({color:'#9ba4a4',metalness:.86,roughness:.3});
 const dark=new THREE.MeshStandardMaterial({color:'#253130',metalness:.35,roughness:.64});
 const black=new THREE.MeshStandardMaterial({color:'#101817',roughness:.86});
 const paint=new THREE.MeshStandardMaterial({color:'#075c50',metalness:.43,roughness:.38});
 const luminous=new THREE.MeshStandardMaterial({color:'#d3e2db',emissive:'#d3e2db',emissiveIntensity:2.6,roughness:.4});
 const batches=new Map(),pose=new THREE.Object3D();
 function add(name,g,m,p,rotation=0){if(!batches.has(name))batches.set(name,{g,m,items:[]});else g.dispose();batches.get(name).items.push({p,rotation});}
 function box(name,p,size,m){add(name,new THREE.BoxGeometry(...size),m,p);}
 function cylinder(name,p,r,h,m,axis='y'){const g=new THREE.CylinderGeometry(r,r,h,20);if(axis==='z')g.rotateX(Math.PI/2);if(axis==='x')g.rotateZ(Math.PI/2);add(name,g,m,p);}
 // Chamfered, forward-raked pier profile, visible between the recessed openings.
 const shape=new THREE.Shape();shape.moveTo(-36.12,0);shape.lineTo(-35.56,0);shape.lineTo(-34.85,3.65);shape.lineTo(-35.14,4.30);shape.lineTo(-36.34,4.30);shape.lineTo(-36.34,3.75);shape.closePath();
 const pier=new THREE.ExtrudeGeometry(shape,{depth:.56,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1});pier.translate(0,0,-.28);
 for(let i=0;i<30;i++){
  const z=-42-i*14.4;
  // Recessed rear walls and partitions make real openings instead of black decals.
  box('Bay rear panel',[-57.75,2.2,z],[.18,4.4,14.3],dark);
  box('Bay partition',[-47.0,2.2,z+7.1],[21.3,4.4,.17],concrete);
  add('Chamfered concrete piers',pier.clone(),concrete,[0,0,z+6.7]);
  box('Shutter head casing',[-35.8,4.01,z],[.65,.58,12.5],alloy);
  for(let j=0;j<9;j++)box('Shutter ribbed lintel',[-35.44,3.82+j*.048,z],[.022,.016,12.35],dark);
  for(const dz of [-6.3,6.3]){
   box('Shutter side guide',[-35.75,1.90,z+dz],[.12,3.8,.10],alloy);
   for(const y of [.32,1.7,3.2])cylinder('Pier anchor fastener',[-35.66,y,z+dz],.021,.025,alloy,'x');
  }
  cylinder('Shutter roller',[-36.4,3.92,z],.15,12.35,alloy,'z');
  box('Inner ceiling',[-46.8,4.27,z],[20.4,.12,14.1],dark);
  for(const x of [-38.6,-44,-50]){
   box('Bay overhead strip case',[x,4.14,z],[.32,.10,2.8],black);
   box('Bay overhead luminous lens',[x,4.078,z],[.24,.022,2.66],luminous);
  }
  // Full depth floor joints and painted bay service limits.
  box('Concrete bay floor',[-46.8,.065,z],[20.4,.11,14.1],concrete);
  box('Bay floor joint',[-46.8,.125,z],[20.3,.003,.016],black);
  box('Service threshold',[-35.65,.135,z],[.55,.018,12.25],alloy);
  for(let j=0;j<20;j++)box('Threshold drain slots',[-35.65,.147,z-5.9+j*.62],[.42,.007,.027],black);
  // Team neutral cabinets inside alternate bays, leaving the lane clear.
  if(i%2===0){
   box('Bay service cabinet',[-54.9,.64,z+4.7],[1.4,1.17,2.0],paint);
   box('Bay cabinet worktop',[-54.9,1.25,z+4.7],[1.5,.055,2.1],alloy);
   for(let j=0;j<6;j++)box('Bay cabinet drawer',[-54.18,.30+j*.14,z+4.7],[.026,.11,1.83],dark);
  }
  // Small rain-channel downspout and projecting façade light, outside openings.
  cylinder('Facade drainage joint',[-35.62,4.65,z+6.5],.086,.12,alloy);
 }
 pier.dispose();
 // Physical pit-wall timing station frames, visibly separate from the barriers.
 for(let i=0;i<10;i++){
  const z=-65-i*37;
  for(const dz of [-2.5,2.5]){
   box('Timing station post',[-16.1,1.52,z+dz],[.07,3.04,.07],alloy);
   box('Timing station crossmember',[-17.1,2.96,z+dz],[2.0,.07,.07],alloy);
  }
  box('Timing station roof',[-17.1,3.05,z],[2.2,.10,5.4],dark);
  box('Timing station fascia',[-15.97,2.83,z],[.06,.40,5.2],paint);
  box('Timing station working ledge',[-16.55,1.20,z],[.9,.08,5.0],alloy);
  for(let j=0;j<3;j++){
   box('Timing monitor housing',[-16.45,1.65,z-1.6+j*1.6],[.10,.58,1.08],black);
   box('Timing monitor glass',[-16.39,1.65,z-1.6+j*1.6],[.009,.51,.99],dark);
  }
 }
 let count=0;
 for(const [name,b] of batches){const mesh=new THREE.InstancedMesh(b.g,b.m,b.items.length);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;b.items.forEach(({p,rotation},i)=>{pose.position.set(...p);pose.rotation.set(0,rotation,0);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});root.add(mesh);count+=b.items.length;}
 root.userData={surveyed:false,detailCount:count,reference:'CyberCop / F-1 Circuit Shanghai, CC BY 3.0; structural details only, no photograph texture'};
 return root;
}
