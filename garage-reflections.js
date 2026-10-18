import {waterRippleGLSL} from './water-ripples.js?v=215c';
import * as THREE from 'three';
import {Reflector} from './vendor/Reflector.js';
// Planar captures: hide peer reflectors during capture to avoid recursive rendering.
export function createGarageReflector(geometry,{wet=false,width=768,height=384}={}){
 const shader={uniforms:{...THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),strength:{value:.1},time:{value:0},waterMap:{value:null},hasWater:{value:0},wet:{value:wet?1:0}},vertexShader:`uniform mat4 textureMatrix;varying vec4 vProj;varying vec2 vLocal;varying vec3 vWorld;varying vec3 vEye;void main(){vProj=textureMatrix*vec4(position,1.);vLocal=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;vec4 eye=modelViewMatrix*vec4(position,1.);vEye=-eye.xyz;gl_Position=projectionMatrix*eye;}`,fragmentShader:`uniform sampler2D tDiffuse;uniform sampler2D waterMap;uniform float hasWater,strength,time,wet;varying vec4 vProj;varying vec2 vLocal;varying vec3 vWorld;varying vec3 vEye;
 ${waterRippleGLSL}
 float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float smoothNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(noise(i),noise(i+vec2(1,0)),f.x),mix(noise(i+vec2(0,1)),noise(i+1.),f.x),f.y);}
 void main(){vec2 uv=vProj.xy/vProj.w;vec2 water=hasWater>.5?(texture2D(waterMap,vLocal).rg*2.-1.):vec2(0);uv+=water*.004;float puddle=1.;float blur=.00025;if(wet>.5){float n=smoothNoise(vLocal*vec2(18.,22.));puddle=smoothstep(.22,.66,n);vec2 slope=rainWaterSlope(vWorld.xz,time,min(1.,strength*4.));uv+=slope*.0018;blur=.0016*(1.-puddle)+.0006;}
 vec3 col=texture2D(tDiffuse,uv).rgb*.36;col+=(texture2D(tDiffuse,uv+vec2(blur,0)).rgb+texture2D(tDiffuse,uv-vec2(blur,0)).rgb+texture2D(tDiffuse,uv+vec2(0,blur)).rgb+texture2D(tDiffuse,uv-vec2(0,blur)).rgb)*.16;float alpha=strength;if(wet>.5)alpha*=(.05+.95*puddle)*(.18+.82*pow(1.-abs(normalize(cameraPosition-vWorld).y),2.));else{float grazing=1.-abs(normalize(vEye).z);alpha+=pow(grazing,5.)*.45;}
 gl_FragColor=vec4(col,clamp(alpha,0.,.85));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`};
 const mirror=new Reflector(geometry,{shader,clipBias:.002,textureWidth:width,textureHeight:height,multisample:0});mirror.camera.userData.reflectionView=true;mirror.material.transparent=true;mirror.material.depthWrite=false;mirror.renderOrder=2;mirror.userData.garageReflection=true;return mirror;
}
export function isolateGarageReflectors(reflectors,hiddenDuringCapture=[]){let capturing=false;for(const mirror of reflectors){const capture=mirror.onBeforeRender;let lastPosition=new THREE.Vector3(1e6,0,0),lastQuaternion=new THREE.Quaternion(),lastTime=-1;mirror.onBeforeRender=function(renderer,scene,camera){if(capturing)return;const time=mirror.material.uniforms.time.value;if(camera.position.distanceToSquared(lastPosition)<1e-8&&1-Math.abs(camera.quaternion.dot(lastQuaternion))<1e-8&&time-lastTime<.25&&!mirror.forceUpdate)return;capturing=true;const objects=[...reflectors.filter(o=>o!==mirror),...hiddenDuringCapture],states=objects.map(o=>o.visible);try{objects.forEach(o=>o.visible=false);capture.call(mirror,renderer,scene,camera);lastPosition.copy(camera.position);lastQuaternion.copy(camera.quaternion);lastTime=time;mirror.forceUpdate=false;}finally{objects.forEach((o,i)=>o.visible=states[i]);capturing=false;}};}}
