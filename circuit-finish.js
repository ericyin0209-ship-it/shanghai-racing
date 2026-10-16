import * as THREE from 'three';
// Fine construction details; locations are representative, not a measured inventory.
export function createCircuitFinish(scene,track){
 const root=new THREE.Group();root.name='Circuit construction details';scene.add(root);
 const metal=new THREE.MeshStandardMaterial({color:'#929da0',metalness:.85,roughness:.36}),rubber=new THREE.MeshStandardMaterial({color:'#303634',roughness:.94}),dark=new THREE.MeshStandardMaterial({color:'#292e2b',metalness:.3,roughness:.8});
 const d=new THREE.Object3D();
 function instances(geometry,material,count,pose){const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.castShadow=true;mesh.receiveShadow=true;for(let i=0;i<count;i++){d.position.set(0,0,0);d.rotation.set(0,0,0);d.scale.set(1,1,1);pose(i,d);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);}root.add(mesh);return mesh;}
 const n=Math.floor(track.length/4),boltGeo=new THREE.CylinderGeometry(.024,.024,.023,10);boltGeo.rotateZ(Math.PI/2);
 instances(boltGeo,metal,n*2*3,(i,o)=>{const side=i%2?1:-1,row=Math.floor(i/2)%3,s=Math.floor(i/6)*4,f=track.at(s,side*17.7);o.position.set(f.p.x,.28+row*.19,f.p.z);o.rotation.y=f.yaw;});
 const mast=new THREE.CylinderGeometry(.041,.052,3.1,12);instances(mast,metal,n*2,(i,o)=>{const f=track.at(Math.floor(i/2)*4,i%2?19:-19);o.position.set(f.p.x,1.55,f.p.z);o.rotation.y=f.yaw;});
 const wire=new THREE.CylinderGeometry(.011,.011,4.08,6);wire.rotateX(Math.PI/2);instances(wire,metal,n*2*3,(i,o)=>{const side=i%2?1:-1,row=Math.floor(i/2)%3,f=track.at(Math.floor(i/6)*4+2,side*19);o.position.set(f.p.x,1.02+row*.91,f.p.z);o.rotation.y=f.yaw;});
 const grate=new THREE.BoxGeometry(.035,.018,.65);instances(grate,metal,Math.floor(track.length/12)*2*8,(i,o)=>{const side=i%2?1:-1,k=Math.floor(i/2)%8,s=Math.floor(i/16)*12,f=track.at(s,side*8.7+(k-3.5)*.047);o.position.set(f.p.x,.069,f.p.z);o.rotation.y=f.yaw;});
 // Segmented tyre recovery barriers outside estimated braking zones.
 const stops=[.125,.29,.565,.695,.96],rings=[];for(const s of stops)for(let row=0;row<3;row++)for(let j=0;j<30;j++)rings.push({s:s*track.length+(j-15)*.64,row});
 const tyreGeo=new THREE.TorusGeometry(.235,.095,14,32);tyreGeo.rotateX(Math.PI/2);instances(tyreGeo,rubber,rings.length,(i,o)=>{const r=rings[i],f=track.at(r.s,-23-r.row*.64);o.position.set(f.p.x,.36,f.p.z);o.rotation.y=f.yaw;});
 instances(new THREE.BoxGeometry(.08,.18,.7),dark,rings.length,(i,o)=>{const r=rings[i],f=track.at(r.s,-23-r.row*.64);o.position.set(f.p.x,.31,f.p.z);o.rotation.y=f.yaw;});
 // Roof and facade joints in the main pit block.
 instances(new THREE.BoxGeometry(.09,2.8,.035),metal,380,(i,o)=>o.position.set(-34.91,8.42,-445+i));
 instances(new THREE.BoxGeometry(.045,.045,9.8),metal,60,(i,o)=>o.position.set(-35.35,3.65,-40-i*7.2));
 return root;
}
