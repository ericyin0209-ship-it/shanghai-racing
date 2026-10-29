import * as THREE from 'three';
import {weatherNoise,cloudVolumeGLSL} from './weather-noise.js?v=229release';
// A shared, periodic density atlas replaces per-fragment multi-octave hash noise.
// Twelve slab samples and local sunlight probes resolve cloud thickness and silver edges.
export function createAtmosphere(scene,hdr){
 const uniforms={skyPhoto:{value:hdr},cloudAtlas:{value:weatherNoise().volume},day:{value:1},twilight:{value:1},cloudCover:{value:0},clock:{value:0},flash:{value:0},sunDirection:{value:new THREE.Vector3(0,1,0)}};
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms,vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
 varying vec3 direction;uniform sampler2D skyPhoto,cloudAtlas;uniform float day,twilight,cloudCover,clock,flash;uniform vec3 sunDirection;
 ${cloudVolumeGLSL}
 float densityAt(vec3 p){float h=(p.y-850.)/800.;float vertical=smoothstep(0.,.13,h)*(1.-smoothstep(.60,1.,h));vec3 q=p*vec3(.00043,.00042,.00043)+vec3(clock*.00033,0.,clock*.00010);vec3 n=cloudNoise(q);float density=max(0.,n.r-(.61-cloudCover*.27));density=max(0.,density-(1.-n.g)*.035);return density*vertical*3.4;}
 void main(){vec3 d=normalize(direction),sun=normalize(sunDirection);float up=max(0.,d.y),elevation=max(0.,sun.y);float toward=max(0.,dot(d,sun));float horizon=pow(1.-up,3.);float dusk=(1.-day)*twilight;
 vec3 zenith=mix(vec3(.12,.28,.55),vec3(.065,.16,.31),cloudCover*.4);vec3 daylight=mix(zenith,vec3(.55,.68,.79),horizon);vec3 warm=vec3(1.1,.43,.14);daylight+=warm*pow(toward,8.)*dusk*.60;daylight=mix(daylight,vec3(.29,.35,.40),cloudCover*.38);
 vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);vec3 photo=min(texture2D(skyPhoto,uv).rgb,vec3(3.));daylight=mix(daylight,min(photo,vec3(1.2))*.92,(1.-cloudCover)*.55);daylight+=warm*horizon*dusk*(.07+.28*pow(toward,3.));
 vec3 night=mix(vec3(.005,.010,.023),vec3(.030,.043,.060),horizon);float moon=dot(d,normalize(vec3(.32,.82,.31)));night+=vec3(.25,.30,.39)*smoothstep(.99992,.99998,moon)*(1.-cloudCover*.9);night+=vec3(.012,.017,.022)*pow(max(0.,moon),28.)*(1.-cloudCover);
 vec3 colour=mix(night,daylight,twilight);float opacity=0.;if(d.y>.025&&cloudCover>.08){float start=850./d.y,span=min(18000.,800./d.y),stepSize=span/12.;float trans=1.;vec3 scattered=vec3(0.);float forward=pow(toward,12.);vec3 lightColour=mix(vec3(.86,.96,1.08),vec3(1.6,.80,.36),clamp(dusk+(.3-elevation),0.,1.));
 for(int i=0;i<12;i++){vec3 p=d*(start+(float(i)+.5)*stepSize);float den=densityAt(p);if(den>.001){float probe=densityAt(p+sun*260.);float lighting=exp(-probe*2.8);float absorption=1.-exp(-den*stepSize*.0026);vec3 ambient=mix(vec3(.016,.023,.034),vec3(.39,.47,.55),twilight);vec3 lit=ambient+lightColour*(.30+.85*lighting)*(.35+.65*day)*twilight+lightColour*forward*lighting*.22*twilight;scattered+=trans*absorption*lit;trans*=1.-absorption;}if(trans<.025)break;}
 opacity=1.-trans;colour=colour*trans+scattered;}
 // Sun radiance is tied to the directional light; no second photographic sun.
 float disk=smoothstep(cos(.0054),cos(.0044),toward);colour+=vec3(1.0,.83,.62)*disk*26.*day*(1.-opacity);colour+=vec3(1.,.65,.36)*pow(toward,64.)*.12*day*(1.-opacity);
 float horizonCloud=smoothstep(.72,1.,cloudCover)*(1.-smoothstep(.0,.16,up));vec3 deck=mix(vec3(.025,.038,.055),vec3(.42,.48,.53),twilight);colour=mix(colour,deck,horizonCloud*.8);float star=step(.99987,fract(sin(dot(floor(uv*vec2(1800.,900.)),vec2(127.1,311.7)))*43758.5453))*smoothstep(.12,.5,up);colour+=vec3(.10)*star*(1.-twilight)*(1.-cloudCover);
 colour+=vec3(.26,.32,.42)*flash*(.25+opacity*.75);gl_FragColor=vec4(max(colour,vec3(0.)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(2800,48,24),material);dome.name='Directional atmosphere / atlas cloud scattering';dome.userData.dynamic=true;dome.frustumCulled=false;scene.add(dome);
 return {dome,uniforms,set(day,twilight,cloudCover,sun){uniforms.day.value=day;uniforms.twilight.value=twilight;uniforms.cloudCover.value=cloudCover;uniforms.sunDirection.value.copy(sun);},update(dt,focus){uniforms.clock.value+=Math.max(0,dt);dome.position.set(focus.x,0,focus.z);}};
}
