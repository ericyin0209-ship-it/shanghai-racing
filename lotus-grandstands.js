import {constructionFinish,landmarkMaterials,createLandmarkBuilder} from './circuit-surface.js?v=218i';
import {createAccessBuilder,accessMaterials,addLotusAccess} from './spectator-access.js';
import * as THREE from 'three';

// Silhouette and terrace construction informed by Tilke's Shanghai photographs.
// Dimensions and locations follow the existing approximate site layout, not survey data.
export function lotusHeight(u){return 7.1*Math.pow(Math.max(0,Math.min(1,u)),.83);}
export function createLotusGrandstands(scene,track,seatGeometry){
 const root=new THREE.Group();root.name='Shanghai lotus canopy and spectator terraces';scene.add(root);
 const fabric=new THREE.MeshPhysicalMaterial({color:'#d3d4c7',roughness:.70,metalness:.01,side:THREE.DoubleSide,sheen:.25,sheenColor:'#e6e5d5',sheenRoughness:.85});
 fabric.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 sailUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsailUV=uv;');shader.fragmentShader='varying vec2 sailUV;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float stitch=abs(fract(sailUV.x*24.)-.5);float aa=fwidth(sailUV.x*24.);float seam=1.-smoothstep(.012,.012+aa,stitch);float fade=1.-smoothstep(.08,.35,aa);diffuseColor.rgb*=.95+.05*sin(sailUV.y*3.14)-seam*.10*fade;`);};fabric.customProgramCacheKey=()=> 'lotus-fabric-218';
 const steel=new THREE.MeshStandardMaterial({color:'#7d8585',metalness:.75,roughness:.4});
 const concrete=new THREE.MeshStandardMaterial({color:'#aaa89f',roughness:.92});
 const seatMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.62});
 const rows=28,segments=128,positions=[],indices=[],uv=[];
 for(let r=0;r<=rows;r++)for(let i=0;i<=segments;i++){
  const u=.035+.965*r/rows,t=i/segments*Math.PI*2,radius=20*u;
  positions.push(Math.cos(t)*radius,lotusHeight(u)-.10*Math.sin(t*24)*u*u,Math.sin(t)*radius);uv.push(i/segments,u);
  if(r&&i){const a=r*(segments+1)+i,b=a-1,c=a-segments-1,d=c-1;indices.push(a,c,b,b,c,d);}
 }
 const membrane=new THREE.BufferGeometry();membrane.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));membrane.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));membrane.setIndex(indices);membrane.computeVertexNormals();
 const batch=new Map(),pose=new THREE.Object3D();
 function add(name,geometry,material,matrix,colour=null){if(!batch.has(name))batch.set(name,{geometry,material,items:[]});batch.get(name).items.push({matrix,colour});}
 function place(name,geometry,material,frame,p,rotation=[0,0,0],scale=[1,1,1],colour=null){pose.position.set(...p);pose.rotation.set(...rotation);pose.scale.set(...scale);pose.updateMatrix();add(name,geometry,material,new THREE.Matrix4().multiplyMatrices(frame,pose.matrix),colour);}
 const slabs=new THREE.BoxGeometry(.77,.32,31.6),post=new THREE.CylinderGeometry(.032,.032,1,8),column=new THREE.CylinderGeometry(.43,.58,14.4,24),ring=new THREE.TorusGeometry(20,.11,8,128),beamGeometry=new THREE.CylinderGeometry(.075,.075,1,10);
 const ribCurves=[];for(let j=0;j<24;j++){const t=j*Math.PI/12,points=[];for(let k=0;k<=12;k++){const u=k/12;points.push(new THREE.Vector3(Math.cos(t)*19.9*u,lotusHeight(u)-.08,Math.sin(t)*19.9*u));}ribCurves.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.065,6,false));}
 const collar=new THREE.CylinderGeometry(.95,.75,.28,32),deck=new THREE.BoxGeometry(3.4,.28,32);
 const support=(name,frame,a,b,r=.1)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);pose.position.copy(from).add(to).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());pose.scale.set(r/.075,delta.length(),r/.075);pose.updateMatrix();add(name,beamGeometry,steel,new THREE.Matrix4().multiplyMatrices(frame,pose.matrix));};
 constructionFinish(concrete);const finishMaterials=landmarkMaterials(),landscape=createLandmarkBuilder(root);const accessBuilder=createAccessBuilder(root),accessMaterial=accessMaterials(),accessRoutes=[];
 let seatCount=0;
 for(let canopy=0;canopy<12;canopy++){
  const f=track.at(track.length*.64+canopy*33,-48),frame=new THREE.Matrix4().makeRotationY(f.yaw);frame.setPosition(f.p.x,0,f.p.z);
  landscape.box('lotus continuous public promenade',[8,.12,32.98],[-22,.045,0],finishMaterials.paving,0,frame);
  for(const zz of [-13,13]){landscape.box('lotus grounded planter',[1.5,.45,3.0],[-22,.225,zz],finishMaterials.concrete,0,frame);landscape.box('lotus planted hedge',[1.2,.42,2.7],[-22,.64,zz],finishMaterials.foliage,0,frame);}
  landscape.box('lotus entry fascia',[.16,.48,3.4],[-9.88,3.12,0],finishMaterials.dark,0,frame);
  landscape.box('lotus column base',[1.5,.26,1.5],[0,.13,0],finishMaterials.concrete,0,frame);
  accessRoutes.push(addLotusAccess(accessBuilder,frame,accessMaterial,canopy));
  place('Lotus tension membranes',membrane,fabric,frame,[0,14.4,0]);place('Lotus structural columns',column,steel,frame,[0,7.2,0]);
  place('Lotus circular edge members',ring,steel,frame,[0,21.5,0],[Math.PI/2,0,0]);
  place('Lotus column collars',collar,steel,frame,[0,14.28,0]);
  support('Lotus central masts',frame,[0,14.5,0],[0,24.2,0],.105);
  for(let j=0;j<24;j++){place('Lotus radial seam '+j,ribCurves[j],steel,frame,[0,14.4,0]);if(j%4===0){const t=j*Math.PI/12;support('Lotus upper tension cables',frame,[0,23.8,0],[Math.cos(t)*19.8,21.6,Math.sin(t)*19.8],.021);}}
  for(let row=0;row<24;row++){
   const x=18.25-row*.75,y=.6+row*.45;place('Lotus stepped concrete terraces',slabs,concrete,frame,[x,y,0]);
   for(let col=0;col<50;col++){if(col%17<2)continue;const colour=new THREE.Color((row*13+col*7+canopy)%11<6?'#d6af58':(row+col)%3?'#a74532':'#c5c1ae');place('Lotus moulded seat shells',seatGeometry,seatMaterial,frame,[x,y+.34,(col-24.5)*.62],[0,Math.PI/2,0],[1,1,1],colour);seatCount++;}
   for(const z of [-15.9,15.9])place('Lotus stair guard posts',post,steel,frame,[x,y+.69,z]);
  }
  for(const z of [-15.9,15.9]){
   support('Lotus stair handrails',frame,[18.3,1.8,z],[1,12.15,z],.032);
   support('Lotus raked structural beams',frame,[19,.15,z],[.2,11,z],.22);
   support('Lotus rear columns',frame,[-.3,.1,z],[-.3,11.25,z],.23);
  }
  place('Lotus rear access deck',deck,concrete,frame,[-1.6,10.72,0]);
  for(let z=-15.5;z<=15.5;z+=1.55)place('Lotus rear guard posts',post,steel,frame,[-3.2,11.35,z]);
  support('Lotus rear handrail',frame,[-3.2,11.85,-15.5],[-3.2,11.85,15.5],.037);
 }
 for(const [name,b]of batch){const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.items.length);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;b.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);if(item.colour)mesh.setColorAt(i,item.colour);});root.add(mesh);}
 const accessInstances=accessBuilder.finish();const landscapeStats=landscape.finish();
 root.userData={accessRoutes,accessBuildings:accessRoutes.length,accessInstances,surveyed:false,canopies:12,seats:seatCount,source:'Tilke 2025 Architecture Portfolio pp.32–33',instances:[...batch.values()].reduce((n,b)=>n+b.items.length,0)};return root;
}
