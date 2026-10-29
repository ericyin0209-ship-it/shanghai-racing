import {constructionFinish,landmarkMaterials,createLandmarkBuilder} from './circuit-surface.js?v=229release';
import {createAccessBuilder,accessMaterials,addLotusAccess} from './spectator-access.js?v=229release';
import * as THREE from 'three';

// preview.25: the two lotus-canopy stands are placed on the OpenStreetMap footprints
// "H看台" and "K看台" beside the T14 hairpin (they were previously one row near T13).
// 13 canopies per stand, spacing and radius fitted to the scalloped OSM outline and
// checked against the 2018 SkySat image; heights are estimates from photo 08 (2004).
// Stands are kept behind the game's trackside barrier (19 m), so a stand may sit a few
// metres further from the track than the mapped outline. Not survey data.
export const LOTUS_RADIUS=14.2,LOTUS_PER_STAND=13,LOTUS_RISE=5.0,LOTUS_COLUMN=14.4;
export function lotusHeight(u){return LOTUS_RISE*Math.pow(Math.max(0,Math.min(1,u)),.83);}
export const lotusViews=[];
// Footprint query used to keep scattered trees and props off the stands (front podium to rear promenade).
export function nearLotus(x,z,margin=6){for(const v of lotusViews){const dx=x-v.centre[0],dz=z-v.centre[1],a=dx*v.axis[0]+dz*v.axis[1],b=dx*v.front[0]+dz*v.front[1];if(Math.abs(a)<v.half+margin&&b>-32-margin&&b<14+margin)return true;}return false;}
const BARRIER=19,CLEARANCE=2.2,ROWS=12,ROW_DEPTH=.75,ROW_RISE=.45,TOP_ROW_Y=11.4;

function standFrames(feature,track){
 const p=feature.points.slice(0,-1),n=p.length,c=p.reduce((s,a)=>[s[0]+a[0]/n,s[1]+a[1]/n],[0,0]);
 let xx=0,xz=0,zz=0;for(const a of p){const dx=a[0]-c[0],dz=a[1]-c[1];xx+=dx*dx;xz+=dx*dz;zz+=dz*dz;}
 const angle=.5*Math.atan2(2*xz,xx-zz),ax=[Math.cos(angle),Math.sin(angle)];let nrm=[-ax[1],ax[0]];
 const near=track.nearest(c[0],c[1]),probe=track.at(near.s,0).p;if((probe.x-c[0])*nrm[0]+(probe.z-c[1])*nrm[1]<0)nrm=[-nrm[0],-nrm[1]];
 let amin=1e9,amax=-1e9,bmax=-1e9;for(const a of p){const u=(a[0]-c[0])*ax[0]+(a[1]-c[1])*ax[1],v=(a[0]-c[0])*nrm[0]+(a[1]-c[1])*nrm[1];amin=Math.min(amin,u);amax=Math.max(amax,u);bmax=Math.max(bmax,v);}
 // End canopies are tangent to the outline ends; the front of the scalloped outline is one radius ahead of the columns.
 const first=amin+LOTUS_RADIUS,last=amax-LOTUS_RADIUS,spacing=(last-first)/(LOTUS_PER_STAND-1);let back=bmax-LOTUS_RADIUS;
 const point=(u,v)=>[c[0]+ax[0]*u+nrm[0]*v,c[1]+ax[1]*u+nrm[1]*v];
 let shift=0;const need=BARRIER+CLEARANCE+(ROWS-1)*ROW_DEPTH+.6;
 for(let i=0;i<LOTUS_PER_STAND;i++){const q=point(first+i*spacing,back),d=track.nearest(q[0],q[1]).distance;shift=Math.max(shift,need-d);}
 back-=shift;
 // Frame +x points to the track, +z along the stand.
 const yaw=Math.atan2(-nrm[1],nrm[0]),frames=[];
 for(let i=0;i<LOTUS_PER_STAND;i++){const q=point(first+i*spacing,back),m=new THREE.Matrix4().makeRotationY(yaw);m.setPosition(q[0],0,q[1]);frames.push(m);}
 return {frames,spacing,shift:+shift.toFixed(2),name:feature.tags.name,centre:point((first+last)/2,back),axis:ax,front:nrm};
}

export async function createLotusGrandstands(scene,track,seatGeometry){
 const root=new THREE.Group();root.name='Shanghai lotus canopy and spectator terraces';scene.add(root);
 const data=await fetch('./surroundings-data.json').then(r=>r.json());
 const features=['H看台','K看台'].map(name=>data.features.find(f=>f.kind==='building'&&f.tags?.name===name)).filter(Boolean);
 const fabric=new THREE.MeshPhysicalMaterial({color:'#d3d4c7',roughness:.70,metalness:.01,side:THREE.DoubleSide,sheen:.25,sheenColor:'#e6e5d5',sheenRoughness:.85});
 fabric.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 sailUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsailUV=uv;');shader.fragmentShader='varying vec2 sailUV;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float stitch=abs(fract(sailUV.x*24.)-.5);float aa=fwidth(sailUV.x*24.);float seam=1.-smoothstep(.012,.012+aa,stitch);float fade=1.-smoothstep(.08,.35,aa);diffuseColor.rgb*=.95+.05*sin(sailUV.y*3.14)-seam*.10*fade;`);};fabric.customProgramCacheKey=()=> 'lotus-fabric-218';
 const steel=new THREE.MeshStandardMaterial({color:'#d9dcd6',metalness:.35,roughness:.45});
 const concrete=new THREE.MeshStandardMaterial({color:'#aaa89f',roughness:.92});
 const seatMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.62});
 const R=LOTUS_RADIUS;
 function membraneGeometry(rows,segments){const positions=[],indices=[],uv=[];
  for(let r=0;r<=rows;r++)for(let i=0;i<=segments;i++){
   const u=.05+.95*r/rows,t=i/segments*Math.PI*2,radius=R*u;
   positions.push(Math.cos(t)*radius,lotusHeight(u)-.07*Math.sin(t*24)*u*u,Math.sin(t)*radius);uv.push(i/segments,u);
   if(r&&i){const a=r*(segments+1)+i,b=a-1,c=a-segments-1,d=c-1;indices.push(a,c,b,b,c,d);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
 // preview.27: screen-size LOD for the 26 membranes (7168 tris each). Mid keeps 3 vertices per scallop of the 24-lobe
 // edge; far keeps 2, so the rim still reads as scalloped from the circuit. The switch is sized on a 5 m patch of membrane
 // rather than the whole 21 m canopy: mid from ~170 m, far from ~690 m at 720 px height.
 const membrane=membraneGeometry(28,128);membrane.userData.environmentLOD=[membraneGeometry(14,72),membraneGeometry(8,48)];membrane.userData.lodMetricSize=5;
 const batch=new Map(),pose=new THREE.Object3D();
 function add(name,geometry,material,matrix,colour=null){if(!batch.has(name))batch.set(name,{geometry,material,items:[]});batch.get(name).items.push({matrix,colour});}
 function place(name,geometry,material,frame,p,rotation=[0,0,0],scale=[1,1,1],colour=null){pose.position.set(...p);pose.rotation.set(...rotation);pose.scale.set(...scale);pose.updateMatrix();add(name,geometry,material,new THREE.Matrix4().multiplyMatrices(frame,pose.matrix),colour);}
 const slab=new THREE.BoxGeometry(1,1,1),post=new THREE.CylinderGeometry(.032,.032,1,8),column=new THREE.CylinderGeometry(.36,.5,1,24),ring=new THREE.TorusGeometry(R,.10,8,128),beamGeometry=new THREE.CylinderGeometry(.075,.075,1,10),spire=new THREE.ConeGeometry(.16,1,12);
 const ribCurves=[];for(let j=0;j<16;j++){const t=j*Math.PI/8,points=[];for(let k=0;k<=12;k++){const u=k/12;points.push(new THREE.Vector3(Math.cos(t)*(R-.1)*u,lotusHeight(u)-.06,Math.sin(t)*(R-.1)*u));}const curve=new THREE.CatmullRomCurve3(points),rib=new THREE.TubeGeometry(curve,20,.055,6,false);rib.userData.environmentLOD=[new THREE.TubeGeometry(curve,10,.055,4,false),new THREE.TubeGeometry(curve,6,.055,3,false)];rib.userData.lodMetricSize=4;ribCurves.push(rib);}
 const collar=new THREE.CylinderGeometry(.85,.68,.28,32);
 const support=(name,frame,a,b,r=.1)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);pose.position.copy(from).add(to).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());pose.scale.set(r/.075,delta.length(),r/.075);pose.updateMatrix();add(name,beamGeometry,steel,new THREE.Matrix4().multiplyMatrices(frame,pose.matrix));pose.quaternion.identity();};
 constructionFinish(concrete);const finishMaterials=landmarkMaterials(),landscape=createLandmarkBuilder(root);const accessBuilder=createAccessBuilder(root),accessMaterial=accessMaterials(),accessRoutes=[];
 // Photo 08: the rear frame reads mid-grey, not near-white; only the lotus stands' own material copies are toned.
 accessMaterial.concrete.color.set('#94958f');concrete.color.set('#9c9c95');
 let seatCount=0,unit=0;const stands=[];
 for(const feature of features){
  const stand=standFrames(feature,track);lotusViews.push({name:stand.name,centre:stand.centre,axis:stand.axis,front:stand.front,half:stand.spacing*(LOTUS_PER_STAND-1)/2+LOTUS_RADIUS});stands.push({name:stand.name,spacing:+stand.spacing.toFixed(2),shiftFromOutline:stand.shift,centre:stand.centre.map(v=>+v.toFixed(1))});
  const W=stand.spacing,half=W/2,seatCols=Math.floor((W-2.4)/.62);
  stand.frames.forEach((frame,canopy)=>{
   // Alternate collar heights: photo 08 shows clearly high and low canopies in turn (~3.5-4 m apart, scaled from the
   // 12 m rear deck); 1.1 m was hardly visible. Estimate, not survey.
   const lift=canopy%2?3.6:0,collarY=LOTUS_COLUMN+lift;
   landscape.box('lotus continuous public promenade',[8,.12,W-.02],[-22,.045,0],finishMaterials.paving,0,frame);
   for(const zz of [-half+3.2,half-3.2]){landscape.box('lotus grounded planter',[1.5,.45,2.4],[-22,.225,zz],finishMaterials.concrete,0,frame);landscape.box('lotus planted hedge',[1.2,.42,2.1],[-22,.64,zz],finishMaterials.foliage,0,frame);}
   landscape.box('lotus column base',[1.4,.26,1.4],[0,.13,0],finishMaterials.concrete,0,frame);
   accessRoutes.push(addLotusAccess(accessBuilder,frame,accessMaterial,unit++,W));
   place('Lotus tension membranes',membrane,fabric,frame,[0,collarY,0]);
   place('Lotus structural columns',column,steel,frame,[0,collarY/2,0],[0,0,0],[1,collarY,1]);
   place('Lotus circular edge members',ring,steel,frame,[0,collarY+LOTUS_RISE+.02,0],[Math.PI/2,0,0]);
   place('Lotus column collars',collar,steel,frame,[0,collarY-.12,0]);
   const mastTop=collarY+11.2;
   support('Lotus central masts',frame,[0,collarY,0],[0,mastTop-1.4,0],.13);
   place('Lotus mast spires',spire,steel,frame,[0,mastTop-.7,0],[0,0,0],[1,1.4,1]);
   for(let j=0;j<16;j++){place('Lotus radial seam '+j,ribCurves[j],steel,frame,[0,collarY,0]);if(j%2===0){const t=j*Math.PI/8;support('Lotus upper tension cables',frame,[0,mastTop-2.2,0],[Math.cos(t)*(R-.25),collarY+LOTUS_RISE,Math.sin(t)*(R-.25)],.018);}}
   // Raked terraces in front of the column line, with a podium wall under the first row.
   for(let row=0;row<ROWS;row++){
    const x=.9+(ROWS-1-row)*ROW_DEPTH,y=TOP_ROW_Y-(ROWS-1-row)*ROW_RISE;
    place('Lotus stepped concrete terraces',slab,concrete,frame,[x,y,0],[0,0,0],[ROW_DEPTH+.02,.32,W-.3]);
    for(let col=0;col<seatCols;col++){if(col%14<2&&col>1)continue;const colour=new THREE.Color((row*13+col*7+canopy)%11<6?'#d6af58':(row+col)%3?'#a74532':'#c5c1ae');place('Lotus moulded seat shells',seatGeometry,seatMaterial,frame,[x,y+.34,(col-(seatCols-1)/2)*.62],[0,Math.PI/2,0],[1,1,1],colour);seatCount++;}
    for(const z of [-half+.3,half-.3])place('Lotus stair guard posts',post,steel,frame,[x,y+.69,z]);
   }
   const front=.9+(ROWS-1)*ROW_DEPTH,frontY=TOP_ROW_Y-(ROWS-1)*ROW_RISE;
   place('Lotus podium front wall',slab,concrete,frame,[front+.5,(frontY-.16)/2,0],[0,0,0],[.35,frontY-.16,W-.02]);
   support('Lotus front guard rail',frame,[front+.55,frontY+.95,-half+.15],[front+.55,frontY+.95,half-.15],.03);
   for(const z of [-half+.3,half-.3]){
    support('Lotus stair handrails',frame,[front+.4,frontY+1.0,z],[1,TOP_ROW_Y+.75,z],.032);
    support('Lotus raked structural beams',frame,[front+.4,frontY-.3,z],[.4,TOP_ROW_Y-.45,z],.22);
    support('Lotus rear columns',frame,[-.3,.1,z],[-.3,11.25,z],.23);
   }
   place('Lotus rear access deck',slab,concrete,frame,[-1.6,10.72,0],[0,0,0],[3.4,.28,W-.6]);
   for(let z=-half+.8;z<=half-.8;z+=1.55)place('Lotus rear guard posts',post,steel,frame,[-3.2,11.35,z]);
   support('Lotus rear handrail',frame,[-3.2,11.85,-half+.8],[-3.2,11.85,half-.8],.037);
  });
 }
 for(const [name,b]of batch){const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.items.length);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;b.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);if(item.colour)mesh.setColorAt(i,item.colour);});mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);}
 const accessInstances=accessBuilder.finish();landscape.finish();
 root.userData={accessRoutes,accessBuildings:accessRoutes.length,accessInstances,surveyed:false,stands,canopies:stands.length*LOTUS_PER_STAND,radius:LOTUS_RADIUS,seats:seatCount,source:'OSM H看台/K看台 footprints; Wikimedia photos 01 (2018) and 08 (2004); Tilke portfolio',instances:[...batch.values()].reduce((n,b)=>n+b.items.length,0)};
 return root;
}
