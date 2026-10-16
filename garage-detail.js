import {makeCarbon,createSpareWing,createSpareWheel} from './car.js';
import * as THREE from 'three';

// Trackside service equipment. Dimensions are metres; the central car bay stays clear.
export function addGarageDetails(parent){
 const group=new THREE.Group();group.name='Pit service / spares / electronics';parent.add(group);
 const metal=new THREE.MeshStandardMaterial({color:'#9caaae',metalness:.88,roughness:.28});
 const dark=new THREE.MeshStandardMaterial({color:'#132827',metalness:.55,roughness:.42});
 const rubber=new THREE.MeshStandardMaterial({color:'#111518',roughness:.87});
 const green=new THREE.MeshStandardMaterial({color:'#005c50',metalness:.48,roughness:.32});
 const fabric=new THREE.MeshStandardMaterial({color:'#303d3c',roughness:.95});
 const led=new THREE.MeshStandardMaterial({color:'#80efc3',emissive:'#64dfad',emissiveIntensity:1.3});
 const weave=document.createElement('canvas');weave.width=weave.height=64;const wc=weave.getContext('2d');wc.fillStyle='#151a1d';wc.fillRect(0,0,64,64);
 for(let y=0;y<64;y+=8)for(let x=0;x<64;x+=8){wc.fillStyle=(x/8+y/8)%2?'#303638':'#202628';wc.fillRect(x,y,7,7);wc.fillStyle='#44494a';wc.fillRect(x+1,y+1,(x/8+y/8)%2?1:5,(x/8+y/8)%2?5:1);}
 const tex=new THREE.CanvasTexture(weave);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(16,8);tex.colorSpace=THREE.SRGBColorSpace;
 const carbon=makeCarbon().clone();
 const boxes=new Map(),cylinders=new Map();
 function box(p,x,y,z,w,h,d,m){const key=[w,h,d].join('/');if(!boxes.has(key))boxes.set(key,new THREE.BoxGeometry(w,h,d));const o=new THREE.Mesh(boxes.get(key),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 function cyl(p,x,y,z,r,h,m,axis='y'){const key=[r,h].join('/');if(!cylinders.has(key))cylinders.set(key,new THREE.CylinderGeometry(r,r,h,24));const o=new THREE.Mesh(cylinders.get(key),m);o.position.set(x,y,z);if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;o.castShadow=true;p.add(o);return o;}
 function hose(p,points,r=.013,m=rubber){const c=new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a)));const o=new THREE.Mesh(new THREE.TubeGeometry(c,64,r,8,false),m);p.add(o);return o;}
 function label(p,text,x,y,z,w=.65,h=.12){const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#132827';ctx.fillRect(0,0,768,128);ctx.fillStyle='#c8d5d2';ctx.font='500 52px monospace';ctx.textAlign='center';ctx.fillText(text,384,82);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.65}));o.position.set(x,y,z);p.add(o);return o;}
 function bolts(p,x,y,z,w,h){for(const sx of [-1,1])for(const sy of [-1,1])cyl(p,x+sx*w/2,y+sy*h/2,z,.012,.009,metal,'z');}
 function wheel(p,x,z){cyl(p,x,.085,z,.085,.05,rubber,'x');box(p,x,.21,z,.04,.16,.065,metal);cyl(p,x+.03,.085,z,.026,.008,metal,'x');}
 // Rear modular cabinets, recessed fasteners, hinges, ventilated lower doors and latches.
 for(const x of [-4.65,4.65]){
  const cabinet=new THREE.Group();cabinet.position.set(x,0,-4.73);group.add(cabinet);cabinet.name='2.05 m spares cabinet';
  box(cabinet,0,1.07,0,2.45,2.02,.73,dark);box(cabinet,0,.11,0,2.32,.20,.65,rubber);box(cabinet,0,2.105,0,2.5,.05,.79,metal);
  for(const sx of [-.61,.61]){box(cabinet,sx,1.12,.376,1.19,1.90,.035,green);box(cabinet,sx-.43,1.19,.415,.021,.27,.027,metal);bolts(cabinet,sx,1.12,.402,1.08,1.77);for(let i=0;i<9;i++)box(cabinet,sx,.30+i*.034,.40,.68,.009,.005,rubber);for(const y of [.51,1.64])box(cabinet,sx+.55,y,.413,.018,.10,.022,metal);}
  label(cabinet,x<0?'COMPOSITES / SPARES':'ELECTRONICS / SERVICE',0,1.84,.40,1.75,.12);
  box(cabinet,0,2.17,0,2.3,.035,.68,rubber);for(let i=0;i<3;i++){box(cabinet,-.78+i*.78,2.31,.02,.66,.25,.45,dark);box(cabinet,-.78+i*.78,2.33,.253,.22,.027,.018,metal);bolts(cabinet,-.78+i*.78,2.31,.252,.57,.17);}
 }
 // Full-width spare front wing on a padded transport stand, outside the presentation bay.
 const aero=new THREE.Group();aero.position.set(-4.8,0,1.7);aero.rotation.y=.27;group.add(aero);aero.name='Spare multi-element wing and padded service stand';
 for(const x of [-.7,.7]){box(aero,x,.47,0,.045,.83,.045,metal);box(aero,x,.11,0,.055,.055,.65,metal);for(const z of [-.25,.25])wheel(aero,x,z);box(aero,x,.83,0,.21,.07,.43,fabric);}
 const spareWing=createSpareWing();spareWing.position.y=.86;aero.add(spareWing);
 // Tyre blankets: seams, securing straps, connector housings and a controller on a trolley.
 const tyres=new THREE.Group();tyres.position.set(5.1,0,2.3);tyres.rotation.y=-.18;group.add(tyres);tyres.name='Tyre heating blankets and controller';
 box(tyres,0,.26,0,1.6,.07,1.6,metal);for(const x of [-.67,.67])for(const z of [-.65,.65])wheel(tyres,x,z);
 const blanketGeo=new THREE.LatheGeometry([[.22,-.18],[.32,-.18],[.36,-.14],[.368,-.10],[.368,.10],[.36,.14],[.32,.18],[.22,.18]].map(p=>new THREE.Vector2(...p)),64);
 for(const x of [-.41,.41])for(const z of [-.4,.4]){const actualWheel=createSpareWheel();actualWheel.rotation.z=Math.PI/2;actualWheel.position.set(x,.465,z);tyres.add(actualWheel);const blanket=new THREE.Mesh(blanketGeo,fabric);blanket.position.set(x,.49,z);blanket.castShadow=true;tyres.add(blanket);cyl(tyres,x,.40,z,.20,.09,rubber);for(const y of [.35,.63]){const seam=new THREE.Mesh(new THREE.TorusGeometry(.365,.004,6,48),metal);seam.rotation.x=Math.PI/2;seam.position.set(x,y,z);tyres.add(seam);}box(tyres,x+.27,.5,z,.026,.36,.038,rubber);box(tyres,x+.33,.52,z,.075,.11,.07,green);hose(tyres,[[x+.35,.49,z],[x+.43,.31,z],[.82,.3,z],[.91,.52,.63]],.008);}
 box(tyres,.82,.88,.53,.24,.48,.25,dark);label(tyres,'TYRE / 080',.82,1.0,.66,.22,.08);for(let i=0;i<4;i++){cyl(tyres,.75+i*.045,.76,.665,.012,.012,metal,'z');box(tyres,.75+i*.045,.86,.663,.018,.011,.01,led);}
 // Engineer's diagnostic cart with physical keyboard, connectors, status indicators and cable loom.
 const diag=new THREE.Group();diag.position.set(4.48,0,-2.6);diag.rotation.y=-.38;group.add(diag);diag.name='Mobile diagnostic and data station';
 box(diag,0,.67,0,1.18,.83,.7,dark);for(const x of [-.49,.49])for(const z of [-.25,.25])wheel(diag,x,z);box(diag,0,1.10,0,1.30,.07,.80,carbon);box(diag,0,1.29,-.22,.065,.30,.065,metal);box(diag,0,1.57,-.22,1.04,.57,.075,rubber);bolts(diag,0,1.57,-.177,.95,.48);
 const screen=document.createElement('canvas');screen.width=1024;screen.height=512;const sc=screen.getContext('2d');sc.fillStyle='#051216';sc.fillRect(0,0,1024,512);sc.fillStyle='#75d9bb';sc.font='28px monospace';sc.fillText('AMR23 / SYSTEM DIAGNOSTICS',42,46);sc.font='19px monospace';sc.fillText('POWER UNIT    HYDRAULICS    SENSORS',42,90);
 for(let row=0;row<4;row++){const y=140+row*78;sc.strokeStyle='#183837';sc.beginPath();sc.moveTo(40,y);sc.lineTo(980,y);sc.stroke();sc.strokeStyle=['#6fdfbf','#ecdf86','#91c8ed','#d1d8d9'][row];sc.beginPath();for(let i=0;i<200;i++){const x=40+i*4.5,yy=y-15+Math.sin(i*.09+row)*9+Math.sin(i*.7)*2;i?sc.lineTo(x,yy):sc.moveTo(x,yy);}sc.stroke();}const st=new THREE.CanvasTexture(screen);st.colorSpace=THREE.SRGBColorSpace;const display=new THREE.Mesh(new THREE.PlaneGeometry(.96,.49),new THREE.MeshBasicMaterial({map:st}));display.position.set(0,1.57,-.177);diag.add(display);
 box(diag,0,1.145,.15,.62,.027,.22,rubber);for(let row=0;row<4;row++)for(let col=0;col<13;col++)box(diag,-.27+col*.043,1.163,.08+row*.045,.033,.01,.025,metal);box(diag,.44,1.15,.18,.10,.04,.15,rubber);
 for(let i=0;i<3;i++){box(diag,0,.40+i*.21,.36,1.08,.15,.025,rubber);for(let j=0;j<14;j++)box(diag,-.4+j*.03,.4+i*.21,.381,.015,.065,.004,metal);box(diag,.45,.4+i*.21,.381,.023,.015,.009,led);cyl(diag,.34,.4+i*.21,.388,.023,.014,metal,'z');}
 hose(diag,[[.5,.43,.3],[.8,.21,.4],[.72,.025,1],[.1,.025,1.15],[-.2,.04,.8]],.018);
 // Suspended service arms, coiled pneumatic lines and impact guns mounted at the side bays.
 for(const side of [-1,1]){
  const sx=side*5.65;box(group,sx,3.72,-1,.06,1.08,.08,metal);box(group,side*4.9,3.22,-1,1.55,.055,.10,metal);cyl(group,side*4.15,3.21,-1,.085,.12,dark);
  const coil=[];for(let i=0;i<=200;i++){const a=i/200*Math.PI*26;coil.push([side*4.15+Math.cos(a)*.065,3.15-i/200*1.44,-1+Math.sin(a)*.065]);}hose(group,coil,.009);
  hose(group,[[side*4.15,1.71,-1],[side*4.2,1.35,-1],[side*4.36,1.25,-1.08]],.012);
  const gun=new THREE.Group();gun.position.set(side*4.4,1.27,-1.08);gun.rotation.z=side*.15;group.add(gun);cyl(gun,0,0,0,.073,.24,green,'x');cyl(gun,side*.20,0,0,.051,.18,metal,'x');box(gun,0,-.12,0,.055,.19,.07,rubber);box(gun,-side*.07,-.045,.03,.018,.07,.023,metal);for(let a=0;a<8;a++)cyl(gun,0,Math.sin(a*Math.PI/4)*.057,Math.cos(a*Math.PI/4)*.057,.004,.25,metal,'x');
 }
 // Transport cases, latches, corner protectors and organised hand tools on the service bench.
 for(let i=0;i<3;i++){
  const x=-5.2+i*.75,z=7.6;box(group,x,.34,z,.67,.58,.52,dark);box(group,x,.65,z,.7,.04,.55,metal);bolts(group,x,.34,z+.266,.59,.49);box(group,x,.4,z+.29,.19,.028,.035,metal);for(const sx of [-.24,.24])box(group,x+sx,.58,z+.285,.065,.10,.025,metal);
 }
 const tray=new THREE.Group();tray.position.set(-5.98,1.113,-1.6);group.add(tray);box(tray,0,0,.25,.77,.022,.45,rubber);for(let i=0;i<8;i++){const x=-.3+i*.085;cyl(tray,x,.055,.25,.016,.075,metal);cyl(tray,x,.096,.25,.009,.01,rubber);}
 for(let i=0;i<3;i++){box(tray,-.23+i*.21,.032,-.09,.12,.02,.07,green);hose(tray,[[-.28+i*.21,.035,-.11],[-.28+i*.21,.035,.04],[-.20+i*.21,.035,.06]],.006,metal);}
 // Fire equipment, spill response and small service fittings kept close to the entrance.
 const fire=new THREE.MeshStandardMaterial({color:'#b72c32',metalness:.3,roughness:.42});
 cyl(group,-6.62,.42,8.1,.11,.55,fire);cyl(group,-6.62,.73,8.1,.043,.11,metal);box(group,-6.62,.79,8.1,.14,.024,.04,rubber);hose(group,[[-6.57,.76,8.1],[-6.41,.66,8.1],[-6.45,.3,8.1]],.011);label(group,'FIRE',-6.62,.48,8.213,.14,.07);
 box(group,6.55,.47,8.9,.40,.88,.42,dark);box(group,6.55,.91,8.9,.43,.04,.44,metal);label(group,'SERVICE',6.55,.72,9.115,.31,.07);
 for(const side of [-1,1])for(let i=0;i<4;i++){box(group,side*6.82,1.12,1+i*1.6,.03,.12,.23,metal);box(group,side*6.79,1.12,1+i*1.6,.02,.07,.15,rubber);}
 // Ceiling cable trays, brackets and ventilation grilles. No equipment enters the central sightline.
 for(const side of [-1,1]){box(group,side*5.0,4.37,2.5,.30,.065,13,metal);for(let z=-3.5;z<9;z+=.35)box(group,side*5.0,4.4,z,.32,.018,.025,dark);for(const z of [-3,2,7]){box(group,side*5,4.52,z,.035,.24,.035,metal);box(group,side*5.9,4.55,z,1.0,.025,.58,rubber);for(let i=0;i<10;i++)box(group,side*5.9,4.528,z-.24+i*.05,.96,.018,.021,metal);}}
 for(const x of [-.52,.52])for(const y of [.36,.92])cyl(diag,x,y,.355,.006,.008,metal,'z');
 return group;
}
