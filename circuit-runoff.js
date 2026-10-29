import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {T12_LAYERS} from './track-surfaces.js?v=229release';
// Turn 1-2 run-off. preview.27: the layers live in track-surfaces.js so physics reads the same paint/asphalt/gravel bands;
// the barrier line (19 m) is unchanged. Layering from photo 02 (2018 aerial), photo 07 (2005) and the 2018 SkySat image: painted green-teal band
// after the kerb on the tightening part of T1, grey asphalt run-off, then beige gravel up to the barrier.
// Real T1 run-off reaches well beyond 19 m; widening it would move barriers/collision and is left for a separate decision.
export function createTurnOneRunoff(scene,track,gravelMat){
 const root=new THREE.Group();root.name='Turn 1-2 run-off surfaces (visual)';scene.add(root);
 const mat=color=>Object.assign(new THREE.MeshStandardMaterial({color,roughness:.92,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
 const teal=mat('#3b8a81'),asphalt=mat('#555c5e');
 const gravel=gravelMat.clone();gravel.polygonOffsetFactor=gravel.polygonOffsetUnits=-3;
 const idx=s=>Math.round(s/track.length*track.n);
 // [side, s0, s1, inner, outer] ; side +1 is the outside of the right-hand T1, -1 the outside of the left-hand T2
 const pick=type=>T12_LAYERS.filter(l=>l[5]===type),layers={teal:pick('paint'),asphalt:pick('runoff'),gravel:pick('gravel')};
 const build=(list,material,name)=>{const parts=list.map(([side,s0,s1,a,b])=>track.ribbon(side*a,side*b,.036,idx(s0),idx(s1)));const m=new THREE.Mesh(mergeGeometries(parts,false),material);parts.forEach(g=>g.dispose());m.name=name;m.receiveShadow=true;root.add(m);};
 build(layers.teal,teal,'T1 painted run-off band');build(layers.asphalt,asphalt,'T1-T2 asphalt run-off');build(layers.gravel,gravel,'T1-T2 gravel');
 root.userData={sharedWithPhysics:true,reference:'photos 01, 02, 07'};
 return root;
}
