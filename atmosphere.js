import * as THREE from 'three';
// Photographic CC0 sky combined with a weather layer; this is not volumetric meteorology.
export function createAtmosphere(scene,hdr){
 const uniforms={skyPhoto:{value:hdr},day:{value:1},twilight:{value:1},cloudCover:{value:0},clock:{value:0},sunDirection:{value:new THREE.Vector3(0,1,0)}};
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms,vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
 varying vec3 direction;uniform sampler2D skyPhoto;uniform float day,twilight,cloudCover,clock;uniform vec3 sunDirection;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float layers(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.07)*.15;}
 float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=mix(mix(hash(i.xy+i.z*37.),hash(i.xy+vec2(1,0)+i.z*37.),f.x),mix(hash(i.xy+vec2(0,1)+i.z*37.),hash(i.xy+1.+i.z*37.),f.x),f.y);float b=mix(mix(hash(i.xy+(i.z+1.)*37.),hash(i.xy+vec2(1,0)+(i.z+1.)*37.),f.x),mix(hash(i.xy+vec2(0,1)+(i.z+1.)*37.),hash(i.xy+1.+(i.z+1.)*37.),f.x),f.y);return mix(a,b,f.z);}
 vec2 cloudVolume(vec3 d){if(d.y<.025||cloudCover<.1)return vec2(0);float t0=750./d.y,t1=1250./d.y,stepSize=(t1-t0)/8.;float transmission=1.,light=0.;for(int i=0;i<8;i++){vec3 p=d*(t0+(float(i)+.5)*stepSize);p.xz+=vec2(clock*3.,clock*.8);vec3 q=p*.0017;float f=n3(q)*.58+n3(q*2.07)*.28+n3(q*4.1)*.14;float height=sin(clamp((p.y-750.)/500.,0.,1.)*3.14159);float density=max(0.,f-(.69-cloudCover*.28))*height;float absorb=1.-exp(-density*stepSize*.0028);light+=transmission*absorb*(.50+.5*height);transmission*=1.-absorb;}return vec2(1.-transmission,light);}
 void main(){vec3 d=normalize(direction);vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.0,1.0))/3.14159265+.5);
 vec3 photo=texture2D(skyPhoto,uv+vec2(clock*.000002,0)).rgb;photo=min(photo*1.6,vec3(3.0));
 float high=smoothstep(-.02,.7,d.y);vec3 clear=mix(vec3(.29,.49,.73),vec3(.075,.22,.50),high);vec3 natural=mix(clear,photo*vec3(.90,1.01,1.12),.76);
 vec2 p=d.xz/max(.2,d.y+.28)*2.2+vec2(clock*.0015,clock*.00045);float shape=layers(p);float cloud=smoothstep(.72-cloudCover*.49,.88-cloudCover*.40,shape)*smoothstep(-.08,.14,d.y)*cloudCover;
 vec3 overcast=mix(vec3(.34,.40,.46),vec3(.76,.79,.81),shape);vec2 volume=cloudVolume(d);overcast=mix(vec3(.22,.28,.34),vec3(.77,.80,.82),volume.y/max(.001,volume.x));natural=mix(natural,overcast,max(cloud*.30,volume.x));natural=mix(natural,natural*.68,cloudCover*.65);
 float rainDeck=smoothstep(.64,1.,cloudCover);vec3 denseSky=mix(vec3(.19,.235,.275),vec3(.43,.47,.50),clamp(shape*.85+volume.y*.35,0.,1.));natural=mix(natural,denseSky,rainDeck*.96);
 float sunset=(1.0-day)*twilight;float toward=pow(max(dot(d,normalize(vec3(sunDirection.x,.02,sunDirection.z))),0.0),3.0);natural=mix(natural,natural*vec3(1.55,.77,.47)+vec3(.07,.014,0),sunset*(.25+.65*toward));
 vec3 night=vec3(.014,.025,.052)+photo*.011;float moon=pow(max(dot(d,normalize(vec3(.32,.82,.31))),0.0),1400.0);night+=vec3(.42,.48,.58)*moon*(1.0-cloudCover*.75);
 float star=step(.99984,hash(floor(uv*vec2(1400,700))))*smoothstep(.08,.4,d.y);night+=vec3(.08)*star*(1.0-cloudCover);
 vec3 color=mix(night,natural,twilight);float haze=1.0-smoothstep(-.07,.10,d.y);color=mix(color,mix(vec3(.025,.042,.065),vec3(.39,.48,.56),twilight),haze*.45);
 gl_FragColor=vec4(color,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`.replace('//#','\n#').replace(';#include',';\n#include')});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(2800,64,32),material);dome.name='Photographic sky and moving weather';dome.userData.dynamic=true;dome.frustumCulled=false;scene.add(dome);
 return {dome,set(day,twilight,cloudCover,sun){uniforms.day.value=day;uniforms.twilight.value=twilight;uniforms.cloudCover.value=cloudCover;uniforms.sunDirection.value.copy(sun);},update(dt,focus){uniforms.clock.value+=dt;dome.position.set(focus.x,0,focus.z);}};
}
