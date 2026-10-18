// World-space capillary-wave slopes, shared by the pavement and its reflection.
// Neighbour cells participate so waves do not disappear at square tile edges.
export const waterRippleGLSL=`
vec2 rainHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
vec2 rainWaterSlope(vec2 worldXZ,float clock,float amount){
 // Sub-pixel capillary waves alias at distance; the broad wet reflection stays intact.
 float footprint=max(length(dFdx(worldXZ)),length(dFdy(worldXZ)));
 float resolved=1.-smoothstep(.025,.12,footprint);
 if(amount<.001||resolved<.001)return vec2(0.);
 amount*=resolved;
 vec2 p=worldXZ*2.15,cell=floor(p),slope=vec2(0.);
 for(int iy=-1;iy<=1;iy++)for(int ix=-1;ix<=1;ix++){
  vec2 donor=cell+vec2(float(ix),float(iy));vec2 hash=rainHash(donor);
  float age=mod(clock+hash.x*1.85,1.85);
  vec2 delta=p-donor-.16-hash*.68;float dist=length(delta);
  float radius=age*.76;float front=dist-radius;
  float fade=exp(-age*3.4)*smoothstep(0.,.035,age)*(1.-smoothstep(.68,.96,age));
  float packet=sin(front*48.)*exp(-front*front*135.);
  float eventWeight=1.-smoothstep(amount,amount+.12,hash.y);
  slope+=delta/max(dist,.001)*packet*fade*eventWeight;
 }
 return slope*amount;
}
`;
