import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {PIT_V,PIT_UNIT_W,unitZ,unitIndex,PIT_START_Z,PIT_END_Z} from './pit-lane.js?v=p34-20261029-r3';
import {PIT_Z0,PIT_Z1} from './main-straight.js?v=229release';
// preview.28/30: the drawn pit road, markings, pit wall, barriers, drains and signals, all generated from the same
// pit-lane.js geometry that physics and the pit-stop route use. Marking positions follow the FIA drawings (SC1/SC2
// lines, pit lane start/end lines, entry bollard, solid exit line); paint widths and colours are standard practice,
// not measured at Shanghai.
const PAINT_Y=.006;
export function createPitLaneVisuals(scene,track,{asphalt,concrete,fence}){
 const pit=track.pitLane,root=new THREE.Group();root.name='Pit lane road, markings and walls (preview.28)';scene.add(root);
 const ROAD_Y=.043,len=pit.length;
 // strip between two lateral offsets along u; faces up, UVs in metres (asphalt tiles at 3 m)
 function strip(u0,u1,vA,vB,y,step=1,tile=3){const pos=[],uv=[],idx=[];const n=Math.max(1,Math.ceil((u1-u0)/step));
  for(let i=0;i<=n;i++){const u=u0+(u1-u0)*i/n;for(const v of [vA(u),vB(u)]){const p=pit.point(u,v);pos.push(p.x,y,p.z);uv.push(v/tile,u/tile);}if(i<n){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  if(g.attributes.normal.getY(0)<0){const a=g.index.array;for(let k=0;k<a.length;k+=3){const t=a[k+1];a[k+1]=a[k+2];a[k+2]=t;}g.computeVertexNormals();}return g;}
 const hw=u=>pit.sample(u).hw,inGarage=u=>{const q=pit.sample(u);return q.z<PIT_Z0+.5&&q.z>PIT_Z1-.5;};
 // road: asphalt fast lane, light sealed concrete working area in front of the garages (user video 3)
 const road=new THREE.Mesh(strip(0,len,u=>-hw(u),u=>hw(u),ROAD_Y,1),asphalt);road.name='Pit road asphalt';road.receiveShadow=true;
 road.material.polygonOffset=true;road.material.polygonOffsetFactor=-1;road.material.polygonOffsetUnits=-2;root.add(road);
 function workshopConcrete(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),im=x.createImageData(512,512);let seed=3451;for(let i=0;i<im.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)|0;const n=181+((seed>>>24)-128)*.028;im.data[i]=n;im.data[i+1]=n+2;im.data[i+2]=n;im.data[i+3]=255;}x.putImageData(im,0,0);x.strokeStyle='rgba(50,55,52,.11)';x.lineWidth=1;for(let j=0;j<4;j++){x.beginPath();x.moveTo(j*128,0);x.lineTo(j*128,512);x.stroke();}const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.anisotropy=4;return tx;}
 const g0=pit.uAtZ(PIT_Z1),g1=pit.uAtZ(PIT_Z0);
 // garage apron: sealed concrete a shade lighter than the lane (photo 04), not bright facade concrete
 const apronMat=new THREE.MeshStandardMaterial({color:'#a8aaa5',map:workshopConcrete(),roughness:.88,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});const apron=new THREE.Mesh(strip(g0,g1,u=>PIT_V.divider+.08,u=>hw(u),ROAD_Y+.004,4,4),apronMat);apron.name='Working area concrete';apron.receiveShadow=true;root.add(apron);
 const jointMat=new THREE.MeshStandardMaterial({color:'#454b48',roughness:.94,polygonOffset:true,polygonOffsetFactor:-3});
 const joints=[];for(let u=g0+2;u<g1;u+=8.94)joints.push(strip(u-.008,u+.008,()=>PIT_V.divider+.15,u=>hw(u)-.1,ROAD_Y+.0045,.016,1));if(joints.length){const m=new THREE.Mesh(mergeGeometries(joints,false),jointMat);m.name='Sealed apron slab joints';root.add(m);joints.forEach(g=>g.dispose());}
 // markings
 const paintMat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.55,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6}),white=paintMat('#ecece6'),yellow=paintMat('#e8c21c'),lime=paintMat('#b8e630');
 const paint={white:[],yellow:[],lime:[]},line=(mat,u0,u1,v,w=.12)=>{if(u1>u0)paint[mat].push(strip(u0,u1,()=>v(u0)-w/2,()=>v(u0)+w/2,ROAD_Y+PAINT_Y,1,1));},follow=(mat,u0,u1,v,w=.12)=>{if(u1>u0)paint[mat].push(strip(u0,u1,u=>v(u)-w/2,u=>v(u)+w/2,ROAD_Y+PAINT_Y,1,1));};
 const across=(mat,u,w=.3,vA=x=>-hw(x),vB=x=>hw(x))=>paint[mat].push(strip(u-w/2,u+w/2,()=>vA(u),()=>vB(u),ROAD_Y+PAINT_Y,w,1));
 const [w0,w1]=pit.wallSpan;
 follow('white',0,w0,u=>-hw(u)+.1,.2);follow('white',0,len,u=>hw(u)-.1,.15);follow('white',w1,len,u=>-hw(u)+.1,.25);// entry line, outer edge, solid exit line
 for(let u=6;u<Math.min(w0-2,80);u+=4)across('white',u,.16,x=>-hw(x)-1.6,x=>-hw(x)+.05);// hatched gore start
 across('white',22,.4);across('white',len-40,.4);// SC1 / SC2 lines
 const uS=pit.U.limitStart,uE=pit.U.limitEnd;across('white',uS,.4);across('white',uE,.4);
 // on the straight the lane heads +z and its right is -x, so lateral v = centre x - world x
 follow('white',uS,uE,u=>Math.min(PIT_V.divider,hw(u)-.2),.12);// fast / working lane divider
 // team boxes: groups of three units per the FIA 2024 drawing; Aston Martin (14-16) in green/lime
 const boxes=[['3',3],['6.5',2],['9',3],['12',3],['15',3],['18',3],['21',3],['24',3],['27',3],['29.5',2]];
 for(const [centre] of boxes){const c=parseFloat(centre),zc=(unitZ(unitIndex(String(Math.floor(c))))+unitZ(unitIndex(String(Math.ceil(c)))))/2,uc=pit.uAtZ(zc),half=6.2,am=centre==='15',mat=am?'lime':'yellow';
  const vIn=u=>PIT_V.divider+.3,vOut=u=>hw(u)-.45;line(mat,uc-half,uc+half,vIn,.1);line(mat,uc-half,uc+half,vOut,.1);across(mat,uc-half,.1,vIn,vOut);across(mat,uc+half,.1,vIn,vOut);}
 // Aston Martin box: front wheel stop marks and wheel-change spots (car CG at BOX, front axle 1.97 m ahead, rear 1.63 m behind)
 const ub=pit.U.box,vb=PIT_V.box;
 for(const side of [-1,1]){const v=vb+side*.83;across('white',ub+1.97+.42,.08,()=>v-.25,()=>v+.25);for(const a of [1.97,-1.63]){paint.lime.push(strip(ub+a-.04,ub+a+.04,()=>v+side*.45,()=>v+side*1.15,ROAD_Y+PAINT_Y,.08,1));}}
 for(const [mat,list] of Object.entries(paint)){if(!list.length)continue;const m=new THREE.Mesh(mergeGeometries(list,false),{white,yellow,lime}[mat]);m.name='Pit lane paint / '+mat;m.receiveShadow=true;root.add(m);list.forEach(g=>g.dispose());}
 // rubber: braking at the limit line, the fast-lane line and the box stop
 const rubberTex=(()=>{const c=document.createElement('canvas');c.width=64;c.height=512;const x=c.getContext('2d');x.fillStyle='#000';for(let i=0;i<900;i++){x.globalAlpha=Math.random()*.10;x.fillRect(Math.random()*64,Math.random()*512,2+Math.random()*10,6+Math.random()*40);}const t=new THREE.CanvasTexture(c);t.wrapT=THREE.RepeatWrapping;return t;})();
 const rubber=new THREE.MeshStandardMaterial({color:'#15181a',alphaMap:rubberTex,transparent:true,opacity:.75,depthWrite:false,roughness:.95,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-8});
 const marks=[];const fastV=u=>PIT_V.fast*Math.max(0,Math.min(1,(hw(u)-3)/5));for(const off of [-.83,.83])marks.push(strip(uS-60,uE+40,u=>fastV(u)+off-.18,u=>fastV(u)+off+.18,ROAD_Y+.004,4,1));
 for(const off of [-.8,.8])marks.push(strip(ub-14,ub+4,u=>vb+off-.2,u=>vb+off+.2,ROAD_Y+.004,1,1));
 const rub=new THREE.Mesh(mergeGeometries(marks,false),rubber);rub.name='Pit lane rubber';rub.renderOrder=1;root.add(rub);marks.forEach(g=>g.dispose());
 // drain channel along the working lane / apron joint, with grating texture
 const grateTex=(()=>{const c=document.createElement('canvas');c.width=32;c.height=128;const x=c.getContext('2d');x.fillStyle='#55595a';x.fillRect(0,0,32,128);x.fillStyle='#111415';for(let y=4;y<128;y+=8)x.fillRect(3,y,26,4);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapT=THREE.RepeatWrapping;return t;})();
 const grate=new THREE.MeshStandardMaterial({map:grateTex,metalness:.6,roughness:.5});const drain=new THREE.Mesh(strip(g0,g1,u=>hw(u)+.02,u=>hw(u)+.32,ROAD_Y+.007,2,.3),grate);drain.name='Pit lane slot drain';root.add(drain);
 // pit wall: concrete platform between the lane face and the track face, debris fence on the track face
 const wallPts=pit.walls[0].points,facePts=pit.walls[1].points,H=1.05;
 const wallGeo=(()=>{const pos=[],idx=[];const push=(p,y)=>{pos.push(p.x,y,p.z);return pos.length/3-1;};
  for(let i=0;i<wallPts.length-1;i++){const a=wallPts[i],b=wallPts[i+1],c=facePts[i],d=facePts[i+1];
   const q=[push(a,0),push(b,0),push(b,H),push(a,H)];idx.push(q[0],q[2],q[1],q[0],q[3],q[2]);
   const r=[push(c,0),push(d,0),push(d,H),push(c,H)];idx.push(r[0],r[1],r[2],r[0],r[2],r[3]);
   const t=[push(a,H),push(b,H),push(d,H),push(c,H)];idx.push(t[0],t[2],t[1],t[0],t[3],t[2]);}
  const end=(p,q)=>{const k=[push(p,0),push(q,0),push(q,H),push(p,H)];idx.push(k[0],k[1],k[2],k[0],k[2],k[3],k[0],k[2],k[1],k[0],k[3],k[2]);};end(wallPts[0],facePts[0]);end(wallPts.at(-1),facePts.at(-1));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  // make every face point away from the wall's centre line
  const P=g.attributes.position,a=g.index.array;for(let k=0;k<a.length;k+=3){const i0=a[k],i1=a[k+1],i2=a[k+2],ax=P.getX(i0),ay=P.getY(i0),az=P.getZ(i0),e1=[P.getX(i1)-ax,P.getY(i1)-ay,P.getZ(i1)-az],e2=[P.getX(i2)-ax,P.getY(i2)-ay,P.getZ(i2)-az],nx=e1[1]*e2[2]-e1[2]*e2[1],ny=e1[2]*e2[0]-e1[0]*e2[2],nz=e1[0]*e2[1]-e1[1]*e2[0];
   const cx=(ax+P.getX(i1)+P.getX(i2))/3,cy=(ay+P.getY(i1)+P.getY(i2))/3,cz=(az+P.getZ(i1)+P.getZ(i2))/3;let best=1e9,mx=0,mz=0;for(let j=0;j<wallPts.length;j+=1){const mxj=(wallPts[j].x+facePts[j].x)/2,mzj=(wallPts[j].z+facePts[j].z)/2,d=(mxj-cx)**2+(mzj-cz)**2;if(d<best){best=d;mx=mxj;mz=mzj;}}
   if(nx*(cx-mx)+ny*(cy-H/2)+nz*(cz-mz)<0){a[k+1]=i2;a[k+2]=i1;}}
  g.computeVertexNormals();return g;})();
 const wall=new THREE.Mesh(wallGeo,concrete);wall.name='Pit wall';wall.castShadow=wall.receiveShadow=true;root.add(wall);
 const fenceMesh=(pts,y0,y1,name)=>{const pos=[],uv=[],idx=[];let d=0;for(let i=0;i<pts.length;i++){if(i)d+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);pos.push(pts[i].x,y0,pts[i].z,pts[i].x,y1,pts[i].z);uv.push(d/2,0,d/2,(y1-y0)/2);if(i){const k=(i-1)*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,fence);m.name=name;root.add(m);return m;};
 const steel=new THREE.MeshStandardMaterial({color:'#7d878b',metalness:.75,roughness:.38}),posts=[];
 const postGeo=new THREE.CylinderGeometry(.05,.06,1,8);const addPosts=(pts,y0,y1,every=4)=>{let d=0,next=0;for(let i=1;i<pts.length;i++){d+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);if(d>=next){posts.push([pts[i].x,y0,y1,pts[i].z]);next=d+every;}}};
 fenceMesh(facePts,H,H+3.2,'Pit wall debris fence');addPosts(facePts,H,H+3.35);
 // outer barrier: concrete wall + fence where no building faces the lane
 const outerPts=pit.walls[2].points,segs=[];let cur=[];for(const p of outerPts){const along=p.z<PIT_Z0+1&&p.z>PIT_Z1-1;if(along){if(cur.length>1)segs.push(cur);cur=[];}else cur.push(p);}if(cur.length>1)segs.push(cur);
 const barrierGeo=[];for(const s of segs){const pos=[],idx=[];for(let i=0;i<s.length;i++){const a=s[Math.max(0,i-1)],b=s[Math.min(s.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*.3,nz=dx/l*.3;for(const [ox,oz] of [[nx,nz],[-nx,-nz]])pos.push(s[i].x+ox,0,s[i].z+oz,s[i].x+ox,.85,s[i].z+oz);
   if(i){const k=(i-1)*4;idx.push(k,k+4,k+1,k+1,k+4,k+5,k+2,k+3,k+6,k+3,k+7,k+6,k+1,k+5,k+3,k+3,k+5,k+7);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();barrierGeo.push(g);fenceMesh(s,.85,3.2,'Pit outer fence');addPosts(s,.85,3.3,5);}
 if(barrierGeo.length){const m=new THREE.Mesh(mergeGeometries(barrierGeo,false),new THREE.MeshStandardMaterial({color:'#cfd1cb',roughness:.85,side:THREE.DoubleSide}));m.name='Pit outer concrete barrier';m.castShadow=m.receiveShadow=true;root.add(m);}
 // entry road inner side: steel W-beam guard rail on posts (FIA photo "Pit Lane Starts": barriers either side, grass verge)
 {const pts=pit.walls[3]?.points||[];if(pts.length>1){const rail=new THREE.MeshStandardMaterial({color:'#aeb5b8',metalness:.8,roughness:.35,side:THREE.DoubleSide}),geos=[];
  for(const [y0,y1] of [[.5,.62],[.68,.8]]){const pos=[],idx=[];for(let i=0;i<pts.length;i++){pos.push(pts[i].x,y0,pts[i].z,pts[i].x,y1,pts[i].z);if(i){const k=(i-1)*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();geos.push(g);}
  const m=new THREE.Mesh(mergeGeometries(geos,false),rail);m.name='Pit entry guard rail';m.castShadow=m.receiveShadow=true;root.add(m);geos.forEach(g=>g.dispose());addPosts(pts,0,.82,2);}}
 const postMesh=new THREE.InstancedMesh(postGeo,steel,posts.length),o=new THREE.Object3D();posts.forEach(([x,y0,y1,z],i)=>{o.position.set(x,(y0+y1)/2,z);o.scale.set(1,y1-y0,1);o.updateMatrix();postMesh.setMatrixAt(i,o.matrix);});postMesh.name='Pit fence posts';root.add(postMesh);
 // entry bollard (FIA: keep right of the bollard), pit exit light at the end of the lane, entry status panels
 const bollard=new THREE.Group();bollard.position.set(pit.landmarks.bollard.x,0,pit.landmarks.bollard.z);root.add(bollard);bollard.name='Pit entry bollard';
 const stripeTex=(()=>{const c=document.createElement('canvas');c.width=8;c.height=64;const x=c.getContext('2d');for(let i=0;i<8;i++){x.fillStyle=i%2?'#151515':'#f0c419';x.fillRect(0,i*8,8,8);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
 const bPost=new THREE.Mesh(new THREE.CylinderGeometry(.18,.2,1.1,16),new THREE.MeshStandardMaterial({map:stripeTex,roughness:.5}));bPost.position.y=.55;bollard.add(bPost);
 const lamp=new THREE.MeshStandardMaterial({color:'#1a1d1e',emissive:'#32ff6a',emissiveIntensity:2.2,roughness:.3}),lampRed=new THREE.MeshStandardMaterial({color:'#1a1d1e',emissive:'#ff2a1a',emissiveIntensity:0,roughness:.3}),dark=new THREE.MeshStandardMaterial({color:'#202426',roughness:.6});
 const exit=pit.point(uE+2,-hw(uE)-.5),exitLight=new THREE.Group();exitLight.name='Pit exit light';exitLight.position.set(exit.x,0,exit.z);root.add(exitLight);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,3.2,10),steel);pole.position.y=H+1.6;exitLight.add(pole);const head=new THREE.Mesh(new THREE.BoxGeometry(.32,.8,.22),dark);head.position.set(0,H+3.0,.08);exitLight.add(head);
 for(const [y,m] of [[H+3.2,lampRed],[H+2.84,lamp]]){const l=new THREE.Mesh(new THREE.CircleGeometry(.11,20),m);l.position.set(0,y,-.04);l.rotation.y=Math.PI;exitLight.add(l);}
 for(const u of [14,60]){const p=pit.point(u,hw(u)+1.6),panel=new THREE.Group();panel.position.set(p.x,0,p.z);panel.rotation.y=pit.sample(u).yaw+Math.PI;panel.name='Pit entry status panel';root.add(panel);const pp=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.4,8),steel);pp.position.y=1.2;panel.add(pp);const b=new THREE.Mesh(new THREE.BoxGeometry(1.2,.8,.14),dark);b.position.y=2.6;panel.add(b);}
 // Readable entry guidance, placed beyond the shared collision boundary (no poles in the driving corridor).
 {const c=document.createElement('canvas');c.width=512;c.height=640;const x=c.getContext('2d');x.fillStyle='#f4f3e9';x.fillRect(0,0,512,640);x.strokeStyle='#c92026';x.lineWidth=35;x.beginPath();x.arc(256,255,195,0,Math.PI*2);x.stroke();x.fillStyle='#20282b';x.textAlign='center';x.textBaseline='middle';x.font='900 240px Arial';x.fillText('80',256,270);x.font='700 54px Arial';x.fillText('PIT LANE',256,540);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;
  const u=uS-2,p=pit.point(u,hw(u)+.7),sign=new THREE.Group();sign.name='Pit speed limit board / 80';sign.position.set(p.x,0,p.z);sign.rotation.y=pit.sample(u).yaw+Math.PI;
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,2.2,8),steel);pole.position.y=1.1;sign.add(pole);const panel=new THREE.Mesh(new THREE.BoxGeometry(.75,.94,.04),dark);panel.position.y=2;sign.add(panel);const ink=new THREE.Mesh(new THREE.PlaneGeometry(.73,.92),new THREE.MeshStandardMaterial({map:tx,roughness:.76}));ink.position.set(0,2,.025);sign.add(ink);root.add(sign);}
 root.userData={surveyed:false,source:'FIA 2024 Chinese GP pit lane drawing (doc 4), FIA 2019 event notes (doc 2)',lengths:{road:Math.round(len),wall:Math.round(w1-w0)}};
 return {root,setNight(v){lamp.emissiveIntensity=1.4+v*1.4;},exitLight:{green:lamp,red:lampRed}};
}
// Trackside furniture placed by track offset (drain covers, posts, tyre stacks) can land on the new pit road. Remove what
// stands on the lane surface below 2.4 m, before static batching; returns counts by name for the release notes.
export function clearPitLaneClutter(scene,pit,keep){const removed={},m=new THREE.Matrix4(),p=new THREE.Vector3(),zero=new THREE.Matrix4().makeScale(0,0,0),kill=[];
 const kept=o=>{for(let q=o;q;q=q.parent)if(q===keep)return true;return false;};
 scene.traverse(o=>{if(!o.isMesh||kept(o)||o.userData.dynamic)return;let n=o.name;for(let q=o.parent;!n&&q;q=q.parent)n=q.name;if(/ground|apron|bridge|lamp|asphalt|kerb|ribbon/i.test(n))return;
  if(o.isInstancedMesh){let c=0;for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);p.setFromMatrixPosition(m.premultiply(o.matrixWorld));if(p.y<2.4&&pit.onLane(p.x,p.z)){o.setMatrixAt(i,zero);c++;}}if(c){o.instanceMatrix.needsUpdate=true;removed[n||'instanced']=(removed[n||'instanced']||0)+c;}return;}
  o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),c=b.getCenter(p),sz=b.getSize(new THREE.Vector3());if(sz.x<12&&sz.z<12&&b.min.y<2.4&&b.max.y<6&&pit.onLane(c.x,c.z)){kill.push(o);removed[n||'mesh']=(removed[n||'mesh']||0)+1;(removed.at=removed.at||[]).push([n.slice(0,24),+c.x.toFixed(1),+c.z.toFixed(1),+sz.x.toFixed(1),+sz.y.toFixed(1),+sz.z.toFixed(1)]);}});
 for(const o of kill)o.parent?.remove(o);return removed;}

// Extend the existing wet-road reflector into the working lane/apron. This is geometry in the SAME reflector,
// not a second scene capture. Shared world position keeps rain ripples and bridge shelter coherent.
export function createPitWetPatch(track){const pit=track.pitLane,verts=[],uv=[],idx=[],u0=pit.U.limitStart,u1=pit.U.limitEnd,n=Math.ceil((u1-u0)/4);
 for(let i=0;i<=n;i++){const u=u0+(u1-u0)*i/n,q=pit.sample(u);for(const v of [-q.hw,q.hw]){const p=pit.point(u,v),t=track.nearest(p.x,p.z);verts.push(p.x,.0145,p.z);uv.push(t.offset*.15,t.s*.15);}if(i<n){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();if(g.attributes.normal.getY(0)<0){for(let i=0;i<g.index.count;i+=3){const a=g.index.getX(i+1);g.index.setX(i+1,g.index.getX(i+2));g.index.setX(i+2,a);}g.computeVertexNormals();}return g;
}
