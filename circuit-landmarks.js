import * as THREE from 'three';
import {landmarkMaterials,createLandmarkBuilder} from './circuit-surface.js?v=218i';
// Architectural characteristics follow Tilke/F1 photographs. Dimensions remain visual estimates.
export function ellipseLoft(profiles,segments=128){
 const v=[],uv=[],idx=[];
 for(let r=0;r<profiles.length;r++){const [rx,rz,y]=profiles[r];for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;v.push(Math.cos(a)*rx,y,Math.sin(a)*rz);uv.push(i/segments,r/(profiles.length-1));if(r&&i){const n=r*(segments+1)+i;idx.push(n,n-segments-1,n-1,n-1,n-segments-1,n-segments-2);}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function createCircuitLandmarks(scene,standAxis){
 const root=new THREE.Group();root.name='Shanghai landmark architecture / 218';scene.add(root);const m=landmarkMaterials(),builder=createLandmarkBuilder(root),{box,beam}=builder,standFrame=standAxis.matrix;
 const structural={bridgeGlazingSegments:128,bridges:2,substructureConnected:true,standAxisShared:true};
 function mesh(name,g,mat,p){const o=new THREE.Mesh(g,mat);o.name=name;o.position.set(...p);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 const lower=ellipseLoft([[.1,.1,21.65],[40,10.5,21.65],[66,19.3,22.55],[75.7,26.7,23.33],[76,27,23.58]]),upper=ellipseLoft([[76,27,27.82],[75.9,26.9,28.09],[68,21.4,28.5],[.1,.1,28.75]]);
 const glazing=ellipseLoft([[69.9,22.9,23.65],[69.9,22.9,27.78]]);
 const floor=new THREE.CylinderGeometry(1,1,.18,96);floor.scale(69.4,1,22.5);
 for(const z of [-455,-57]){
  mesh('Bridge sculpted aluminium underbelly',lower,m.ivory,[0,0,z]);mesh('Bridge tapered roof shell',upper,m.ivory,[0,0,z]);mesh('Bridge segmented reflective curtain wall',glazing,m.glass,[0,0,z]);mesh('Bridge recessed interior floor',floor,m.interior,[0,23.62,z]);mesh('Bridge suspended ceiling',floor,m.ivory,[0,27.72,z]);
  for(let j=0;j<128;j++){const a=j*Math.PI/64,b=(j+1)*Math.PI/64,x=Math.cos(a)*70.02,zz=z+Math.sin(a)*23.02;
   beam('bridge vertical mullions',[x,23.58,zz],[x,27.84,zz],.047,m.alloy);
   for(const y of [23.68,25.75,27.70])beam('bridge curved transoms',[x,y,zz],[Math.cos(b)*70.02,y,z+Math.sin(b)*23.02],.04,m.alloy);
   // Sealed edge flashings sit on the shell perimeter; no detached light strips.
   beam('bridge drip edge',[Math.cos(a)*75.9,23.58,z+Math.sin(a)*26.9],[Math.cos(b)*75.9,23.58,z+Math.sin(b)*26.9],.055,m.alloy);
   if(j%4===0){beam('bridge underside panel joint',[Math.cos(a)*45,21.83,z+Math.sin(a)*12.4],[Math.cos(a)*74.2,23.26,z+Math.sin(a)*25.7],.024,m.dark);}
  }
  for(let x=-58;x<=58;x+=5.8){box('bridge internal partition',[.10,2.8,12],[x,25.12,z],m.dark);box('bridge recessed ceiling lens',[3.2,.025,.25],[x,27.6175,z-9.2],m.glow);}
  for(const x of [-53,53]){
   const t=new THREE.Group();t.position.set(x,0,z);root.add(t);const tb=createLandmarkBuilder(t);
   // Spectator side (x>0): red cylindrical stair towers; team side: glass office towers (Tilke design notes, building.co.uk).
   const towerWall=new THREE.CylinderGeometry(7.1,8,23.3,64,1,true),o=new THREE.Mesh(towerWall,x>0?(m.stairRed??=new THREE.MeshPhysicalMaterial({color:'#b5262b',metalness:.35,roughness:.38,clearcoat:.6,clearcoatRoughness:.25,side:THREE.DoubleSide})):m.warmGlass);o.position.y=11.9;o.castShadow=o.receiveShadow=true;t.add(o);
   const plinth=new THREE.Mesh(new THREE.CylinderGeometry(8.25,8.6,.55,64),m.concrete);plinth.position.y=.275;t.add(plinth);
   for(let j=0;j<40;j++){const a=j*Math.PI/20,xx=Math.cos(a),zz=Math.sin(a);tb.beam('tower curtain mullions',[xx*8,.55,zz*8],[xx*7.1,23.55,zz*7.1],.06,m.alloy);}
   for(let k=1;k<=7;k++){const y=k*3.15+.4,r=8-(y/23.3)*.9;mesh('Tower continuous floor edge',ellipseLoft([[r+.12,r+.12,y-.10],[r+.12,r+.12,y+.10]],64),m.alloy,[x,0,z]);}
   tb.box('tower entry threshold',[3.4,.10,2.5],[0,.10,8.5],m.paving);tb.box('tower entrance canopy',[4.5,.18,3.3],[0,3.05,8.7],m.ivory);for(const side of [-1,1])tb.box('tower entry frame',[.10,2.6,.10],[side*1.25,1.6,8.1],m.alloy);tb.box('tower door glass',[2.4,2.45,.06],[0,1.7,8.12],m.glass);tb.finish();
  }
 }
 // Panelised upper pit facade, metal reveal depth, sunshades and recessed joints.
 for(let i=0;i<126;i++){const z=-476+i*3.55;
  box('pit curtain glazing',[.10,3.46,3.45],[-35.19,8.45,z],m.glass);
  box('pit vertical pressure cap',[.16,3.75,.07],[-35.07,8.45,z+1.75],m.alloy);
  box('pit lower pressure cap',[.17,.10,3.55],[-35.07,6.68,z],m.alloy);
  box('pit upper pressure cap',[.17,.12,3.55],[-35.07,10.23,z],m.alloy);
  box('pit sunshade blade',[1.05,.065,3.49],[-34.82,10.49,z],m.ivory);
  box('pit shadow reveal',[.12,.12,3.47],[-35.12,6.56,z],m.dark);
  box('pit ceiling recess lens',[.06,.12,1.75],[-35.22,7.0,z],m.glow);
 }
 for(let z=-470;z<-40;z+=14.4){box('pit pilaster cladding',[.36,6.2,.29],[-35.30,7.45,z+6.7],m.ivory);box('pit coping cap',[1.5,.16,14.2],[-35.75,11.64,z],m.ivory);}
 // Roof panel seams and edging follow the same roof surface, while leaving every aperture open.
 const roofY=x=>23+((x-40)/30)**2*1.5;
 for(let z=-445;z<=-65;z+=7.6){for(let x=15;x<74;x+=4){const q=Math.min(74,x+4),mid=(x+q)/2;
  if(Array.from({length:15},(_,j)=>({x:j%2?34:54,z:-85-j*24})).some(h=>Math.abs(h.z-z)<2.9&&mid>h.x-3.3&&mid<h.x+3.3))continue;
  beam('roof standing seams',[x,roofY(x)+.564,z],[q,roofY(q)+.564,z],.018,m.alloy,standFrame);
 }}
 for(const x of [15,74])for(let z=-445;z<-65;z+=9.5){box('canopy continuous edge flashing',[.18,.46,9.48],[x,roofY(x)+.30,z+4.75],m.ivory,0,standFrame);box('canopy weather gutter',[.22,.15,9.48],[x,roofY(x)-.05,z+4.75],m.dark,0,standFrame);}
 // Connected access plaza: door recesses, paving joints, grounded planters and benches.
 for(let z=-430;z<-75;z+=12){box('rear promenade paving',[12,.13,11.97],[87,.045,z],m.paving,0,standFrame);box('rear tactile wayfinding',[.45,.008,11.96],[83,.114,z],m.ivory,0,standFrame);box('rear paving inlay',[11.8,.004,.025],[87,.113,z+5.98],m.dark,0,standFrame);}
 for(const z of [-410,-326,-242,-158,-86]){
  box('entrance canopy',[5.1,.20,11.0],[82.1,3.4,z],m.ivory,0,standFrame);
  for(const dz of [-5,5])beam('entrance canopy columns',[84.3,.0,z+dz],[84.3,3.31,z+dz],.11,m.alloy,standFrame);
  box('entrance recessed light',[.12,.035,8.4],[82.6,3.28,z],m.glow,0,standFrame);
  for(const dz of [-9,9]){box('entry planter',[2.6,.52,4.3],[89,.26,z+dz],m.concrete,0,standFrame);box('entry planted hedge',[2.2,.56,3.95],[89,.75,z+dz],m.foliage,0,standFrame);}
 }
 for(let z=-421;z<-90;z+=28){box('promenade bench seat',[.65,.12,2.5],[87.6,.50,z],m.ivory,0,standFrame);for(const dz of [-.8,.8])box('bench grounded base',[.48,.44,.12],[87.6,.22,z+dz],m.dark,0,standFrame);box('promenade bollard',[.10,.84,.10],[81.8,.42,z+3.4],m.alloy,0,standFrame);box('bollard lens',[.11,.08,.11],[81.8,.77,z+3.4],m.glow,0,standFrame);}
 const stats={...builder.finish(),...structural};root.userData={...root.userData,...stats,reference:'Tilke Architecture Portfolio / Formula1 Shanghai site photographs',surveyed:false};
 return {root,stats,setNight(v){m.glow.emissiveIntensity=v*2.3;m.warmGlass.emissiveIntensity=v*.48;m.glass.emissive.set('#d7c2a0');m.glass.emissiveIntensity=v*.14;},setWetness(v){m.paving.roughness=.91-v*.38;m.paving.color.setRGB(.30-v*.04,.33-v*.04,.32-v*.04);}};
}
