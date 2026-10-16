// Cache spatial candidates, not query results: cars still sample their exact position.
export function createTrackLocator(points,frames,length,cellSize=45){
 const count=points.length-1,cells=new Map(),cache=new Map();
 const dx=new Float64Array(count),dz=new Float64Array(count),squaredLength=new Float64Array(count);
 const all=Uint32Array.from({length:count},(_,i)=>i);
 for(let i=0;i<count;i++){
  const point=points[i],key=`${Math.floor(point.x/cellSize)},${Math.floor(point.z/cellSize)}`;
  if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
  dx[i]=points[i+1].x-point.x;dz[i]=points[i+1].z-point.z;
  squaredLength[i]=dx[i]*dx[i]+dz[i]*dz[i];
 }
 function candidates(x,z){
  const cx=Math.floor(x/cellSize),cz=Math.floor(z/cellSize),key=`${cx},${cz}`;
  if(cache.has(key))return cache.get(key);
  const indices=[];
  for(let ix=-1;ix<=1;ix++)for(let iz=-1;iz<=1;iz++){
   const list=cells.get(`${cx+ix},${cz+iz}`);if(list)indices.push(...list);
  }
  const result=indices.length?Uint32Array.from(indices):all;
  // Bound memory when inspecting or driving well beyond the track.
  if(cache.size>=512)cache.delete(cache.keys().next().value);
  cache.set(key,result);return result;
 }
 function query(x,z,out={}){
  let distanceSquared=Infinity,index=0,fraction=0,px=0,pz=0;
  for(const i of candidates(x,z)){
   const a=points[i],f=Math.max(0,Math.min(1,((x-a.x)*dx[i]+(z-a.z)*dz[i])/squaredLength[i]));
   const qx=a.x+dx[i]*f,qz=a.z+dz[i]*f,d=(x-qx)**2+(z-qz)**2;
   // Preserve candidate order and strict tie handling from the original locator.
   if(d<distanceSquared){distanceSquared=d;index=i;fraction=f;px=qx;pz=qz;}
  }
  const normal=frames[index].normal;
  out.s=(index+fraction)/count*length;out.distance=Math.sqrt(distanceSquared);
  out.offset=(x-px)*normal.x+(z-pz)*normal.z;out.index=index;out.x=px;out.z=pz;
  return out;
 }
 return {query,get cacheSize(){return cache.size;}};
}
