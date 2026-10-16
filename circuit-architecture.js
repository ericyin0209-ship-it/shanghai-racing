import * as THREE from 'three';
// Photo-informed construction, not surveyed dimensions. Existing mapped footprints are retained.
export function createCircuitArchitecture(scene){
 const root=new THREE.Group();root.name='Shanghai architectural structure 1.0.8';scene.add(root);
 const steel=new THREE.MeshStandardMaterial({color:'#839297',metalness:.82,roughness:.32}),concrete=new THREE.MeshStandardMaterial({color:'#9c9e96',roughness:.89}),dark=new THREE.MeshStandardMaterial({color:'#26373a',metalness:.45,roughness:.5}),gold=new THREE.MeshStandardMaterial({color:'#b39a59',metalness:.7,roughness:.32});
 const glow=new THREE.MeshStandardMaterial({color:'#e5ddd0',emissive:'#ffe5ba',emissiveIntensity:0,roughness:.35});const batches=new Map(),d=new THREE.Object3D();
 function box(key,w,h,l,x,y,z,mat=steel,rot=0){if(!batches.has(key))batches.set(key,{g:new THREE.BoxGeometry(w,h,l),mat,items:[]});batches.get(key).items.push({p:[x,y,z],r:[0,rot,0],s:[1,1,1]});}
 function beam(key,a,b,r=.09,mat=steel){if(!batches.has(key))batches.set(key,{g:new THREE.CylinderGeometry(r,r,1,10),mat,items:[]});const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());batches.get(key).items.push({p:p.add(q).multiplyScalar(.5).toArray(),q:quat,s:[1,delta.length(),1]});}
 // Main stand underside: the load paths, concourse, stair treads and rear screen.
 for(let z=-427;z<=-83;z+=16){
  for(const x of [36,52,65]){const top=x===36?8:x===52?17:23;box('stand columns',.62,1,.62,x,top/2,z,concrete);batches.get('stand columns').items.at(-1).s[1]=top;}
  beam('raked terrace girder',[30,.7,z],[64,21.5,z],.20);beam('roof diagonal',[65,12,z],[19,23.9,z],.13);beam('roof top chord',[18,23.9,z],[73,24.8,z],.15);beam('roof lower chord',[19,23.2,z],[69,23.2,z],.12);
  for(let x=22;x<70;x+=6){beam('roof web',[x,23.2,z],[x+6,24.1,z],.075);beam('roof web',[x+6,23.2,z],[x,24.1,z],.075);}
  box('concourse lamps',.11,.07,6,54,10.1,z,glow);box('rear facade fins',.16,19,.16,66,10.5,z);
 }
 for(let z=-418;z<-85;z+=48){for(let step=0;step<38;step++){const x=30+step*.80,y=1.05+step*.49;box('stand stair treads',.80,.08,1.8,x,y,z,concrete);if(step%5===0)beam('stair rail posts',[x,y,z-.9],[x,y+1,z-.9],.033);}beam('stair handrail',[30,2.05,z-.9],[59.6,20.18,z-.9],.037);}
 for(let z=-437;z<-72;z+=2.8)box('rear louvre',.08,18,.075,67,10.9,z,dark);
 // Lantern holes acquire a copper rim and translucent inner drum; rim sizes match existing openings.
 for(let j=0;j<15;j++){const x=j%2?34:54,z=-85-j*24,y=23+((x-40)/30)**2*1.5;const rim=new THREE.Mesh(new THREE.TorusGeometry(2.72,.10,12,64),gold);rim.rotation.x=Math.PI/2;rim.position.set(x,y+.6,z);root.add(rim);for(let k=0;k<24;k++){const a=k*Math.PI/12;box('lantern ribs',.055,.6,.055,x+Math.cos(a)*2.68,y+.25,z+Math.sin(a)*2.68,gold);}}
 // Oval glass bridges: curved fascia divisions, under-deck triangulation and recessed lighting.
 for(const z of [-455,-57]){
  for(let j=0;j<96;j++){const a=j/96*Math.PI*2,b=(j+1)/96*Math.PI*2,x=Math.cos(a)*69.8,zz=z+Math.sin(a)*22.8;beam('bridge transom',[x,25.6,zz],[Math.cos(b)*69.8,25.6,z+Math.sin(b)*22.8],.045);beam('bridge sill',[x,24,zz],[Math.cos(b)*69.8,24,z+Math.sin(b)*22.8],.075);}
  for(let x=-60;x<61;x+=8){beam('bridge underdeck chord',[x,22.9,z-5],[x+8,22.9,z-5],.13);beam('bridge truss',[x,21.6,z-5],[x+8,23.3,z-5],.095);beam('bridge truss',[x,23.3,z-5],[x+8,21.6,z-5],.095);box('bridge ceiling strips',4,.055,.15,x,23.1,z-8,glow);}
 }
 // Pit block roof plant, duct joints, downpipes and door mechanisms.
 for(let i=0;i<30;i++){const z=-42-i*14.4;box('roof HVAC',3.1,1.2,2.3,-48,12.2,z,dark);box('roof vent hood',3.3,.08,2.5,-48,12.86,z,steel);for(let k=0;k<12;k++)box('HVAC grille',.045,.85,2.32,-49.5+k*.26,12.25,z,steel);box('roof duct',.65,.55,10,-52,11.86,z,dark);for(const dz of [-4,-2,0,2,4])box('duct seam',.7,.59,.04,-52,11.86,z+dz);beam('rain downpipes',[-35.2,.12,z+6.5],[-35.2,11.6,z+6.5],.075);box('shutter motor',.34,.42,.68,-35.23,3.86,z+5.5,dark);box('pit service lantern',.17,.15,.34,-35.07,3.85,z+5.9,glow);}
 box('roof drainage gutter',.28,.20,455,-35.28,11.55,-255);
 for(const [key,batch] of batches){const mesh=new THREE.InstancedMesh(batch.g,batch.mat,batch.items.length);mesh.name=key;mesh.castShadow=true;mesh.receiveShadow=true;batch.items.forEach((o,i)=>{d.position.set(...o.p);if(o.q)d.quaternion.copy(o.q);else d.rotation.set(...o.r);d.scale.set(...o.s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);});root.add(mesh);}
 root.userData={surveyed:false,detailCount:[...batches.values()].reduce((s,b)=>s+b.items.length,0)};
 return {root,setNight(value){glow.emissiveIntensity=value*3;}};
}
