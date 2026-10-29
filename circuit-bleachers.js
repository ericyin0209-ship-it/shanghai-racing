import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
// Turn 1-2 spectator stands B1/B2/B3 (OSM "grandstand" outlines in surroundings-data.json).
// Photo 07 (2005) shows B1 as an open steel bleacher of plain aluminium benches, ~20 rows, no roof, behind the catch
// fence and a service road; the 2018 SkySat image (photo 01) shows the same grey bench rows at B1, B2 and B3.
// Row count, rake and frame spacing are estimates, not survey data. The front edge keeps the stands outside the
// barrier line (OSM puts B1's front 16.5 m from the centreline, inside the 19 m barrier), so B1 starts ~4 m further out.
// The eleven unnamed OSM grandstand outlines round the outside of T11-T13 (s 2870-3070) are the red-seated stands seen on
// the 2018 SkySat image; the seat lettering there is not reproduced. Their front edge is the side nearest the track, and
// all eleven take the median 16 rows so the arc reads as one continuous stand, as on the image.
const STANDS={'B1看台':{front:[3,2],back:[0,1]},'B2看台':{front:[0,15,14,13,12,11,10,9],back:[1,2,3,4,5,6,7,8]},'B3看台':{front:[0,11,10,9,8,7],back:[1,2,3,4,5,6]}};
const TREAD=.85,RISE=.40,FRONT_H=1.1,MAX_ROWS=22,CLEAR=23;
export function createCircuitBleachers(scene,track,data){
 const root=new THREE.Group();root.name='Turn 1-2 bleachers B1/B2/B3';scene.add(root);
 const deckMat=new THREE.MeshStandardMaterial({color:'#7d8486',metalness:.35,roughness:.62,side:THREE.DoubleSide});
 const benchMat=new THREE.MeshStandardMaterial({color:'#c9cdca',metalness:.55,roughness:.38}),redMat=new THREE.MeshStandardMaterial({color:'#b3282d',roughness:.55});
 const steel=new THREE.MeshStandardMaterial({color:'#8f9799',metalness:.7,roughness:.4});
 const deck=[],redDeck=[],grey=[],red=[],rails=[],posts=[];const stats={};let bench,D,unnamed=0;
 // quad strip between two point lists (each [x,y,z]); one quad per consecutive pair
 // preview.27: faces are wound to face up (treads, bench tops) or towards the track (risers, lips, rails). The stage-2
 // build let the winding follow the outline direction, so B1-B3 bench tops faced down and vanished from above.
 let frontDir=[0,0,1];
 function strip(list,a,b){const pos=[],idx=[];const e1=[b[0][0]-a[0][0],b[0][1]-a[0][1],b[0][2]-a[0][2]],e2=[a[1][0]-a[0][0],a[1][1]-a[0][1],a[1][2]-a[0][2]],n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]],l=Math.hypot(...n)||1,flip=Math.abs(n[1]/l)>.7?n[1]<0:n[0]*frontDir[0]+n[2]*frontDir[2]<0;for(let i=0;i<a.length;i++){pos.push(...a[i],...b[i]);if(i){const k=(i-1)*2;if(flip)idx.push(k,k+2,k+1,k+2,k+3,k+1);else idx.push(k,k+1,k+2,k+2,k+1,k+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();list.push(g);}
 for(const f of data.features){if(f.kind!=='building'||f.tags?.building!=='grandstand')continue;const p=f.points;let spec=STANDS[f.tags.name];bench=grey;D=deck;
  if(!spec&&!f.tags.name&&p.length===5){const mid=i=>track.nearest((p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2).distance;let i=0;for(let k=1;k<4;k++)if(mid(k)<mid(i))i=k;spec={front:[i,i+1],back:[(i+3)%4,(i+2)%4],rows:16};bench=red;D=redDeck;}
  if(!spec)continue;
  // resample the track-facing edge every ~2 m and point each normal towards the rear edge
  const chain=spec.front.map(i=>p[i]),rear=spec.back.map(i=>p[i]),rc=rear.reduce((s,q)=>[s[0]+q[0]/rear.length,s[1]+q[1]/rear.length],[0,0]);
  const pts=[];for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i],n=Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/2));for(let j=i===1?0:1;j<=n;j++)pts.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}
  const nrm=pts.map((q,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;let nx=dz/l,nz=-dx/l;if((rc[0]-q[0])*nx+(rc[1]-q[1])*nz<0){nx=-nx;nz=-nz;}return [nx,nz];});
  let push=0;pts.forEach(q=>{push=Math.max(push,CLEAR-track.nearest(q[0],q[1]).distance);});
  // depth = median distance from the front edge to the rear outline
  const segDist=(q,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(a[0]+dx*u-q[0],a[1]+dz*u-q[1]);};
  const gaps=pts.map(q=>Math.min(...rear.slice(1).map((r,j)=>segDist(q,rear[j],r)))).sort((a,b)=>a-b),depth=gaps[Math.floor(gaps.length/2)],rows=spec.rows||Math.max(8,Math.min(MAX_ROWS,Math.floor((depth-push-2.5)/TREAD)));
  const at=(i,d,y)=>[pts[i][0]+nrm[i][0]*(push+d),y,pts[i][1]+nrm[i][1]*(push+d)],along=[0];for(let i=1;i<pts.length;i++)along.push(along[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const idx=pts.map((_,i)=>i);
  {const m=nrm[Math.floor(nrm.length/2)];frontDir=[-m[0],0,-m[1]];}
  // front plinth wall, then per row: riser, tread and an aluminium bench (benches break at ~24 m stair aisles)
  strip(D,idx.map(i=>at(i,0,0)),idx.map(i=>at(i,0,FRONT_H)));
  for(let r=0;r<rows;r++){const y=FRONT_H+r*RISE,d0=r*TREAD;
   if(r)strip(D,idx.map(i=>at(i,d0,y-RISE)),idx.map(i=>at(i,d0,y)));
   strip(D,idx.map(i=>at(i,d0,y)),idx.map(i=>at(i,d0+TREAD,y)));
   let run=[];const flush=()=>{if(run.length>1){strip(bench,run.map(i=>at(i,d0+.30,y+.43)),run.map(i=>at(i,d0+.62,y+.43)));strip(bench,run.map(i=>at(i,d0+.30,y+.36)),run.map(i=>at(i,d0+.30,y+.43)));}run=[];};
   for(const i of idx){if(along[i]%24<2.2&&along[i]>3&&along.at(-1)-along[i]>3)flush();else run.push(i);}flush();}
  const top=FRONT_H+(rows-1)*RISE,back=rows*TREAD;
  strip(D,idx.map(i=>at(i,back,top)),idx.map(i=>at(i,back,top+1.1)));
  // front and rear guard rails, open steel frame: rear columns, raking beams and a mid-row column every ~6 m
  for(const [d,y] of [[-.05,FRONT_H+1.0],[back+.02,top+1.15]])strip(rails,idx.map(i=>at(i,d,y)),idx.map(i=>at(i,d,y+.06)));
  for(let i=0;i<pts.length;i+=3){const b=at(i,back-.2,0),m=at(i,back*.5,0),fr=at(i,.4,0),hb=top,hm=FRONT_H+(Math.floor(rows/2)-1)*RISE;
   posts.push({a:[b[0],0,b[2]],b:[b[0],hb,b[2]],r:.16},{a:[m[0],0,m[2]],b:[m[0],hm,m[2]],r:.13},{a:[fr[0],FRONT_H,fr[2]],b:[b[0],hb,b[2]],r:.11},{a:[m[0],.2,m[2]],b:[b[0],hb*.55,b[2]],r:.06});}
  stats[f.tags.name||'T11-13 stand '+(++unnamed)]={rows,frontShift:+push.toFixed(1),length:Math.round(along.at(-1)),topHeight:+(top+1.15).toFixed(1)};
 }
 const add=(list,mat,name)=>{if(!list.length)return;const g=mergeGeometries(list,false);list.forEach(x=>x.dispose());const m=new THREE.Mesh(g,mat);m.name=name;m.castShadow=m.receiveShadow=true;root.add(m);};
 add(deck,deckMat,'Bleacher decks and risers');add(redDeck,new THREE.MeshStandardMaterial({color:'#8c2f32',roughness:.7,side:THREE.DoubleSide}),'T11-13 stand decks');add(grey,benchMat,'Bleacher aluminium benches');add(red,redMat,'T11-13 red stand seats');add(rails,steel,'Bleacher guard rails');
 if(posts.length){const g=new THREE.CylinderGeometry(1,1,1,6),mesh=new THREE.InstancedMesh(g,steel,posts.length),o=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);posts.forEach(({a,b,r},i)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,dir.clone().normalize());o.scale.set(r,dir.length(),r);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.name='Bleacher steel frame';mesh.castShadow=true;root.add(mesh);}
 root.userData={surveyed:false,stands:stats,reference:'photo 07 (V8 racing 002, 2005) and photo 01 (SkySat 2018); outlines from OSM'};
 return root;
}
