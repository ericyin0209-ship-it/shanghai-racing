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
  const target=track.at(index*track.length/48,0).p;fixtures.push({index,x:f.p.x,z:f.p.z,y:11.8,targetX:target.x,targetZ:target.z});
 }
 const lights=Array.from({length:Math.min(6,fixtures.length)},()=>{const light=new THREE.SpotLight('#ffe6c7',0,110,Math.PI*.40,.72,2);light.userData.dynamic=true;light.shadow.mapSize.set(1024,1024);light.shadow.focus=.65;light.shadow.bias=-.00002;light.shadow.normalBias=.004;light.shadow.autoUpdate=false;light.shadow.camera.near=.8;light.shadow.camera.far=150;light.visible=false;scene.add(light,light.target);return light;});let amount=0,initialized=false;
 function update(focus,dt=.016){
  if(!lights.length||amount<=0)return;const candidates=fixtures.map(f=>({f,d:(f.x-focus.x)**2+(f.z-focus.z)**2})).sort((a,b)=>a.d-b.d).slice(0,lights.length).map(v=>v.f);const wanted=new Set(candidates.map(f=>f.index));const occupied=new Set();for(const light of lights)if(wanted.has(light.userData.fixtureIndex))occupied.add(light.userData.fixtureIndex);
  for(const light of lights){let fixture=fixtures.find(f=>f.index===light.userData.fixtureIndex);if(!fixture||!wanted.has(fixture.index)){const next=candidates.find(f=>!occupied.has(f.index));if(next&&(!initialized||light.intensity<30||Math.hypot(fixture.x-focus.x,fixture.z-focus.z)>140)){fixture=next;light.userData.fixtureIndex=fixture.index;light.intensity=0;light.position.set(fixture.x,fixture.y,fixture.z);light.target.position.set(fixture.targetX,0,fixture.targetZ);occupied.add(fixture.index);}}
   const shadowed=amount>.40&&fixture?.index===candidates[0]?.index;if(light.castShadow!==shadowed){light.castShadow=shadowed;light.shadow.needsUpdate=true;}if(shadowed&&(dt>0&&Number.isFinite(focus.speed)||!initialized||dt===0))light.shadow.needsUpdate=true;
   const desired=fixture&&wanted.has(fixture.index)?amount*6400:0;light.intensity+= (desired-light.intensity)*(dt>0?1-Math.exp(-dt*5):1);
  }initialized=true;
 }

 return {root,fixtures,lights,lensMaterial:lens,setNight(value){amount=Math.max(0,Math.min(1,value));lens.emissiveIntensity=amount*3.2;for(const light of lights)light.visible=amount>0;if(amount===0)for(const light of lights){light.intensity=0;light.castShadow=false;light.shadow.needsUpdate=false;}initialized=false;},update};
}
