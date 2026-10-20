import * as THREE from 'three';
import {createTrackLocator} from './track-locator.js';
import {wrap} from './physics.js';
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
  function at(s,offset=0){
    const f=wrap(s,length)/length*n,i=Math.floor(f),u=f-i;
    const p=points[i].clone().lerp(points[i+1],u),t=frames[i].t.clone().lerp(frames[i+1].t,u).normalize(),normal=new THREE.Vector3(t.z,0,-t.x);
    p.addScaledVector(normal,offset);p.y=surfaceHeight(s,offset,length);return {p,t,normal,yaw:Math.atan2(t.x,t.z),curvature:curvatures[i],s:wrap(s,length)};
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
      const off=inner+(outer-inner)*j/across,p=points[i],normal=frames[i].normal,s=i*length/n;
      let y=height(s,off)+heightOffset-.035;if(heightOffset===.09)y=height(s,off);
      verts.push(p.x+normal.x*off,y,p.z+normal.z*off);uvs.push(off*.15,s*.15);
      if(i<end&&j<across){const k=(i-start)*(across+1)+j;idx.push(k,k+across+1,k+1,k+1,k+across+1,k+across+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  return {data,calibration,curve,length,n,points,frames,at,nearest,ribbon,curvatures,height,surface,isPitLane,updateWater,drying,dryOffsets};
}
