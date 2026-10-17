import * as THREE from 'three';
import {SurfaceReflector as Reflector} from './surface-reflector.js';
export function createRearMirrors(chassis,centres){
 const rounded=(w,h,r)=>{const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;};
 const mirrors=[];for(const centre of centres){const mirror=new Reflector(new THREE.ShapeGeometry(rounded(.193,.043,.0055),8),{textureWidth:768,textureHeight:384,color:0xdde7e9,clipBias:.0004,multisample:2});mirror.name='Live rear-view mirror';mirror.position.copy(centre);mirror.position.z-=.0007;mirror.rotation.set(0,Math.PI,0);mirror.material.toneMapped=true;
 mirror.material.fragmentShader=mirror.material.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor=vec4(base.rgb*vec3(.90,.97,1.0),1.0);');
 const reflect=mirror.onBeforeRender;mirror.onBeforeRender=function(renderer,scene,camera){if(camera.userData.reflectionView)return;const hidden=[];scene.traverse(o=>{if(o.isReflector&&o!==mirror){hidden.push([o,o.visible]);o.visible=false;}});try{reflect.call(this,renderer,scene,camera);}finally{for(const [o,visible] of hidden)o.visible=visible;}};
 chassis.add(mirror);mirrors.push(mirror);
 const frame=rounded(.202,.052,.008);frame.holes.push(new THREE.Path(rounded(.193,.043,.0055).getPoints(16).reverse()));const rim=new THREE.Mesh(new THREE.ShapeGeometry(frame,8),new THREE.MeshStandardMaterial({color:'#24373c',metalness:.92,roughness:.18}));rim.name='Mirror glass bevel';rim.position.copy(centre);rim.position.z-=.0003;rim.rotation.y=Math.PI;chassis.add(rim);
 }return mirrors;
}
