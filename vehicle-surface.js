// A dielectric water layer on paint and epoxy, kept in car-local metres so
// droplets stay attached to the body instead of swimming through world space.
export function createVehicleSurface(root){
 const wet={value:0},time={value:0},air={value:0},seen=new Set();
 root.traverse(mesh=>{const m=mesh.material;if(!mesh.isMesh||!m||seen.has(m)||mesh.name!=='body'||!/emerald|Carbon/.test(m.name))return;seen.add(m);
  const previous=m.onBeforeCompile;
  m.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.uniforms.bodyWater=wet;shader.uniforms.bodyWaterTime=time;shader.uniforms.bodyAir=air;
   shader.vertexShader='varying vec3 beadPoint,beadNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbeadPoint=position;beadNormal=normal;');
   shader.fragmentShader=`varying vec3 beadPoint,beadNormal;uniform float bodyWater,bodyWaterTime,bodyAir;
float beadHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float beadHeight(vec2 p){vec2 cell=floor(p),q=fract(p)-.5;float seed=beadHash(cell);q-=vec2(seed-.5,beadHash(cell+43.)-.5)*.34;q.y*=1.+bodyAir*.65;float shape=exp(-dot(q,q)*65.);return shape*smoothstep(.46,.65,seed)*bodyWater;}
`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,max(.11,roughnessFactor*.66),bodyWater*.76);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <clearcoat_normal_fragment_maps>',`#include <clearcoat_normal_fragment_maps>
#if defined(USE_CLEARCOAT)
vec3 axis=abs(beadNormal);vec2 beadUV=axis.y>max(axis.x,axis.z)?beadPoint.xz:axis.x>axis.z?beadPoint.zy:beadPoint.xy;
float footprint=length(fwidth(beadUV))*145.;float bead=beadHeight(beadUV*145.)*(1.-smoothstep(.18,.9,footprint));
vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,clearcoatNormal),r2=cross(clearcoatNormal,sx);float det=dot(sx,r1);
if(abs(det)>1.e-9&&bodyWater>.01){vec3 gradient=sign(det)*(dFdx(bead)*r1+dFdy(bead)*r2);vec3 changed=abs(det)*clearcoatNormal-gradient*.00007;if(dot(changed,changed)>1.e-18)clearcoatNormal=normalize(changed);}
#endif
`);
  };
  m.customProgramCacheKey=()=> 'amr-water-beads-200-clearcoat';m.needsUpdate=true;
 });
 return {update(dt,state){time.value+=Math.max(0,dt);air.value=Math.max(0,Math.min(1,(state.speed||0)/85));const exposed=state.active&&((state.raining?1:0)+(state.wetness||0)*Math.min(1,(state.speed||0)/20));const target=Math.min(1,exposed);wet.value+=(target-wet.value)*(-Math.expm1(-Math.max(0,dt)*(target>wet.value?1.2:.025)));},get wetness(){return wet.value;}};
}
