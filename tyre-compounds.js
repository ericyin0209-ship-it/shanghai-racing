import * as THREE from 'three';

// Colour conventions follow Pirelli; tread profiles are authored approximations.
export const compoundColours={soft:'#d7393c',medium:'#f1cf36',hard:'#e7e6de',intermediate:'#38b46b',wet:'#3795dd'};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function createWetTreadGeometry(width,fullWet){
  const around=512,across=64,half=width/2,positions=[],uvs=[],indices=[];
  // Additional rows close the shoulders down to the rim while keeping the source dimensions.
  const profile=[[-1,.235],[-1,.28]];
  for(let j=0;j<=across;j++){const x=j/across*2-1;profile.push([x,.36-.055*smooth(.70,1,Math.abs(x))]);}
  profile.push([1,.28],[1,.235]);
  for(let j=0;j<profile.length;j++)for(let i=0;i<=around;i++){
    const [fraction,base]=profile[j],x=fraction*half,theta=i/around*Math.PI*2;
    let cut=0;
    if(j>=2&&j<=across+2){
      for(const channel of [-.64,-.22,.22,.64])cut=Math.max(cut,1-smooth(.002,.005,Math.abs(x-channel*half)));
      const phase=theta/(Math.PI*2)*(fullWet?72:56)+Math.abs(fraction)*(fullWet?1.6:1.15);
      const seam=Math.abs(phase-Math.round(phase));
      const lateral=(1-smooth(.07,.18,seam))*smooth(.08,.22,Math.abs(fraction));
      cut=Math.max(cut,lateral)*(1-smooth(.88,1,Math.abs(fraction)));
    }
    const radius=base-cut*(fullWet?.005:.0035);
    positions.push(x,radius*Math.cos(theta),radius*Math.sin(theta));uvs.push(i/around*Math.PI*.72*35.355,fraction*half*35.355);
  }
  const stride=around+1;
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<around;i++){const a=j*stride+i,b=a+1,d=a+stride,c=d+1;indices.push(a,b,d,b,c,d);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  // Weld only normals at the angular seam, preserving the UV boundary.
  const normals=geometry.attributes.normal;
  for(let j=0;j<profile.length;j++){const a=j*stride,b=a+around,n=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

const treadCache=new Map();
export function createTyreCompounds(wheels,inkMaterials){
  const wetSets=wheels.map((spin,index)=>{
    const holder=spin.userData.assembly||spin,original=holder.children.filter(o=>o.name.endsWith('-tread'));
    const material=original[0]?.material;if(!material)return null;
    const set={original,intermediate:null,wet:null};
    set.ensure=compound=>{
      if(set[compound])return set[compound];
      const rubber=material.clone();rubber.roughness=compound==='wet'?.65:.72;
      const width=index<2?.335:.429,key=width+':'+compound;
      if(!treadCache.has(key)){const geometry=createWetTreadGeometry(width,compound==='wet');geometry.userData.shared=true;treadCache.set(key,geometry);}
      const mesh=new THREE.Mesh(treadCache.get(key),rubber);
      mesh.name='AMR23 '+compound+' tread';mesh.castShadow=mesh.receiveShadow=true;mesh.visible=false;holder.add(mesh);set[compound]=mesh;return mesh;
    };
    return set;
  });
  let previous=null;
  return {update(compound='medium'){
    if(compound===previous)return;previous=compound;
    for(const mat of inkMaterials)mat.color.set(compoundColours[compound]||compoundColours.medium);
    for(const set of wetSets){if(!set)continue;const wet=compound==='wet'||compound==='intermediate';for(const mesh of set.original)mesh.visible=!wet;if(wet)set.ensure(compound);if(set.intermediate)set.intermediate.visible=compound==='intermediate';if(set.wet)set.wet.visible=compound==='wet';}
  }};
}
