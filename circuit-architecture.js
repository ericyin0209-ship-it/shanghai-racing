import * as THREE from 'three';
// Photo-informed construction, not surveyed dimensions. Existing mapped footprints are retained.
export function createCircuitArchitecture(scene){
 const root=new THREE.Group();root.name='Shanghai architectural structure 1.0.8';scene.add(root);const standRoot=new THREE.Group();standRoot.name='Main stand structural frame';root.add(standRoot);let standPart=true;
 const steel=new THREE.MeshStandardMaterial({color:'#839297',metalness:.82,roughness:.32}),concrete=new THREE.MeshStandardMaterial({color:'#9c9e96',roughness:.89}),dark=new THREE.MeshStandardMaterial({color:'#26373a',metalness:.45,roughness:.5}),gold=new THREE.MeshStandardMaterial({color:'#b39a59',metalness:.7,roughness:.32});
 const glow=new THREE.MeshStandardMaterial({color:'#e5ddd0',emissive:'#ffe5ba',emissiveIntensity:0,roughness:.35});const batches=new Map(),d=new THREE.Object3D();
 function box(key,w,h,l,x,y,z,mat=steel,rot=0){if(!batches.has(key))batches.set(key,{g:new THREE.BoxGeometry(w,h,l),mat,items:[],stand:standPart});batches.get(key).items.push({p:[x,y,z],r:[0,rot,0],s:[1,1,1]});}
 function beam(key,a,b,r=.09,mat=steel){if(!batches.has(key))batches.set(key,{g:new THREE.CylinderGeometry(r,r,1,10),mat,items:[],stand:standPart});const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());batches.get(key).items.push({p:p.add(q).multiplyScalar(.5).toArray(),q:quat,s:[1,delta.length(),1]});}
 // Main stand underside: the load paths, concourse, stair treads and rear screen.
 for(let z=-427;z<=-83;z+=16){
  for(const x of [36,52,65]){const row=(x-29-(x>45?2.4:0))/.75,top=x===65?23:1.21+row*.43+(row>20?1.3:0)-.42;box('stand columns',.62,1,.62,x,top/2,z,concrete);batches.get('stand columns').items.at(-1).s[1]=top;}
  // Cantilever trusses stay above the audience; every web joins both chords.
  beam('raked terrace girder',[28.5,.7,z],[63,19.6,z],.20);
  const roofY=x=>23+((x-40)/30)**2*1.5;
  for(let x=18;x<72;x+=6){const q=Math.min(72,x+6);beam('roof top chord',[x,roofY(x)-.12,z],[q,roofY(q)-.12,z],.13);beam('roof lower chord',[x,roofY(x)-.85,z],[q,roofY(q)-.85,z],.11);beam('roof web',[x,roofY(x)-.85,z],[q,roofY(q)-.12,z],.065);beam('roof web',[q,roofY(q)-.85,z],[x,roofY(x)-.12,z],.065);}
  beam('rear roof brace',[70,20.8,z],[60,roofY(60)-.85,z],.15);
  box('concourse lamps',.11,.07,6,54,10.1,z,glow);box('rear facade fins',.16,19,.16,66,10.5,z);
 }
 // Aisles share the seat grid, including the mid-tier concourse landing.
 for(let col=0;col<360;col+=30){const z=-433+(col+.5)*.99;for(let row=0;row<42;row++){const x=29+row*.75+(row>20?2.4:0),top=1.21+row*.43+(row>20?1.3:0);box('stand aisle treads',.85,.10,1.90,x,top-.05,z,concrete);if(row>20&&row<22)box('stand aisle landing',2.4,.18,1.90,x-1.575,10.71,z,concrete);}}
 for(let z=-437;z<-72;z+=2.8)box('rear louvre',.08,18,.075,67,10.9,z,dark);
 // Lantern holes acquire a copper rim and translucent inner drum; rim sizes match existing openings.
 for(let j=0;j<15;j++){const x=j%2?34:54,z=-85-j*24,y=23+((x-40)/30)**2*1.5;const rim=new THREE.Mesh(new THREE.TorusGeometry(2.72,.10,12,64),gold);rim.rotation.x=Math.PI/2;rim.position.set(x,y+.6,z);standRoot.add(rim);for(let k=0;k<24;k++){const a=k*Math.PI/12;box('lantern ribs',.055,.6,.055,x+Math.cos(a)*2.68,y+.25,z+Math.sin(a)*2.68,gold);}}
 standPart=false;
 // Elliptical bridge construction moved to circuit-landmarks; no overlapping legacy frame.
 // Pit block roof plant, duct joints, downpipes and door mechanisms.
 for(let i=0;i<30;i++){const z=-42-i*14.4;box('roof HVAC',3.1,1.2,2.3,-48,12.2,z,dark);box('roof vent hood',3.3,.08,2.5,-48,12.86,z,steel);for(let k=0;k<12;k++)box('HVAC grille',.045,.85,2.32,-49.5+k*.26,12.25,z,steel);box('roof duct',.65,.55,10,-52,11.86,z,dark);for(const dz of [-4,-2,0,2,4])box('duct seam',.7,.59,.04,-52,11.86,z+dz);beam('rain downpipes',[-35.2,.12,z+6.5],[-35.2,11.6,z+6.5],.075);box('shutter motor',.34,.42,.68,-35.23,3.86,z+5.5,dark);box('pit service lantern',.17,.15,.34,-35.07,3.85,z+5.9,glow);}
 box('roof drainage gutter',.28,.20,455,-35.28,11.55,-255);
 for(const [key,batch] of batches){const mesh=new THREE.InstancedMesh(batch.g,batch.mat,batch.items.length);mesh.name=key;mesh.castShadow=true;mesh.receiveShadow=true;batch.items.forEach((o,i)=>{d.position.set(...o.p);if(o.q)d.quaternion.copy(o.q);else d.rotation.set(...o.r);d.scale.set(...o.s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);});(batch.stand?standRoot:root).add(mesh);}
 root.userData={surveyed:false,detailCount:[...batches.values()].reduce((s,b)=>s+b.items.length,0)};
 return {root,standRoot,setNight(value){glow.emissiveIntensity=value*3;}};
}
