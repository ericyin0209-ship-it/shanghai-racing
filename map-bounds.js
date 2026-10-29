// Fixed development boundary (CLAUDE.md): the OSM download box 121.198–121.258 E, 31.322–31.362 N in local metres.
// Corners are the box projected with the data's origin/axis (x = e*axis[1] + n*axis[0], z = e*axis[0] - n*axis[1]);
// 96.6 % of mapped area points fall inside, the rest belong to features the OSM API returned across the edge.
// Order: SW, NW, NE, SE.
export const MAP_BOUNDS=[[1119,2278],[-3170,1203],[-1782,-4331],[2507,-3255]];
// Ground rectangle: centre, angle about +y and size (along NW→NE, along SW→NW) plus a margin for straddling features.
export const MAP_GROUND={centre:[-331.5,-1026.3],angle:Math.atan2(.9701,.2433),width:5705+300,depth:4422+300};
export function inMapBounds(x,z,p=MAP_BOUNDS){let v=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,zi]=p[i],[xj,zj]=p[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)v=!v;}return v;}
// Cut linear features (roads, rail, channels) at the boundary; area features wholly outside are dropped and those
// straddling the edge are kept whole. Returns new features; cut ends are listed so bridge ramps do not land on them.
export function clipToMapBounds(features){
 const out=[],cutEnds=new Set(),edge=(a,b)=>{let lo=0,hi=1;const ia=inMapBounds(a[0],a[1]);for(let k=0;k<24;k++){const m=(lo+hi)/2;if(inMapBounds(a[0]+(b[0]-a[0])*m,a[1]+(b[1]-a[1])*m)===ia)lo=m;else hi=m;}const u=(lo+hi)/2;return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];};
 let cutLines=0,droppedAreas=0;
 for(const f of features){const p=f.points;if(!p||!p.length){out.push(f);continue;}
  const linear=f.kind==='road'||f.kind==='rail'||f.kind==='channel';
  if(!linear){if(p.some(q=>inMapBounds(q[0],q[1])))out.push(f);else droppedAreas++;continue;}
  const inside=p.map(q=>inMapBounds(q[0],q[1]));if(inside.every(Boolean)){out.push(f);continue;}
  cutLines++;let run=[];const flush=()=>{if(run.length>1)out.push({...f,id:f.id+'#'+out.length,points:run});run=[];};
  for(let i=0;i<p.length;i++){if(inside[i]){if(i&&!inside[i-1]){const q=edge(p[i],p[i-1]);run.push(q);cutEnds.add(f.kind+':'+Math.round(q[0])+','+Math.round(q[1]));}run.push(p[i]);}else if(i&&inside[i-1]){const q=edge(p[i-1],p[i]);run.push(q);cutEnds.add(f.kind+':'+Math.round(q[0])+','+Math.round(q[1]));flush();}}
  flush();}
 return {features:out,cutEnds,cutLines,droppedAreas};
}
