import * as THREE from 'three';
import {landmarkMaterials,createLandmarkBuilder} from './circuit-surface.js?v=218i';
export function formedRailGeometry(length){
 const outline=[[-.04,-.35],[.10,-.32],[.10,-.24],[-.015,-.15],[-.015,-.08],[.105,.02],[.105,.11],[-.015,.20],[-.015,.27],[.10,.33],[.10,.35],[-.065,.35],[-.065,-.35]];
 const s=new THREE.Shape();s.moveTo(...outline[0]);for(const p of outline.slice(1))s.lineTo(...p);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:length,bevelEnabled:false,curveSegments:1});g.translate(0,0,-length/2);g.userData.environmentLOD=[new THREE.BoxGeometry(.17,.70,length),new THREE.BoxGeometry(.17,.70,length)];g.userData.lodMetricSize=.7;return g;
}
export function createTrackEnvironment(scene,track){
 const root=new THREE.Group();root.name='Circuit edge construction / 218';scene.add(root);const m=landmarkMaterials(),builder=createLandmarkBuilder(root),{box,beam}=builder;let seed=218;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Guard-rail joint details are now on the actual barrier line, never floating in front of it.
 for(let s=0;s<track.length;s+=10)for(const side of [-1,1]){const f=track.at(s,side*19),frame=new THREE.Matrix4().makeRotationY(f.yaw);frame.setPosition(f.p.x,0,f.p.z);
  box('armco grounded backing post',[.12,.95,.16],[side*.16,.475,0],m.alloy,0,frame);
  box('armco base plate',[.38,.045,.34],[side*.16,.0225,0],m.concrete,0,frame);
  if(Math.floor(s/10)%4===0){beam('catch-fence connected overhang',[0,2.95,0],[-side*.32,3.22,0],.034,m.alloy,frame);}
 }
 // Small, sparse rubber marbles stay outside the white line; never obscure guidance.
 const marbleGeo=new THREE.IcosahedronGeometry(1,0),marbles=[];for(let i=0;i<3000;i++){const s=random()*track.length,j=Math.floor(s/track.length*track.n);if(track.curvatures[j]<.004&&random()<.8)continue;const off=(random()<.5?-1:1)*(7.27+random()*.98),f=track.at(s,off);marbles.push({f,scale:[.006+random()*.012,.003+random()*.005,.010+random()*.022],yaw:random()*Math.PI});}
 const marbleMesh=new THREE.InstancedMesh(marbleGeo,m.rubber,marbles.length),dummy=new THREE.Object3D();marbleMesh.name='Environment218 / tyre marbles';marbleMesh.castShadow=false;marbleMesh.receiveShadow=true;marbles.forEach(({f,scale,yaw},i)=>{dummy.position.copy(f.p);dummy.position.y+=scale[1];dummy.rotation.set(0,yaw,0);dummy.scale.set(...scale);dummy.updateMatrix();marbleMesh.setMatrixAt(i,dummy.matrix);});root.add(marbleMesh);
 // Asphalt edge erosion and grass transition: metric-height strips share the existing road profile.
 const earth=new THREE.MeshStandardMaterial({color:'#72705a',roughness:1});for(const side of [-1,1]){const edge=new THREE.Mesh(track.ribbon(side*10.98,side*11.18,.030),earth);edge.name='Fine verge soil edge';edge.receiveShadow=true;root.add(edge);}
 // A physical roadside safety light has a housing, lens and pole; no separate glowing sprites.
 for(let i=0;i<16;i++){const f=track.at((i+.35)*track.length/16,i%2?22:-22),frame=new THREE.Matrix4().makeRotationY(f.yaw);frame.setPosition(f.p.x,0,f.p.z);
  box('marshal foundation',[.65,.10,.60],[0,.05,0],m.concrete,0,frame);box('marshal junction cabinet',[.34,.58,.25],[0,.46,0],m.dark,0,frame);beam('marshal signal mast',[.18,.1,0],[.18,3.0,0],.045,m.alloy,frame);box('marshal panel housing',[.12,.56,.65],[.18,2.72,0],m.dark,0,frame);box('marshal signal inset',[.125,.44,.54],[.18,2.72,0],m.rubber,0,frame);
 }
 const stats={...builder.finish(),marbles:marbles.length};root.userData={...root.userData,...stats,surveyed:false};return {root,stats};
}
