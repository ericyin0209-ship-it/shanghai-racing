import * as THREE from 'three';
// Each pole owns one downward-facing lens; pooled lights stay on unique physical fixtures.
export function createTrackLighting(scene,track){
 const root=new THREE.Group();root.name='Circuit pole lighting';scene.add(root);
 const steel=new THREE.MeshStandardMaterial({color:'#78858b',metalness:.75,roughness:.42}),housing=new THREE.MeshStandardMaterial({color:'#344148',metalness:.65,roughness:.38}),lens=new THREE.MeshStandardMaterial({color:'#dce0dc',emissive:'#ffe9c5',emissiveIntensity:0,roughness:.35});
 const poleGeometry=new THREE.CylinderGeometry(.075,.11,12,12),headGeometry=new THREE.BoxGeometry(2.1,.2,.75),lensGeometry=new THREE.PlaneGeometry(1.92,.59),baseGeometry=new THREE.BoxGeometry(.55,.20,.55),fixtures=[];
 for(let index=0;index<48;index++){
  const f=track.at(index*track.length/48,index%2?24:-24);
  if(fixtures.some(p=>Math.hypot(p.x-f.p.x,p.z-f.p.z)<4))continue;
  const pole=new THREE.Mesh(poleGeometry,steel);pole.position.set(f.p.x,6,f.p.z);pole.name='Track lamp pole';pole.castShadow=true;root.add(pole);
  const base=new THREE.Mesh(baseGeometry,steel);base.position.set(f.p.x,.10,f.p.z);base.name='Track lamp base';root.add(base);
  const head=new THREE.Mesh(headGeometry,housing);head.position.set(f.p.x,12.1,f.p.z);head.rotation.y=f.yaw;head.name='Opaque track lamp housing';root.add(head);
  const diffuser=new THREE.Mesh(lensGeometry,lens);diffuser.rotation.set(Math.PI/2,f.yaw,0,'YXZ');diffuser.position.set(f.p.x,11.995,f.p.z);diffuser.name='Single downward track lamp lens';root.add(diffuser);
  fixtures.push({index,x:f.p.x,z:f.p.z,y:11.8});
 }
 const lights=Array.from({length:Math.min(6,fixtures.length)},()=>{const light=new THREE.PointLight('#ffe3bb',0,175,2);light.userData.dynamic=true;scene.add(light);return light;});let lastPole=-1;
 function update(focus){
  if(!lights.length||lights[0].intensity<=0)return;
  const nearest=track.nearest(focus.x,focus.z),pole=Math.floor(nearest.s/track.length*48);if(pole===lastPole)return;lastPole=pole;
  const byCourse=fixtures.slice().sort((a,b)=>{const da=Math.abs(a.index-pole),db=Math.abs(b.index-pole);return Math.min(da,48-da)-Math.min(db,48-db);});
  lights.forEach((light,i)=>{const f=byCourse[i];light.position.set(f.x,f.y,f.z);light.userData.fixtureIndex=f.index;});
 }
 return {root,fixtures,lights,lensMaterial:lens,setNight(amount){lens.emissiveIntensity=Math.max(0,Math.min(1,amount))*3.2;for(const light of lights)light.intensity=Math.max(0,Math.min(1,amount))*5200;},update};
}
