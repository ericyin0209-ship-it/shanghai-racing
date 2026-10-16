import * as THREE from 'three';
import {SurfaceReflector as Reflector} from './surface-reflector.js';
export function createRearMirrors(chassis,centres){
 const mirrors=[];for(const centre of centres){const mirror=new Reflector(new THREE.PlaneGeometry(.198,.048),{textureWidth:768,textureHeight:384,color:0xdde7e9,clipBias:.0004,multisample:2});mirror.name='Live rear-view mirror';mirror.position.copy(centre);mirror.rotation.set(.035,Math.PI,0);mirror.material.toneMapped=true;
 mirror.material.fragmentShader=mirror.material.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor=vec4(base.rgb*vec3(.90,.97,1.0),1.0);');
 const reflect=mirror.onBeforeRender;mirror.onBeforeRender=function(renderer,scene,camera){if(camera.userData.reflectionView)return;const hidden=[];scene.traverse(o=>{if(o.isReflector&&o!==mirror){hidden.push([o,o.visible]);o.visible=false;}});try{reflect.call(this,renderer,scene,camera);}finally{for(const [o,visible] of hidden)o.visible=visible;}};
 chassis.add(mirror);mirrors.push(mirror);
 const rim=new THREE.Mesh(new THREE.BoxGeometry(.204,.054,.001),new THREE.MeshStandardMaterial({color:'#24373c',metalness:.92,roughness:.18}));rim.name='Mirror glass bevel';rim.position.copy(centre);rim.position.z+=.0008;chassis.add(rim);
 }return mirrors;
}
