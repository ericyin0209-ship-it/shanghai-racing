import {Reflector} from './vendor/Reflector.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import * as THREE from 'three';
import {landmarkMaterials,createLandmarkBuilder} from './circuit-surface.js?v=218i';
// Extend existing mapped footprints rather than inventing a second paddock layout.
export function offsetFootprint(points,distance){
 const p=points.slice(0,-1),area=p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0),sign=area>0?1:-1;
 return p.map((a,i)=>{const prev=p[(i+p.length-1)%p.length],next=p[(i+1)%p.length],d1=new THREE.Vector2(a[0]-prev[0],a[1]-prev[1]).normalize(),d2=new THREE.Vector2(next[0]-a[0],next[1]-a[1]).normalize(),n1=new THREE.Vector2(d1.y,-d1.x).multiplyScalar(sign),n2=new THREE.Vector2(d2.y,-d2.x).multiplyScalar(sign),sum=n1.clone().add(n2).normalize(),den=Math.max(.4,sum.dot(n1));return [a[0]+sum.x*distance/den,a[1]+sum.y*distance/den];});
}
export async function createPaddockDetail(scene,track){
 const data=await fetch('./surroundings-data.json').then(r=>r.json()),root=new THREE.Group();root.name='Mapped water pavilions and bank construction / 218';scene.add(root);const m=landmarkMaterials(),b=createLandmarkBuilder(root);let pavilions=0,bankSegments=0;const lakeParts=[];
 for(const f of data.features){
  const p=f.points;if(!p||p.length<4)continue;const cx=p.reduce((s,a)=>s+a[0],0)/p.length,cz=p.reduce((s,a)=>s+a[1],0)/p.length;
  if(track.nearest(cx,cz).distance>430)continue;
  if(f.kind==='water'){
   if(cx>-250&&cx<-70&&cz>-500&&cz<20){const shape=new THREE.Shape(p.map(a=>new THREE.Vector2(a[0],-a[1])));for(const hole of (f.holes||[]))shape.holes.push(new THREE.Path(hole.map(a=>new THREE.Vector2(a[0],-a[1]))));lakeParts.push(new THREE.ShapeGeometry(shape));}
   for(let i=0;i<p.length-1;i++){const a=p[i],q=p[i+1],dx=q[0]-a[0],dz=q[1]-a[1],len=Math.hypot(dx,dz);if(len<.3)continue;b.box('mapped water bank coping',[.40,.22,len],[((a[0]+q[0])/2),.065,(a[1]+q[1])/2],m.concrete,Math.atan2(dx,dz));bankSegments++;}
  }
  if(f.kind!=='building'||f.tags['building:material']!=='glass'||cx>-75||cz<-430||cz>0)continue;
  pavilions++;const height=parseFloat(f.tags.height)||5.5,roof=height+1.35,expanded=offsetFootprint(p,.85),shape=new THREE.Shape();shape.moveTo(expanded[0][0],-expanded[0][1]);for(const a of expanded.slice(1))shape.lineTo(a[0],-a[1]);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,roof,0);const canopy=new THREE.Mesh(g,m.ivory);canopy.name='Pavilion extended roof with physical fascia';canopy.castShadow=canopy.receiveShadow=true;root.add(canopy);
  for(let i=0;i<p.length-1;i++){
   const a=p[i],q=p[i+1],dx=q[0]-a[0],dz=q[1]-a[1],len=Math.hypot(dx,dz);if(len<.3)continue;const angle=Math.atan2(dx,dz),ux=dx/len,uz=dz/len;
   b.box('pavilion recessed soffit strip',[.12,.028,len*.86],[(a[0]+q[0])/2,roof-.014,(a[1]+q[1])/2],m.glow,angle);
   for(let s=0;s<len-.1;s+=1.8){const t=(s+.04)/len;b.box('pavilion fine curtain mullions',[.075,height,.075],[a[0]+dx*t,1.1+height/2,a[1]+dz*t],m.alloy);}
   // Stilt collars seat onto mapped pier centres, not onto an invented second foundation grid.
   b.box('pavilion concrete pier collar',[.42,.20,.42],[a[0],.12,a[1]],m.concrete);
   b.box('pavilion parapet cap',[.18,.16,len],[(a[0]+q[0])/2,roof+.1,(a[1]+q[1])/2],m.alloy,angle);
  }
  const first=p[0],next=p[1],dx=next[0]-first[0],dz=next[1]-first[1],len=Math.hypot(dx,dz),theta=Math.atan2(dx,dz);
  if(len>5){const nx=dz/len,nz=-dx/len,x=(first[0]+next[0])/2+nx*.7,z=(first[1]+next[1])/2+nz*.7;b.box('pavilion balcony bench',[.55,.12,2.6],[x,1.58,z],m.ivory,theta);for(const u of [-.8,.8])b.box('pavilion bench legs',[.4,.36,.12],[x+dx/len*u,1.34,z+dz/len*u],m.dark,theta);}
 }
 const lakeWind={value:0},clock={value:0};let reflection=null,reflectionUpdates=0;
 if(lakeParts.length){const g=mergeGeometries(lakeParts,false);lakeParts.forEach(p=>p.dispose());reflection=new Reflector(g,{textureWidth:1024,textureHeight:576,color:'#88a6a9',clipBias:.006,multisample:0});reflection.name='Paddock water architectural reflection';reflection.rotation.x=-Math.PI/2;reflection.position.y=.009;reflection.camera.userData.reflectionView=true;reflection.userData.dynamic=true;reflection.material.transparent=true;reflection.material.depthWrite=false;reflection.material.uniforms.lakeClock=clock;reflection.material.uniforms.lakeWind=lakeWind;
  reflection.material.vertexShader='varying vec3 lakeWorld;\n'+reflection.material.vertexShader;reflection.material.vertexShader=reflection.material.vertexShader.replace('void main() {','void main() {lakeWorld=(modelMatrix*vec4(position,1.)).xyz;');reflection.material.fragmentShader='varying vec3 lakeWorld;uniform float lakeClock,lakeWind;\n'+reflection.material.fragmentShader;
  reflection.material.fragmentShader=reflection.material.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );','vec4 distorted=vUv;vec2 ripple=vec2(cos(lakeWorld.x*2.3+lakeWorld.z*.8+lakeClock*(.4+lakeWind*.5)),sin(lakeWorld.z*3.1+lakeClock*(.6+lakeWind*.5)));distorted.xy+=ripple*(.00028+lakeWind*.00032)*vUv.w;vec4 base=texture2DProj(tDiffuse,distorted);');reflection.material.fragmentShader=reflection.material.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','float fresnel=.15+.65*pow(1.-abs(normalize(cameraPosition-lakeWorld).y),3.);gl_FragColor=vec4(blendOverlay(base.rgb,color),fresnel);');
  const original=reflection.onBeforeRender,previous=new THREE.Matrix4(),previousProjection=new THREE.Matrix4();let last=-1000,dirty=true;
  reflection.onBeforeRender=function(renderer,scene,camera){if(camera.userData.reflectionView)return;const now=performance.now(),moved=!previous.equals(camera.matrixWorld)||!previousProjection.equals(camera.projectionMatrix);if(!dirty&&!moved)return;if(!dirty&&now-last<65)return;const hidden=[];scene.traverse(o=>{if(o.isReflector&&o!==this&&o.visible){hidden.push(o);o.visible=false;}});try{original.call(this,renderer,scene,camera);previous.copy(camera.matrixWorld);previousProjection.copy(camera.projectionMatrix);last=now;dirty=false;reflectionUpdates++;}finally{hidden.forEach(o=>o.visible=true);}};
  reflection.userData.markDirty=()=>{dirty=true;};root.add(reflection);
 }
 const stats={...b.finish(),pavilions,bankSegments,lakeReflection:!!reflection,reflectionSize:[1024,576]};return {root,stats,updateTime:(t,wind=0)=>{clock.value=t;lakeWind.value=wind;},prepare(camera,enabled=true){if(reflection)reflection.visible=enabled&&!camera.userData.reflectionView&&camera.position.x>-275&&camera.position.x<-72&&camera.position.y<45&&camera.position.z>-510&&camera.position.z<30;},setNight(v){m.glow.emissiveIntensity=v*1.7;reflection?.userData.markDirty();},get reflectionUpdates(){return reflectionUpdates;}};
}
