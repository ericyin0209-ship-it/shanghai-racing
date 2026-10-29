// Planar, tangent-continuous rounded corners. All extra coordinates (e.g. lane half-width) interpolate too.
export function simplifyPath(points,tolerance=1){if(points.length<3)return points.map(p=>p.slice());const a=points[0],b=points.at(-1),dx=b[0]-a[0],dz=b[1]-a[1],ll=dx*dx+dz*dz||1;let max=0,k=0;
 for(let i=1;i<points.length-1;i++){const p=points[i],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/ll)),d=Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);if(d>max){max=d;k=i;}}
 return max>tolerance?[...simplifyPath(points.slice(0,k+1),tolerance).slice(0,-1),...simplifyPath(points.slice(k),tolerance)]:[a.slice(),b.slice()];}
export function roundPath(points,trim=12,step=.75){const out=[points[0].slice()],mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],la=Math.hypot(b[0]-a[0],b[1]-a[1]),lb=Math.hypot(c[0]-b[0],c[1]-b[1]);if(la<1e-5||lb<1e-5)continue;
  const dot=((b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]))/la/lb;if(dot>.9998){out.push(b.slice());continue;}
  const cut=Math.min(trim,la*.42,lb*.42),p=mix(b,a,cut/la),q=mix(b,c,cut/lb),n=Math.max(6,Math.ceil(cut*2/step));out.push(p);
  for(let j=1;j<=n;j++){const t=j/n;out.push(b.map((v,k)=>(1-t)*(1-t)*p[k]+2*(1-t)*t*v+t*t*q[k]));}}
 out.push(points.at(-1).slice());return out;}
// Distance-parametrised crew paths; orientation turns through the same rounded corner as the body.
export function makeCrewPath(points,trim=.42){const p=roundPath(points.map(v=>[v.x,v.z]),trim,.08),u=[0];for(let i=1;i<p.length;i++)u.push(u.at(-1)+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));
 const length=u.at(-1),at=dist=>{dist=Math.max(0,Math.min(length,dist));let i=0;while(i<u.length-2&&u[i+1]<dist)i++;const d=Math.max(1e-8,u[i+1]-u[i]),t=(dist-u[i])/d,dx=p[i+1][0]-p[i][0],dz=p[i+1][1]-p[i][1];return {x:p[i][0]+dx*t,z:p[i][1]+dz*t,dx:dx/d,dz:dz/d};};return {length,at};}
