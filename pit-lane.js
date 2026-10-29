// preview.30: one pit lane definition shared by the road mesh, markings, walls, physics surface, collision, the pit-stop
// route and the box mark. Reference year 2024 (FIA 2024 Chinese GP event notes doc 4: circuit map and pit lane drawing).
//
// Calibration (see evidence/p30/地图校准 for the working files), by evidence grade:
//  - topology (FIA drawing, its photos, user video 3): entry leaves the outside of T16 past the SC1 line as a single lane
//    between barriers, swings wide and comes back to the pit lane at "Pit Lane Starts" (before garage A); fast lane beside
//    the pit wall, working area in front of the garages; after "Pit Lane Ends" the exit runs on beside the track behind a
//    solid line and merges at T1. Aston Martin garages 14-16 (2024), box in front of 15.
//  - positions (OSM, traced from imagery, ~2-3 m): the pit-lane way 107371147 + 107371138 and the garages footprint
//    156328694 from the project's own 2026-10-07 OSM extract (same bbox). Relative to the OSM circuit line the pit-lane way
//    runs 14.5 m out and the garage front 27.5 m out, both parallel to the straight. The game track (bacinger polyline)
//    sits 3.2 m east of the OSM circuit line, so OSM pit points are shifted by +3.2 m in x to stay consistent with it,
//    and the straight section is built from the game track itself at the OSM offsets.
//  - widths not measured (to verify): pit wall 1.7 m, fast lane 6.2 m, working area 9.9 m, entry/exit lane 6 m.
// No centimetre-level claim is made; the pit lane is a photo/map estimate, not a survey.
import {simplifyPath,roundPath} from './pit-path.js?v=232';
import {clamp} from './physics.js?v=229release';
import {PIT_Z0,PIT_Z1,PIT_LEN} from './main-straight.js?v=229release';
export const PIT_UNITS=['A','B','C',...Array.from({length:33},(_,i)=>String(i+1))];
// unit index counted from the exit end (z PIT_Z0) toward the entry end, matching the garage loops (z = BAY0 - i*BAY)
export const PIT_UNIT_W=PIT_LEN/PIT_UNITS.length,unitZ=i=>PIT_Z0-PIT_UNIT_W*(i+.5),unitLabel=i=>PIT_UNITS[PIT_UNITS.length-1-i];
export const unitIndex=label=>PIT_UNITS.length-1-PIT_UNITS.indexOf(label);
export const TEAM_GARAGES={'Aston Martin':['14','15','16']};
// offsets from the track centre line on the straight (negative = pit side), see the header for their grades
export const PIT_OFF={wallTrack:-9.7,wallPit:-11.4,fast:-14.5,divider:-17.6,box:-22.7,garage:-27.5};
const CENTRE=(PIT_OFF.wallPit+PIT_OFF.garage)/2,HW=(PIT_OFF.wallPit-PIT_OFF.garage)/2;
// lateral v across the lane (positive toward the garages) on the straight
export const PIT_V={wall:-HW,fast:CENTRE-PIT_OFF.fast,divider:CENTRE-PIT_OFF.divider,box:CENTRE-PIT_OFF.box,garage:HW};
// preview.29 positions (absolute x), kept so world.js can move the pit building and wall onto the calibrated lines
export const PIT_X_OLD={wallTrack:-13.6,wallPit:-16.4,garage:-35.2,back:-62};
export const PIT_LIMIT=80/3.6,PIT_START_Z=PIT_Z1-5,PIT_END_Z=PIT_Z0+6;
export const BOX={x:0,z:unitZ(unitIndex('15')),yaw:0};// filled in by createPitLane
const OSM_SHIFT=3.2;// game track vs OSM circuit line, x (measured along the straight, 3.05-3.5 m)
// OSM pit-lane way (entry part, local metres), shifted onto the game track
const OSM_ENTRY=[[-62.4,-648.8],[-65.97,-646.77],[-67.96,-645.33],[-69.93,-642.92],[-71.17,-640.43],[-71.41,-636.39],[-69.17,-624.68],[-63.85,-596.2],[-61.45,-586.63],[-58.07,-575.77],[-53.75,-560.62],[-48.56,-543.53],[-44.07,-528.76],[-20.64,-448.5],[-18.16,-439.87],[-16.49,-432.73],[-14.17,-421.12]].map(([x,z])=>[x+OSM_SHIFT,z]);
const OSM_BRANCH=[15.6+OSM_SHIFT,-681.0];// where way 107371147 leaves the circuit line (T16)
const OSM_EXIT=[[-17.57,-26.87],[-17.22,-14.98],[-16.31,-5.78],[-14.67,3.74],[-12.43,13.1],[-10.5,21.94],[-9.24,33.76],[-8.88,50.15]].map(([x,z])=>[x+OSM_SHIFT,z]);
const lerp=(a,b,t)=>a+(b-a)*t;
function catmull(points,steps){const out=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];for(let k=0;k<steps;k++){const t=k/steps,t2=t*t,t3=t2*t;out.push(p1.map((_,j)=>.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3)));}}out.push(points.at(-1).slice());return out;}
export function createPitLane(track){
 const L=track.length,wrap=s=>((s%L)+L)%L,T=(s,o,hw)=>{const p=track.at(wrap(s),o).p;return [p.x,p.z,hw];};
 // on the main straight the track's s runs with z (s = 0 at z = 0); refine with a nearest query
 const S=z=>wrap(track.nearest(track.at(wrap(z>=0?z:L+z),0).p.x,z).s),EW=3.0;// entry / exit lane half width
 // the branch from the track at T16: continue straight off the outside of the corner toward the OSM entry way
 const sB=track.nearest(OSM_BRANCH[0],OSM_BRANCH[1]).s,b0=track.at(wrap(sB-38),-5.2).p,bA=track.at(wrap(sB-20),-6.8).p;
 const e0=OSM_ENTRY[0],branch=[[b0.x,b0.z,3.0],[bA.x,bA.z,3.0]];for(const f of [.2,.45,.72])branch.push([lerp(bA.x,e0[0],f),lerp(bA.z,e0[1],f),EW]);
 const entry=OSM_ENTRY.map(([x,z])=>[x,z,EW]);
 // join: the fast line continues; the lane widens on the garage side to the full pit lane before garage A
 // (the OSM way reaches the fast line at z ~ -404; the widening keeps the wall-side edge at a constant offset)
 const join=[T(S(-404),PIT_OFF.fast,EW)];for(const k of [1,2,3])join.push(T(S(-404+7*k),PIT_OFF.fast+(CENTRE-PIT_OFF.fast)*k/3,EW+(HW-EW)*k/3));
 const straight=[];for(let z=-370;z<=PIT_Z0-14;z+=26)straight.push(T(S(z),CENTRE,HW));straight.push(T(S(PIT_Z0-6),CENTRE,HW));
 const narrow=[];for(const k of [1,2,3])narrow.push(T(S(PIT_Z0-6+7*k),CENTRE+(PIT_OFF.fast-CENTRE)*k/3,HW+(EW-HW)*k/3));
 const exit=OSM_EXIT.map(([x,z])=>[x,z,EW]);exit.push(T(70,-4.6,2.4),T(94,-2.9,1.2));
 /* preview.32: retain mapped entry/exit topology; remove digitisation kinks, then round the T16 approach. */
 const entryGuide=simplifyPath([...branch.slice(1),...entry,join[0]],3.0);for(const p of entryGuide)p[2]=EW;
 const roundedEntry=roundPath(entryGuide,17,.8);roundedEntry[0][2]=3.0;
 const control=[branch[0],...roundedEntry,...join.slice(1),...straight,...narrow,...exit];
 // uniform Catmull-Rom overshoots where control spacing is very uneven (OSM nodes: 84 m next to 9 m), so long segments
 // are subdivided to ~10 m first; the curve then stays on the mapped line without loops
 const even=[control[0]];for(let i=1;i<control.length;i++){const a=control[i-1],b=control[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.round(d/10));for(let k=1;k<=n;k++)even.push(a.map((x,j)=>x+(b[j]-x)*k/n));}
 const raw=catmull(even,8),xs=[],zs=[],hw=[],us=[0];
 /* Remove the last tight digitised elbow by filtering positions over metres, not over node indices. Only the entry
    connector is filtered; garage fronts, stop marks, main straight and exit retain their calibrated positions. */
 {const arc=[0];for(let i=1;i<raw.length;i++)arc.push(arc.at(-1)+Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]));const copy=raw.map(p=>p.slice()),at=u=>{u=clamp(u,0,arc.at(-1));let lo=0,hi=arc.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(arc[m]<u)lo=m;else hi=m;}const t=(u-arc[lo])/Math.max(1e-6,arc[hi]-arc[lo]);return copy[lo].map((v,k)=>v+(copy[hi][k]-v)*t);};
  for(let i=0;i<raw.length&&raw[i][1]<-395;i++){const p=raw[i],u=arc[i],fade=clamp(u/35,0,1)*clamp((-p[1]-400)/35,0,1);let x=0,z=0,w=0;for(let d=-26;d<=26;d+=2){const a=Math.exp(-d*d/200),q=at(u+d);x+=q[0]*a;z+=q[1]*a;w+=a;}p[0]=lerp(p[0],x/w,fade);p[1]=lerp(p[1],z/w,fade);}}

 for(const p of raw){if(xs.length){const d=Math.hypot(p[0]-xs.at(-1),p[1]-zs.at(-1));if(d<.05)continue;us.push(us.at(-1)+d);}xs.push(p[0]);zs.push(p[1]);hw.push(p[2]);}
 const N=xs.length,length=us.at(-1),dirX=new Float32Array(N),dirZ=new Float32Array(N);
 for(let i=0;i<N;i++){const a=Math.max(0,i-1),b=Math.min(N-1,i+1),dx=xs[b]-xs[a],dz=zs[b]-zs[a],l=Math.hypot(dx,dz)||1;dirX[i]=dx/l;dirZ[i]=dz/l;}
 // right of travel (toward the garages on the straight) is (-dz, dx)
 const sample=u=>{u=clamp(u,0,length);let lo=0,hi=N-1;while(hi-lo>1){const m=(lo+hi)>>1;if(us[m]<=u)lo=m;else hi=m;}const t=(u-us[lo])/Math.max(1e-6,us[hi]-us[lo]),x=xs[lo]+(xs[hi]-xs[lo])*t,z=zs[lo]+(zs[hi]-zs[lo])*t,dx=dirX[lo]+(dirX[hi]-dirX[lo])*t,dz=dirZ[lo]+(dirZ[hi]-dirZ[lo])*t,l=Math.hypot(dx,dz)||1;return {x,z,dx:dx/l,dz:dz/l,hw:hw[lo]+(hw[hi]-hw[lo])*t,yaw:Math.atan2(dx,dz),u};};
 const point=(u,v)=>{const q=sample(u);return {x:q.x-q.dz*v,z:q.z+q.dx*v};};
 function nearest(x,z){let best=1e9,bi=0;for(let i=0;i<N;i+=4){const d=(xs[i]-x)**2+(zs[i]-z)**2;if(d<best){best=d;bi=i;}}let i0=Math.max(0,bi-6),i1=Math.min(N-2,bi+6),bu=0,bv=0;best=1e9;
  for(let i=i0;i<=i1;i++){const ax=xs[i],az=zs[i],ex=xs[i+1]-ax,ez=zs[i+1]-az,ll=ex*ex+ez*ez||1,t=clamp(((x-ax)*ex+(z-az)*ez)/ll,0,1),px=ax+ex*t,pz=az+ez*t,d=(x-px)**2+(z-pz)**2;if(d<best){best=d;const l=Math.sqrt(ll);bu=us[i]+t*l;bv=((x-px)*(-ez)+(z-pz)*ex)/l;}}
  const q=sample(bu);return {u:bu,v:bv,distance:Math.sqrt(best),hw:q.hw,yaw:q.yaw};}
 // u at a given z on the straight (garages, limit lines, box)
 const uAtZ=z=>{const p=track.at(S(z),CENTRE).p;return nearest(p.x,p.z).u;};
 const U={limitStart:uAtZ(PIT_START_Z),limitEnd:uAtZ(PIT_END_Z),box:uAtZ(BOX.z)};
 {const b=point(U.box,PIT_V.box);BOX.x=b.x;BOX.z=b.z;BOX.yaw=sample(U.box).yaw;}
 // track centre x along the straight, for cheap "is this the track itself?" tests
 const trackX=new Map();for(let z=-720;z<=130;z+=1)trackX.set(z,track.at(S(z),0).p.x);
 const onTrack=(x,z)=>{const tx=trackX.get(Math.round(z));return tx!=null&&x>tx-7.02&&x<tx+12;};
 function onRoad(x,z,margin=0){if(onTrack(x,z))return false;const q=nearest(x,z);if(q.distance>40||q.u<=.5||q.u>=length-.5)return false;return q.v>=-q.hw-margin&&q.v<=q.hw+margin;}
 // strictly on the lane surface, used to clear trackside furniture placed by track offset
 function onLane(x,z){if(onTrack(x,z))return false;const q=nearest(x,z);return q.distance<40&&q.u>.5&&q.u<length-.5&&Math.abs(q.v)<q.hw-.15;}
 // s ranges on the track's right side where the pit road replaces the barrier line (physics and drawing)
 const S0=wrap(sB-60),S1=125,inRange=s=>{s=wrap(s);return s>=S0||s<=S1;};
 // kerb modules on the right side are cleared where the pit road overlaps the kerb band
 const kerbClear=new Set();for(let u=0;u<length;u+=.5){const q=sample(u);for(let v=-q.hw;v<=q.hw+.01;v+=.5){const p=point(u,v),n=track.nearest(p.x,p.z);if(n.offset<-7&&n.offset>-8.6)kerbClear.add(Math.floor(n.s));}}
 // walls: the pit wall on the track side of the straight; a steel barrier on the inside of the entry road; the outer line
 const innerTrack=u=>{const p=point(u,-sample(u).hw),n=track.nearest(p.x,p.z);return -n.offset;};
 let w0=0,w1=length;for(let u=0;u<length;u+=1){const q=sample(u);if(q.z>-418&&innerTrack(u)<12.5){w0=u;break;}}for(let u=length;u>0;u-=1){const q=sample(u);if(q.z<-30&&innerTrack(u)<12.5){w1=u;break;}}
 const WALL=PIT_OFF.wallTrack-PIT_OFF.wallPit,wallWidth=u=>clamp(innerTrack(u)+PIT_OFF.wallTrack,.6,WALL);
 const inner=[],face=[];for(let u=w0;u<=w1;u+=2){const q=sample(u),w=wallWidth(u);inner.push(point(u,-q.hw-.05));face.push(point(u,-q.hw-.05-w));}
 const uEntryBarrier0=(()=>{for(let u=0;u<w0;u+=1)if(innerTrack(u)>9.5)return u;return w0;})();
 const entryInner=[];for(let u=uEntryBarrier0;u<=w0;u+=2)entryInner.push(point(u,-sample(u).hw-.45));
 const garageZ=z=>z<PIT_Z0+1&&z>PIT_Z1-1;
 const outer=[];for(let u=0;u<=length;u+=2){const q=sample(u),edge=point(u,q.hw+.45);if(u<100&&track.nearest(edge.x,edge.z).offset>-8.0)continue;outer.push(point(u,q.hw+(garageZ(q.z)?.15:.45)));}
 const walls=[{name:'pit wall',points:inner,thick:.3},{name:'pit wall track face',points:face,thick:.3},{name:'pit outer barrier',points:outer,thick:.3},{name:'pit entry barrier',points:entryInner,thick:.25}];
 const nose={entry:point(w0,-sample(w0).hw-.6),exit:point(w1,-sample(w1).hw-.6)};
 const garageAt=z=>point(uAtZ(z),HW);
 // FIA Chinese GP 2024 event notes 10.4: bollard at the entry bend apex, not the pit-wall nose.
 let entryApex=30,entryCurvature=0;for(let u=30;u<Math.min(240,U.limitStart-40);u+=1){const a=sample(u-2),b=sample(u+2),k=Math.abs(Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw)))/4;if(k>entryCurvature){entryCurvature=k;entryApex=u;}}
 const landmarks={entryApex,bollard:point(entryApex,-sample(entryApex).hw+.12),sc1:22,sc2:length-40,pitStart:U.limitStart,pitEnd:U.limitEnd,source:'FIA Chinese GP 2024 Doc 4 / event notes 10.2-10.4; metre positions estimated from mapped lane'};
 return {length,N,xs,zs,hw,us,sample,point,nearest,onRoad,onLane,inRange,kerbClear,walls,wallWidth,nose,U,uAtZ,garageAt,wallSpan:[w0,w1],box:BOX,limitZ:[PIT_START_Z,PIT_END_Z],limit:PIT_LIMIT,
  landmarks,trackXAt:z=>trackX.get(Math.round(clamp(z,-720,130))),centreOffset:CENTRE,
  inLimitZone(x,z){return onRoad(x,z,1)&&z>PIT_START_Z&&z<PIT_END_Z;}};
}
// capsule (car axis +-halfLength, radius) against wall polylines; returns the deepest contact or null
export function wallContact(walls,x,z,yaw,halfLength=2.3,radius=1.0){const fx=Math.sin(yaw),fz=Math.cos(yaw),ax=x-fx*halfLength,az=z-fz*halfLength,bx=x+fx*halfLength,bz=z+fz*halfLength;let hit=null;
 for(const w of walls){const pts=w.points;for(let i=0;i<pts.length-1;i++){const p=pts[i],q=pts[i+1];if(Math.abs(p.x-x)>40&&Math.abs(q.x-x)>40)continue;if(Math.abs(p.z-z)>40&&Math.abs(q.z-z)>40)continue;
  const r=closest(ax,az,bx,bz,p.x,p.z,q.x,q.z),pen=radius+w.thick-r.d;if(pen>0&&(!hit||pen>hit.pen))hit={pen,nx:(r.wx-r.cx)/(r.d||1),nz:(r.wz-r.cz)/(r.d||1),wall:w.name};}}
 return hit;}
function closest(ax,az,bx,bz,cx,cz,dx,dz){// closest points between segments AB (car) and CD (wall)
 const ux=bx-ax,uz=bz-az,vx=dx-cx,vz=dz-cz,wx=ax-cx,wz=az-cz,a=ux*ux+uz*uz,b=ux*vx+uz*vz,c=vx*vx+vz*vz,d=ux*wx+uz*wz,e=vx*wx+vz*wz,D=a*c-b*b;let s=D>1e-9?clamp((b*e-c*d)/D,0,1):0,t=c>1e-9?clamp((b*s+e)/c,0,1):0;s=a>1e-9?clamp((b*t-d)/a,0,1):0;
 const px=ax+ux*s,pz=az+uz*s,qx=cx+vx*t,qz=cz+vz*t;return {d:Math.hypot(qx-px,qz-pz),cx:px,cz:pz,wx:qx,wz:qz};}
