import * as THREE from 'three';
// Share a conforming overlay only when its source tread geometry is shared.
const fittedTreads=new WeakMap();
export function fittedDustGeometry(source){
 if(fittedTreads.has(source))return fittedTreads.get(source);
 const geometry=source.clone(),positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++){const y=positions.getY(i),z=positions.getZ(i),radius=Math.hypot(y,z);if(radius>.001){const factor=1+.00035/radius;positions.setY(i,y*factor);positions.setZ(i,z*factor);}}
 geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.shared=true;fittedTreads.set(source,geometry);return geometry;
}
export function createTyreDust(wheels){
 const overlays=[],amounts=new Float32Array(4);let seed=7813;
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<4;i++){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
  for(let j=0;j<260;j++){const x=random()*512,y=random()*256,r=.4+random()*1.6;ctx.fillStyle=`rgba(156,147,124,${.06+random()*.18})`;ctx.beginPath();ctx.ellipse(x,y,r*1.8,r,random()*3,0,Math.PI*2);ctx.fill();}
  for(let j=0;j<7;j++){ctx.fillStyle='rgba(127,124,112,.18)';ctx.beginPath();ctx.ellipse(random()*512,random()*256,7+random()*12,1.2+random()*3,random()*.8,0,Math.PI*2);ctx.fill();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map:texture,color:'#b4ac98',roughness:.94,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const holder=wheels[i].userData.assembly||wheels[i],original=holder.children.find(o=>o.name.endsWith('-tread'));
  const mesh=new THREE.Mesh(original?fittedDustGeometry(original.geometry):new THREE.BufferGeometry(),material);mesh.name='Tyre dust / rotating tread';mesh.visible=false;holder.add(mesh);overlays.push(mesh);
 }
 return {update(dt,v,wet,enabled){
  for(let i=0;i<4;i++){
   const target=enabled&&v.speed>.5?Math.min(.55,.10+(v.distance||0)/10000+((v.surfaceType==='gravel'||v.surfaceType==='grass'?.20:0)))*(1-wet*.82):0;
   amounts[i]+=(target-amounts[i])*(1-Math.exp(-dt*(target>amounts[i]?.3:1.2)));
   const mesh=overlays[i];mesh.visible=enabled&&amounts[i]>.002;mesh.material.opacity=amounts[i];
   if(mesh.visible){const tread=(wheels[i].userData.assembly||wheels[i]).children.find(o=>o.visible&&(o.name.endsWith('-tread')||/^AMR23 (intermediate|wet) tread$/.test(o.name)));if(tread)mesh.geometry=fittedDustGeometry(tread.geometry);}
  }
 },reset(){amounts.fill(0);for(const mesh of overlays)mesh.visible=false;}};
}
