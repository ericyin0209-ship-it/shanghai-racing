import * as THREE from 'three';
import {wrap} from './physics.js?v=229release';
// Metres/seconds. Visible impact rings follow the driving surface, never the grass.
export function impactEnvelope(age){return age>=0&&age<.92?Math.sin(Math.min(1,age/.055)*Math.PI/2)*Math.pow(1-age/.92,1.65):0;}
export function createRainImpacts(scene,track){
 const count=3200,geo=new THREE.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);
 const phase=new Float32Array(count),gain=new Float32Array(count),locations=new Float64Array(count);let seed=108;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<count;i++){phase[i]=random()*1.7;gain[i]=random();}
 geo.setAttribute('impactPhase',new THREE.InstancedBufferAttribute(phase,1));geo.setAttribute('impactGain',new THREE.InstancedBufferAttribute(gain,1));
 const uniforms={clock:{value:0},rainAmount:{value:0},waterAmount:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide,
  vertexShader:`attribute float impactPhase;attribute float impactGain;varying vec2 localUv;varying float phase;varying float gain;void main(){localUv=uv;phase=impactPhase;gain=impactGain;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float clock;uniform float rainAmount;uniform float waterAmount;varying vec2 localUv;varying float phase;varying float gain;
  void main(){float period=1.20+gain*1.10;float age=mod(clock+phase,period);if(age>.92||gain>rainAmount)discard;float r=length(localUv-.5);float envelope=sin(min(1.,age/.055)*1.5708)*pow(1.-age/.92,1.65);float ring=0.;for(int i=0;i<3;i++){float a=age-float(i)*.085;if(a>0.){float radius=.02+sqrt(a)*.43;float width=.0035+.004*a;ring+=exp(-pow((r-radius)/width,2.))*pow(.58,float(i));}}float splash=exp(-r*r/ .00032)*max(0.,1.-age/.085);float edge=1.-smoothstep(.44,.50,r);float angle=atan(localUv.y-.5,localUv.x-.5);float glint=.30+.70*pow(max(0.,cos(angle-.7)),2.);float alpha=(ring*.095*glint+splash*.26)*envelope*edge*waterAmount;gl_FragColor=vec4(vec3(.57,.66,.70),alpha);#include <tonemapping_fragment>
  #include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const mesh=new THREE.InstancedMesh(geo,material,count);mesh.name='Rain impact expanding capillary rings';mesh.frustumCulled=false;mesh.userData.dynamic=true;scene.add(mesh);const pose=new THREE.Object3D();let placed=false,elapsed=0,lastCenter=NaN;
 function place(i,s){const off=(random()-.5)*13.5,f=track.at(wrap(s,track.length),off);locations[i]=wrap(s,track.length);pose.position.set(f.p.x,f.p.y+.009,f.p.z);pose.rotation.set(0,f.yaw,0);const size=.18+random()*.42;pose.scale.set(size,1,size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);}
 function update(dt,focus,wet,rain,time=null){elapsed=Number.isFinite(time)?time:elapsed+Math.max(0,dt);uniforms.clock.value=elapsed;uniforms.rainAmount.value=rain;uniforms.waterAmount.value=Math.min(1,wet*1.7);mesh.visible=rain>0&&wet>.08;if(!mesh.visible)return;const center=track.nearest(focus.x,focus.z).s;if(placed&&Math.abs(wrap(center-lastCenter+track.length/2,track.length)-track.length/2)<8)return;lastCenter=center;let changed=false;for(let i=0;i<count;i++){const distance=Math.abs(wrap(locations[i]-center+track.length/2,track.length)-track.length/2);if(!placed||distance>125){place(i,center+(random()-.35)*190);changed=true;}}placed=true;if(changed)mesh.instanceMatrix.needsUpdate=true;}
 return {update,mesh,uniforms};
}
