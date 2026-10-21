// Linear-HDR composite: edge-aware half-resolution AO and soft, separable bloom.
// Fog integrates density along the view ray; short cockpit distances stay clear.
export const cinematicLightingGLSL=`
uniform sampler2D sceneDepth,ambientOcclusion,softBloom;
uniform mat4 inverseProjection,viewToWorld;
uniform vec2 frameTexel,aoSize;
uniform float cinematicStrength,mistDensity,mistHeight,mistSunStrength,mistStart;
uniform vec3 mistColour,eyeWorld,sunWorld;
vec3 viewPoint(vec2 uv){float d=texture2D(sceneDepth,uv).r;vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
float localOcclusion(vec2 uv,float depth){vec2 q=uv*aoSize-.5,base=floor(q),f=fract(q);float result=0.,weights=0.;for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 k=vec2(float(x),float(y));vec2 sampleUv=(base+k+.5)/aoSize;vec2 data=texture2D(ambientOcclusion,clamp(sampleUv,vec2(.001),vec2(.999))).rg;float weight=(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y);weight*=exp(-abs(data.g-depth)/max(.08,depth*.012));result+=data.r*weight;weights+=weight;}return weights>.00001?result/weights:1.;}
vec3 finishLighting(vec2 uv,vec3 colour){
 if(cinematicStrength>.01){float depth=texture2D(sceneDepth,uv).r;vec3 p=viewPoint(uv);if(depth<.99999){colour*=localOcclusion(uv,-p.z);if(mistDensity>.000001&&-p.z>3.){vec3 world=(viewToWorld*vec4(p,1.)).xyz;vec3 ray=world-eyeWorld;float distanceToPoint=min(length(ray),1000.);float heightDiff=world.y-eyeWorld.y;float groundFactor=exp(-max(0.,eyeWorld.y)/mistHeight);float integral=abs(heightDiff)>.03?(1.-exp(-clamp(heightDiff/mistHeight,-12.,12.)))/(heightDiff/mistHeight):1.;float optical=max(0.,distanceToPoint-mistStart)*mistDensity*groundFactor*clamp(integral,0.,12.);float amount=1.-exp(-max(0.,optical));float forward=pow(max(0.,dot(normalize(ray),sunWorld)),8.);vec3 tint=mistColour+vec3(1.,.58,.28)*forward*mistSunStrength*.12;colour=mix(colour,tint,min(.64,amount));}}
 colour+=texture2D(softBloom,uv).rgb*.085;
 }
 return max(colour,vec3(0.));
}
`;
