import * as THREE from 'three';
// A volume reconstructed around the component-aware flow paths, not a CFD pressure/velocity solution.
export function createWindVolume(){
 const nx=192,ny=96,nz=384,minimum=new THREE.Vector3(-1.45,.025,-5.3),maximum=new THREE.Vector3(1.45,1.05,3.15),extent=maximum.clone().sub(minimum);
 const data=new Uint8Array(nx*ny*nz),texture=new THREE.Data3DTexture(data,nx,ny,nz);texture.format=THREE.RedFormat;texture.type=THREE.UnsignedByteType;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.unpackAlignment=1;texture.needsUpdate=true;
 const solids=new Uint8Array(nx*ny*nz),solidTexture=new THREE.Data3DTexture(solids,nx,ny,nz);solidTexture.format=THREE.RedFormat;solidTexture.type=THREE.UnsignedByteType;solidTexture.minFilter=solidTexture.magFilter=THREE.LinearFilter;solidTexture.unpackAlignment=1;solidTexture.needsUpdate=true;
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,samples:0});target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);target.depthBuffer=true;
 // Precomputed lattice values replace dozens of transcendental hashes per ray step.
 const noiseSize=128,noiseData=new Uint8Array(noiseSize**3);for(let z=0;z<noiseSize;z++)for(let y=0;y<noiseSize;y++)for(let x=0;x<noiseSize;x++){const h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;noiseData[x+noiseSize*(y+noiseSize*z)]=Math.round((h-Math.floor(h))*255);}
 const noiseTexture=new THREE.Data3DTexture(noiseData,noiseSize,noiseSize,noiseSize);noiseTexture.format=THREE.RedFormat;noiseTexture.minFilter=noiseTexture.magFilter=THREE.LinearFilter;noiseTexture.wrapS=noiseTexture.wrapT=noiseTexture.wrapR=THREE.RepeatWrapping;noiseTexture.unpackAlignment=1;noiseTexture.needsUpdate=true;
 // Optical depth is static until the flow profile changes. Integrate it once,
 // retaining separate smoke/solid channels so live density adjustments stay exact.
 const lightTarget=new THREE.WebGL3DRenderTarget(96,48,192);lightTarget.texture.type=THREE.HalfFloatType;lightTarget.texture.minFilter=lightTarget.texture.magFilter=THREE.LinearFilter;lightTarget.depthBuffer=false;let lightingDirty=true;
 const lightUniforms={densityMap:{value:texture},solidMap:{value:solidTexture},volumeMin:{value:minimum},volumeMax:{value:maximum},slice:{value:0}};
 const lightMaterial=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:lightUniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp sampler3D;uniform sampler3D densityMap,solidMap;uniform vec3 volumeMin,volumeMax;uniform float slice;varying vec2 vUv;out vec4 result;void main(){vec3 p=mix(volumeMin,volumeMax,vec3(vUv,slice));vec2 sum=vec2(0.);for(int j=1;j<=8;j++){vec3 uv=(p+vec3(-.065,.12,.055)*float(j)-volumeMin)/(volumeMax-volumeMin);if(all(greaterThanEqual(uv,vec3(0.)))&&all(lessThanEqual(uv,vec3(1.))))sum+=vec2(texture(densityMap,uv).r,texture(solidMap,uv).r)*.12;}result=vec4(sum,0.,1.);}`});
 const lightScene=new THREE.Scene(),lightCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);lightScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),lightMaterial));
 const smokeTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});const size=new THREE.Vector2();
 const uniforms={colorMap:{value:target.texture},depthMap:{value:target.depthTexture},lightMap:{value:lightTarget.texture},noiseMap:{value:noiseTexture},densityMap:{value:texture},solidMap:{value:solidTexture},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},eye:{value:new THREE.Vector3()},volumeMin:{value:minimum},volumeMax:{value:maximum},time:{value:0},travel:{value:0},arrival:{value:0},traceMax:{value:new THREE.Vector3(1.45,1.05,7.38)},strength:{value:0}};
 const material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp sampler3D;uniform sampler2D colorMap,depthMap;uniform sampler3D densityMap,solidMap,noiseMap,lightMap;uniform mat4 inverseProjection,cameraWorld;uniform vec3 eye,volumeMin,volumeMax,traceMax;uniform float time,travel,strength,arrival;varying vec2 vUv;out vec4 finalColor;
#define gl_FragColor finalColor

 float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return texture(noiseMap,(i+f+.5)/128.).r;}
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
 if(base==0.)return 0.;
 float n=fbm(stream*7.+displacement*9.);float filaments=smoothstep(.22,.76,n);
 float turbulence=.08+1.65*filaments;
 float lateral=1.-smoothstep(.82+wake*.22,1.14+wake*.25,abs(p.x));
 float edges=smoothstep(0.,.035,uv.y)*(1.-smoothstep(.88,1.,uv.y));
 float solid=texture(solidMap,clamp((p-volumeMin)/(volumeMax-volumeMin),vec3(.001),vec3(.999))).r;return base*turbulence*edges*lateral*strength*(1.-solid);
 }
 float smokeShadow(vec3 p){vec3 uv=(p-volumeMin)/(volumeMax-volumeMin);if(any(lessThan(uv,vec3(0.)))||any(greaterThan(uv,vec3(1.))))return 0.;return texture(densityMap,uv).r*strength+texture(solidMap,uv).r*.65;}
 vec3 unproject(float depth){vec4 p=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);p/=p.w;return (cameraWorld*p).xyz;}
 void main(){if(strength<.001){finalColor=vec4(0.,0.,0.,1.);}else{vec3 direction=normalize(unproject(1.)-eye),inv=1./direction,t0=(volumeMin-eye)*inv,t1=(traceMax-eye)*inv,a=min(t0,t1),b=max(t0,t1);float start=max(0.,max(a.x,max(a.y,a.z))),end=min(b.x,min(b.y,b.z));float surface=length(unproject(texture(depthMap,vUv).r)-eye);end=min(end,surface);vec3 accum=vec3(0.);float transmission=1.;if(end>start){float stepSize=(end-start)/160.;float jitter=hash(vec3(gl_FragCoord.xy,1.));for(int i=0;i<160;i++){vec3 p=eye+direction*(start+(float(i)+jitter)*stepSize);float d=density(p);if(d>.002){vec2 opticalDepth=texture(lightMap,(p-volumeMin)/(volumeMax-volumeMin)).rg;float shadow=opticalDepth.x*strength+opticalDepth.y*.65;float light=exp(-shadow*2.8);float scattering=.36+.75*light;float alpha=1.-exp(-d*stepSize*4.4);vec3 smoke=vec3(.75,.88,.95)*scattering;accum+=transmission*alpha*smoke;transmission*=1.-alpha;if(transmission<.025)break;}}}finalColor=vec4(accum,transmission);}

 }`});
 // Evaluate animated turbulence once per world-space voxel, never once per
 // screen pixel AND ray step. A filterable 2D slice atlas avoids 192 layer draws.
 const fieldTarget=new THREE.WebGLRenderTarget(2048,1024,{type:THREE.HalfFloatType,depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});uniforms.fieldMap={value:fieldTarget.texture};
 const functions=material.fragmentShader.slice(material.fragmentShader.indexOf(' float hash'),material.fragmentShader.indexOf(' vec3 unproject'));
 const fieldMaterial=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms,vertexShader:material.vertexShader,fragmentShader:`precision highp sampler3D;uniform sampler3D densityMap,solidMap,noiseMap,lightMap;uniform vec3 volumeMin,volumeMax;uniform float time,travel,strength;out vec4 result;${functions}
 void main(){vec2 pixel=floor(gl_FragCoord.xy),tile=floor(pixel/vec2(128.,64.));float slice=tile.x+tile.y*16.;vec3 uv=vec3((mod(pixel,vec2(128.,64.))+.5)/vec2(128.,64.),(slice+.5)/256.);vec3 p=mix(volumeMin,volumeMax,uv);float d=density(p);vec2 depth=texture(lightMap,uv).rg;float scattering=.36+.75*exp(-(depth.x*strength+depth.y*.65)*2.8);result=vec4(d,d*scattering,0.,1.);}`});
 const fieldScene=new THREE.Scene(),fieldCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);fieldScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),fieldMaterial));
 const sampleField=`uniform sampler2D fieldMap;
 vec2 fieldSlice(vec2 xy,float z){vec2 tile=vec2(mod(z,16.),floor(z/16.));vec2 pixel=clamp(xy*vec2(128.,64.),vec2(.5),vec2(127.5,63.5));return texture(fieldMap,(tile*vec2(128.,64.)+pixel)/vec2(2048.,1024.)).rg;}
 vec2 sampleField(vec3 p){vec3 uv=clamp((p-volumeMin)/(volumeMax-volumeMin),vec3(0.),vec3(1.));float z=clamp(uv.z*256.-.5,0.,255.),lo=floor(z);vec2 field=mix(fieldSlice(uv.xy,lo),fieldSlice(uv.xy,min(lo+1.,255.)),fract(z));
 if(p.z>volumeMax.z){float inlet=smoothstep(volumeMax.z,4.,p.z);field*=mix(1.,.6+.8*noise(p*4.+vec3(0.,0.,travel*4.)),inlet);}
 float front=7.38-arrival;field*=smoothstep(front-.15,front+.05,p.z)*(1.-smoothstep(7.30,7.38,p.z));return field;}

 `;
 material.fragmentShader=material.fragmentShader.replace(' vec3 unproject',sampleField+' vec3 unproject').replace('float d=density(p);','vec2 field=sampleField(p);float d=field.r;').replace('vec2 opticalDepth=texture(lightMap,(p-volumeMin)/(volumeMax-volumeMin)).rg;float shadow=opticalDepth.x*strength+opticalDepth.y*.65;float light=exp(-shadow*2.8);float scattering=.36+.75*light;','float scattering=field.g/max(d,.00001);');
 const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 // Preserve full-resolution car/room pixels; only the soft volume is reconstructed.
 const compositeUniforms={colorMap:{value:target.texture},depthMap:{value:target.depthTexture},smokeMap:{value:smokeTarget.texture},smokeTexel:{value:new THREE.Vector2(1,1)}};
 const composite=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:compositeUniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D colorMap,depthMap,smokeMap;uniform vec2 smokeTexel;varying vec2 vUv;
 void main(){float depth=texture2D(depthMap,vUv).r;vec4 fog=vec4(0.);float weights=0.;vec2 pixel=vUv/smokeTexel-.5,base=floor(pixel),f=fract(pixel);for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 uv=(base+vec2(float(x),float(y))+.5)*smokeTexel;float d=texture2D(depthMap,uv).r;float w=max(.000001,exp(-abs(d-depth)*18000.))*(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y);fog+=texture2D(smokeMap,uv)*w;weights+=w;}fog/=max(weights,.00000001);gl_FragColor=vec4(fog.rgb+texture2D(colorMap,vUv).rgb*fog.a,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});const compositeScene=new THREE.Scene();compositeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),composite));
 let needsBake=true,lastRegion=null,lastYaw=null;const field=new Float32Array(data.length),kx=new Float64Array(nx),ky=new Float64Array(ny),kz=new Float64Array(nz);
 function bake(flowAt,laneFor,region,yaw,time){if(!needsBake&&lastRegion===region&&lastYaw===yaw)return;const bakeStart=performance.now();needsBake=false;lightingDirty=true;diagnostics.bakes++;lastRegion=region;lastYaw=yaw;field.fill(0);const lanes=region==='all'?Array.from({length:54},(_,i)=>3+i%18+Math.floor(i/18)*23):Array.from({length:40},(_,i)=>laneFor(i));
  for(const lane of lanes)for(let k=0;k<=220;k++){const p=flowAt(lane,k/220,time,yaw);if(p[2]<minimum.z||p[2]>maximum.z)continue;const tail=Math.max(0,-p[2]-1.5),r=.058+Math.min(.11,tail*.035),cx=(p[0]-minimum.x)/extent.x*nx,cy=(p[1]-minimum.y)/extent.y*ny,cz=(p[2]-minimum.z)/extent.z*nz,rx=r/extent.x*nx,ry=r*.6/extent.y*ny,rz=.095/extent.z*nz;
   const x0=Math.max(0,Math.floor(cx-rx*2)),x1=Math.min(nx-1,Math.ceil(cx+rx*2)),y0=Math.max(0,Math.floor(cy-ry*2)),y1=Math.min(ny-1,Math.ceil(cy+ry*2)),z0=Math.max(0,Math.floor(cz-rz*2)),z1=Math.min(nz-1,Math.ceil(cz+rz*2));
   for(let x=x0;x<=x1;x++)kx[x]=Math.exp(-1.5*((x-cx)/rx)**2);for(let y=y0;y<=y1;y++)ky[y]=Math.exp(-1.5*((y-cy)/ry)**2);for(let z=z0;z<=z1;z++)kz[z]=Math.exp(-1.5*((z-cz)/rz)**2)*.28;
   for(let z=z0;z<=z1;z++)for(let y=y0;y<=y1;y++){const offset=nx*(y+ny*z),yz=ky[y]*kz[z];for(let x=x0;x<=x1;x++)field[offset+x]+=kx[x]*yz;}

  }
  for(let i=0;i<data.length;i++)data[i]=Math.min(255,field[i]*215);texture.needsUpdate=true;diagnostics.lastBakeMilliseconds=performance.now()-bakeStart;
 }
 const diagnostics={sceneWidth:0,sceneHeight:0,smokeWidth:0,smokeHeight:0,steps:160,fieldResolution:[128,64,256],bakes:0};
 function render(renderer,scene,camera,hidden,{flowAt,laneFor,region,yaw,time,distance,arrival=distance,density,visible}){
  if(!visible||density<=.001){renderer.render(scene,camera);return;}camera.updateMatrixWorld();if(visible&&density>.001)bake(flowAt,laneFor,region,yaw,time);
  uniforms.time.value=time;uniforms.travel.value=distance*.18;uniforms.arrival.value=arrival*.18;uniforms.strength.value=visible?density*1.55:0;uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.eye.value.copy(camera.position);
  renderer.getDrawingBufferSize(size);if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);
  const scale=Math.min(.65,Math.sqrt(320000/(size.x*size.y))),w=Math.max(1,Math.round(size.x*scale)),h=Math.max(1,Math.round(size.y*scale));if(smokeTarget.width!==w||smokeTarget.height!==h){smokeTarget.setSize(w,h);compositeUniforms.smokeTexel.value.set(1/w,1/h);}Object.assign(diagnostics,{sceneWidth:size.x,sceneHeight:size.y,smokeWidth:w,smokeHeight:h});
  const oldTarget=renderer.getRenderTarget(),states=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);
  try{if(lightingDirty&&visible&&density>.001){for(let layer=0;layer<192;layer++){lightUniforms.slice.value=(layer+.5)/192;renderer.setRenderTarget(lightTarget,layer);renderer.render(lightScene,lightCamera);}lightingDirty=false;}renderer.setRenderTarget(fieldTarget);renderer.render(fieldScene,fieldCamera);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(smokeTarget);renderer.render(postScene,postCamera);renderer.setRenderTarget(oldTarget);renderer.render(compositeScene,postCamera);}
  finally{hidden.forEach((o,i)=>o.visible=states[i]);renderer.setRenderTarget(oldTarget);}
 }

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
 return {render,diagnostics,configureSolids,invalidate(){needsBake=true;},texture};
}
