import * as THREE from 'three';
import {PIT_OFF,PIT_X_OLD} from './pit-lane.js?v=p34-20261029-r3';
import {PIT_Z0,PIT_Z1} from './main-straight.js?v=229release';
// preview.30: the pit building, garage-front furniture, pit-wall structures and the strip between track and wall were laid
// out (preview.24-29) on fixed x lines: garage doors x -35.2, pit wall -16.4/-13.6. The OSM garages footprint and pit-lane
// way put them 27.5 m and ~11 m from the track centre line and parallel to the straight (pit-lane.js header). Instead of
// rewriting several hundred literal coordinates in eight modules, every static object of the pit complex is moved onto
// the calibrated lines with one piecewise-linear map of x (per z, following the track line), applied once at load before
// static batching:
//   building back line (x -62, OSM)        unchanged
//   garage door line  -35.2 -> track - 27.5 (building made deeper toward the lane, as the OSM footprint is)
//   pit wall lane face -16.4 -> track - 11.4, track face -13.6 -> track - 9.7
//   track edge (track - 7)                 unchanged, nothing on or beyond it is touched
// Blended to zero over 6 m beyond each end of the building. Instanced objects and lights are moved, not stretched.
const BLEND=6,REGION={x0:-66,x1:-2};
export function warpPitComplex(scene,pit,{keep=[]}={}){
 const z0=PIT_Z1,z1=PIT_Z0,O=PIT_X_OLD;
 const mapX=(x,z)=>{const zc=Math.max(z0,Math.min(z1,z)),w=1-Math.min(1,Math.max(z0-z,z-z1,0)/BLEND);if(w<=0)return x;
  const c=pit.trackXAt(zc),E=c-7.0;if(x>=E||x<=O.back)return x;const F=c+PIT_OFF.garage,Wp=c+PIT_OFF.wallPit,Wt=c+PIT_OFF.wallTrack;
  const seg=(a0,a1,b0,b1)=>b0+(x-a0)*(b1-b0)/(a1-a0);
  const nx=x<=O.garage?seg(O.back,O.garage,O.back,F):x<=O.wallPit?seg(O.garage,O.wallPit,F,Wp):x<=O.wallTrack?seg(O.wallPit,O.wallTrack,Wp,Wt):seg(O.wallTrack,E,Wt,E);
  return x+(nx-x)*w;};
 const kept=o=>{for(let q=o;q;q=q.parent)if(keep.includes(q)||q.userData?.noPitWarp)return true;return false;};
 const inRegion=b=>b.max.x>REGION.x0&&b.min.x<REGION.x1&&b.max.z>z0-BLEND&&b.min.z<z1+BLEND;
 scene.updateMatrixWorld(true);
 const users=new Map();scene.traverse(o=>{if(o.isMesh&&o.geometry)users.set(o.geometry,(users.get(o.geometry)||0)+1);});
 const stats={meshes:0,vertices:0,instances:0,lights:0,skipped:0},box=new THREE.Box3(),v=new THREE.Vector3(),inv=new THREE.Matrix4(),m=new THREE.Matrix4(),d=new THREE.Matrix4();
 const targets=[];scene.traverse(o=>{if((o.isMesh||o.isLight||o.isPoints||o.isLine)&&!kept(o))targets.push(o);});
 for(const o of targets){
  if(o.isLight){o.getWorldPosition(v);const nx=mapX(v.x,v.z);if(nx!==v.x){v.x=nx;o.position.copy(o.parent.worldToLocal(v.clone()));o.updateMatrixWorld(true);stats.lights++;}continue;}
  if(o.isSkinnedMesh||/reflect|mirror/i.test(o.name||'')||o.isReflector){stats.skipped++;continue;}
  const g=o.geometry;if(!g?.attributes?.position)continue;if(!g.boundingBox)g.computeBoundingBox();box.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
  if(o.isInstancedMesh){let moved=0;inv.copy(o.matrixWorld).invert();const structural=/Concrete bay floor|Inner ceiling|Bay partition|Bay floor joint/.test(o.name),b0=g.boundingBox;
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);v.setFromMatrixPosition(m);let nx=mapX(v.x,v.z),scaleX=1;
    if(structural){const left=new THREE.Vector3(b0.min.x,0,0).applyMatrix4(m),right=new THREE.Vector3(b0.max.x,0,0).applyMatrix4(m),span=right.x-left.x;
     if(Math.abs(span)>1){const lo=mapX(left.x,left.z),hi=mapX(right.x,right.z);scaleX=(hi-lo)/span;nx=(lo+hi)/2;}}
    if(Math.abs(nx-v.x)>1e-4||Math.abs(scaleX-1)>1e-4){d.makeScale(scaleX,1,1);d.setPosition(nx-scaleX*v.x,0,0);m.premultiply(d).premultiply(inv);o.setMatrixAt(i,m);moved++;}}
   if(moved){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere?.();o.computeBoundingBox?.();stats.instances+=moved;}continue;}
  if(!inRegion(box))continue;
  // vertex warp in world space, written back in the object's local space (shared geometry is cloned first)
  let geo=g;if((users.get(g)||1)>1){geo=g.clone();o.geometry=geo;users.set(g,users.get(g)-1);}
  const pos=geo.attributes.position,w=o.matrixWorld;inv.copy(w).invert();let changed=0;
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(w);const nx=mapX(v.x,v.z);if(Math.abs(nx-v.x)>1e-5){v.x=nx;v.applyMatrix4(inv);pos.setXYZ(i,v.x,v.y,v.z);changed++;}}
  if(changed){pos.needsUpdate=true;geo.computeVertexNormals();if(geo.attributes.tangent)geo.deleteAttribute('tangent');geo.computeBoundingBox();geo.computeBoundingSphere();stats.meshes++;stats.vertices+=changed;}}
 return {...stats,mapX};
}
