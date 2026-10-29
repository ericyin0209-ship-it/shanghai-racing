import * as THREE from 'three';
const Y=new THREE.Vector3(0,1,0),identity=new THREE.Matrix4();
export function createAccessBuilder(root){
 const batches=new Map(),pose=new THREE.Object3D();
 function add(name,size,position,material,frame=identity,quaternion=null){
  const key=name+':'+size.join(':')+':'+material.uuid;
  if(!batches.has(key))batches.set(key,{name,geometry:new THREE.BoxGeometry(...size),material,items:[]});
  pose.position.set(...position);pose.scale.set(1,1,1);pose.quaternion.identity();if(quaternion)pose.quaternion.copy(quaternion);pose.updateMatrix();batches.get(key).items.push(new THREE.Matrix4().multiplyMatrices(frame,pose.matrix));
 }
 function beam(name,a,b,width,depth,material,frame=identity){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from),q=new THREE.Quaternion().setFromUnitVectors(Y,delta.clone().normalize());add(name,[width,delta.length(),depth],from.add(to).multiplyScalar(.5).toArray(),material,frame,q);}
 function finish(){let instances=0;for(const b of batches.values()){const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.items.length);mesh.name=b.name;mesh.castShadow=mesh.receiveShadow=true;b.items.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);instances+=b.items.length;}return instances;}
 return {box:add,beam,finish};
}
export function accessMaterials(){
 const metal=new THREE.MeshStandardMaterial({color:'#879697',metalness:.7,roughness:.4}),cladding=metal.clone();
 cladding.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 facadeUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfacadeUV=uv;');
  shader.fragmentShader='varying vec2 facadeUV;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 weaveUV=facadeUV*vec2(110.,180.);vec2 aa=fwidth(weaveUV);vec2 bars=1.-smoothstep(vec2(.10),vec2(.10)+aa,abs(fract(weaveUV)-.5));float detail=1.-smoothstep(.3,.8,max(aa.x,aa.y));diffuseColor.rgb*=mix(.92,mix(.76,1.05,max(bars.x,bars.y)),detail);
`);
 };cladding.customProgramCacheKey=()=> 'spectator-woven-facade-208';
 return {concrete:new THREE.MeshStandardMaterial({color:'#aaa99f',roughness:.91}),dark:new THREE.MeshStandardMaterial({color:'#263638',roughness:.7}),metal,cladding,glass:new THREE.MeshStandardMaterial({color:'#3d555c',metalness:.35,roughness:.22})};
}
export function addReturnStair(builder,{x,z,levels,materials,frame=identity,name='Spectator stairs'}){
 const {box,beam}=builder,{concrete,metal}=materials,run=4.64,width=1.9,landingDepth=1.86,landingZ=run/2+landingDepth/2,flights=[];
 box(name+' foundation',[6.8,.24,8.7],[x,levels[0]-.12,z],concrete,frame);
 for(let floor=0;floor<levels.length-1;floor++){
  const half=(levels[floor+1]-levels[floor])/2,n=Math.ceil(half/.175),riser=half/n,tread=run/n;
  for(let leg=0;leg<2;leg++){
   const xx=x+(leg?1.15:-1.15),base=levels[floor]+leg*half,direction=leg?-1:1,start=z-direction*run/2,end=z+direction*run/2;
   for(let i=0;i<n;i++){
    const top=base+(i+1)*riser,zz=start+direction*(i+.5)*tread;
    box(name+' concrete treads',[width,riser+.035,tread+.006],[xx,top-(riser+.035)/2,zz],concrete,frame);
    if(i%3===0||i===n-1)for(const side of [-1,1])box(name+' balusters',[.045,1.04,.045],[xx+side*(width/2+.04),top+.52,zz],metal,frame);
   }
   beam(name+' reinforced waist',[xx,base-.12,start],[xx,base+half-.12,end],width,.18,concrete,frame);
   for(const side of [-1,1])beam(name+' continuous handrails',[xx+side*(width/2+.04),base+1.05,start],[xx+side*(width/2+.04),base+half+1.05,end],.045,.045,metal,frame);
   flights.push({floor,leg,riser,tread,width,bottom:base,top:base+half,start:[xx,start],end:[xx,end]});
  }
  const middle=levels[floor]+half;
  box(name+' intermediate landing',[5.2,.24,landingDepth],[x,middle-.12,z+landingZ],concrete,frame);
  beam(name+' intermediate landing guard',[x-2.6,middle+1.05,z+4.18],[x+2.6,middle+1.05,z+4.18],.045,.045,metal,frame);
  for(const side of [-1,1])for(const zz of [z+2.32,z+4.18])box(name+' landing guard posts',[.045,1.05,.045],[x+side*2.6,middle+.525,zz],metal,frame);
 }
 for(const level of levels){
  box(name+' floor landing',[5.2,.24,landingDepth],[x,level-.12,z-landingZ],concrete,frame);
  // Keep the side entrance at the front landing open to the concourse bridge.
  beam(name+' landing guard',[x-2.6,level+1.05,z-4.18],[x+2.6,level+1.05,z-4.18],.045,.045,metal,frame);
 }
 return {x,z,levels:levels.slice(),flights,bridgeZ:z-landingZ,landingZ,frame:frame.toArray()};
}
export function addLotusAccess(builder,frame,materials,index,width=33){
 const L=width-1.4,H=width/2;
 const {box}=builder,{concrete,metal,cladding}=materials,dark=materials.infill??=new THREE.MeshStandardMaterial({color:'#3a4142',roughness:.95});
 const levels=[.24,5.69,10.86],stair=addReturnStair(builder,{x:-13.4,z:0,levels,materials,frame,name:'Lotus access'});
 for(const level of levels){
  box('Lotus enclosed concourse floors',[6.1,.28,L],[-6.35,level-.14,0],concrete,frame);
  box('Lotus stair-to-concourse bridge',[1.5,.24,1.86],[-10.1,level-.12,stair.bridgeZ],concrete,frame);
 }
 for(const zz of [-(H-.6),H-.6])box('Lotus concrete end walls',[6.1,13.4,.24],[-6.35,6.8,zz],concrete,frame);
 // Segmented facade with a ground entrance and an open portal into each stair landing.
 const bays=Math.max(2,Math.round(L/4)),bayW=L/bays;
 for(let bay=0;bay<bays;bay++){
  const zz=-L/2+bayW*(bay+.5),hb=bayW/2-.15;
  box('Lotus rear concrete piers',[.7,10.7,.55],[-9.3,5.7,zz-bayW/2+.1],concrete,frame);
  const cut=(intervals)=>{let pieces=[[zz-hb,zz+hb]];for(const [lo,hi]of intervals)pieces=pieces.flatMap(([a,b])=>hi<=a||lo>=b?[[a,b]]:[[a,Math.max(a,lo)],[Math.min(b,hi),b]].filter(([l,r])=>r-l>.02));return pieces;};
  const portal=[stair.bridgeZ-1.1,stair.bridgeZ+1.1];
  // Open concrete frame (rear elevation photo 08): recessed dark infill behind slab edges and piers.
  // The openings read as deep shadow under the rake in photo 08, so the infill sits 1.4 m behind the pier faces.
  for(const [a,b]of cut([portal,[-1.6,1.6]]))box('Lotus rear recessed infill',[.12,4.4,b-a],[-7.9,3.05,(a+b)/2],dark,frame);
  for(const [a,b]of cut([portal])){box('Lotus rear recessed infill',[.12,4.65,b-a],[-7.9,8.25,(a+b)/2],dark,frame);box('Lotus top gallery screen',[.12,1.1,b-a],[-9.49,11.55,(a+b)/2],cladding,frame);}
 }
 box('Lotus sheltered entrance header',[.38,.7,3.5],[-9.65,3.0,0],concrete,frame);
 for(const zz of [-1.75,1.75])box('Lotus entrance jambs',[.38,2.9,.20],[-9.65,1.55,zz],concrete,frame);
 // Stair enclosure leaves glazed side slots so the flights can be read from outside.
 for(const xx of [-16.85,-9.95]){
  for(const zz of [-4.24,4.24])box('Lotus stair enclosure corners',[.22,13.6,.22],[xx,6.9,zz],concrete,frame);
 }
 for(const zz of [-4.25,4.25]){
  box('Lotus stair side sill',[6.8,1.15,.14],[-13.4,.82,zz],metal,frame);
  for(const level of levels)box('Lotus access floor bands',[6.8,.20,.20],[-13.4,level-.1,zz],metal,frame);
 }
 box('Lotus access tower roof',[7.25,.2,9.05],[-13.4,13.7,0],metal,frame);
 for(const level of levels.slice(1))box('Lotus rear slab edges',[.6,.38,width-1.4],[-9.35,level-.21,0],concrete,frame);
 box('Lotus concourse roof',[6.6,.18,width-.8],[-6.5,13.65,0],metal,frame);
 box('Lotus spectator rear apron',[13.8,.12,width-.6],[-10.4,.06,0],concrete,frame);
 return {...stair,unit:index,topConcourse:10.86,roofUnderside:13.56};
}
