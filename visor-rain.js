import {cinematicLightingGLSL} from './cinematic-lighting.js';
import * as THREE from 'three';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Millimetre-like droplet footprints in normalized visor space, with pinning and runoff.
export class VisorDroplets {
 constructor(random=Math.random){this.random=random;this.drops=[];this.films=[];this.spawn=0;this.time=0;}
 step(dt,{rain=0,speed=0,steer=0,fullFrame=false}={}){
  if(dt<=0)return this.drops;if(dt>1/60+1e-8){const steps=Math.ceil(dt*60);for(let i=0;i<steps;i++)this.step(dt/steps,{rain,speed,steer,fullFrame});return this.drops;}this.time+=dt;this.spawn+=dt*rain*(13+speed*.31);
  while(this.spawn>=1){this.spawn--;if(this.drops.length<220){const size=.0012+this.random()**2*.0049;this.drops.push({x:.035+this.random()*.93,y:fullFrame?this.random()*.94:.275+this.random()*.465,r:size,age:0,life:6+this.random()*7,vx:0,vy:0,pin:.6+this.random()*3,phase:this.random()*6.28,stretch:1,trail:[]});}}
  for(const d of this.drops){d.age+=dt;const free=d.age>d.pin||d.r>.006,flow=free?(.012+speed*.00045)*(d.r/.005):0;
   d.vx+=(((d.x-.5)*speed*.00045-steer*.025)*(free?1:.08)-d.vx)*Math.min(1,dt*5);d.vy+=(flow-d.vy)*Math.min(1,dt*3);const old={x:d.x,y:d.y};d.x+=dt*(d.vx+Math.sin(this.time*3+d.phase)*d.vy*.16);d.y+=dt*d.vy;d.stretch=1+Math.min(1.6,d.vy*17);
   if(free&&d.vy>.008){if(!d.trail.length||Math.hypot(d.x-d.trail[d.trail.length-1].x,d.y-d.trail[d.trail.length-1].y)>.0015)d.trail.push(old);if(d.trail.length>34)d.trail.shift();if(this.films.length<360)this.films.push({a:old,b:{x:d.x,y:d.y},r:d.r*.20,life:.8,age:0});}d.r-=dt*(rain? .000012:.0005);
  }
  for(let i=0;i<this.drops.length;i++)for(let j=i+1;j<this.drops.length;j++){const a=this.drops[i],b=this.drops[j];if(b.life<0)continue;if(Math.hypot(a.x-b.x,(a.y-b.y)*.65)<(a.r+b.r)*.72){const aa=a.r*a.r,bb=b.r*b.r;a.x=(a.x*aa+b.x*bb)/(aa+bb);a.y=(a.y*aa+b.y*bb)/(aa+bb);a.r=Math.min(.010,Math.sqrt(aa+bb));a.pin=0;a.life=Math.max(a.life,b.life);b.life=-1;}}
  this.drops=this.drops.filter(d=>d.age<d.life&&d.r>.0006&&d.x>.015&&d.x<.985&&d.y<(fullFrame?1.02:.77));for(const f of this.films)f.age+=dt;this.films=this.films.filter(f=>f.age<f.life);return this.drops;
 }
}
export function createVisorRain(){
 const model=new VisorDroplets(),mapCanvas=document.createElement('canvas');mapCanvas.width=2048;mapCanvas.height=1152;const ctx=mapCanvas.getContext('2d'),heightTexture=new THREE.CanvasTexture(mapCanvas);heightTexture.minFilter=THREE.LinearFilter;heightTexture.magFilter=THREE.LinearFilter;
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,samples:4});target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{sceneDepth:{value:target.depthTexture},inverseProjection:{value:new THREE.Matrix4()},frameTexel:{value:new THREE.Vector2(1,1)},cinematicStrength:{value:1},image:{value:target.texture},water:{value:heightTexture},texel:{value:new THREE.Vector2(1/2048,1/1152)},aspect:{value:16/9}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv;uniform sampler2D image;uniform sampler2D water;uniform vec2 texel;uniform float aspect;
 ${cinematicLightingGLSL}
 float heightAt(vec2 p){return texture2D(water,p).r;}
 void main(){float h=heightAt(vUv);vec2 slope=vec2(heightAt(vUv+vec2(texel.x,0.))-heightAt(vUv-vec2(texel.x,0.)),heightAt(vUv+vec2(0.,texel.y))-heightAt(vUv-vec2(0.,texel.y)));float wet=smoothstep(.012,.16,h);vec2 shift=slope*vec2(.027,.032);vec2 sampleUv=clamp(vUv+shift,vec2(.001),vec2(.999));vec3 colour=texture2D(image,sampleUv).rgb;
 vec3 n=normalize(vec3(-slope.x*12.,-slope.y*12.,1.));float fresnel=pow(1.-n.z,3.);float spec=pow(max(0.,dot(reflect(-normalize(vec3(-.5,.85,1.)),n),vec3(0.,0.,1.))),65.);vec3 sky=texture2D(image,clamp(vec2(vUv.x-slope.x*.05,.70+slope.y*.06),vec2(0.),vec2(1.))).rgb;colour=mix(colour,sky,wet*fresnel*.32);colour+=vec3(.64,.78,.85)*spec*wet*.07;colour*=1.-wet*length(slope)*.035;colour=finishLighting(sampleUv,colour);gl_FragColor=vec4(colour,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));let refresh=0,lastFullFrame=null,painted=false;const bufferSize=new THREE.Vector2();
 const stamp=document.createElement('canvas');stamp.width=stamp.height=256;const sc=stamp.getContext('2d'),gradient=sc.createRadialGradient(112.64,104.96,6.4,128,128,128);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.42,'rgba(210,210,210,1)');gradient.addColorStop(.78,'rgba(98,98,98,1)');gradient.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=gradient;sc.beginPath();sc.arc(128,128,128,0,Math.PI*2);sc.fill();
 function lens(x,y,rx,ry,strength){ctx.globalAlpha=strength;ctx.drawImage(stamp,x-rx,y-ry,rx*2,ry*2);ctx.globalAlpha=1;}

 function render(renderer,scene,camera,dt,state){model.step(dt,{...state,rain:state.exposed===false?0:state.rain});const enabled=state.enabled&&(state.rain>0||model.drops.length||model.films.length);const cinematic=state.cinematic!==false;if(!enabled&&!cinematic){renderer.setRenderTarget(null);renderer.render(scene,camera);return;}if(!enabled&&painted){ctx.fillStyle='#000';ctx.fillRect(0,0,mapCanvas.width,mapCanvas.height);heightTexture.needsUpdate=true;painted=false;}material.uniforms.cinematicStrength.value=cinematic?1:0;
  refresh+=dt;if(enabled&&(refresh>=1/60||!painted||lastFullFrame!==state.fullFrame)){painted=true;lastFullFrame=state.fullFrame;refresh=0;const w=mapCanvas.width,h=mapCanvas.height;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.save();ctx.beginPath();if(state.fullFrame)ctx.rect(0,0,w,h);else ctx.roundRect(w*.02,h*.265,w*.96,h*.50,25);ctx.clip();ctx.globalCompositeOperation='lighten';
   for(const f of model.films){ctx.strokeStyle=`rgba(80,80,80,${(1-f.age/f.life)*.7})`;ctx.lineWidth=f.r*w*2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(f.a.x*w,f.a.y*h);ctx.lineTo(f.b.x*w,f.b.y*h);ctx.stroke();}
   for(const d of model.drops){if(d.trail.length>2){ctx.strokeStyle='rgba(90,90,90,.42)';ctx.lineWidth=d.r*w*.50;ctx.lineCap='round';ctx.beginPath();d.trail.forEach((q,i)=>i?ctx.lineTo(q.x*w,q.y*h):ctx.moveTo(q.x*w,q.y*h));ctx.lineTo(d.x*w,d.y*h);ctx.stroke();}const impact=1+Math.max(0,1-d.age/.12)*.65,strength=clamp(d.age*18,0,1)*clamp((d.life-d.age)*2,0,1);lens(d.x*w,d.y*h,d.r*w*impact,d.r*w*d.stretch*impact,strength*.8);if(d.age<.15){for(let i=0;i<3;i++){const a=d.phase+i*2.1;lens((d.x+Math.cos(a)*d.r*1.7)*w,(d.y+Math.sin(a)*d.r*1.7)*h,d.r*w*.22,d.r*w*.3,strength*.45);}}}ctx.restore();heightTexture.needsUpdate=true;
  }
  const size=renderer.getDrawingBufferSize(bufferSize);if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);material.uniforms.aspect.value=size.x/size.y;material.uniforms.frameTexel.value.set(1/size.x,1/size.y);material.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
 }
 return {render,model,target};
}
