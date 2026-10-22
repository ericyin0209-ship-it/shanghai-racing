import * as THREE from 'three';
import {landmarkMaterials,createLandmarkBuilder} from './circuit-surface.js?v=218i';
// Architectural characteristics follow Tilke/F1 photographs. Dimensions remain visual estimates.
export function ellipseLoft(profiles,segments=128){
 const v=[],uv=[],idx=[];
 for(let r=0;r<profiles.length;r++){const [rx,rz,y]=profiles[r];for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;v.push(Math.cos(a)*rx,y,Math.sin(a)*rz);uv.push(i/segments,r/(profiles.length-1));if(r&&i){const n=r*(segments+1)+i;idx.push(n,n-segments-1,n-1,n-1,n-segments-1,n-segments-2);}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export const BRIDGE_AXIS_Y=33;
export function createCircuitLandmarks(scene,standAxis){
 const root=new THREE.Group();root.name='Shanghai landmark architecture / 218';scene.add(root);const m=landmarkMaterials(),builder=createLandmarkBuilder(root),{box,beam}=builder,standFrame=standAxis.matrix;
 const structural={bridgeGlazingSegments:128,bridges:2,substructureConnected:true,standAxisShared:true};
 function mesh(name,g,mat,p){const o=new THREE.Mesh(g,mat);o.name=name;o.position.set(...p);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 // preview.25 bridges: lens-shaped in elevation with pointed tips (photos 05/06/07/10), plan length ~150 m and
 // width ~40 m from the 2018 satellite image. One central oval window band with visible Warren-truss
 // members and two small eye windows per long face. Heights are photo estimates (±15%), not survey data.
 const BL=76,section=48,stations=161;
 const plan=u=>19*Math.pow(Math.max(0,1-Math.pow(Math.abs(u),5)),.5);
 const shellTop=u=>BRIDGE_AXIS_Y+6.3*Math.pow(Math.max(0,1-u*u),.42),shellBottom=u=>BRIDGE_AXIS_Y-8.0*Math.pow(Math.max(0,1-u*u),.72);
 const bridgeShell=(()=>{const pos=[],shell=[],idx=[];for(let i=0;i<stations;i++){const u=-Math.cos(Math.PI*i/(stations-1)),a=plan(u),top=shellTop(u),bottom=shellBottom(u),mid=(top+bottom)/2,hh=(top-bottom)/2;
   for(let j=0;j<=section;j++){const th=j/section*Math.PI*2,c=Math.cos(th),s=Math.sin(th),e=2/6.5,cz=Math.sign(c)*Math.pow(Math.abs(c),e),sy=Math.sign(s)*Math.pow(Math.abs(s),e);pos.push(u*BL,mid+hh*sy,a*cz);shell.push(u,sy,Math.abs(cz));
    if(i&&j){const k=i*(section+1)+j;idx.push(k,k-1,k-section-1,k-1,k-section-2,k-section-1);}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('shellUV',new THREE.Float32BufferAttribute(shell,3));g.setIndex(idx);g.computeVertexNormals();return g;})();
 const bridgeNight={value:0};
 const shellMat=new THREE.MeshPhysicalMaterial({color:'#b3b8b8',metalness:.55,roughness:.32,clearcoat:.3,clearcoatRoughness:.22});
 shellMat.onBeforeCompile=shader=>{shader.uniforms.bridgeNight=bridgeNight;
  shader.vertexShader='attribute vec3 shellUV;varying vec3 vShell;varying vec3 vShellPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvShell=shellUV;vShellPos=position;');
  shader.fragmentShader='varying vec3 vShell;varying vec3 vShellPos;uniform float bridgeNight;float glassMask;float trussLine;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float side=smoothstep(.80,.93,vShell.z);
 vec2 q=vec2(vShell.x/.445,(vShell.y+.03)/.60);float r=length(q),aaR=fwidth(r)+1e-4;
 vec2 q2=vec2((abs(vShell.x)-.635)/.072,(vShell.y-.10)/.30);float r2=length(q2),aaR2=fwidth(r2)+1e-4;
 float main=1.-smoothstep(1.-aaR,1.,r),eye=1.-smoothstep(1.-aaR2,1.,r2);
 glassMask=max(main,eye)*side;
 float rim=max(smoothstep(.93-aaR,.93,r)*(1.-smoothstep(1.03,1.03+aaR,r)),smoothstep(.86-aaR2,.86,r2)*(1.-smoothstep(1.06,1.06+aaR2,r2)))*side;
 float x=vShellPos.x;float bay=fract(x/6.4);float yN=clamp(vShell.y/.55*.5+.5,0.,1.);
 float diag=abs(mod(floor(x/6.4),2.)<1.?bay-yN:1.-bay-yN);float fw=fwidth(x/6.4)+1e-4;
 trussLine=max(1.-smoothstep(.035,.035+fw*1.5,diag),max(1.-smoothstep(.04,.04+fwidth(yN)*1.5,abs(yN-.08)),1.-smoothstep(.04,.04+fwidth(yN)*1.5,abs(yN-.92))));
 float mull=1.-smoothstep(.03,.03+fwidth(x/1.6)*1.5,min(fract(x/1.6),1.-fract(x/1.6)));
 trussLine*=main;float detail=1.-smoothstep(.04,.25,fw);
 vec3 glassCol=mix(vec3(.30,.42,.44),vec3(.13,.17,.18),trussLine*detail*.9);glassCol*=1.-mull*.25*detail;
 diffuseColor.rgb=mix(diffuseColor.rgb,glassCol,glassMask);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.84,.86,.85),rim*.8);
 vec2 panel=vec2(x/3.2,vShell.y*7.);vec2 pj=min(fract(panel),1.-fract(panel))/(fwidth(panel)+1e-4);float joint=1.-min(1.,min(pj.x,pj.y)/1.5);diffuseColor.rgb*=1.-joint*.10*(1.-glassMask)*detail;`)
  .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.06,glassMask);')
  .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.18,glassMask);')
  .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.80,.56)*glassMask*(1.-trussLine)*bridgeNight*.85;');};
 shellMat.customProgramCacheKey=()=> 'bridge-lens-shell-225';
 const towerU=53/BL,towerTop=shellBottom(towerU)+.25;
 const rounded=(w,d,r)=>{const s=new THREE.Shape(),x=w/2,z=d/2;s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);return s;};
 const towerShape=rounded(15,13.5,4.2),towerBody=new THREE.ExtrudeGeometry(towerShape,{depth:towerTop-.55,bevelEnabled:false,curveSegments:10});towerBody.rotateX(-Math.PI/2);towerBody.translate(0,.55,0);
 const bandShape=rounded(15.5,14,4.45);bandShape.holes.push(rounded(14.9,13.4,4.15));const band=new THREE.ExtrudeGeometry(bandShape,{depth:.22,bevelEnabled:false,curveSegments:10});band.rotateX(-Math.PI/2);
 const towerPerimeter=towerShape.getSpacedPoints(44);
 for(const z of [-455,-57]){
  const shell=mesh('Bridge lens shell with oval glazing',bridgeShell,shellMat,[0,0,z]);shell.userData.surveyed=false;
  for(const x of [-53,53]){
   const t=new THREE.Group();t.position.set(x,0,z);root.add(t);const tb=createLandmarkBuilder(t);
   const plinth=new THREE.Mesh(new THREE.CylinderGeometry(8.6,8.9,.55,48),m.concrete);plinth.position.y=.275;t.add(plinth);
   if(x<0){
    // Pit side: rounded-rectangle glass office towers with continuous floor edges.
    const o=new THREE.Mesh(towerBody,m.warmGlass);o.castShadow=o.receiveShadow=true;t.add(o);
    for(let y=3.95;y<towerTop-1;y+=3.4){const b=new THREE.Mesh(band,m.alloy);b.position.y=y;t.add(b);}
    for(const p of towerPerimeter.slice(0,-1))tb.beam('tower curtain mullions',[p.x*1.012,.55,-p.y*1.012],[p.x*1.012,towerTop-.1,-p.y*1.012],.05,m.alloy);
    tb.box('tower entry threshold',[3.4,.10,2.5],[0,.10,8.0],m.paving);tb.box('tower entrance canopy',[4.5,.18,3.3],[0,3.05,8.2],m.ivory);for(const side of [-1,1])tb.box('tower entry frame',[.10,2.6,.10],[side*1.25,1.6,6.9],m.alloy);tb.box('tower door glass',[2.4,2.45,.06],[0,1.7,6.85],m.glass);
   }else{
    // Spectator side: open red braced frame around a stair core (photos 02/07); proportions estimated.
    const red=m.stairRed??=new THREE.MeshPhysicalMaterial({color:'#b5262b',metalness:.35,roughness:.38,clearcoat:.6,clearcoatRoughness:.25});
    // Clad red tower with a large framed opening on the faces toward the straight (photo 07).
    const H=towerTop-.55,open0=H*.38,open1=H*.62;
    tb.box('red tower cladding',[9.4,open0,13.3],[0,.55+open0/2,0],red);tb.box('red tower cladding',[9.4,H-open1,13.3],[0,.55+open1+(H-open1)/2,0],red);
    for(const sx of [-1,1])tb.box('red tower cladding',[2.2,open1-open0,13.3],[sx*3.6,.55+(open0+open1)/2,0],red);
    tb.box('red tower opening core',[5.0,open1-open0,12.4],[0,.55+(open0+open1)/2,0],m.concrete);
    for(const sz of [-1,1]){tb.box('red tower opening frame',[5.4,.35,.4],[0,.55+open0,sz*6.55],m.ivory);tb.box('red tower opening frame',[5.4,.35,.4],[0,.55+open1,sz*6.55],m.ivory);for(const sx of [-1,1])tb.box('red tower opening frame',[.35,open1-open0,.4],[sx*2.55,.55+(open0+open1)/2,sz*6.55],m.ivory);}
    tb.box('red tower entry threshold',[3.4,.10,2.5],[0,.10,8.6],m.paving);
   }
   tb.finish();
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
 return {root,stats,setNight(v){bridgeNight.value=v;m.glow.emissiveIntensity=v*2.3;m.warmGlass.emissiveIntensity=v*.48;m.glass.emissive.set('#d7c2a0');m.glass.emissiveIntensity=v*.14;},setWetness(v){m.paving.roughness=.91-v*.38;m.paving.color.setRGB(.30-v*.04,.33-v*.04,.32-v*.04);}};
}
