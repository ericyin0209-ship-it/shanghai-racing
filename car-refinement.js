import * as THREE from 'three';
let wingsTexture;
export async function preloadRefinementAssets(){if(typeof document.createElementNS!=='function'){wingsTexture=new THREE.CanvasTexture(document.createElement('canvas'));return;}wingsTexture=await new THREE.TextureLoader().loadAsync('assets/logos/amr23-nose-wings.svg');wingsTexture.colorSpace=THREE.SRGBColorSpace;wingsTexture.anisotropy=8;}

const sideProjectors=new WeakMap();
function sideProjector(geometries){
 if(sideProjectors.has(geometries))return sideProjectors.get(geometries);
 const cells=new Map(),size=.025;
 for(const g of geometries){const p=g.attributes.position,idx=g.index;for(let i=0;i<(idx?idx.count:p.count);i+=3){const tri=[0,1,2].map(k=>{const v=idx?idx.getX(i+k):i+k;return [p.getX(v),p.getY(v),p.getZ(v)];});const ys=tri.map(v=>v[1]),zs=tri.map(v=>v[2]);for(let y=Math.floor(Math.min(...ys)/size);y<=Math.floor(Math.max(...ys)/size);y++)for(let z=Math.floor(Math.min(...zs)/size);z<=Math.floor(Math.max(...zs)/size);z++){const key=y+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(tri);}}}
 const sample=(sign,y,z)=>{let result=sign>0?-Infinity:Infinity;for(const [a,b,c] of cells.get(Math.floor(y/size)+':'+Math.floor(z/size))||[]){const dy1=b[1]-a[1],dz1=b[2]-a[2],dy2=c[1]-a[1],dz2=c[2]-a[2],det=dy1*dz2-dz1*dy2;if(Math.abs(det)<1e-14)continue;const u=((y-a[1])*dz2-(z-a[2])*dy2)/det,v=(dy1*(z-a[2])-dz1*(y-a[1]))/det;if(u>=-1e-7&&v>=-1e-7&&u+v<=1.0000001){const x=a[0]+u*(b[0]-a[0])+v*(c[0]-a[0]);result=sign>0?Math.max(result,x):Math.min(result,x);}}return Number.isFinite(result)?result:null;};sideProjectors.set(geometries,sample);return sample;
}
// Photograph-informed render assembly, in metres. No factory CAD dimensions are claimed.
function roundedProfile(w,h,n=96){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return new THREE.Vector2(w*Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.65),h*Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.65));});}
function loft(sections,n=96){const positions=[],uv=[],indices=[];for(let j=0;j<sections.length;j++){const s=sections[j],profile=roundedProfile(s.w,s.h,n);for(let i=0;i<=n;i++){const p=profile[i%n];positions.push((s.x||0)+p.x,s.y+p.y,s.z);uv.push(i/n,j/(sections.length-1));}}for(let j=0;j<sections.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
function blade(points,chord,thickness){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),pos=[],uv=[],idx=[],steps=32,ring=16;for(let j=0;j<=steps;j++){const p=curve.getPoint(j/steps);for(let i=0;i<=ring;i++){const a=i/ring*Math.PI*2;pos.push(p.x,p.y+Math.sin(a)*thickness*.5,p.z+Math.cos(a)*chord*.5);uv.push(i/ring,j/steps);}}for(let j=0;j<steps;j++)for(let i=0;i<ring;i++){const a=j*(ring+1)+i,b=a+ring+1;idx.push(a,b,a+1,b,b+1,a+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
export function addCarRefinement(chassis,carbon,paint,wingEndplates=[],noseSurfaces=[],refinementMarks=[]){
 const root=new THREE.Group();root.name='AMR23 refined external assembly';chassis.add(root);const c=carbon.clone();c.side=THREE.DoubleSide;c.color.set('#171c1d');c.metalness=.3;c.roughness=.36;const p=paint.clone();p.side=THREE.DoubleSide;const black=new THREE.MeshStandardMaterial({color:'#020405',roughness:1,envMapIntensity:0,side:THREE.DoubleSide});
 const mesh=(name,g,m)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=o.receiveShadow=true;root.add(o);return o;};
 // A continuous rolled intake lip, recessed duct and tapering shell replace intersecting caps.
 const lip=[{w:.145,h:.106,y:.981,z:-.275},{w:.147,h:.108,y:.981,z:-.281},{w:.147,h:.108,y:.981,z:-.290},{w:.139,h:.100,y:.981,z:-.297},{w:.132,h:.093,y:.981,z:-.296},{w:.131,h:.092,y:.981,z:-.284}];
 mesh('Airbox / continuous radiused carbon lip',loft(lip),c);
 mesh('Airbox / recessed hollow duct',loft([{w:.131,h:.092,y:.981,z:-.284},{w:.128,h:.089,y:.981,z:-.32},{w:.116,h:.077,y:.983,z:-.38},{w:.103,h:.063,y:.987,z:-.44}]),black);
 const airboxShell=mesh('Airbox / integrated outer fairing',loft([{w:.145,h:.106,y:.981,z:-.290},{w:.149,h:.109,y:.980,z:-.33},{w:.151,h:.110,y:.976,z:-.39},{w:.148,h:.104,y:.970,z:-.46},{w:.135,h:.088,y:.960,z:-.55},{w:.111,h:.065,y:.943,z:-.66}]),p);
 const darkBack=new THREE.MeshBasicMaterial({color:'#010203',side:THREE.DoubleSide});const throat=mesh('Airbox / dark recessed rear surface',new THREE.PlaneGeometry(.28,.205),darkBack);throat.position.set(0,.985,-.444);
 const shellSections=[{w:.145,h:.106,y:.981,z:-.290},{w:.149,h:.109,y:.980,z:-.33},{w:.151,h:.110,y:.976,z:-.39},{w:.148,h:.104,y:.970,z:-.46},{w:.135,h:.088,y:.960,z:-.55},{w:.111,h:.065,y:.943,z:-.66}];
 for(const mark of refinementMarks){const g=mark.geometry.clone(),pos=g.attributes.position,sign=Math.sign(pos.getX(0));for(let i=0;i<pos.count;i++){const z=pos.getZ(i);let j=0;while(j<shellSections.length-2&&z<shellSections[j+1].z)j++;const a=shellSections[j],b=shellSections[j+1],t=THREE.MathUtils.clamp((z-a.z)/(b.z-a.z),0,1),w=THREE.MathUtils.lerp(a.w,b.w,t),h=THREE.MathUtils.lerp(a.h,b.h,t),y=THREE.MathUtils.lerp(a.y,b.y,t),power=2/.65,ratio=Math.min(.999,Math.abs((pos.getY(i)-y)/h));pos.setX(i,sign*(w*Math.pow(1-Math.pow(ratio,power),1/power)+.00045));}g.computeVertexNormals();mesh('Airbox / fitted BOMBARDIER paint '+sign,g,mark.material.clone());}

 const divider=mesh('Airbox / thin internal splitter',new THREE.BoxGeometry(.003,.171,.014),c);divider.position.set(0,.982,-.300);
 for(const s of [-1,1]){
  const section=(w,h,y,z)=>({x:s*.525,w,h,y,z});
  mesh('Sidepod / continuous painted inlet lip '+s,loft([section(.229,.058,.580,.603),section(.230,.059,.580,.597),section(.227,.056,.580,.587),section(.218,.047,.580,.584),section(.217,.046,.580,.596)]),p);
  mesh('Sidepod / recessed inlet tunnel '+s,loft([section(.217,.046,.580,.596),section(.208,.044,.578,.53),section(.195,.041,.575,.44),section(.180,.038,.571,.36)]),black);
  mesh('Sidepod / blended inlet shoulder '+s,loft([section(.229,.058,.580,.597),section(.235,.070,.574,.56),section(.244,.095,.561,.50),section(.251,.129,.545,.42)]),p);
  const inletBack=mesh('Sidepod / recessed radiator face '+s,new THREE.PlaneGeometry(.44,.092),darkBack);inletBack.position.set(s*.525,.580,.52);
  for(const offset of [-.1,0,.1]){const splitter=mesh('Sidepod / internal splitter '+s,new THREE.BoxGeometry(.003,.078,.12),c);splitter.position.set(s*.525+offset,.577,.45);}
  mesh('Mirror / swept carbon mounting blade '+s,blade([[s*.296,.642,.704],[s*.36,.650,.704],[s*.46,.668,.694],[s*.56,.685,.686],[s*.588,.688,.685]],.052,.008),c);
  const wing=mesh('Mirror / single thin lower aerofoil '+s,blade([[s*.474,.671,.665],[s*.53,.670,.665],[s*.60,.668,.664],[s*.674,.667,.663]],.112,.0035),c);
  wing.userData.detail='Single supported lower vane, no loop or stacked duplicate';
 }
 // The launch car has a rounded white XP badge. Keep its proportions and seat it
 // on the curved endplate rather than leaving a thick, floating rectangular plaque.
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,768);ctx.fillStyle='#f4f5ef';ctx.beginPath();ctx.roundRect(25,25,974,718,62);ctx.fill();ctx.fillStyle='#070b0e';ctx.beginPath();const xPoints=[[155,240],[265,240],[370,345],[475,240],[585,240],[425,400],[585,560],[475,560],[370,455],[265,560],[155,560],[315,400]];ctx.moveTo(...xPoints[0]);for(const point of xPoints.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(555,240);ctx.lineTo(741,240);ctx.bezierCurveTo(934,240,934,493,741,493);ctx.lineTo(637,493);ctx.lineTo(637,686);ctx.lineTo(555,686);ctx.closePath();ctx.moveTo(637,319);ctx.lineTo(637,414);ctx.lineTo(738,414);ctx.bezierCurveTo(826,414,826,319,738,319);ctx.closePath();ctx.fill('evenodd');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;const ink=new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.1,depthWrite:false,roughness:.48,polygonOffset:true,polygonOffsetFactor:-1});
 for(const s of [-1,1]){
  const g=new THREE.PlaneGeometry(.145,.115,12,10);g.rotateY(s*Math.PI/2);g.translate(s*.845,.665,-2.425);const sample=sideProjector(wingEndplates),pos=g.attributes.position;let projectionMisses=0;for(let i=0;i<pos.count;i++){const x=sample(s,pos.getY(i),pos.getZ(i));if(x!==null)pos.setX(i,x+s*.00045);else projectionMisses++;}g.computeVertexNormals();
  const badge=mesh('Rear wing / fitted XP paint '+s,g,ink);badge.userData.projectionMisses=projectionMisses;
 }
 // New thin paint decals preserve the wings artwork instead of stretching letter geometry
 // across the seam between the supplied nose and survival-cell surfaces.
 const wingsInk=new THREE.MeshStandardMaterial({map:wingsTexture,transparent:true,alphaTest:.08,depthWrite:false,roughness:.4,polygonOffset:true,polygonOffsetFactor:-1});
 const noseSample=sideProjector(noseSurfaces);
 for(const sign of [-1,1]){const g=new THREE.PlaneGeometry(.266,.061,40,12);g.rotateY(sign*Math.PI/2);g.translate(sign*.30,.480,1.035);const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const x=noseSample(sign,pos.getY(i),pos.getZ(i));if(x!==null)pos.setX(i,x+sign*.0004);}g.computeVertexNormals();mesh('Nose / fitted wings paint '+sign,g,wingsInk);}

 return root;
}
// Clip the supplied forward engine-cover cap behind the intake, interpolating every
// triangle at the join. Centroid-only deletion would leave long triangles across the mouth.
export function openIntakeChannel(name,g){
 if(name!=='Engine cover | narrow central spine'&&!/^Engine cover \| centre split line/.test(name))return g;
 const source=g.index?g.toNonIndexed():g,attributes={};for(const k of Object.keys(source.attributes))attributes[k]=[];
 const keys=Object.keys(source.attributes),position=source.attributes.position;
 const vertex=i=>Object.fromEntries(keys.map(k=>[k,Array.from({length:source.attributes[k].itemSize},(_,c)=>source.attributes[k].getComponent(i,c))]));
 const blend=(a,b,t)=>Object.fromEntries(keys.map(k=>[k,a[k].map((v,c)=>v+(b[k][c]-v)*t)]));
 function cut(polygon,axis,bound,less){const result=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],insideA=less?a.position[axis]<=bound:a.position[axis]>=bound,insideB=less?b.position[axis]<=bound:b.position[axis]>=bound;if(insideA)result.push(a);if(insideA!==insideB)result.push(blend(a,b,(bound-a.position[axis])/(b.position[axis]-a.position[axis])));}return result;}
 function append(polygon){for(let j=1;j<polygon.length-1;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]])for(const k of keys)attributes[k].push(...v[k]);}
 for(let i=0;i<position.count;i+=3){const tri=[vertex(i),vertex(i+1),vertex(i+2)];append(cut(tri,1,.865,true));append(cut(cut(tri,1,.865,false),2,-.46,true));}

 const result=new THREE.BufferGeometry();for(const [key,arr] of Object.entries(attributes))result.setAttribute(key,new THREE.Float32BufferAttribute(arr,source.attributes[key].itemSize));result.setIndex(Array.from({length:result.attributes.position.count},(_,i)=>i));if(source!==g)source.dispose();g.dispose();return result;
}
// The old lower/front endplate corner crossed the rear tyre envelope. Clip the
// carbon surface to a circular clearance; subdivide near the cut to retain the arc.
export function clearRearTyre(name,g){
 if(!/^Rear wing \| (?:hanging endplate|lower rolled lip)/.test(name))return g;
 const source=g.index?g.toNonIndexed():g,keys=Object.keys(source.attributes),out=Object.fromEntries(keys.map(k=>[k,[]])),radius=.433;
 const vertex=i=>Object.fromEntries(keys.map(k=>[k,Array.from({length:source.attributes[k].itemSize},(_,c)=>source.attributes[k].getComponent(i,c))]));
 const mix=(a,b,t)=>Object.fromEntries(keys.map(k=>[k,a[k].map((v,c)=>v+(b[k][c]-v)*t)]));
 const distance=v=>Math.hypot(v.position[1]-.36,v.position[2]+1.93)-radius;
 function emit(tri){for(const v of tri)for(const k of keys)out[k].push(...v[k]);}
 function clip(tri,depth=0){
  const ys=tri.map(v=>v.position[1]),zs=tri.map(v=>v.position[2]),near=Math.min(...ys)<.74&&Math.max(...zs)>-2.32;let edge=0,length=0;
  for(let j=0;j<3;j++){const a=tri[j].position,b=tri[(j+1)%3].position,l=Math.hypot(a[1]-b[1],a[2]-b[2]);if(l>length){length=l;edge=j;}}
  if(near&&length>.018&&depth<8){const a=tri[edge],b=tri[(edge+1)%3],c=tri[(edge+2)%3],m=mix(a,b,.5);clip([a,m,c],depth+1);clip([m,b,c],depth+1);return;}
  const polygon=[];for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3],da=distance(a),db=distance(b);if(da>=0)polygon.push(a);if((da>=0)!==(db>=0)){let lo=0,hi=1;for(let n=0;n<24;n++){const t=(lo+hi)/2,d=distance(mix(a,b,t));if((d>=0)===(da>=0))lo=t;else hi=t;}polygon.push(mix(a,b,(lo+hi)/2));}}
  for(let j=1;j<polygon.length-1;j++)emit([polygon[0],polygon[j],polygon[j+1]]);
 }
 for(let i=0;i<source.attributes.position.count;i+=3)clip([vertex(i),vertex(i+1),vertex(i+2)]);
 const result=new THREE.BufferGeometry();for(const k of keys)result.setAttribute(k,new THREE.Float32BufferAttribute(out[k],source.attributes[k].itemSize));result.setIndex(Array.from({length:result.attributes.position.count},(_,i)=>i));if(source!==g)source.dispose();g.dispose();return result;
}
