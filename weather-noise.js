import * as THREE from 'three';
let shared;
const lerp=(a,b,t)=>a+(b-a)*t,fade=x=>x*x*(3-2*x);
function hash(x,y,z){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function field(x,y,z,n){x*=n;y*=n;z*=n;const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=fade(x-ix),fy=fade(y-iy),fz=fade(z-iz),h=(a,b,c)=>hash((ix+a)%n,(iy+b)%n,(iz+c)%n);return lerp(lerp(lerp(h(0,0,0),h(1,0,0),fx),lerp(h(0,1,0),h(1,1,0),fx),fy),lerp(lerp(h(0,0,1),h(1,0,1),fx),lerp(h(0,1,1),h(1,1,1),fx),fy),fz);}
export function weatherNoise(){if(shared)return shared;
 const size=64,stride=66,width=stride*8,data=new Uint8Array(width*width*4);
 for(let z=0;z<size;z++)for(let y=0;y<stride;y++)for(let x=0;x<stride;x++){const px=((x+63)%64)/64,py=((y+63)%64)/64,pz=z/64;const i=(((z>>3)*stride+y)*width+(z%8)*stride+x)*4;data[i]=Math.round(255*(field(px,py,pz,4)*.57+field(px,py,pz,8)*.28+field(px,py,pz,16)*.15));data[i+1]=Math.round(field(px,py,pz,24)*255);data[i+2]=Math.round(field(px,py,pz,2)*255);data[i+3]=255;}
 const volume=new THREE.DataTexture(data,width,width);volume.minFilter=volume.magFilter=THREE.LinearFilter;volume.generateMipmaps=false;volume.needsUpdate=true;
 const surfaceData=new Uint8Array(256*256*4);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;surfaceData[i]=Math.round((field(x/256,y/256,.27,8)*.7+field(x/256,y/256,.27,24)*.3)*255);surfaceData[i+1]=Math.round(field(x/256,y/256,.7,32)*255);surfaceData[i+2]=Math.round(field(x/256,y/256,.45,4)*255);surfaceData[i+3]=255;}
 const surface=new THREE.DataTexture(surfaceData,256,256);surface.wrapS=surface.wrapT=THREE.RepeatWrapping;surface.minFilter=THREE.LinearMipmapLinearFilter;surface.magFilter=THREE.LinearFilter;surface.generateMipmaps=true;surface.needsUpdate=true;
 return shared={volume,surface};
}
export const cloudVolumeGLSL=`
vec3 cloudNoise(vec3 p){vec3 q=fract(p)*64.;float a=floor(q.z),b=mod(a+1.,64.);vec2 xy=q.xy+1.5;vec2 ua=(vec2(mod(a,8.),floor(a/8.))*66.+xy)/528.;vec2 ub=(vec2(mod(b,8.),floor(b/8.))*66.+xy)/528.;return mix(texture2D(cloudAtlas,ua).rgb,texture2D(cloudAtlas,ub).rgb,fract(q.z));}
`;
