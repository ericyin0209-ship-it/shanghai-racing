// Linear-HDR finishing. Occlusion uses reconstructed view-space geometry;
// luminous highlights bloom before tone mapping, never over the HTML controls.
export const cinematicLightingGLSL=`
uniform sampler2D sceneDepth;
uniform mat4 inverseProjection;
uniform vec2 frameTexel;
uniform float cinematicStrength;
vec3 viewPoint(vec2 uv){float d=texture2D(sceneDepth,uv).r;vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
vec3 finishLighting(vec2 uv,vec3 colour){
 if(cinematicStrength<.01)return colour;
 float depth=texture2D(sceneDepth,uv).r;
 vec3 p=viewPoint(uv);
 if(depth<.99999&&-p.z>1.5&&-p.z<120.){
  // Pick the neighbour on the same surface at silhouettes. Derivatives of
  // resolved depth mix nearby carbon panels and caused pepper-like occlusion.
  vec3 leftPoint=viewPoint(clamp(uv-vec2(frameTexel.x,0.),vec2(.001),vec2(.999)));
  vec3 rightPoint=viewPoint(clamp(uv+vec2(frameTexel.x,0.),vec2(.001),vec2(.999)));
  vec3 lowerPoint=viewPoint(clamp(uv-vec2(0.,frameTexel.y),vec2(.001),vec2(.999)));
  vec3 upperPoint=viewPoint(clamp(uv+vec2(0.,frameTexel.y),vec2(.001),vec2(.999)));
  vec3 dx=abs(rightPoint.z-p.z)<abs(p.z-leftPoint.z)?rightPoint-p:p-leftPoint;
  vec3 dy=abs(upperPoint.z-p.z)<abs(p.z-lowerPoint.z)?upperPoint-p:p-lowerPoint;
  vec3 crossNormal=cross(dx,dy);vec3 n=crossNormal/max(length(crossNormal),1.e-9);if(dot(n,-p)<0.)n=-n;
  float angle=.37;
  float occ=0.;float radius=clamp(.65/max(1.,-p.z),.0007,.075);
  for(int i=0;i<24;i++){
   float a=angle+float(i)*2.3999632;
   float r=sqrt((float(i)+.5)/24.);
   vec2 offset=vec2(cos(a)*frameTexel.x/frameTexel.y,sin(a))*r*radius;
   vec2 sampleUV=clamp(uv+offset,vec2(.001),vec2(.999));vec3 delta=viewPoint(sampleUV)-p;
   float distanceToSample=length(delta);
   float facing=max(0.,dot(n,delta)-.008)/max(distanceToSample,.0001);
   occ+=facing*(1.-smoothstep(.08,.8,distanceToSample));
  }
  colour*=1.-clamp(occ/24.*2.2,0.,.26)*cinematicStrength*smoothstep(1.5,3.,-p.z);
 }
 // A contiguous Gaussian footprint produces one halo instead of displaced copies.
 vec3 bloom=vec3(0.);float weight=0.;
 for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){
  vec2 offset=vec2(float(x),float(y));float w=exp(-dot(offset,offset)*.45);
  vec3 sampleColor=texture2D(image,clamp(uv+offset*frameTexel,vec2(.001),vec2(.999))).rgb;
  float luminance=dot(sampleColor,vec3(.2126,.7152,.0722));
  bloom+=sampleColor*max(0.,luminance-1.6)/max(luminance,.001)*w;weight+=w;
 }
 return colour+bloom/max(weight,.001)*.10*cinematicStrength;
}
`;
