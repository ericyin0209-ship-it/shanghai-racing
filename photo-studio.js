import * as THREE from 'three';
export function createPhotoStudio(){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),size=new THREE.Vector2();
 const uniforms={image:{value:target.texture},depth:{value:target.depthTexture},texel:{value:new THREE.Vector2()},clip:{value:new THREE.Vector2()},focus:{value:3.5},aperture:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv;uniform sampler2D image,depth;uniform vec2 texel,clip;uniform float focus,aperture;
 float distanceAt(vec2 uv){float d=texture2D(depth,uv).x;return clip.x*clip.y/(clip.y-(clip.y-clip.x)*d);}
 void main(){float d=distanceAt(vUv),radius=min(15.,abs(1.-focus/max(.1,d))*aperture*12.);vec3 colour=texture2D(image,vUv).rgb;float weight=1.;for(int i=0;i<24;i++){float f=float(i)+.5,a=f*2.399963;vec2 uv=clamp(vUv+vec2(cos(a),sin(a))*sqrt(f/24.)*radius*texel,vec2(.001),vec2(.999));float sampleDepth=distanceAt(uv);float valid=1.-smoothstep(max(.2,d*.08),max(.5,d*.25),abs(sampleDepth-d));colour+=texture2D(image,uv).rgb*valid;weight+=valid;}gl_FragColor=vec4(colour/weight,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 return {target,render(renderer,source,eye,{focus=3.5,aperture=0}={}){if(aperture<=0){renderer.setRenderTarget(null);renderer.render(source,eye);return;}renderer.getDrawingBufferSize(size);if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);uniforms.texel.value.set(1/size.x,1/size.y);uniforms.clip.value.set(eye.near,eye.far);uniforms.focus.value=focus;uniforms.aperture.value=aperture;renderer.setRenderTarget(target);renderer.render(source,eye);renderer.setRenderTarget(null);renderer.render(scene,camera);}};
}
