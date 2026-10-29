import {planCrewRoute} from './pit-crew-route.js?v=p34-20261029-r3';
import {makeCrewPath} from './pit-path.js?v=232';
import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createSpareWheel} from './car.js?v=229release';
import {createWetTreadGeometry,compoundColours} from './tyre-compounds.js?v=229release';
import {CORNERS,STEP} from './pit-stop.js?v=p34-20261029-r3';
import {FRONT_ARM,REAR_ARM} from './physics.js?v=229release';
// preview.30: Aston Martin pit box, equipment and crew choreography.
//
// Equipment, after user videos 2 and 3 (Aston Martin box, 2024 Chinese GP): two boom towers stand at the garage front,
// one beside each axle; each carries an angled boom over the car with a lime tip, and the wheel-gun hoses hang from the
// booms (yellow/black wrap). The release light hangs from the front boom ahead of the driver. Front and rear jacks are
// lever jacks: two wheels on the floor at the pivot, a cradle ahead of it and a long handle with a T-bar behind it.
// Every part has a parent and a support: towers on base plates on the floor, booms on the tower pivot, hoses from a
// boom clamp to the gun fitting, jack wheels on the sampled floor height, wheels resting on their tread.
//
// Choreography (per role, from the event state in pit-stop.js and the car's real pose, no free timers): the crew wait
// pre-positioned beside the box (gunners and tyre men already low, as in video 2), adapt to where the car actually
// stopped, then: gun on -> undo -> tyre-off man pulls the old wheel out and back -> tyre-on man brings the new wheel in
// from ahead and seats it -> tighten -> gunner signals, withdraws the gun, stands and steps back; jacks drop and pull
// clear (front jack out of the exit lane to the garage side). The release check (clearance) tests the real positions
// of crew bodies, guns, jacks and wheels against the car's exit channel.
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
const UP=V(0,1,0);
// car geometry in the centre-of-gravity frame (x = car's left / pit-wall side, z = forward), from the AMR23 model
export const CAR={axle:{F:FRONT_ARM,R:-REAR_ARM},track:{F:.8325,R:.7855},hubY:.36,tyreR:.36,modelZ:FRONT_ARM-1.67,nut:{F:.205,R:.25},
 noseJack:{z:2.62+FRONT_ARM-1.67,y:.105},rearJack:{z:-2.78+FRONT_ARM-1.67,y:.235},halfWidth:1.0,rearZ:-2.75,noseZ:3.05};
// exit channel used by the release check: the car's own footprint plus the path it takes out toward the fast lane
// exit channel in the stop frame: the area the car's outline (±1.0 m, tail -2.75 to nose 3.05) sweeps while leaving the
// box, measured in the game (dev-tools/exit-envelope.js, preview.31, box 3.25 m from the lane centre) over the assisted
// exit and guided manual exits (pit-stop.js EXIT_GUIDE / EXIT_BAND: full left, straight, full right at full and part
// throttle), plus 0.12 m; per metre of z from -3 to 10: garage side (x min) and fast-lane side (x max)
const CHANNEL={rear:-2.8,ahead:10,z0:-3,lo:[-1.13,-1.14,-1.14,-1.15,-1.15,-1.13,-1.13,-1.13,-1.07,-0.92,-0.68,-0.39,0,0.45],hi:[1.12,1.12,1.14,1.19,1.27,1.39,1.58,1.81,2.12,2.48,2.9,3.36,3.92,4.64]};
// where each gunner stands once clear (z from his hub): off the route his tyre-off man carries the old tyre along
const GUN_CLEAR_Z={FL:.15,FR:.7,RL:.7,RR:.55};
const channelAt=z=>{const f=clamp(z-CHANNEL.z0,0,CHANNEL.lo.length-1),i=Math.min(CHANNEL.lo.length-2,Math.floor(f)),u=f-i;return [lerp(CHANNEL.lo[i],CHANNEL.lo[i+1],u),lerp(CHANNEL.hi[i],CHANNEL.hi[i+1],u)];};
function batchParts(group){const bins=new Map();for(const m of [...group.children])if(m.isMesh){m.updateMatrix();const list=bins.get(m.material)||[];list.push(m);bins.set(m.material,list);}
 for(const [mat,list]of bins){if(list.length<2)continue;const clones=list.map(m=>m.geometry.clone().applyMatrix4(m.matrix)),g=mergeGeometries(clones,false);if(!g)continue;const merged=new THREE.Mesh(g,mat);merged.castShadow=merged.receiveShadow=true;for(const m of list){group.remove(m);m.geometry.dispose();}clones.forEach(g=>g.dispose());group.add(merged);}}
// boom sidewall lettering (V2/V3: white ASTON MARTIN / aramco / cognizant on the dark green beam; spacing estimated)
function boomTextTexture(){const c=document.createElement('canvas');c.width=2048;c.height=96;const g=c.getContext('2d');g.fillStyle='#f2f4f3';g.textBaseline='middle';
 g.font='600 58px Helvetica, Arial, sans-serif';g.fillText('ASTON MARTIN',40,50);g.font='500 62px Helvetica, Arial, sans-serif';g.fillText('aramco',820,48);g.fillText('cognizant',1420,48);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function stripeTexture(){const c=document.createElement('canvas');c.width=64;c.height=8;const g=c.getContext('2d');g.fillStyle='#121314';g.fillRect(0,0,64,8);g.fillStyle='#e3c51b';for(let x=-8;x<72;x+=16){g.beginPath();g.moveTo(x,0);g.lineTo(x+6,0);g.lineTo(x+14,8);g.lineTo(x+8,8);g.fill();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(14,1);return t;}

export function createPitBox(scene,{box,garageAt=null,garageX=garageAt?garageAt(box.z).x:-35.2,laneYaw=0}){
 const root=new THREE.Group();root.name='Aston Martin pit box equipment (preview.30)';root.visible=false;scene.add(root);
 const M={gun:new THREE.MeshStandardMaterial({color:'#2b2f31',metalness:.55,roughness:.38}),gunAccent:new THREE.MeshStandardMaterial({color:'#bfe33a',roughness:.45}),socket:new THREE.MeshStandardMaterial({color:'#b9bec0',metalness:.9,roughness:.25}),
  hose:new THREE.MeshStandardMaterial({map:stripeTexture(),roughness:.62}),jack:new THREE.MeshStandardMaterial({color:'#0e5c4f',metalness:.35,roughness:.42}),jackFront:new THREE.MeshStandardMaterial({color:'#e7c21c',metalness:.25,roughness:.45}),/* front jack yellow: V1 onboard */
  boomText:new THREE.MeshStandardMaterial({map:boomTextTexture(),transparent:true,roughness:.6,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),jackSteel:new THREE.MeshStandardMaterial({color:'#9aa1a4',metalness:.85,roughness:.3}),
  rubber:new THREE.MeshStandardMaterial({color:'#151719',roughness:.85}),tower:new THREE.MeshStandardMaterial({color:'#0d3d36',metalness:.3,roughness:.5}),boom:new THREE.MeshStandardMaterial({color:'#0f5a4e',metalness:.35,roughness:.42}),
  lime:new THREE.MeshStandardMaterial({color:'#c6e83a',roughness:.5}),dark:new THREE.MeshStandardMaterial({color:'#15191b',metalness:.4,roughness:.5}),
  red:new THREE.MeshStandardMaterial({color:'#2a0606',emissive:'#ff2010',emissiveIntensity:2.4}),green:new THREE.MeshStandardMaterial({color:'#062a10',emissive:'#20ff5a',emissiveIntensity:0})};
 // ---- mark frame (car CG at the box mark) and ground sampling
 const markYaw=box.yaw||laneYaw,mark={o:V(box.x,0,box.z),f:V(Math.sin(markYaw),0,Math.cos(markYaw)),l:V(Math.cos(markYaw),0,-Math.sin(markYaw))};
 let groundGrid=null;const G0={x:box.x-9,z:box.z-9},GS=.75,GN=25;
 const groundAt=(x,z)=>{if(!groundGrid)return 0;const fx=clamp((x-G0.x)/GS,0,GN-1.001),fz=clamp((z-G0.z)/GS,0,GN-1.001),i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j,g=(a,b)=>groundGrid[b*GN+a];return lerp(lerp(g(i,j),g(i+1,j),u),lerp(g(i,j+1),g(i+1,j+1),u),v);};
 function sampleGround(){const rc=new THREE.Raycaster(),hits=[];groundGrid=new Float32Array(GN*GN);const skip=o=>{for(let p=o;p;p=p.parent)if(p===root||/pit crew/i.test(p.name||''))return true;return false;};
  const targets=[];scene.traverse(o=>{if(o.isMesh&&o.visible&&!skip(o)&&!o.isSkinnedMesh&&!o.isInstancedMesh)targets.push(o);});
  for(let j=0;j<GN;j++)for(let i=0;i<GN;i++){rc.set(V(G0.x+i*GS,4,G0.z+j*GS),V(0,-1,0));rc.far=6;hits.length=0;rc.intersectObjects(targets,false,hits);const h=hits.find(x=>x.face&&x.face.normal&&Math.abs(x.point.y)<.5);groundGrid[j*GN+i]=h?h.point.y:0;}
  return groundGrid;}
 const P=(fr,x,y,z)=>fr.o.clone().addScaledVector(fr.l,x).addScaledVector(fr.f,z).setY(groundAt(fr.o.x+fr.l.x*x+fr.f.x*z,fr.o.z+fr.l.z*x+fr.f.z*z)+y);
 const DIR=(fr,x,y,z)=>V().addScaledVector(fr.l,x).addScaledVector(fr.f,z).add(V(0,y,0)).normalize();
 // ---- wheel gun: socket at the local origin pointing along -X (toward the hub), pistol grip behind, top handle in front
 function makeGun(){const g=new THREE.Group();g.name='wheel gun';const socket=new THREE.Mesh(new THREE.CylinderGeometry(.043,.047,.085,24),M.socket);socket.rotation.z=Math.PI/2;socket.position.x=.04;g.add(socket);
  const spinner=new THREE.Group();g.add(spinner);for(let k=0;k<6;k++){const lug=new THREE.Mesh(new THREE.BoxGeometry(.03,.012,.016),M.socket);const a=k*Math.PI/3;lug.position.set(-.004,Math.cos(a)*.036,Math.sin(a)*.036);lug.rotation.x=a;spinner.add(lug);}
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.055,.06,.27,24),M.gun);body.rotation.z=Math.PI/2;body.position.x=.215;g.add(body);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(.061,.061,.035,24),M.gunAccent);band.rotation.z=Math.PI/2;band.position.x=.16;g.add(band);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.045,.15,.04),M.gun);grip.position.set(.30,-.09,0);grip.rotation.z=-.25;g.add(grip);
  const guard=new THREE.Mesh(new THREE.TorusGeometry(.035,.007,6,12,Math.PI),M.gun);guard.position.set(.27,-.08,0);guard.rotation.z=Math.PI*.55;g.add(guard);
  const front=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.11,12),M.gun);front.position.set(.13,.11,0);g.add(front);
  const fit=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,.05,12),M.socket);fit.rotation.z=Math.PI/2;fit.position.x=.37;g.add(fit);
  batchParts(spinner);batchParts(g);
  // grips: point, grip axis (thumb side) and finger direction, all gun-local
  g.userData={spinner,grips:{rear:{p:V(.305,-.085,0),axis:V(.25,1,0).normalize(),fwd:V(-1,0,0)},front:{p:V(.13,.12,0),axis:V(0,1,0),fwd:V(-1,-.2,0).normalize()}},hoseTail:V(.40,0,0)};return g;}
 // ---- lever jack: root at the wheel axle on the floor, local +Z toward the car (cradle), handle and T-bar along -Z
 function makeJack(rear){const g=new THREE.Group();g.name=rear?'rear jack':'front jack';const ahead=rear?.26:.31,handle=rear?1.30:1.72,wr=.075,padTop=rear?.34:.17,postH=padTop-.06;
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.40,12),M.jackSteel);axle.rotation.z=Math.PI/2;axle.position.y=wr;g.add(axle);
  const wheels=new THREE.Group();wheels.position.y=wr;g.add(wheels);for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.CylinderGeometry(wr,wr,.045,18),M.rubber);w.rotation.z=Math.PI/2;w.position.x=s*.19;wheels.add(w);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.05,10),M.jackSteel);hub.rotation.z=Math.PI/2;hub.position.x=s*.19;wheels.add(hub);}
  // side frames from the axle up to the lever pivot (pivot = axle, so the lever turns about the wheel axle)
  const lever=new THREE.Group();lever.position.y=wr;g.add(lever);
  for(const s of [-1,1]){const side=new THREE.Mesh(new THREE.BoxGeometry(.03,.05,ahead+.12),rear?M.jack:M.jackFront);side.position.set(s*.13,0,ahead/2-.02);lever.add(side);}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.065,.06,handle),rear?M.jack:M.jackFront);beam.position.z=-handle/2;lever.add(beam);
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.56,12),M.jackSteel);bar.rotation.z=Math.PI/2;bar.position.z=-handle;lever.add(bar);
  for(const s of [-1,1]){const grip=new THREE.Mesh(new THREE.CylinderGeometry(.021,.021,.12,12),M.rubber);grip.rotation.z=Math.PI/2;grip.position.set(s*.21,0,-handle);lever.add(grip);}
  // cradle on a pin at the front of the lever; it stays level while the lever turns
  const cradle=new THREE.Group();cradle.position.z=ahead;lever.add(cradle);
  const pin=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.30,10),M.jackSteel);pin.rotation.z=Math.PI/2;cradle.add(pin);
  const post=new THREE.Mesh(new THREE.BoxGeometry(.055,postH,.055),M.jackSteel);post.position.y=postH/2;cradle.add(post);
  const head=new THREE.Mesh(new THREE.BoxGeometry(rear?.42:.34,.035,.13),M.jackSteel);head.position.y=padTop-.03;cradle.add(head);for(const s of [-1,1]){const lip=new THREE.Mesh(new THREE.BoxGeometry(.03,.06,.13),M.jackSteel);lip.position.set(s*(rear?.2:.16),padTop-.005,0);cradle.add(lip);}
  const pad=new THREE.Mesh(new THREE.BoxGeometry(rear?.36:.28,.012,.11),M.rubber);pad.position.y=padTop-.006;cradle.add(pad);
  batchParts(lever);batchParts(cradle);batchParts(wheels);
  g.userData={lever,cradle,wheels,ahead,handle,wr,padTop,bar:V(0,0,-handle)};return g;}
 // lever angle that puts the cradle pad top at height h (relative to the floor)
 function jackAngle(J,h){const u=J.userData;return Math.asin(clamp((h-u.wr-u.padTop)/u.ahead,-.9,.9));}
 function placeJack(J,pos,dir,padTop){// pos: axle point on the floor, dir: unit toward the car, padTop: pad height above floor
  J.position.copy(pos);J.rotation.set(0,Math.atan2(dir.x,dir.z),0);const a=jackAngle(J,padTop);J.userData.lever.rotation.x=-a;J.userData.cradle.rotation.x=a;
  const roll=J.userData.last?dir.dot(pos.clone().sub(J.userData.last)):0;J.userData.wheels.children.forEach(w=>w.rotation.x+=roll/J.userData.wr);J.userData.last=(J.userData.last||V()).copy(pos);J.updateMatrixWorld(true);}
 const jackPoint=(J,local)=>J.userData.lever.localToWorld(local.clone());
 // ---- boom towers and booms
 const GARAGE_GAP=.75;// tower centre in front of the garage door line
 function makeBoom(axleZ,front){const g=new THREE.Group();g.name=(front?'front':'rear')+' boom';root.add(g);
  const towerZ=axleZ+(front?1.05:-1.05),tower=V(garageX+GARAGE_GAP,0,mark.o.z+towerZ*mark.f.z);// on the garage side, beside the axle
  g.position.copy(tower);const plate=new THREE.Mesh(new THREE.BoxGeometry(.75,.04,.75),M.dark);plate.position.y=.02;g.add(plate);
  const col=new THREE.Mesh(new THREE.BoxGeometry(.34,2.36,.34),M.tower);col.position.y=.04+1.18;g.add(col);
  const head=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.22,16),M.dark);head.position.y=2.47;g.add(head);
  // boom: from the pivot over the axle to beyond the pit-wall-side wheel, rising 9 degrees
  const pivot=V(0,2.5,0),farX=mark.o.x+CAR.track[front?'F':'R']+1.05,target=V(farX-tower.x,0,mark.o.z+axleZ-tower.z),flat=Math.hypot(target.x,target.z),len=flat/Math.cos(.157),yaw=Math.atan2(target.x,target.z);
  const arm=new THREE.Group();arm.position.copy(pivot);arm.rotation.set(0,yaw,0);g.add(arm);const tilt=new THREE.Group();tilt.rotation.x=-.157;arm.add(tilt);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.16,.22,len),M.boom);beam.position.z=len/2;tilt.add(beam);
  const tip=new THREE.Mesh(new THREE.BoxGeometry(.18,.24,.34),M.lime);tip.position.z=len+.12;tilt.add(tip);
  const brace=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,1.25),M.dark);brace.position.set(0,-.36,.52);brace.rotation.x=.55;tilt.add(brace);
  for(const sx of [1,-1]){const tl=Math.min(len*.82,4.6),txt=new THREE.Mesh(new THREE.PlaneGeometry(tl,tl*96/2048),M.boomText);txt.position.set(sx*.0815,0,len*.52);txt.rotation.y=sx*Math.PI/2;tilt.add(txt);}
  g.updateMatrixWorld(true);batchParts(g);
  const along=t=>tilt.localToWorld(V(0,-.12,t*len));// clamp points on the underside of the boom
  return {g,tilt,len,along,tower};}
 const booms={F:makeBoom(CAR.axle.F,true),R:makeBoom(CAR.axle.R,false)};
 // ---- garage front over the box (V3, Shanghai 2024: a continuous yellow DHL band over the garage openings, driver name boards
 // under it with the car numbers). Band height, lengths and which driver's board is nearer the pit exit are estimates.
 {const face=garageX+.06,y0=4.32,along=mark.f.clone(),out=V(1,0,0),yaw=Math.atan2(out.x,out.z);
  const label=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w>10?4096:1024;c.height=Math.max(64,Math.round(c.width*h/w));const g=c.getContext('2d');draw(g,c.width,c.height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
   const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.7}));m.rotation.y=yaw;return m;};
  const band=label(28.2,.62,(g,W,H)=>{g.fillStyle='#ffcc00';g.fillRect(0,0,W,H);g.fillStyle='#d40511';g.font=`italic 900 ${H*.62}px Helvetica, Arial, sans-serif`;g.textBaseline='middle';for(let x=W*.06;x<W;x+=W/6)g.fillText('DHL',x,H*.54);});
  band.position.set(face,y0+.62/2,mark.o.z);band.name='Garage front DHL band (estimated size)';root.add(band);
  for(const [dz,text] of [[3.4,'14  FERNANDO ALONSO'],[-3.4,'18  LANCE STROLL']]){const b=label(4.6,.42,(g,W,H)=>{g.fillStyle='#0b3b33';g.fillRect(0,0,W,H);g.fillStyle='#f4f6f5';g.font=`700 ${H*.56}px Helvetica, Arial, sans-serif`;g.textBaseline='middle';g.textAlign='center';g.fillText(text,W/2,H*.54);});
   b.position.set(face+.01,y0-.30,mark.o.z+along.z*dz);b.name='Driver name board: '+text;root.add(b);}}
 // hose clamp for each corner: the point on its axle's boom nearest above that wheel's gun position
 const hoseAnchor={};for(const k of CORNERS){const b=booms[k[0]],sgn=k[1]==='L'?1:-1,want=P(mark,sgn*(CAR.track[k[0]==='F'?'F':'R']+.22),0,CAR.axle[k[0]]);let best=0,bd=1e9;for(let t=0;t<=1;t+=.02){const p=b.along(t),d=Math.hypot(p.x-want.x,p.z-want.z);if(d<bd){bd=d;best=t;}}hoseAnchor[k]=b.along(best);
  const clamp_=new THREE.Mesh(new THREE.BoxGeometry(.2,.06,.12),M.dark);clamp_.position.copy(hoseAnchor[k]).add(V(0,.02,0));root.add(clamp_);}
 // release light hangs from the front boom where it crosses the car centre line, facing the driver
 const lightRig=new THREE.Group();lightRig.name='release light';root.add(lightRig);
 {let best=0,bd=1e9;for(let t=0;t<=1;t+=.01){const p=booms.F.along(t),d=Math.abs((p.x-mark.o.x)*mark.l.x+(p.z-mark.o.z)*mark.l.z);if(d<bd){bd=d;best=t;}}const top=booms.F.along(best);
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.55,8),M.dark);rod.position.copy(top).add(V(0,-.275,0));lightRig.add(rod);
  const housing=new THREE.Mesh(new THREE.BoxGeometry(.62,.24,.16),M.dark);housing.position.copy(top).add(V(0,-.67,0));lightRig.add(housing);lightRig.userData.y=top.y-.67;}
 const lights=[];for(let i=0;i<4;i++){const m=i<2?M.red:M.green;const l=new THREE.Mesh(new THREE.CircleGeometry(.055,20),m);const h=lightRig.children[1].position;l.position.set(h.x-.21+i*.14,h.y,h.z).addScaledVector(mark.f,-.081);l.rotation.y=Math.atan2(-mark.f.x,-mark.f.z);lightRig.add(l);lights.push(l);}
 // ---- tools and hoses
 const guns={},hoses={},hoseGeo={};for(const k of CORNERS){const g=makeGun();root.add(g);guns[k]=g;const hose=new THREE.Mesh(new THREE.BufferGeometry(),M.hose);hose.name='wheel gun hose';hose.castShadow=true;root.add(hose);hoses[k]=hose;}
 const jacks={front:makeJack(false),rear:makeJack(true)};root.add(jacks.front,jacks.rear);
 const hoseLast={};const tmpC=new THREE.CatmullRomCurve3([V(),V(),V(),V(),V()]);
 function setHose(k,tail,back){const a=hoseAnchor[k];if(hoseLast[k]&&hoseLast[k].distanceToSquared(tail)<1e-7)return;hoseLast[k]=(hoseLast[k]||V()).copy(tail);
  // hangs from the clamp, sags under its weight and enters the gun fitting from behind with a gentle bend
  const span=a.distanceTo(tail),sag=Math.min(.55,.18+span*.18),mid=a.clone().lerp(tail,.55);mid.y=Math.min(a.y,tail.y)+Math.max(.1,(a.y-tail.y)*.25)-sag*.5;
  const pts=tmpC.points;pts[0].copy(a);pts[1].copy(a).add(V(0,-.35,0)).lerp(mid,.15);pts[2].copy(mid);pts[3].copy(tail).addScaledVector(back,.06).add(V(0,.26,0));pts[4].copy(tail);
  const segments=28,radial=7,mesh=hoses[k];let g=mesh.geometry;if(!g.attributes.position){const initial=new THREE.TubeGeometry(tmpC,segments,.017,radial,false);mesh.geometry=initial;g.dispose();g=initial;g.attributes.position.setUsage(THREE.DynamicDrawUsage);g.attributes.normal.setUsage(THREE.DynamicDrawUsage);}
  const frames=tmpC.computeFrenetFrames(segments,false),pos=g.attributes.position,norm=g.attributes.normal,pt=V(),n=V();for(let i=0;i<=segments;i++){tmpC.getPointAt(i/segments,pt);for(let j=0;j<=radial;j++){const ang=j/radial*Math.PI*2;n.copy(frames.normals[i]).multiplyScalar(-Math.cos(ang)).addScaledVector(frames.binormals[i],Math.sin(ang));const v=i*(radial+1)+j;pos.setXYZ(v,pt.x+.017*n.x,pt.y+.017*n.y,pt.z+.017*n.z);norm.setXYZ(v,n.x,n.y,n.z);}}
  pos.needsUpdate=norm.needsUpdate=true;g.computeBoundingSphere();}
 // ---- wheels (old ones come off the car, new ones are carried in), built once per role/corner/compound and reused
 const spares=new Map(),oldW={},newW={};
 // one wheel geometry set per corner shape, shared by every spare (each spare only owns its materials: compound colour)
 const wheelTemplates={},treadGeo={},wheelTemplate=(axle,side)=>wheelTemplates[axle+side]||(wheelTemplates[axle+side]=createSpareWheel(axle,side));
 function spare(k,compound,role){const key=role+':'+k+':'+compound;if(spares.has(key))return spares.get(key);const front=k[0]==='F',w=wheelTemplate(front?'front':'rear',k[1]==='L'?'left':'right').clone();w.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});w.name=`${role} ${compound} ${k} wheel`;
  w.traverse(o=>{if(o.isMesh&&/flat yellow sidewall ink/.test(o.material.name))o.material.color.set(compoundColours[compound]||compoundColours.medium);});
  if(compound==='wet'||compound==='intermediate'){const slick=w.children.find(o=>/rounded slick shoulder|textured slick rubber/.test(o.material?.name||''));if(slick){const tread=new THREE.Mesh(treadGeo[front+compound]||(treadGeo[front+compound]=createWetTreadGeometry(front?.335:.429,compound==='wet')),slick.material.clone());tread.castShadow=tread.receiveShadow=true;w.add(tread);slick.visible=false;}}
  w.visible=false;root.add(w);spares.set(key,w);return w;}
 const pose={hub:V(),out:V(),q:new THREE.Quaternion()};
 function hubFrame(car,k){const pivot=car.children.find(o=>o.name===({FL:'front-left',FR:'front-right',RL:'rear-left',RR:'rear-right'})[k]);pivot.updateMatrixWorld(true);pivot.getWorldPosition(pose.hub);pivot.getWorldQuaternion(pose.q);
  const sign=pivot.position.x>0?1:-1;pose.out.set(sign,0,0).applyQuaternion(pose.q);return {pivot,sign,spin:pivot.children[0]};}
 // wheel orientation: upright, axle along the car's lateral axis, plus a yaw (radians) and the rolled angle
 const wheelQ=(fr,yaw,roll)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fr.l.clone().applyAxisAngle(UP,yaw),UP,fr.f.clone().applyAxisAngle(UP,yaw))).multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),roll));

 const intents={};const I=role=>intents[role]??(intents[role]={anchor:{o:V(),f:V(0,0,1),l:V(1,0,0)},offset:null,clips:[],hands:{L:null,R:null}});
 // ---- clip timelines: segments start at real event times; a segment with a span is warped to fill it; 0.1 s crossfade
 const XF=.14,D=name=>api.crew?.meta?.[name]?.duration??1;
 const seg=(name,at,span=null,loop=false)=>({name,at,span,loop,dur:D(name)});
 // preview.33 performances: one clip per role, its marked phases (pit-crew-v33-clips.json markers) mapped onto the stop's
 // event times. plan = [{m, a, b, loop}] in time order: a phase plays linearly from a to b; a loop phase ping-pongs inside its
 // marked range from a until the next phase starts; a finished phase holds its last pose. Before the first phase: 'ready'.
 const v33=role=>!!api.crew?.byRole?.[role]?.v33;
 function perfPlay(T,name,plan,t){const M=api.crew?.meta33?.[name]?.markers;if(!M)return null;let cur={m:'ready',a:-1e9,b:null,loop:true};
  // phases start in order (each no earlier than the one before it); one the stop's events cut short is left there and the
  // jump into the next is blended below, since squeezing it into the time left moved the body faster than a person can
  let prevA=-1e9;const Q=plan.map(p=>({...p}));for(const p of Q)if(p.a!=null){p.a=Math.max(p.a,prevA);prevA=p.a;}
  for(const p of Q){if(p.a==null||!(t>=p.a))break;cur=p;}
  const [m0,m1]=M[cur.m]||M.ready;let ct;
  if(cur.loop){const u=(t-cur.a)/Math.max(1e-3,m1-m0),q=((u%2)+2)%2;ct=m0+(q<1?q:2-q)*(m1-m0);}
  else{const span=cur.b!=null?Math.max(1e-3,cur.b-cur.a):m1-m0;ct=m0+clamp((t-cur.a)/span,0,1)*(m1-m0);}
  // the stop's timing can cut a phase short or leave a loop mid-way: a jump in clip time blends over 0.12 s (world space,
  // pit-crew.js) instead of popping
  const pp=T._pp||(T._pp={ct,m:cur.m,key:0,t});if(pp.m!==cur.m&&Math.abs(ct-pp.ct)>.03+3*Math.abs(t-pp.t))pp.key++;pp.ct=ct;pp.m=cur.m;pp.t=t;   /* a long frame is not a jump: up to 3 clip-seconds per second of advance */T.perfKey=pp.key;T.blendTime=.12;
  T.clips.length=0;T.clips.push({name,t:ct,w:1,loop:false});T.regime='perf';return cur.m;}
 function play(T,segs,t){let i=0;for(let j=0;j<segs.length;j++){if(segs[j].at==null)break;if(t>=segs[j].at)i=j;}
  const ct=s=>{let x=t-(s.at??t);if(s.span)x=x/s.span*s.dur;return s.loop?x:Math.min(x,s.dur);};const cur=segs[i],age=t-(cur.at??-1e9);T.clips.length=0;
  if(i>0&&age<XF){const pv=segs[i-1],w=smooth(age/XF);T.clips.push({name:pv.name,t:ct(pv),w:1-w,loop:pv.loop},{name:cur.name,t:ct(cur),w,loop:cur.loop});}
  else T.clips.push({name:cur.name,t:ct(cur),w:1,loop:cur.loop});return cur;}
 const deg=Math.PI/180;
 let compoundShown=null,lastTime=null,cleanup={};
 const api={buildId:"p34-20261029-r3",root,jacks,guns,lights,booms,wheels:{old:oldW,new:newW},intents,groundAt,
  sampleGround,
  setCrew(c){api.crew=c;},
  hold:{},// negative tests only: {rearJack:true} keeps the rear jack under the car, {crew:role}, {tyre:corner}
  // (the last stop's old tyres stay stacked by the garage as stand-ins sharing the wheels' geometry and materials; the
  // wheels themselves are reused for this stop)
  prepare(compound,current){root.visible=true;for(const m of stacked)m.removeFromParent();stacked.length=0;
   for(const k of CORNERS){const ow=oldW[k];if(ow?.visible&&restPose[k]&&ow.parent){const m=ow.clone();m.userData={};ow.parent.add(m);stacked.push(m);}}
   for(const k in restPose)delete restPose[k];if(!groundGrid)sampleGround();for(const k of CORNERS){if(oldW[k])oldW[k].visible=false;if(newW[k])newW[k].visible=false;newW[k]=spare(k,compound,'new');oldW[k]=null;if(current)spare(k,current,'old');}compoundShown=compound;cleanup={};},
  hide(){root.visible=false;},
  // release check: real positions against the car's exit channel (car frame); returns {clear, blockers}
  // release check against the car's drivable exit area (CHANNEL, car frame, 2-D; parts more than 1.2 m above the floor pass
  // over the car). Crew: limb capsules from pitCrew.limbs() (falls back to body circles); tools: gun capsule nose->hose
  // tail, both jacks as head->handle capsules plus an explicit 'unloaded' test (pad clear of its contact point under the
  // car); loose wheels as discs. Returns {clear, blockers}.
  clearance(parts){const fr=api.frame;if(!fr)return {clear:false,blockers:['no frame']};const blockers=[],seen=new Set(),add=n=>{if(!seen.has(n)){seen.add(n);blockers.push(n);}};
   const inChannel=(p,r=0)=>{const d=p.clone().sub(fr.o),x=d.dot(fr.l),z=d.dot(fr.f);if(z<CHANNEL.rear-r||z>CHANNEL.ahead+r)return false;const [lo,hi]=channelAt(z);return x>lo-r&&x<hi+r;};
   const segIn=(a,b,r)=>{const n=Math.max(1,Math.ceil(a.distanceTo(b)/.1));for(let i=0;i<=n;i++){const p=a.clone().lerp(b,i/n);if(p.y-groundAt(p.x,p.z)>1.2)continue;if(inChannel(p,r))return true;}return false;};
   for(const b of parts||api.targetBodies()){if(seen.has(b.role))continue;if(b.a?segIn(b.a,b.b,b.r):inChannel(V(b.x,0,b.z),b.r))add(b.role);}
   for(const k of CORNERS){const g=guns[k];if(g.visible&&segIn(g.localToWorld(V(-.06,0,0)),g.localToWorld(g.userData.hoseTail.clone()),.05))add(k+' gun');}
   for(const [name,J] of Object.entries(jacks)){const head=jackPoint(J,V(0,0,J.userData.ahead)),bar=jackPoint(J,J.userData.bar),rear=name==='rear',c=CAR[rear?'rearJack':'noseJack'],contact=P(fr,0,c.y,c.z);
    if(Math.hypot(head.x-contact.x,head.z-contact.z)<.25)add(name+' jack loaded');
    if(segIn(head,bar,.1)||inChannel(J.position,.12))add(name+' jack');}
   for(const k of CORNERS)for(const w of [oldW[k],newW[k]])if(w&&w.visible&&w.userData.loose&&inChannel(w.position,CAR.tyreR))add(k+' tyre');
   return {clear:blockers.length===0,blockers};},
  targetBodies(){return Object.entries(intents).filter(([r])=>r!=='__time').map(([role,t])=>({role,x:t.anchor.o.x+(t.offset?.x||0)*t.anchor.l.x+(t.offset?.z||0)*t.anchor.f.x,z:t.anchor.o.z+(t.offset?.x||0)*t.anchor.l.z+(t.offset?.z||0)*t.anchor.f.z,r:.32}));},
  // after the crew update (same frame): carried tools and wheels follow the hands, the jacks follow their men
  afterCrew(S){if(root.visible)afterCrew(S);},
  get _carried(){return carried;},get _plans(){return plans;},get _gunE(){return gunE;},
  update(S,car,{currentCompound='medium'}={}){if(!root.visible)return intents;currentCompound=S.previousCompound||currentCompound;api.car=car;car.updateMatrixWorld(true);
   const inService=['stopped','service','release'].includes(S.phase),stopped=inService||S.phase==='leave'&&S.leaveU!=null&&false;
   const carQ=car.getWorldQuaternion(new THREE.Quaternion()),cf=V(0,0,1).applyQuaternion(carQ).setY(0).normalize(),cl=V(1,0,0).applyQuaternion(carQ).setY(0).normalize();
   const carFr={o:car.position.clone().addScaledVector(cf,-CAR.modelZ).setY(0),f:cf,l:cl};
   // before the stop everything is placed from the box mark; after it from the frozen stop pose (blended in over 0.35 s,
   // so tools and targets adapt to where the car really stopped without jumping); attached contacts use the live car
   // (and it stays there after the car has gone, until the next stop is called); while the car closes on the box the set-out
   // already shifts sideways with it, as a crew does, so an off-line stop does not put anyone inside the car. The frame
   // eases to each new target (0.12 s), so a change of target (stop, push-back, next stop) never jumps anyone
   const PRE0=['booked','pitlane','box','creep','pushback','pitlane-missed','realign','drive-through'],sp=S.stopPose;
   const post=(['release','leave','done'].includes(S.phase)||S.stopAt!=null&&!PRE0.includes(S.phase))&&sp;
   const stopFr=sp?{o:V(sp.x,0,sp.z),f:V(Math.sin(sp.yaw),0,Math.cos(sp.yaw)),l:V(Math.cos(sp.yaw),0,-Math.sin(sp.yaw))}:mark;
   const since=inService&&S.stopAt!=null?S.t-S.stopAt:0,closing=(S.phase==='box'||S.phase==='creep')&&S.align?smooth((S.align.dz+4)/3):0;
   const base=inService&&S.phase!=='pushback'||post?stopFr:{o:mark.o.clone().addScaledVector(mark.l,carFr.o.clone().sub(mark.o).dot(mark.l)*closing),f:mark.f,l:mark.l};
   {const dt=api.dt||0,F=api.frS;if(!F||dt<=0||dt>.2||F.o.distanceTo(base.o)>3)api.frS={o:base.o.clone(),f:base.f.clone(),l:base.l.clone()};
    else{const a=1-Math.exp(-dt/.12);F.o.lerp(base.o,a);F.f.lerp(base.f,a).normalize();F.l.lerp(base.l,a).normalize();}}
   const fr={o:api.frS.o.clone(),f:api.frS.f.clone(),l:api.frS.l.clone()};
   api.frame=inService||S.phase==='leave'||S.phase==='pushback'?carFr:fr;api.mark=mark;api.since=since;api.chassis=car.userData.chassis||car;
   const t=S.t,dropAge=S.dropAtT!=null?t-S.dropAtT:-1,green=S.lightGreen||S.phase==='release'||S.phase==='leave'||S.phase==='done';
   // after the stop (leaving, done, back to idle) the crew stay where the stop left them and finish clearing up, until the
   // next stop is called (pre-stop phases start a fresh set-out)
   const PRE=PRE0;api.after=S.stopAt!=null&&!PRE.includes(S.phase);
   {const dzm=carFr.o.clone().sub(mark.o).dot(mark.f);if((S.phase==='box'||S.phase==='creep')&&dzm>-1.6&&api.closeT==null)api.closeT=S.t;}   // the car is 1.6 m from its mark: crew set
   if(inService&&api.closeT==null)api.closeT=S.stopAt-.4;
   const releaseAge=S.releaseAtT!=null&&api.after&&S.releaseAtT>=S.stopAt?t-S.releaseAtT:-1;
   intents.__time=t;for(const r in intents)if(intents[r]&&typeof intents[r]==='object'){intents[r].epoch=S.bookingId||0;intents[r].regime=null;intents[r].blendTime=null;intents[r].gaze=null;}
   for(const kk of CORNERS)corner(kk,S,car,fr,carFr,inService,green,releaseAge,currentCompound);
   frontJack(S,fr,carFr,inService,dropAge,green);rearJack(S,fr,carFr,inService,dropAge,green);stabilisers(S,fr,carFr,inService,dropAge,green);chief(S,fr,green);for(const role of ['chief','stab-L','stab-R'])I(role).gaze=car.position.clone().add(V(0,.7,0));
   if(S.phase==='pushback'){pushback(S,car,carFr);pushEnd=null;for(const k in retPlan)delete retPlan[k];}else{if(lastPhase==='pushback')pushEnd=t;if(pushEnd!=null&&t-pushEnd<8)afterPush(S,carFr);}
   // a while after the stop everyone goes back to the set-out spot for the next one: a slow blend (by distance) with the
   // feet stepping under it; the tyre-off men walk back themselves once their tyre is stacked (tyreCleanup)
   if(releaseAge>=HOME)for(const [role,name] of Object.entries(HOME_CLIPS)){const T=intents[role];if(!T||role.endsWith('-off')&&plans[role.slice(0,2)]||role.endsWith('jack')&&v33(role))continue;   /* the preview.33 jack men walk back in their own clips (gunners and tyre-on men are not in HOME_CLIPS) */T.clips=[{name,t:t+1e9,w:1,loop:true}];/* same loop phase as play() gives the ready clip, so the next set-out does not hop */T.offset=null;T.regime='home';T.blendTime='auto';T.hands.L=T.hands.R=null;}
   // Wheel crews wait outside the arrival sweep. Close in only after the car has stopped, before the delayed lift.
   const stage=S.stopAt&&inService?1-smooth((t-S.stopAt)/.45):!api.after?1:0;
   for(const k of CORNERS)for(const suffix of ['-gun','-off','-on']){const T=intents[k+suffix];if(T&&stage>0)T.anchor={...T.anchor,o:T.anchor.o.clone().addScaledVector(fr.l,(k[1]==='L'?1:-1)*.50*stage)};}
   // negative tests (dev-tools/release-negative.js): keep a crew member or an old wheel inside the exit area
   if(api.hold.crew&&intents[api.hold.crew]){const T=intents[api.hold.crew];T.anchor={o:fr.o.clone(),f:fr.f.clone(),l:fr.l.clone()};T.offset={x:1.0,z:.9,yaw:-Math.PI/2};T.clips=[{name:'stand',t:S.t,w:1,loop:true}];T.hands.L=T.hands.R=null;}
   if(S.phase==='pitlane'&&lastPhase!=='pitlane'){pushEnd=null;api.closeT=null;for(const r in intents)if(intents[r]&&typeof intents[r]==='object')intents[r].blendTime='auto';/* anyone not yet back walks over rather than snapping */
    for(const k in restPose)delete restPose[k];for(const k in plans)delete plans[k];api.stabT=null;}lastPhase=S.phase;
   M.red.emissiveIntensity=green?0:2.4;M.green.emissiveIntensity=green?2.6:0;
   for(const [role,T] of Object.entries(intents)){if(!T||typeof T!=='object')continue;T.relaxHands=[];const phase=T._pp?.m;
    if(role.endsWith('-off')&&!carried[role]&&(['ready','clear'].includes(phase)||['home','walk1','walkback','stand'].includes(T.regime)))T.relaxHands=['L','R'];
    if(role.endsWith('-gun')&&phase==='clear')T.relaxHands=[role.startsWith('FL')||role.startsWith('RL')?'L':'R'];
    if(role.endsWith('-on')&&(['clear','ret'].includes(phase)||T.regime==='home'))T.relaxHands=['L','R'];
    if(role.startsWith('stab-')&&(api.stabT==null||S.dropAtT!=null&&t-S.dropAtT>.8))T.relaxHands=['L','R'];
    if(role==='chief')T.relaxHands=green?['L']:['L','R'];}
   return intents;}
 };
 // ---------------------------------------------------------------- per-corner: gun, old wheel, new wheel, three crew
 // Clip space for a wheel crew is that corner's hub on the floor in car axes (assets-src/crew/animate_crew_v31.py), so the
 // authored nut, tyre and grip positions land on the real wheel wherever the car stopped. The gun is on the nut (and
 // rises with the car) while engaged, the gunner's hands pulled onto its grips; otherwise it rides the gunner's prop bone.
 // The old wheel rides the tyre-off man's prop while he draws it off, the new wheel the tyre-on man's until it is seated.
 const stacked=[],carried={},settling={},restPose={},gunE={},nutPose={},gunSignal={};
 function corner(k,S,car,fr,carFr,inService,green,releaseAge,compound){const w=S.corners[k],front=k[0]==='F',sgn=k[1]==='L'?1:-1,ax=front?'F':'R',gun=guns[k],sd=sgn>0?'_L':'_R';
  const {spin}=hubFrame(car,k),hubC=pose.hub.clone();const hubX=sgn*CAR.track[ax],hubZ=CAR.axle[ax],t=S.t;
  const hub=inService?hubC:P(fr,hubX,CAR.hubY,hubZ),out=fr.l.clone().multiplyScalar(sgn),inward=out.clone().negate();
  const nut=hub.clone().addScaledVector(out,CAR.nut[ax]),A={o:P(fr,hubX,0,hubZ).setY(0),f:fr.f.clone(),l:fr.l.clone()};
  const svc=inService||api.after;
  // ---- gunner
  {const T=I(k+'-gun');T.anchor={...A,o:A.o.clone().addScaledVector(out,CAR.nut[ax]-.205)};T.offset=null;T.hands.L=T.hands.R=null;
   const segs=[seg('gun_ready'+sd,-1e9,null,true)];
   if(svc&&w.gunOnAtT!=null){segs.push(seg('gun_engage'+sd,w.gunOnAtT,w.undoAtT!=null?Math.max(.30,w.undoAtT-w.gunOnAtT):null),seg('gun_hold'+sd,w.undoAtT,null,true),seg('gun_back'+sd,w.offAtT),seg('gun_reengage'+sd,w.seatAtT,w.tightAtT!=null?Math.max(.06,w.tightAtT-w.seatAtT):null),seg('gun_hold'+sd,w.tightAtT,null,true),seg('gun_signal_rise'+sd,w.doneAtT));
    if(w.doneAtT!=null)segs.push(seg('gun_clear'+sd,w.doneAtT+D('gun_signal_rise'+sd),null,true));}
   var cur=play(T,segs,t),perfM=null;
   if(v33(k+'-gun')){const P=[],cl=api.closeT,st=S.stopAt;
    if(svc&&cl!=null){P.push({m:'set',a:S.stopAt,b:S.stopAt+.45});
     /* engage starts at the stop, known the moment it happens (it was dated back 0.12 s from the gun event, which made it start
        late and jump mid-way into the drop to the knee) */
     if(st!=null){const ea=st+.45;P.push({m:'engage',a:ea,b:Math.max(ea+.3,w.undoAtT??ea+.42)});}
     if(w.undoAtT!=null)P.push({m:'undo',a:w.undoAtT,b:w.offAtT??w.undoAtT+.24});
     if(w.offAtT!=null)P.push({m:'back',a:w.offAtT,b:w.offAtT+.18},{m:'waitseat',a:w.offAtT+.18,loop:true});
     if(w.seatAtT!=null)P.push({m:'reengage',a:w.seatAtT,b:Math.max(w.seatAtT+.08,w.tightAtT??w.seatAtT+.16)});
     if(w.tightAtT!=null)P.push({m:'tighten',a:w.tightAtT,b:Math.max(w.tightAtT+.1,w.doneAtT??w.tightAtT+.24)});
     if(w.doneAtT!=null)P.push({m:'rise',a:w.doneAtT,b:w.doneAtT+.9},{m:'clear',a:w.doneAtT+.9,loop:true});
     if(api.after&&S.releaseAtT!=null){const h=S.releaseAtT+HOME;P.push({m:'ret',a:h,b:h+2.0},{m:'ready',a:h+2.0,loop:true});}}
    perfM=perfPlay(T,'p33_gun_'+k,P,t);}
   // on the nut (it rides up with the car on the jacks) from the end of the engage move until the signal; blended in and
   // out over 0.1 s from where the gunner's hands hold it, so the gun never jumps
   const engaged=inService&&['gunOn','undo','tighten','signal'].includes(w.step)&&w.gunOnAtT!=null&&t-w.gunOnAtT>.8*(w.undoAtT!=null?Math.max(.30,w.undoAtT-w.gunOnAtT):.36);   /* the drop to the knee is never squeezed under 0.3 s */
   const dt=api.dt||0;gunE[k]=dt<=0||dt>=.2?(engaged?1:0):clamp((gunE[k]??0)+(engaged?1:-1)*dt/.1,0,1);   // seeks and big steps: straight to the state
   nutPose[k]={p:nut.clone(),q:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(out,UP,V().crossVectors(out,UP)))};
   gunSignal[k]=perfM?(perfM==='rise'&&t-w.doneAtT>.08||perfM==='clear'||perfM==='ret'):cur.name.startsWith('gun_signal_rise')&&t-w.doneAtT>.08||cur.name.startsWith('gun_clear');   // signal hand up, then carried one-handed
   gun.userData.spinner.rotation.x+=(w.step==='undo'?-1:w.step==='tighten'?1:0)*(api.dt||0)*600;}
  // ---- old wheel: on the car until the nut is off; then in the tyre-off man's hands; then standing where he left it
  const detached=inService&&!['wait','gunOn','undo'].includes(w.step);
  if(detached&&!oldW[k]){oldW[k]=spare(k,compound,'old');}
  const ow=oldW[k];spin.userData.assembly.visible=!(detached&&w.fresh<1);
  if(ow){ow.visible=detached||api.after;ow.userData.loose=w.old>=1;}
  {const T=I(k+'-off');T.anchor=A;T.offset=null;T.hands.L=T.hands.R=null;const segs=[seg('off_ready'+sd,-1e9,null,true)];
   if(svc&&w.undoAtT!=null){segs.push(seg('off_grab'+sd,w.undoAtT,w.offAtT!=null?Math.max(.08,w.offAtT-w.undoAtT):null),seg('off_pull'+sd,w.offAtT,w.oldDoneT!=null?Math.max(.3,w.oldDoneT-w.offAtT):STEP.wheelOff),seg('off_release'+sd,w.oldDoneT));
    if(w.oldDoneT!=null)segs.push(seg('off_clear'+sd,w.oldDoneT+D('off_release'+sd),null,true));}
   play(T,segs,t);T.regime='anchor';
   let pullEnd=null;if(v33(k+'-off')){const P=[],cl=api.closeT;
    if(svc&&cl!=null){P.push({m:'set',a:S.stopAt,b:S.stopAt+.45});
     if(w.undoAtT!=null)P.push({m:'grab',a:w.undoAtT,b:Math.max(w.undoAtT+.1,w.offAtT??w.undoAtT+.2)});
     /* the stop's oldDone is the wheel clearing the hub; he keeps carrying it through the swing back and sets it down
        when his own pull motion ends (never under 0.6 s), so it is never dropped halfway in the car's exit path */
     if(w.offAtT!=null){pullEnd=Math.max(w.offAtT+.6,w.oldDoneT??w.offAtT+.8);P.push({m:'pull',a:w.offAtT,b:pullEnd});}
     if(w.oldDoneT!=null&&pullEnd!=null)P.push({m:'release',a:pullEnd,b:pullEnd+.5},{m:'clear',a:pullEnd+.5,loop:true});}
    perfPlay(T,'p33_off_'+k,P,t);}
   settling[k]=!!ow&&w.oldDoneT!=null&&pullEnd!=null&&t<pullEnd+.20;carried[k+'-off']=!!ow&&w.offAtT!=null&&(w.oldDoneT==null||t<(pullEnd!=null?pullEnd+.03:w.oldDoneT+.02));   /* preview.33: keep the tyre attached through the 0.12 s pose transition, until it is fully outside the exit channel */
   if(releaseAge>=0&&ow&&restPose[k])tyreCleanup(k,T,A,S,releaseAge,ow);}
  // ---- new wheel: in the tyre-on man's hands until seated; then the car's own wheel shows
  const nw=newW[k],fresh=inService||api.after?w.fresh:0,seated=fresh>=1;
  if(nw){nw.visible=!seated&&!(api.after&&!inService);nw.userData.loose=false;}   /* api.after is also true during service: hide only once the car has gone */
  if(seated)spin.userData.assembly.visible=true;
  {const T=I(k+'-on');T.anchor=A;T.offset=null;T.hands.L=T.hands.R=null;const segs=[seg('on_ready'+sd,-1e9,null,true)];
   if(svc&&w.freshAtT!=null){segs.push(seg('on_fit'+sd,w.freshAtT,w.seatAtT!=null?Math.max(.3,w.seatAtT-w.freshAtT):STEP.wheelOn),seg('on_hold'+sd,w.seatAtT,null,true),seg('on_release'+sd,w.tightAtT!=null?w.tightAtT+.04:null));
    if(w.tightAtT!=null)segs.push(seg('on_clear'+sd,w.tightAtT+.04+D('on_release'+sd),null,true));}
   play(T,segs,t);
   if(v33(k+'-on')){const P=[],cl=api.closeT;
    if(svc&&cl!=null){P.push({m:'set',a:S.stopAt,b:S.stopAt+.45});
     if(w.freshAtT!=null)P.push({m:'fit',a:w.freshAtT,b:Math.max(w.freshAtT+.3,w.seatAtT??w.freshAtT+.8)});
     if(w.seatAtT!=null)P.push({m:'hold',a:w.seatAtT,loop:true});
     if(w.tightAtT!=null)P.push({m:'release',a:w.tightAtT+.04,b:w.tightAtT+.64},{m:'clear',a:w.tightAtT+.64,loop:true});
     if(api.after&&S.releaseAtT!=null){const h=S.releaseAtT+HOME;P.push({m:'ret',a:h,b:h+2.2},{m:'ready',a:h+2.2,loop:true});}}
    perfPlay(T,'p33_on_'+k,P,t);}
   carried[k+'-on']=!!nw&&!seated;}
 }
 // ---- after the car has gone: the tyre-off man walks to the old tyre, picks it up, carries it to the stack in front of
 // the garage and sets it down (garage-side tyres straight there; far-side ones across the empty box along its middle,
 // stacked beyond the garage-side crew). Clips tyre_pickup / carry_walk / tyre_setdown are authored at the man's own
 // origin; here they are placed along the path (anchor offset), the walk at the clip's own speed (stride / period).
 const HOME=1e9,HOME_CLIPS={'front-jack':'fjack_ready','rear-jack':'rjack_ready','stab-L':'stab_wait_L','stab-R':'stab_wait_R'};
 for(const k of CORNERS){const sd=k[1]==='L'?'_L':'_R';HOME_CLIPS[k+'-gun']='gun_ready'+sd;HOME_CLIPS[k+'-on']='on_ready'+sd;HOME_CLIPS[k+'-off']='off_ready'+sd;}
 const plans={};
 const gait=name=>api.crew?.gait?.(name)||{dist:t=>t*1.24,time:d=>d/1.24};   // path progress from the clip's own foot travel
 // walking, a tyre-off man takes the sideways offset (up to 0.8 m, eased at 1.2 m/s) that leaves the most room to everyone
 // else here and up to a metre ahead, preferring to stay on his line
 let avoidStamp=null,avoidBodies=[];const avoid={},OFFS=[0,-.1,.1,-.2,.2,-.3,.3,-.4,.4,-.5,.5,-.6,.6,-.7,.7,-.8,.8];
 function steer(k,p,d){if(avoidStamp!==intents.__time){avoidStamp=intents.__time;avoidBodies=api.crew?.bodies?.()||[];}const me=k+'-off',side=V(-d.z,0,d.x),bodies=avoidBodies;let best=0,bs=-1e9;
  for(const o of OFFS){let clear=9;for(const b of bodies)if(b.role!==me)for(const ahead of [0,.5,1.0]){const x=p.x+side.x*o+d.x*ahead-b.x,z=p.z+side.z*o+d.z*ahead-b.z;clear=Math.min(clear,Math.hypot(x,z));}
   const sc=Math.min(clear,.9)-.12*Math.abs(o);if(sc>bs+1e-6){bs=sc;best=o;}}
  const a=avoid[k]??0,dt=api.dt||0;avoid[k]=a+clamp(best-a,-1.2*dt,1.2*dt);return p.clone().addScaledVector(side,avoid[k]);}
 // preview.33 walk to the tyre: straight to a point 0.45 m short of the pick-up spot, then square onto it; where another crew
 // member stands within 0.75 m of that line it goes round them on the far side (no steering during the walk itself)
 function walkUp(k,C,W,pick,tyre){const obstacles=(api.crew?.bodies?.()||[]).filter(b=>b.role!==k+'-off').map(b=>({x:b.x,z:b.z,r:.69}));if(tyre)obstacles.push({x:tyre.x,z:tyre.z,r:.63});
  const route=planCrewRoute(C,W,obstacles,{pad:.08});return [...route.points.map(p=>V(p.x,0,p.z)),pick];}
 function plannedRoute(k,points){const obstacles=(api.crew?.bodies?.()||[]).filter(b=>b.role!==k+'-off').map(b=>({x:b.x,z:b.z,r:b.role==='chief'?1.28:1.12}));
  for(const [corner,w] of Object.entries(oldW))if(corner!==k&&w?.visible)obstacles.push({x:w.position.x,z:w.position.z,r:.64});
  const out=[points[0]];let clear=true;for(let i=1;i<points.length;i++){const route=planCrewRoute(points[i-1],points[i],obstacles,{pad:.18});clear=clear&&route.clear;out.push(...route.points.slice(1).map(p=>V(p.x,0,p.z)));}
  api.routeWarnings??={};api.routeWarnings[k]=!clear;return out;}
 function tyreCleanup(k,T,A,S,releaseAge,ow){const front=k[0]==='F',sgn=k[1]==='L'?1:-1,ax=front?'F':'R',az=CAR.axle[ax],sd=sgn>0?'_L':'_R';
  const first=({FL:6,RL:7})[k],other=plans[k==='FR'?'FL':'RL'];if(first==null&&!other?.finished)return;const start=first??other.finished+.7;if(releaseAge<start){return;}
  const len=pts=>{let L=0;for(let i=1;i<pts.length;i++)L+=pts[i].distanceTo(pts[i-1]);return L;};
  let pl=plans[k];if(!pl||pl.stop!==S.stopAt){const tr=restPose[k],axle=V(1,0,0).applyQuaternion(tr.q).setY(0).normalize();
   /* preview.33 performers walk from where their own clear move left them (not the fixed spot C, which made the straight walk
      cross the standing tyre), pick it up from that side and come in square to it over the last 0.45 m */
   const v=v33(k+'-off'),b0=v&&api.crew?.bodies?.().find(b=>b.role===k+'-off');
   const C=b0?V(b0.x,0,b0.z):A.o.clone().addScaledVector(A.l,sgn*1.40).addScaledVector(A.f,-1.40);let d=V(-axle.z,0,axle.x);if(d.dot(tr.p.clone().sub(C).setY(0))<0)d.negate();
   const reach=v?.76:.50,pick=tr.p.clone().setY(0).addScaledVector(d,-reach),stack=   /* preview.33 clips hold the floor tyre 0.70 m out (GROUND_T) */V(garageX+.15,0,mark.o.z+az+(sgn>0?(front?1.9:-2.4):(front?.45:-.45)));
   /* far side: round the front (z 3.6, between the tyre-on men at ~2.9 and the chief at 4.35) or the back (z -4.1, between the
      rear crew at ~-3.3 and the rear jack at -5.1) of the whole crew, then down the garage-side corridor; garage side: round behind the gunner */
   const zc=front?7.2:-7.2,route=sgn>0?[pick,P(mark,.9,0,zc).setY(0),P(mark,-3.3,0,zc).setY(0)]:[pick,A.o.clone().addScaledVector(A.l,sgn*1.9).addScaledVector(A.f,-.9)];
   /* preview.33: a turn with the tyre in his hands is walked (the path's rounded corners), never a pose blend between two
      facings, which swung the tyre through his body: the carry starts with a step the way he faces, and the last waypoint is
      kept far enough from the stack that he walks straight into the set-down instead of doubling back */
   if(v){route.splice(1,0,pick.clone().addScaledVector(d,.35));const n=route.length,prev=route[n-2],lp=route[n-1];if(lp.distanceTo(stack)<reach+.45)route[n-1]=stack.clone().addScaledVector(stack.clone().sub(prev).setY(0).normalize(),-(reach+.7));}
   const last=route[route.length-1],dir=stack.clone().sub(last).setY(0).normalize(),set=stack.clone().addScaledVector(dir,-reach);route.push(set);
   pl=plans[k]={stop:S.stopAt,v,C,pick,d,route,set,dir,stack,L1:C.distanceTo(pick),Lr:len(route)};pl.path1=makeCrewPath(v?walkUp(k,C,pick.clone().addScaledVector(d,-.45),pick,tr.p.clone().setY(0)):[C,pick],.25);pl.path=makeCrewPath(plannedRoute(k,route),.12);pl.L1=pl.path1.length;pl.Lr=pl.path.length;pl.w1=gait('walk').time(pl.L1);pl.carry=gait('carry_walk').time(pl.Lr);}
  const along=(path,u)=>{const q=path.at(clamp(u,0,1)*path.length);return {p:V(q.x,0,q.z),d:V(q.dx,0,q.dz)};};
  const off=(p,d)=>{const q=p.clone().sub(A.o);return {x:q.dot(A.l),z:q.dot(A.f),yaw:Math.atan2(d.dot(A.l),d.dot(A.f))};};
  const tt=releaseAge-start,t1=pl.w1,t2=t1+D('tyre_pickup'),t3=t2+pl.carry,t4=t3+D('tyre_setdown');
  if(tt<t1){const q=along(pl.path1,gait('walk').dist(tt)/pl.L1);T.offset=off(pl.v?q.p:steer(k,q.p,q.d),q.d);   /* preview.33: its path is laid out clear of the tyre; steer, which does not know about tyres, sidestepped it into it */T.clips=[{name:'walk',t:tt,w:1,loop:true}];T.regime='walk1';T.blendTime=.12;}
  else if(tt<t2){T.offset=off(pl.pick,pl.d);T.clips=[{name:'tyre_pickup',t:tt-t1,w:1}];T.regime='pick';T.blendTime=.15;carried[k+'-off']=tt-t1>.3;}
  else if(tt<t3){const q=along(pl.path,gait('carry_walk').dist(tt-t2)/pl.Lr);T.offset=off(q.p,q.d);T.clips=[{name:'carry_walk',t:tt-t2,w:1,loop:true}];T.regime='carry';carried[k+'-off']=true;}
  else if(tt<t4){T.offset=off(pl.set,pl.dir);T.clips=[{name:'tyre_setdown',t:tt-t3,w:1}];T.regime='set';carried[k+'-off']=tt-t3<.70;}
  else{pl.finished??=releaseAge;T.offset=off(pl.set,pl.dir);T.clips=[{name:'stand',t:tt,w:1,loop:true}];T.regime='stand';T.blendTime=.20;}}
 // carried objects follow the hands that hold them (called after the crew update, same frame)
 const mtx=new THREE.Matrix4(),tp=V(),tq=new THREE.Quaternion(),ts=V();
 function fromProp(obj,role){if(!api.crew?.prop(role,mtx))return false;mtx.decompose(tp,tq,ts);obj.position.copy(tp);obj.quaternion.copy(tq);obj.updateMatrixWorld(true);return true;}
 // palms onto the nearest point of a carried tyre's surface (tread or sidewall, 1 cm proud), corrections over 15 cm ignored
 // (30 cm once the tyre hangs from the hands after the stop: the carry clip spreads the hands differently from the lift)
 function gripTyre(w,role,front,lim=.15){const man=api.crew?.byRole?.[role];if(!man?.seen)return;const inv=w.matrixWorld.clone().invert(),hw=(front?.153:.203)+.01,tg={};
  for(const n of ['L','R']){const hp=man.handWorld[n];if(!hp)continue;const q=hp.clone().applyMatrix4(inv),r=Math.hypot(q.y,q.z)||1e-6,a=Math.atan2(q.z,q.y);let p;
   if(Math.abs(q.x)<hw-.03)p=V(q.x,Math.cos(a)*.37,Math.sin(a)*.37);else{const rr=Math.min(r,.35);p=V(Math.sign(q.x)*hw,Math.cos(a)*rr,Math.sin(a)*rr);}
   p.applyMatrix4(w.matrixWorld);if(p.distanceTo(hp)<lim)tg[n]=p;}
  api.crew.reach?.(role,tg);}
 function afterCrew(S){for(const k of CORNERS){const g=guns[k];fromProp(g,k+'-gun');const e=gunE[k]||0;
   // carried, the gun hangs from the trigger hand (its rear grip on that palm); on the nut, the hands go to the gun
   {const man=api.crew?.byRole?.[k+'-gun'],hp=man?.seen&&man.handWorld[k[1]==='L'?'R':'L'];if(hp&&e<1){g.updateMatrixWorld(true);g.position.add(hp.clone().sub(g.localToWorld(g.userData.grips.rear.p.clone())));}}
   if(e>0&&nutPose[k]){const sm=smooth(e);g.position.lerp(nutPose[k].p,sm);g.quaternion.slerp(nutPose[k].q,sm);}g.updateMatrixWorld(true);
   const gw=q=>g.localToWorld(q.p.clone()),rearHand=k[1]==='L'?'R':'L',frontHand=rearHand==='R'?'L':'R',tg={[rearHand]:gw(g.userData.grips.rear)};if(!gunSignal[k])tg[frontHand]=gw(g.userData.grips.front);
   api.crew?.reach?.(k+'-gun',tg,e>0);setHose(k,g.localToWorld(g.userData.hoseTail.clone()),V(1,0,0).transformDirection(g.matrixWorld));
   const ow=oldW[k],role=k+'-off';if(ow&&(carried[role]||settling[k])){
    // The tyre follows the authored prop trajectory; palms solve onto its surface.
    // Deriving a second attachment from two moving palms amplified their rotation and drifted the wheel into other people.
    const man=api.crew?.byRole?.[role],cl=['pick','carry','set'].includes(man?.regime);fromProp(ow,role);
    restPose[k]={p:ow.position.clone(),q:ow.quaternion.clone()};if(carried[role])gripTyre(ow,role,k[0]==='F',cl?.3:.15);}
   else{if(ow&&restPose[k]){const r=restPose[k];if(!r.floored){/* let go: it stands on the floor, never hangs where the hands left it */
     const ax=V(1,0,0).applyQuaternion(r.q),hw=k[0]==='F'?.153:.203,low=r.p.y-CAR.tyreR*Math.sqrt(Math.max(0,1-ax.y*ax.y))-hw*Math.abs(ax.y),g=groundAt(r.p.x,r.p.z);if(low-g>.01)r.p.y-=low-g;r.floored=true;}
     ow.position.copy(r.p);ow.quaternion.copy(r.q);}}
   const nw=newW[k];if(nw&&nw.visible&&carried[k+'-on']&&fromProp(nw,k+'-on'))gripTyre(nw,k+'-on',k[0]==='F',.24);}
  // Keep elbows/knees outside nearby tyres after all tools and hand contacts are placed.
  for(const k of CORNERS){const front=k[0]==='F',wheel=hubFrame(api.car,k).spin.userData.assembly;for(const w of [oldW[k],newW[k],wheel])if(w?.visible)for(const r of ['-off','-on','-gun'])api.crew.clearTyreLegs?.(k+r,w,front?.153:.203);}
  // negative tests: a held loose tyre stays in the exit area; a held tyre-off man has put his tyre down beside the wheel
  // (outside the exit area) so that only he blocks the release
  if(api.hold.tyre&&oldW[api.hold.tyre]){const w=oldW[api.hold.tyre];w.visible=true;w.userData.loose=true;w.position.copy(P(api.frS||mark,.9,CAR.tyreR,-1.6));w.updateMatrixWorld(true);}
  {const r=api.hold.crew,k=r&&r.endsWith('-off')&&r.slice(0,2),w=k&&oldW[k];if(w){const fr=api.frS||mark,sg=k[1]==='L'?1:-1;w.position.copy(P(fr,sg*(CAR.track[k[0]]+1.9),CAR.tyreR,CAR.axle[k[0]]+(k[0]==='F'?-.6:.6)));restPose[k]={p:w.position.clone(),q:w.quaternion.clone(),floored:true};w.updateMatrixWorld(true);}}
  for(const [name,role] of [['front','front-jack'],['rear','rear-jack']]){const J=jacks[name];if(!api.crew?.prop(role,mtx))continue;mtx.decompose(tp,tq,ts);
   const d=V(1,0,0).applyQuaternion(tq).setY(0).normalize(),pad=name==='front'?CAR.noseJack.y-.03+(S.lift?.front||0)*(jackEngaged.front?1:0)+(jackEngaged.front?.03:0):CAR.rearJack.y-.035+(S.lift?.rear||0)*(jackEngaged.rear?1:0)+(jackEngaged.rear?.035:0);
   // off the car the lever is where the man's hands hold its T-bar (lever geometry inverted), the cradle kept just under
   // the jacking point while the car is in the box
   let pd=jackEngaged[name]?pad:Math.min(pad,(name==='front'?CAR.noseJack.y:CAR.rearJack.y)-.04);const man=api.crew?.byRole?.[role];
   if(!jackEngaged[name]&&man?.seen&&man.handWorld.L&&man.handWorld.R){const u=J.userData,Y=name==='front'?CAR.noseJack.y:CAR.rearJack.y,hy=(man.handWorld.L.y+man.handWorld.R.y)/2-groundAt(tp.x,tp.z);
    pd=Math.min(u.wr+u.padTop+u.ahead*clamp((u.wr-hy)/u.handle,-.9,.9),['box','creep','stopped','service','release','leave'].includes(S.phase)?Y-.01:Y+.15);}
   placeJack(J,J.position,d,pd);const bar=jackPoint(J,J.userData.bar);J.position.x+=tp.x-bar.x;J.position.z+=tp.z-bar.z;J.updateMatrixWorld(true);
   const b2=jackPoint(J,J.userData.bar),side=V().crossVectors(UP,d).normalize();api.crew.reach?.(role,{L:b2.clone().addScaledVector(side,.21),R:b2.clone().addScaledVector(side,-.21)});}}
 const jackEngaged={front:false,rear:false};
 // ---------------------------------------------------------------- jacks and their men (clip space: the car frame)
 function frontJack(S,fr,carFr,inService,dropAge,green){const T=I('front-jack'),t=S.t;T.anchor={o:fr.o.clone(),f:fr.f.clone(),l:fr.l.clone()};T.offset=null;T.hands.L=T.hands.R=null;
  const svc=inService||api.after,segs=[seg('fjack_ready',-1e9,null,true)];
  if(svc&&S.stopAt!=null){const a=S.stopAt+.03+(S.serviceAdj||0);   /* adjusted stops and push-backs start later (pit-stop.js serviceStep) */segs.push(seg('fjack_lift',a,STEP.jackIn+STEP.lift),seg('fjack_hold',a+STEP.jackIn+STEP.lift,null,true),seg('fjack_drop',S.dropAtT,STEP.drop),seg('fjack_out',S.dropAtT!=null?S.dropAtT+STEP.drop+.02:null),seg('fjack_idle',S.dropAtT!=null?S.dropAtT+STEP.drop+.02+D('fjack_out'):null,null,true));}
  play(T,segs,t);jackEngaged.front=inService&&(S.dropAtT==null||t<S.dropAtT+STEP.drop+.02);
  if(v33('front-jack')){const P=[],cl=api.closeT;
   if(svc&&S.stopAt!=null&&cl!=null){const a=S.stopAt+.03+(S.serviceAdj||0),b=a+STEP.jackIn+STEP.lift;P.push({m:'set',a:cl,b:cl+.3},{m:'lift',a,b},{m:'hold',a:b,loop:true});
    if(S.dropAtT!=null){const d=S.dropAtT;P.push({m:'drop',a:d,b:d+STEP.drop},{m:'out',a:d+STEP.drop+.02,b:d+STEP.drop+.92},{m:'idle',a:d+STEP.drop+.92,loop:true});}
    if(api.after&&S.releaseAtT!=null){const h=S.releaseAtT+HOME;P.push({m:'ret',a:h,b:h+2.0},{m:'ready',a:h+2.0,loop:true});}}
   perfPlay(T,'p33_fjack',P,t);}}
 function rearJack(S,fr,carFr,inService,dropAge,green){const T=I('rear-jack'),t=S.t;T.anchor={o:fr.o.clone(),f:fr.f.clone(),l:fr.l.clone()};T.offset=null;T.hands.L=T.hands.R=null;
  const svc=inService||api.after,segs=[seg('rjack_ready',-1e9,null,true)];
  if(svc&&S.stopAt!=null){const a=S.stopAt+.10+(S.serviceAdj||0);segs.push(seg('rjack_lift',a,STEP.jackIn+STEP.lift),seg('rjack_hold',a+STEP.jackIn+STEP.lift,null,true));
   if(!api.hold.rearJack)segs.push(seg('rjack_drop',S.dropAtT,STEP.drop),seg('rjack_out',S.dropAtT!=null?S.dropAtT+STEP.drop+.04:null),seg('rjack_idle',S.dropAtT!=null?S.dropAtT+STEP.drop+.04+D('rjack_out'):null,null,true));}
  play(T,segs,t);jackEngaged.rear=inService&&(S.dropAtT==null||t<S.dropAtT+STEP.drop+.04||api.hold.rearJack);
  if(v33('rear-jack')){const P=[],cl=api.closeT;
   if(svc&&S.stopAt!=null&&cl!=null){const a=S.stopAt+.10+(S.serviceAdj||0),b=a+STEP.jackIn+STEP.lift;P.push({m:'set',a:S.stopAt,b:S.stopAt+.85},{m:'lift',a,b},{m:'hold',a:b,loop:true});
    if(S.dropAtT!=null&&!api.hold.rearJack){const d=S.dropAtT;P.push({m:'drop',a:d,b:d+STEP.drop},{m:'out',a:d+STEP.drop+.04,b:d+STEP.drop+.54},{m:'idle',a:d+STEP.drop+.54,loop:true});
     if(api.after&&S.releaseAtT!=null){const h=S.releaseAtT+HOME;P.push({m:'ret',a:h,b:h+2.0},{m:'ready',a:h+2.0,loop:true});}}}
   perfPlay(T,'p33_rjack',P,t);}}
 function stabilisers(S,fr,carFr,inService,dropAge,green){for(const s of [1,-1]){const sd=s>0?'_L':'_R',T=I('stab-'+(s>0?'L':'R')),t=S.t;T.anchor={o:fr.o.clone(),f:fr.f.clone(),l:fr.l.clone()};T.offset=null;T.hands.L=T.hands.R=null;
  const closing=false,ready=inService&&S.t-S.stopAt>=(S.serviceAdj||.85)-.15;if((closing||ready)&&api.stabT==null)api.stabT=t;   /* after a push-back they come in once it has stopped */if(!closing&&!inService&&S.phase!=='leave'&&S.phase!=='done')api.stabT=null;
  const segs=[seg('stab_wait'+sd,-1e9,null,true)];if(api.stabT!=null){segs.push(seg('stab_in'+sd,api.stabT),seg('stab_hold'+sd,api.stabT+D('stab_in'+sd),null,true),seg('stab_out'+sd,S.dropAtT),seg('stab_clear'+sd,S.dropAtT!=null?S.dropAtT+D('stab_out'+sd):null,null,true));}
  const cur=play(T,segs,t);if(api.stabT==null){T.regime='wait';T.blendTime='auto';}   /* a called-off approach (overshoot): back to waiting without a snap */
  if(inService&&cur.name.startsWith('stab_hold')){const ch=api.chassis,cp=(x,y,z)=>ch.localToWorld(V(x,y,z-CAR.modelZ));T.hands.L={p:cp(s*.74,.64,s>0?.62:.06),w:1};T.hands.R={p:cp(s*.74,.64,s>0?.06:.62),w:1};}}}
 function chief(S,fr,green){const T=I('chief');T.anchor={o:fr.o.clone(),f:fr.f.clone(),l:fr.l.clone()};T.offset=null;T.hands.L=T.hands.R=null;play(T,[seg('chief_idle',-1e9,null,true),seg('chief_signal',green&&S.releaseAtT!=null?S.releaseAtT:null)],S.t);}
 // overshoot: the car is rolled back by hand; the front tyre-off men lean on the front tyres (approximate: no authored push clip yet)
 // overshoot push-back (pit-stop.js PUSH_RESET): the front tyre-off men jog (walk clip at double speed, the path keeping
 // pace with its feet) round the outside of their gunner and tyre-on man to the front of the front tyres and lean on them
 // while the car rolls back; the tyre-on men and the chief step aside; afterwards the pushers go back round the front and the
 // outside to their wheels while the service waits. All spots are in the car frame (x out from the hub line, z along).
 const pushPlan={},retPlan={};let pushEnd=null;
 function routeWalk(T,fr,pts,te,rate=2){const g=gait('walk');let L=0;const seg=[];for(let i=1;i<pts.length;i++){seg.push(pts[i].distanceTo(pts[i-1]));L+=seg[i-1];}
  const dd=g.dist(te*rate);if(dd>=L)return true;let x=dd,i=0;while(i<seg.length-1&&x>seg[i]){x-=seg[i];i++;}
  const d=pts[i+1].clone().sub(pts[i]).setY(0).normalize(),q=pts[i].clone().lerp(pts[i+1],seg[i]?Math.min(1,x/seg[i]):1).sub(fr.o);
  T.anchor={o:fr.o.clone(),f:fr.f.clone(),l:fr.l.clone()};T.offset={x:q.dot(fr.l),z:q.dot(fr.f),yaw:Math.atan2(d.dot(fr.l),d.dot(fr.f))};T.clips=[{name:'walk',t:te*rate,w:1,loop:true}];T.hands.L=T.hands.R=null;return false;}
 function standAside(S,until){for(const k of ['FL','FR']){const O=I(k+'-on'),sgn=k[1]==='L'?1:-1;if(until!=null&&S.t>until)continue;O.offset={x:sgn*.9,z:-.3,yaw:0};O.regime='aside';O.blendTime='auto';}
  const C=I('chief');if(until==null||S.t<until+.5){C.offset={x:-1.85,z:0,yaw:0};C.regime='aside';C.blendTime='auto';}}
 function pushback(S,car,carFr){const ps=S.t-S.pushAt,az=CAR.axle.F,tx=CAR.track.F,Pc=(x,z)=>carFr.o.clone().addScaledVector(carFr.l,x).addScaledVector(carFr.f,z);
  for(const [role,k] of [['FL-off','FL'],['FR-off','FR']]){hubFrame(car,k);const h=pose.hub.clone(),T=I(role),sgn=k[1]==='L'?1:-1;
   let pl=pushPlan[k];if(!pl||pl.at!==S.pushAt){const b=api.crew?.bodies?.().find(b=>b.role===role),st=b?V(b.x,0,b.z):Pc(sgn*(tx+.58),az-.98),stz=st.clone().sub(carFr.o).dot(carFr.f);
    pl=pushPlan[k]={at:S.pushAt,pts:[st,Pc(sgn*(tx+2.4),stz),Pc(sgn*(tx+2.4),az+1.6)]};}
   T.blendTime='auto';if(!routeWalk(T,carFr,[...pl.pts,Pc(sgn*(tx+.32),az+CAR.tyreR+.62)],ps)){T.regime='pushwalk';continue;}
   T.anchor={o:carFr.o.clone(),f:carFr.f.clone(),l:carFr.l.clone()};T.offset={x:sgn*(tx+.32),z:az+CAR.tyreR+.62,yaw:Math.PI};/* on the tyre's outer shoulder, clear of the wing endplate */T.clips=[{name:'stand',t:S.t,w:1,loop:true}];T.regime='push';
   const front=h.clone().addScaledVector(carFr.f,CAR.tyreR+.02);T.hands.L={p:front.clone().addScaledVector(carFr.l,.1).add(V(0,.08,0)),w:1};T.hands.R={p:front.clone().addScaledVector(carFr.l,-.1).add(V(0,.08,0)),w:1};}
  standAside(S,null);}
 function afterPush(S,carFr){const te=S.t-pushEnd,az=CAR.axle.F,tx=CAR.track.F,Pc=(x,z)=>carFr.o.clone().addScaledVector(carFr.l,x).addScaledVector(carFr.f,z);let busy=false;
  for(const [role,k] of [['FL-off','FL'],['FR-off','FR']]){const T=I(role),sgn=k[1]==='L'?1:-1;
   if(!retPlan[k]){const b=api.crew?.bodies?.().find(b=>b.role===role);retPlan[k]=[b?V(b.x,0,b.z):Pc(sgn*(tx+.32),az+.98),Pc(sgn*(tx+.32),az+2.3),Pc(sgn*(tx+2.4),az+2.3),Pc(sgn*(tx+2.4),az-.98),Pc(sgn*(tx+.58),az-.98)];}
   if(!routeWalk(T,carFr,retPlan[k],te)){T.regime='pushback-return';T.blendTime='auto';busy=true;}else{T.blendTime='auto';}}
  standAside(S,pushEnd+2.0);return busy;}
 let lastPhase=null;api.dt=0;const _upd=api.update;api.update=(S,car,o)=>{api.dt=lastTime==null?0:Math.max(0,Math.min(.2,S.t-lastTime));lastTime=S.t;return _upd(S,car,o);};
 return api;
}
