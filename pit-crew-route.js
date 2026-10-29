// Local visibility planner for a mechanic's root. Obstacles are ground-projected people and loose tyres.
// A route is planned once; no sideways per-frame steering that would slide planted feet.
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function segmentClear(a,b,obstacles,pad=0){const dx=b.x-a.x,dz=b.z-a.z,ll=dx*dx+dz*dz;for(const o of obstacles){const t=ll?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/ll)):0;if(Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z)<o.r+pad-.001)return false;}return true;}
export function planCrewRoute(start,end,obstacles,{pad=.09,maxDetour=3}={}){
 const a={x:start.x,z:start.z},b={x:end.x,z:end.z};if(dist(a,b)<.02)return {points:[a,b],clear:true};
 // An occupied start may be exited; an occupied destination is unsafe and must not be reported clear.
 const obs=obstacles.filter(o=>dist(a,o)>o.r+.025&&dist(a,o)+dist(b,o)<dist(a,b)+maxDetour*2);
 if(segmentClear(a,b,obs,pad))return {points:[a,b],clear:true};
 const nodes=[a,b];for(const o of obs)for(let i=0;i<12;i++){const t=i*Math.PI/6,r=(o.r+pad)/Math.cos(Math.PI/12)+.035;const p={x:o.x+Math.cos(t)*r,z:o.z+Math.sin(t)*r};if(obs.every(q=>q===o||dist(p,q)>q.r+pad))nodes.push(p);}
 const N=nodes.length,cost=Array(N).fill(Infinity),prev=Array(N).fill(-1),used=new Uint8Array(N);cost[0]=0;
 for(let k=0;k<N;k++){let u=-1;for(let i=0;i<N;i++)if(!used[i]&&(u<0||cost[i]<cost[u]))u=i;if(u<0||!Number.isFinite(cost[u]))break;if(u===1)break;used[u]=1;
  for(let v=1;v<N;v++)if(!used[v]&&segmentClear(nodes[u],nodes[v],obs,pad)){const c=cost[u]+dist(nodes[u],nodes[v]);if(c<cost[v]){cost[v]=c;prev[v]=u;}}}
 if(!Number.isFinite(cost[1]))return {points:[a,b],clear:false};let p=1,path=[];while(p>=0){path.push(nodes[p]);p=prev[p];}return {points:path.reverse(),clear:true};
}
