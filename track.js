import * as THREE from 'three';
import {createTrackLocator} from './track-locator.js';
import {wrap} from './physics.js?v=224';
import {surfaceHeight,waterAt} from './road-surface.js';
export async function createTrack(){
  const data=await fetch('./track-data.json').then(r=>{if(!r.ok)throw Error('无法读取赛道数据');return r.json()});
  const curve=new THREE.CatmullRomCurve3(data.points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
  curve.arcLengthDivisions=10000;curve.updateArcLengths();
  // Spline smoothing changes the source polyline length. Calibrate the finished
  // centreline to the published lap distance; this does not imply surveyed geometry.
  const rawSplineLength=curve.getLength(),uniformScale=data.referenceLength/rawSplineLength;
  if(!Number.isFinite(uniformScale)||uniformScale<.95||uniformScale>1.05)throw Error('赛道距离校准异常');
  for(const p of curve.points)p.multiplyScalar(uniformScale);
  curve.updateArcLengths();
  const calibration={rawSplineLength,referenceLength:data.referenceLength,uniformScale,surveyed:false};
  const length=curve.getLength(),n=2800,points=[],frames=[],curvatures=[];
  for(let i=0;i<=n;i++){
    const p=curve.getPointAt(i/n),t=curve.getTangentAt(i/n).normalize();
    points.push(p);frames.push({t,normal:new THREE.Vector3(t.z,0,-t.x)});
  }
  for(let i=0;i<n;i++){
    const a=frames[(i+n-2)%n].t,b=frames[(i+2)%n].t;
    curvatures[i]=Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1))/(4*length/n);
  }
  const locator=createTrackLocator(points,frames,length),queryScratch={};
  // Offsets beyond the kerbs can fold through the centre of tight corners or reach a
  // neighbouring section. Per side, precompute the largest safe offset (inside the local
  // radius of curvature and short of neighbouring sections), then min-filter and smooth
  // it so barrier lines and run-off ribbons bend smoothly instead of crossing themselves.
  const sideLimits=(()=>{const lim=[new Float32Array(n+1),new Float32Array(n+1)],ds=length/n,scratch={};
   for(let i=0;i<=n;i++){const a=frames[(i-2+n)%n].t,b=frames[(i+2)%n].t,turn=Math.atan2(a.x*b.z-a.z*b.x,a.x*b.x+a.z*b.z),k=-turn/(4*ds),p=points[i%n],nx=frames[i%n].normal.x,nz=frames[i%n].normal.z,own=i*ds;
    for(let side=0;side<2;side++){const sign=side?1:-1;let limit=60;if(k*sign>1e-5)limit=Math.min(limit,.8/(k*sign));
     const valid=o=>{const q=locator.query(p.x+nx*sign*o,p.z+nz*sign*o,scratch);let d=Math.abs(wrap(q.s,length)-own);d=Math.min(d,length-d);return d<Math.max(4,o*.35)&&Math.abs(q.distance-o)<.6;};
     if(!valid(Math.min(limit,60))){let lo=7.3,hi=Math.min(limit,60);for(let r=0;r<10;r++){const m=(lo+hi)/2;if(valid(m))lo=m;else hi=m;}limit=Math.min(limit,lo-1.2);}
     lim[side][i]=Math.max(8,limit);}}
   const W=14;for(const arr of lim){const src=arr.slice(),minf=new Float32Array(n+1);for(let i=0;i<=n;i++){let m=1e9;for(let d=-W;d<=W;d++)m=Math.min(m,src[((i+d)%n+n)%n]);minf[i]=m;}for(let i=0;i<=n;i++){let sum=0;for(let d=-7;d<=7;d++)sum+=minf[((i+d)%n+n)%n];arr[i]=sum/15;}}
   return lim;})();
  function foldSafeOffset(s,offset){const a=Math.abs(offset);if(a<=7.3)return offset;const f=wrap(s,length)/length*n,i=Math.floor(f),u=f-i,arr=sideLimits[offset>0?1:0],limit=arr[i]+(arr[Math.min(n,i+1)]-arr[i])*u;return a<=limit?offset:Math.sign(offset)*limit;}
  function offsetPoint(s,requested){const o=foldSafeOffset(s,requested),f=wrap(s,length)/length*n,i=Math.floor(f),u=f-i,tx=frames[i].t.x+(frames[i+1].t.x-frames[i].t.x)*u,tz=frames[i].t.z+(frames[i+1].t.z-frames[i].t.z)*u,l=Math.hypot(tx,tz)||1;return {x:points[i].x+(points[i+1].x-points[i].x)*u+tz/l*o,z:points[i].z+(points[i+1].z-points[i].z)*u-tx/l*o};}
  function at(s,offset=0){const requested=offset;offset=foldSafeOffset(s,offset);
    const f=wrap(s,length)/length*n,i=Math.floor(f),u=f-i;
    const p=points[i].clone().lerp(points[i+1],u),t=frames[i].t.clone().lerp(frames[i+1].t,u).normalize(),normal=new THREE.Vector3(t.z,0,-t.x);
    p.addScaledVector(normal,offset);p.y=surfaceHeight(s,offset,length);let yaw=Math.atan2(t.x,t.z),stretch=1;
    // Far from the centreline, orient objects along the offset path itself and report how
    // much longer/shorter that path is, so barriers and boards join without gaps or overlaps.
    if(Math.abs(offset)>3){const a=offsetPoint(s-1,requested),b=offsetPoint(s+1,requested),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len>1e-4){yaw=Math.atan2(dx,dz);stretch=len/2;}}
    return {p,t,normal,yaw,stretch,curvature:curvatures[i],s:wrap(s,length)};
  }
  function nearest(x,z){
    const q=locator.query(x,z,queryScratch),s=wrap(q.s,length);
    return {s,distance:q.distance,offset:q.offset,index:q.index,p:new THREE.Vector3(q.x,surfaceHeight(q.s,0,length),q.z)};
  }
  function height(s,offset=0){return surfaceHeight(s,offset,length);}
  const drying=new Float32Array(n),dryOffsets=new Float32Array(n);let currentWet=0;
  function updateWater(dt,wet,focus){currentWet=wet;const decay=Math.exp(-dt*(wet>.5?.02:.008));if(dt>0)for(let i=0;i<n;i++)drying[i]*=decay;if(focus?.speed>8){const near=nearest(focus.x,focus.z),k=near.index;for(let j=-2;j<=2;j++){const i=(k+j+n)%n;dryOffsets[i]=near.offset;drying[i]=Math.min(.20,drying[i]+dt*.018);}}}
  function isPitLane(x,z){return x<-18&&x>-32&&z>-535&&z<35;}
  function surface(x,z,wet=currentWet){const near=nearest(x,z),localWet=Math.max(0,wet-drying[near.index]*Math.exp(-Math.pow(near.offset-dryOffsets[near.index],2)/5)),pit=isPitLane(x,z);return {...near,height:pit?.035:height(near.s,near.offset),...waterAt(near.s,near.offset,pit?wet:localWet,length),offroad:!pit&&Math.abs(near.offset)>8.35,curb:!pit&&Math.abs(near.offset)>7.2&&Math.abs(near.offset)<8.35};}
  function ribbon(inner,outer,heightOffset=.035,start=0,end=n,acrossOverride=0){
    const verts=[],uvs=[],idx=[],across=acrossOverride||(Math.abs(outer-inner)>2?8:2);
    for(let i=start;i<=end;i++)for(let j=0;j<=across;j++){
      const s=i*length/n,off=foldSafeOffset(s,inner+(outer-inner)*j/across),p=points[i],normal=frames[i].normal;
      let y=height(s,off)+heightOffset-.035;if(heightOffset===.09)y=height(s,off);
      verts.push(p.x+normal.x*off,y,p.z+normal.z*off);uvs.push(off*.15,s*.15);
      if(i<end&&j<across){const k=(i-start)*(across+1)+j;idx.push(k,k+across+1,k+1,k+1,k+across+1,k+across+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  return {foldSafeOffset,data,calibration,curve,length,n,points,frames,at,nearest,ribbon,curvatures,height,surface,isPitLane,updateWater,drying,dryOffsets};
}
