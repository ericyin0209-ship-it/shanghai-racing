import * as THREE from 'three';
// A volume reconstructed around the component-aware flow paths, not a CFD pressure/velocity solution.
export function createWindVolume(){
 const nx=192,ny=96,nz=384,minimum=new THREE.Vector3(-1.45,.025,-5.3),maximum=new THREE.Vector3(1.45,1.05,3.15),extent=maximum.clone().sub(minimum);
 const data=new Uint8Array(nx*ny*nz),texture=new THREE.Data3DTexture(data,nx,ny,nz);texture.format=THREE.RedFormat;texture.type=THREE.UnsignedByteType;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.unpackAlignment=1;texture.needsUpdate=true;
 const solids=new Uint8Array(nx*ny*nz),solidTexture=new THREE.Data3DTexture(solids,nx,ny,nz);solidTexture.format=THREE.RedFormat;solidTexture.type=THREE.UnsignedByteType;solidTexture.minFilter=solidTexture.magFilter=THREE.LinearFilter;solidTexture.unpackAlignment=1;solidTexture.needsUpdate=true;
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,samples:4});target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);target.depthBuffer=true;
 const uniforms={colorMap:{value:target.texture},depthMap:{value:target.depthTexture},densityMap:{value:texture},solidMap:{value:solidTexture},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},eye:{value:new THREE.Vector3()},volumeMin:{value:minimum},volumeMax:{value:maximum},time:{value:0},travel:{value:0},strength:{value:0}};
 const material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp sampler3D;uniform sampler2D colorMap,depthMap;uniform sampler3D densityMap,solidMap;uniform mat4 inverseProjection,cameraWorld;uniform vec3 eye,volumeMin,volumeMax;uniform float time,travel,strength;varying vec2 vUv;out vec4 finalColor;
#define gl_FragColor finalColor

 float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 p){float n=noise(p)*.55;n+=noise(p*2.03+7.)*.28;n+=noise(p*4.09+19.)*.12;n+=noise(p*8.1+31.)*.05;return n;}
 float density(vec3 p){
 if(any(lessThan(p,volumeMin))||any(greaterThan(p,volumeMax)))return 0.;
 vec3 stream=p+vec3(0,0,travel);float wake=(1.-smoothstep(-3.5,-.8,p.z));
 float phase=p.z*7.+travel*3.1;float roll=sin(phase)*wake*.09;
 vec3 displacement=vec3(noise(stream*5.+17.)-.5,noise(stream*5.+31.)-.5,0.)*(.13+wake*.14);
 displacement.x+=roll;displacement.y+=cos(phase+p.x*5.)*wake*.065;
 float wheels=exp(-pow((p.z-1.02)*3.5,2.))+exp(-pow((p.z+1.12)*3.5,2.));
 displacement.y+=wheels*sin(p.z*13.+travel*5.+p.x*9.)*.06;
 displacement.z+=wheels*cos(p.y*17.+travel*4.)*.045;
 vec3 uv=(p+displacement-volumeMin)/(volumeMax-volumeMin);
 float base=texture(densityMap,clamp(uv,vec3(.001),vec3(.999))).r;
 float n=fbm(stream*7.+displacement*9.);float filaments=smoothstep(.22,.76,n);
 float turbulence=.08+1.65*filaments;
 float lateral=1.-smoothstep(.82+wake*.22,1.14+wake*.25,abs(p.x));
 float edges=smoothstep(0.,.035,uv.y)*(1.-smoothstep(.88,1.,uv.y));
 float solid=texture(solidMap,clamp((p-volumeMin)/(volumeMax-volumeMin),vec3(.001),vec3(.999))).r;return base*turbulence*edges*lateral*strength*(1.-solid);
 }
 float smokeShadow(vec3 p){vec3 uv=(p-volumeMin)/(volumeMax-volumeMin);if(any(lessThan(uv,vec3(0.)))||any(greaterThan(uv,vec3(1.))))return 0.;return texture(densityMap,uv).r*strength+texture(solidMap,uv).r*.65;}
 vec3 unproject(float depth){vec4 p=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);p/=p.w;return (cameraWorld*p).xyz;}
 void main(){vec3 background=texture(colorMap,vUv).rgb;if(strength<.001){finalColor=vec4(background,1.);}else{vec3 direction=normalize(unproject(1.)-eye),inv=1./direction,t0=(volumeMin-eye)*inv,t1=(volumeMax-eye)*inv,a=min(t0,t1),b=max(t0,t1);float start=max(0.,max(a.x,max(a.y,a.z))),end=min(b.x,min(b.y,b.z));float surface=length(unproject(texture(depthMap,vUv).r)-eye);end=min(end,surface);vec3 accum=vec3(0.);float transmission=1.;if(end>start){float stepSize=(end-start)/256.;float jitter=hash(vec3(gl_FragCoord.xy,1.));for(int i=0;i<256;i++){vec3 p=eye+direction*(start+(float(i)+jitter)*stepSize);float d=density(p);if(d>.002){float shadow=0.;for(int j=1;j<=8;j++)shadow+=smokeShadow(p+vec3(-.065,.12,.055)*float(j))*.12;float light=exp(-shadow*2.8);float scattering=.36+.75*light;float alpha=1.-exp(-d*stepSize*4.4);vec3 smoke=vec3(.75,.88,.95)*scattering;accum+=transmission*alpha*smoke;transmission*=1.-alpha;if(transmission<.025)break;}}}finalColor=vec4(accum+background*transmission,1.);}
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));let needsBake=true,lastRegion=null,lastYaw=null;
 function bake(flowAt,laneFor,region,yaw,time){if(!needsBake&&lastRegion===region&&lastYaw===yaw)return;needsBake=false;lastRegion=region;lastYaw=yaw;const field=new Float32Array(data.length),lanes=region==='all'?Array.from({length:54},(_,i)=>3+i%18+Math.floor(i/18)*23):Array.from({length:40},(_,i)=>laneFor(i));
  for(const lane of lanes)for(let k=0;k<=220;k++){const p=flowAt(lane,k/220,time,yaw);if(p[2]<minimum.z||p[2]>maximum.z)continue;const tail=Math.max(0,-p[2]-1.5),r=.058+Math.min(.11,tail*.035),cx=(p[0]-minimum.x)/extent.x*nx,cy=(p[1]-minimum.y)/extent.y*ny,cz=(p[2]-minimum.z)/extent.z*nz,rx=r/extent.x*nx,ry=r*.6/extent.y*ny,rz=.095/extent.z*nz;
   for(let z=Math.max(0,Math.floor(cz-rz*2));z<=Math.min(nz-1,Math.ceil(cz+rz*2));z++)for(let y=Math.max(0,Math.floor(cy-ry*2));y<=Math.min(ny-1,Math.ceil(cy+ry*2));y++)for(let x=Math.max(0,Math.floor(cx-rx*2));x<=Math.min(nx-1,Math.ceil(cx+rx*2));x++){const distance=((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2;field[x+nx*(y+ny*z)]+=Math.exp(-distance*1.5)*.28;}
  }
  for(let i=0;i<data.length;i++)data[i]=Math.min(255,field[i]*215);texture.needsUpdate=true;
 }
 function render(renderer,scene,camera,hidden,{flowAt,laneFor,region,yaw,time,distance,density,visible}){camera.updateMatrixWorld();bake(flowAt,laneFor,region,yaw,time);uniforms.time.value=time;uniforms.travel.value=distance*.18;uniforms.strength.value=visible?density*1.55:0;uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.eye.value.copy(camera.position);const size=renderer.getDrawingBufferSize(new THREE.Vector2());if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);const oldTarget=renderer.getRenderTarget(),states=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);try{renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);}finally{hidden.forEach((o,i)=>o.visible=states[i]);renderer.setRenderTarget(oldTarget);}renderer.render(postScene,postCamera);}
 function configureSolids(obstacles){
  solids.fill(0);const step=[extent.x/nx,extent.y/ny,extent.z/nz],origin=minimum.toArray();
  for(const o of obstacles){
   const center=[o.x,o.y,o.z],r=[o.rx,o.ry,o.rz],edge=.009,minRadius=Math.min(...r);
   const lo=center.map((v,i)=>Math.max(0,Math.floor((v-r[i]-edge-origin[i])/step[i]))),hi=center.map((v,i)=>Math.min([nx,ny,nz][i]-1,Math.ceil((v+r[i]+edge-origin[i])/step[i])));
   for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++){
    const qx=(origin[0]+(x+.5)*step[0]-center[0])/r[0],qy=(origin[1]+(y+.5)*step[1]-center[1])/r[1],qz=(origin[2]+(z+.5)*step[2]-center[2])/r[2];
    const signed=(Math.sqrt(qx*qx+qy*qy+qz*qz)-1)*minRadius,u=Math.max(0,Math.min(1,(signed+.004)/.013)),value=Math.round((1-u*u*(3-2*u))*255),i=x+nx*(y+ny*z);
    solids[i]=Math.max(solids[i],value);
   }
  }
  solidTexture.needsUpdate=true;needsBake=true;
 }
 return {render,configureSolids,invalidate(){needsBake=true;},texture};
}
