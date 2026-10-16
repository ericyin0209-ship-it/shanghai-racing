import * as THREE from 'three';
// Corrections are applied to imported render geometry; the supplied GLB stays intact.
export async function loadModelRepairs(){
 const read=async(url,json)=>{const r=await fetch(url);if(!r.ok)throw Error('无法读取赛车装配修正数据');return json?r.json():r.arrayBuffer();};
 const [metadata,buffer]=await Promise.all([read('assets/models/amr23-repairs.json',true),read('assets/models/amr23-repairs.bin',false)]);
 return createModelRepairs(metadata,buffer);
}
export function createModelRepairs(metadata,buffer){
 if(metadata.schema!==1)throw Error('赛车修正数据版本不兼容');
 const removed=new Set([...metadata.remove,...metadata.replace]),patches=new Map(metadata.patches.map(p=>[p.name,{...p,values:new Float32Array(buffer,p.byteOffset,p.count)}]));
 return {removed,apply(name,geometry){const patch=patches.get(name);if(!patch)return false;const position=geometry.attributes.position;if(position.count!==patch.count)throw Error('赛车模型与装配修正数据不匹配');for(let i=0;i<position.count;i++)position.setComponent(i,patch.axis,patch.values[i]);position.needsUpdate=true;geometry.computeVertexNormals();return true;}};
}
export function suspensionWeight(x,lo,hi){return Math.max(0,Math.min(1,(Math.abs(x)-lo-.018)/Math.max(.001,hi-lo-.043)));}
export function suspensionAccessory(name,centre){
 const side=centre.x>0?'left':'right';
 if(/^Front track rod\s*\|/i.test(name))return {part:'suspension-front-'+side,lo:.266,hi:.657};
 if(/^(Transmission\s*\|.*drive shaft|Driveshaft\s*\|)/i.test(name))return {part:'suspension-rear-'+side,lo:0,hi:.563};
 return null;
}
export function addMirrorFrontMarkings(chassis,centres){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,256);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f1f2ed';ctx.font='bold 208px Arial';ctx.fillText('BOSS',512,131);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;const material=new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.05,roughness:.4,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 for(const centre of centres){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.145,.028),material);mesh.name='Mirror front / fitted BOSS marking';mesh.position.copy(centre);chassis.add(mesh);}
}
