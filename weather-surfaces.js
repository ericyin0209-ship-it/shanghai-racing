import * as THREE from 'three';
import {weatherNoise,cloudVolumeGLSL} from './weather-noise.js?v=229release';
export function createWeatherSurfaces(roots,{exclude=[]}={}){
 const noise=weatherNoise(),uniforms={surfaceWet:{value:0},surfaceClock:{value:0},cloudShadowAmount:{value:0},surfaceNoise:{value:noise.surface},cloudAtlas:{value:noise.volume},weatherSun:{value:new THREE.Vector3(0,1,0)}};const visited=new Set();
 for(const root of roots)root.traverse(mesh=>{for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if(!material?.isMeshStandardMaterial||visited.has(material)||exclude.includes(material)||material.transparent||material.userData.weatherSurface||material.userData.weatherSurfaceExempt)continue;visited.add(material);material.userData.weatherSurface=true;const before=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);const oldKey=key();material.onBeforeCompile=(shader,renderer)=>{before.call(material,shader,renderer);Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 weatherPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 weatherVertex=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 weatherVertex=instanceMatrix*weatherVertex;
 #endif
 weatherPoint=(modelMatrix*weatherVertex).xyz;`);
 shader.fragmentShader='varying vec3 weatherPoint;uniform sampler2D surfaceNoise,cloudAtlas;uniform float surfaceWet,surfaceClock,cloudShadowAmount;uniform vec3 weatherSun;\n'+cloudVolumeGLSL+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 if(surfaceWet>.0001){vec3 weatherN=normalize(cross(dFdx(weatherPoint),dFdy(weatherPoint))+vec3(1.e-9));weatherN*=gl_FrontFacing?1.:-1.;float weatherFacing=smoothstep(-.10,.25,weatherN.y);vec2 weatherSample=texture2D(surfaceNoise,weatherPoint.xz*.013+weatherPoint.y*.006).rg;float weatherFilm=surfaceWet*weatherFacing*(.20+.80*smoothstep(.36,.68,weatherSample.r));roughnessFactor=mix(roughnessFactor,min(roughnessFactor,.18),weatherFilm*.75);diffuseColor.rgb*=1.-weatherFilm*.24;}
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 if(cloudShadowAmount>.001){vec3 cloudPoint=weatherPoint+weatherSun*(1100./max(.18,weatherSun.y));vec3 cloudField=cloudNoise(cloudPoint*vec3(.00043,.00042,.00043)+vec3(surfaceClock*.00033,0.,surfaceClock*.0001));float transmission=mix(.52,1.,smoothstep(.48,.61,1.-cloudField.r));float shadow=mix(1.,transmission,cloudShadowAmount);reflectedLight.directDiffuse*=shadow;reflectedLight.directSpecular*=shadow;}
 `);};material.customProgramCacheKey=()=>oldKey+'|weather-surfaces-221';material.needsUpdate=true;}});
 return {uniforms,count:visited.size,update(wet,time,state,sun){uniforms.surfaceWet.value=wet;uniforms.surfaceClock.value=time;uniforms.cloudShadowAmount.value=state.cloudShadow;uniforms.weatherSun.value.copy(sun);}};
}
