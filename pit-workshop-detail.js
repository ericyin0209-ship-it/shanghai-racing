import * as THREE from 'three';
// Photographic detailing in the existing Aston Martin garage footprint, after the shared pit warp.
// Equipment dimensions are plausible working dimensions, not surveyed replica CAD.
export function addPitWorkshopDetail(scene,pit){const root=new THREE.Group();root.name='Aston workshop / service equipment v34';root.userData.noPitWarp=true;scene.add(root);
 const mat=(c,m=.3,r=.55)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r}),green=mat('#104d42',.38,.42),dark=mat('#1a2424',.4,.58),alloy=mat('#929d9a',.85,.29),rubber=mat('#191c1c',.02,.91),white=mat('#bbc8c3',.1,.65),led=new THREE.MeshStandardMaterial({color:'#dde9e2',emissive:'#dde9e2',emissiveIntensity:2,roughness:.3});
 const bins=new Map(),box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,12),pose=new THREE.Object3D();
 const add=(name,g,m,p,size,rot=0)=>{const key=name;let b=bins.get(key);if(!b){b={g,m,items:[]};bins.set(key,b);}b.items.push({p,size,rot});};
 const b=(name,m,p,size)=>add(name,box,m,p,size);
 const wheel=(x,z)=>add('Cabinet caster',cylinder,rubber,[x,.135,z],[.09,.055,.09],Math.PI/2);
 const z0=pit.box.z,face=pit.garageAt(z0).x;
 // One rolling cabinet per visible team bay, placed behind the threshold with a clear service corridor.
 for(const dz of [-8.94,0,8.94]){const z=z0+dz,x=face-3.5;b('Tool chest shell',green,[x,.78,z+2.0],[1.1,1.12,2.0]);b('Tool chest stainless worktop',alloy,[x,1.37,z+2.0],[1.19,.065,2.08]);
  for(let j=0;j<6;j++){b('Drawer inset',dark,[x+.558,.36+j*.155,z+2.0],[.025,.13,1.87]);b('Drawer handle',alloy,[x+.60,.405+j*.155,z+2.0],[.038,.018,1.55]);}
  for(const dx of [-.43,.43])for(const zz of [-.78,.78])wheel(x+dx,z+2.0+zz);
  b('Cabinet top tray',rubber,[x,1.42,z+2.3],[.75,.03,.85]);
  // Support rack: visible back uprights, shelves and travel cases, all supported on the floor.
  const rx=face-7.5;for(const zz of [-1,1]){b('Rack post',alloy,[rx,1.195,z+zz],[.055,2.30,.055]);b('Rack rear post',alloy,[rx-.7,1.195,z+zz],[.055,2.30,.055]);}
  for(const y of [.12,1.12,2.20])b('Rack shelf',dark,[rx-.35,y,z],[.76,.065,2.1]);
  for(const zz of [-.57,.48]){b('Equipment flight case',dark,[rx-.35,.4825,z+zz],[.68,.66,.83]);b('Case edge trim',alloy,[rx+.005,.4825,z+zz],[.014,.62,.78]);b('Case handle',rubber,[rx+.025,.58,z+zz],[.025,.055,.26]);}
  // Wall junction boxes, conduit and glazed task board; not placed on the apron.
  b('Bay electrics box',white,[face-5.5,1.7,z-3.65],[.18,.65,.43]);b('Bay conduit',alloy,[face-5.5,2.75,z-3.65],[.035,1.45,.035]);
  b('Workshop strip housing',dark,[face-3.0,3.78,z],[.16,.10,4.6]);b('Workshop strip diffuser',led,[face-3.0,3.717,z],[.13,.017,4.45]);}
 let count=0;for(const [name,batch] of bins){const m=new THREE.InstancedMesh(batch.g,batch.m,batch.items.length);m.name=name;m.castShadow=m.receiveShadow=true;batch.items.forEach((a,i)=>{pose.position.set(...a.p);pose.scale.set(...a.size);pose.rotation.set(a.rot,0,0);pose.updateMatrix();m.setMatrixAt(i,pose.matrix);});root.add(m);count+=batch.items.length;}root.userData.parts=count;return root;}
