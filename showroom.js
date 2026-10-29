import {weatherLighting,weatherMistRGB} from './weather-state.js?v=229release';
import {batchStaticMeshes} from './static-batching.js?v=229release';
import * as THREE from 'three';
import {createPitGarage} from './pit-garage.js?v=229release';
import {HDRLoader} from './vendor/HDRLoader.js';
import {upgradeGarageEquipment} from './precision-garage.js?v=229release';
export async function createShowroom(renderer){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#11151c');
  const pmrem=new THREE.PMREMGenerator(renderer);const hdr=await new HDRLoader().loadAsync('assets/textures/studio.hdr');const env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;scene.environmentIntensity=.65;hdr.dispose();
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,16.5),new THREE.MeshPhysicalMaterial({color:'#11161e',roughness:.47,metalness:.05,clearcoat:.25,clearcoatRoughness:.32}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-.006,2.6);floor.receiveShadow=true;scene.add(floor);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(4.05,4.05,.035,128),new THREE.MeshStandardMaterial({color:'#1a212a',roughness:.77,metalness:.08}));disc.position.y=-.025;disc.receiveShadow=true;scene.add(disc);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(4.06,.006,8,192),new THREE.MeshBasicMaterial({color:'#49556a'}));ring.rotation.x=Math.PI/2;ring.position.y=.001;scene.add(ring);
  const key=new THREE.DirectionalLight('#e4eeff',2.2);key.position.set(-3.5,4.25,1);key.castShadow=true;key.shadow.autoUpdate=false;key.shadow.needsUpdate=true;key.shadow.mapSize.set(4096,4096);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.camera.near=.5;key.shadow.camera.far=25;key.shadow.normalBias=.002;key.shadow.bias=-.00005;scene.add(key);
  const fill=new THREE.DirectionalLight('#a7c9ff',.65);fill.position.set(5,3,-3);scene.add(fill);const rim=new THREE.DirectionalLight('#ffe1be',1.2);rim.position.set(-4,2,-4);scene.add(rim);
  const ambient=new THREE.HemisphereLight('#c6ded8','#171d22',.28);scene.add(ambient);
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(26,8),new THREE.MeshStandardMaterial({color:'#10141c',roughness:.84,metalness:.12}));wall.position.set(0,3.9,-5.4);wall.receiveShadow=true;scene.add(wall);
  const logoMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide});const logo=new THREE.Mesh(new THREE.PlaneGeometry(4.3,4.3),logoMaterial);logo.position.set(0,2.8,-5.34);scene.add(logo);
  const accents=new THREE.MeshBasicMaterial({color:'#ed3c43',toneMapped:false});for(const x of [-9,-5,5,9]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.028,5,.025),accents);bar.position.set(x,3.2,-5.2);scene.add(bar);}
  for(let i=0;i<14;i++){const seam=new THREE.Mesh(new THREE.BoxGeometry(.025,7,.04),new THREE.MeshStandardMaterial({color:'#2a313e',metalness:.5,roughness:.7}));seam.position.set(-13+i*2,3.5,-5.3);scene.add(seam);}
  let generation=0;function setBrand(livery){const gen=++generation;accents.color.set(livery.color);ring.material.color.set(livery.color).multiplyScalar(.6);const image=new Image();image.onload=()=>{if(gen!==generation)return;const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;const ctx=canvas.getContext('2d'),scale=Math.min(1900/image.width,1900/image.height),w=image.width*scale,h=image.height*scale;ctx.drawImage(image,(2048-w)/2,(2048-h)/2,w,h);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,2048,2048);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;logoMaterial.map?.dispose();logoMaterial.map=t;logoMaterial.needsUpdate=true;};image.src=`assets/logos/${livery.id}.svg`;}
  const pitGarage=createPitGarage(scene);
  await upgradeGarageEquipment(pitGarage.group);
  batchStaticMeshes(pitGarage.group);
 // Capture the actual luminaires and room for bodywork reflections, without the car reflecting itself.
 const captureTarget=new THREE.WebGLCubeRenderTarget(512,{type:THREE.HalfFloatType,generateMipmaps:false});const cubeCamera=new THREE.CubeCamera(.12,70,captureTarget);cubeCamera.position.set(0,1.25,0);let reflectionDirty=true,roomEnvironment=null,tunnel=false;
 function setEnvironment(weather,hour){pitGarage.setEnvironment(weather,hour);const lighting=weatherLighting(weather,hour);scene.userData.weatherState={...lighting,mistColour:new THREE.Color().setRGB(...weatherMistRGB(lighting)),mistStart:14,sunDirection:new THREE.Vector3(0,1,0)};key.intensity=1.35+lighting.twilight*.35;fill.intensity=.23+lighting.twilight*.16;rim.intensity=.65+lighting.twilight*.20;ambient.intensity=.16+lighting.twilight*.07;reflectionDirty=true;key.shadow.needsUpdate=true;}
 function prepareReflections(renderer,car){if(tunnel||!reflectionDirty)return;reflectionDirty=false;const hidden=[car,...pitGarage.reflectors];const states=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);const shadowAuto=key.shadow.autoUpdate,shadowDirty=key.shadow.needsUpdate;key.shadow.autoUpdate=false;key.shadow.needsUpdate=false;try{cubeCamera.update(renderer,scene);const next=pmrem.fromCubemap(captureTarget.texture);roomEnvironment?.dispose();roomEnvironment=next;scene.environment=next.texture;scene.environmentIntensity=.95;for(const mirror of pitGarage.reflectors)mirror.forceUpdate=true;}finally{key.shadow.autoUpdate=shadowAuto;key.shadow.needsUpdate=shadowDirty;hidden.forEach((o,i)=>o.visible=states[i]);}}
 const garageObjects=scene.children.filter(o=>!o.isLight);let garageShadow=null;
 // The 60% test car needs a 6 m shadow footprint, versus the 16 m garage.
 // Scale the map by 3/8 as well: identical texels/metre with 86% fewer texels.
 function setTunnel(enabled){
  if(enabled!==tunnel){const shadow=key.shadow,c=shadow.camera;if(enabled){garageShadow={size:shadow.mapSize.clone(),left:c.left,right:c.right,top:c.top,bottom:c.bottom};const size=Math.max(512,Math.round(shadow.mapSize.x*3/8));shadow.mapSize.set(size,size);c.left=c.bottom=-3;c.right=c.top=3;}else if(garageShadow){shadow.mapSize.copy(garageShadow.size);Object.assign(c,{left:garageShadow.left,right:garageShadow.right,top:garageShadow.top,bottom:garageShadow.bottom});garageShadow=null;}c.updateProjectionMatrix();shadow.map?.dispose();shadow.map=null;}
  tunnel=enabled;key.shadow.autoUpdate=false;key.shadow.needsUpdate=true;scene.environment=enabled?env.texture:(roomEnvironment?.texture||env.texture);reflectionDirty=!enabled;for(const o of garageObjects)o.visible=!enabled;pitGarage.setVisible(!enabled);}function setBrandVisible(visible){logo.visible=visible;}
return {setCircuitExterior:pitGarage.setCircuitExterior,setLightDetail:pitGarage.setLightDetail,scene,key,setBrand,setTunnel,setBrandVisible,setEnvironment,prepareReflections,update:pitGarage.update,constrainCamera:pitGarage.constrainCamera};
}
