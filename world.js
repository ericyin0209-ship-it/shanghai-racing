import {weatherLighting,weatherMistRGB} from './weather-state.js?v=221';
import {weatherNoise} from './weather-noise.js?v=221';
import {createWeatherSurfaces} from './weather-surfaces.js?v=221';
import {createWetReflection} from './wet-reflection.js?v=224';
import {createWeatherRain} from './weather-rain.js?v=221';
import {optimizeEnvironmentBatches} from './environment-batching.js?v=218i';
import {createKerbSurfaces} from './circuit-kerbs.js?v=218i';
import {createCircuitLandmarks} from './circuit-landmarks.js?v=225';
import {createTrackEnvironment,formedRailGeometry} from './circuit-track-detail.js?v=218i';
import {createPaddockDetail} from './circuit-paddock.js?v=221';
import {constructionFinish} from './circuit-surface.js?v=218i';
import {fitStandToStraight} from './stand-alignment.js?v=216';
import {createSceneDetail} from './scene-detail.js?v=218i';
import {createTrackLighting} from './track-lighting.js?v=222';
import {batchStaticMeshes} from './static-batching.js';
import {snapShadowFocus} from './shadow-focus.js';
import {createLotusGrandstands} from './lotus-grandstands.js?v=218i';
import {createPitArchitecture} from './pit-architecture.js';
import {waterRippleGLSL} from './water-ripples.js?v=221';
import {createCircuitEnvelope,capturePitVista} from './circuit-envelope.js?v=218i';
import {partitionStaticInstances} from './spatial-batches.js?v=218i';
import {createCircuitLifeDetail} from './circuit-livedetail.js?v=218i';
import * as THREE from 'three';
import {addGroundVariation} from './terrain-shading.js';
import {createRainImpacts} from './rain-impact.js?v=221';
import {createCircuitArchitecture} from './circuit-architecture.js?v=218i';
import {Sky} from './vendor/Sky.js';
import {Reflector} from './vendor/Reflector.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createSurroundings} from './surroundings.js?v=225';
import {createCircuitDetailUpgrade} from './circuit-detail-upgrade.js?v=216';
import {createTracksideDetails} from './trackside-details.js?v=225';
import {createFoliage} from './foliage.js';
import {createCircuitFinish} from './circuit-finish.js?v=218i';
import {createAtmosphere} from './atmosphere.js?v=221';
import {solarPosition,clamp} from './physics.js';
function seeded(seed=38){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function texture(size,draw,repeat=1){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);return t;}
function label(text,color='#e6f4de',bg='#1b3429',width=1024,height=128){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.font=`600 ${height*.46}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,width/2,height/2);return new THREE.CanvasTexture(c);}
export async function createWorld(scene,renderer,track){
  const random=seeded();
  const loader=new THREE.TextureLoader();
  const [asphaltTex,asphaltNormal,asphaltRoughness,hdr]=await Promise.all([loader.loadAsync('assets/textures/asphalt-color.jpg'),loader.loadAsync('assets/textures/asphalt-normal.jpg'),loader.loadAsync('assets/textures/asphalt-roughness.jpg'),new HDRLoader().loadAsync('assets/textures/outdoor.hdr')]);
  asphaltTex.colorSpace=THREE.SRGBColorSpace;for(const t of [asphaltTex,asphaltNormal,asphaltRoughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();}
  const surfaceNoise=weatherNoise().surface;
  const freshAsphalt=texture(1024,(c,s)=>{const image=c.createImageData(s,s);for(let i=0;i<s*s;i++){const value=69+random()*22+(random()<.025?25:0);image.data[i*4]=value;image.data[i*4+1]=value+1;image.data[i*4+2]=value+2;image.data[i*4+3]=255;}c.putImageData(image,0,0);});freshAsphalt.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const asphalt=new THREE.MeshPhysicalMaterial({color:'#b0b0b0',map:freshAsphalt,normalMap:asphaltNormal,normalScale:new THREE.Vector2(.11,.11),roughnessMap:asphaltRoughness,roughness:1,metalness:.02,clearcoat:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
  const dryPixels=new Uint8Array(track.n*4),dryTexture=new THREE.DataTexture(dryPixels,track.n,1,THREE.RGBAFormat);dryTexture.minFilter=dryTexture.magFilter=THREE.LinearFilter;dryTexture.wrapS=THREE.RepeatWrapping;dryTexture.needsUpdate=true;const wetUniform={value:0},waterClock={value:0},rainEnergy={value:0};const rubberPixels=new Uint8Array(1024*4).fill(128),rubberTexture=new THREE.DataTexture(rubberPixels,1024,1,THREE.RGBAFormat);rubberTexture.minFilter=rubberTexture.magFilter=THREE.LinearFilter;rubberTexture.wrapS=THREE.RepeatWrapping;rubberTexture.needsUpdate=true;asphalt.onBeforeCompile=shader=>{shader.uniforms.waterClock=waterClock;shader.uniforms.rainEnergy=rainEnergy;shader.uniforms.surfaceNoise={value:surfaceNoise};shader.uniforms.roadWet=wetUniform;shader.uniforms.dryTrail={value:dryTexture};shader.uniforms.circuitLength={value:track.length};shader.uniforms.asphaltPhoto={value:asphaltTex};shader.uniforms.rubberLine={value:rubberTexture};shader.vertexShader='varying vec3 wetRoadPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwetRoadPoint=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 wetRoadPoint;\n'+waterRippleGLSL+'\nuniform sampler2D dryTrail,surfaceNoise,asphaltPhoto,rubberLine;uniform float rainEnergy;uniform float circuitLength;uniform float roadWet;uniform float waterClock;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat ss=vMapUv.y/.15,oo=vMapUv.x/.15;vec2 wetNoise=texture2D(surfaceNoise,wetRoadPoint.xz*.013).rg;float waterPocket=.5+.5*sin(ss*.039+sin(ss*.013)*2.)*sin(oo*1.7+ss*.011);float waterPatch=smoothstep(.38,.78,waterPocket*.55+wetNoise.r*.30+wetNoise.g*.15);vec4 trail=texture2D(dryTrail,vec2(fract(ss/circuitLength),.5));float dryOff=trail.g*20.-10.;float localWet=max(0.,roadWet-trail.r*exp(-pow(oo-dryOff,2.)/5.));roughnessFactor*=.94+wetNoise.g*.06;vec3 photoNear=texture2D(asphaltPhoto,wetRoadPoint.xz*.34).rgb,photoFar=texture2D(asphaltPhoto,wetRoadPoint.zx*.043+.37).rgb;float aggregate=dot(photoNear,vec3(.3333)),patchy=dot(photoFar,vec3(.3333));float macro=texture2D(surfaceNoise,wetRoadPoint.xz*.0023).r;diffuseColor.rgb*=mix(1.,(.62+aggregate*.85)*(.82+patchy*.36),.8)*(.88+macro*.22);float lineOff=texture2D(rubberLine,vec2(fract(ss/circuitLength),.5)).r*20.-10.;float rubber=exp(-pow((oo-lineOff)/1.45,2.));diffuseColor.rgb*=1.-rubber*(.20+.08*wetNoise.r);roughnessFactor=mix(roughnessFactor,roughnessFactor*.84,rubber);float verge=smoothstep(5.4,7.1,abs(oo));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.10+.010,verge*.55);roughnessFactor=mix(roughnessFactor,max(.13,roughnessFactor*.40),localWet*waterPatch);diffuseColor.rgb*=1.-localWet*.30;');shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec2 waterSlope=rainWaterSlope(wetRoadPoint.xz,waterClock,localWet*rainEnergy);
 normal=normalize(normal+mat3(viewMatrix)*vec3(waterSlope.x,0.,waterSlope.y)*.072);
 
 `);};
  const road=new THREE.Mesh(track.ribbon(-7.2,7.2),asphalt);road.receiveShadow=true;scene.add(road);
  const runoffMaterial=new THREE.MeshStandardMaterial({color:'#69777a',map:asphaltTex,roughness:1});for(const [inner,outer] of [[-16,-8.4],[8.4,16]]){const runoff=new THREE.Mesh(track.ribbon(inner,outer,.014),runoffMaterial);runoff.receiveShadow=true;scene.add(runoff);}
  const green=new THREE.MeshStandardMaterial({color:'#668274',roughness:1});
  for(const side of [-1,1]){const m=new THREE.Mesh(track.ribbon(side*8.45,side*11,.032),green);m.receiveShadow=true;scene.add(m);}
  const white=new THREE.MeshStandardMaterial({color:'#f2eddf',roughness:.78});
  for(const side of [-1,1]){const m=new THREE.Mesh(track.ribbon(side*6.95,side*7.12,.047),white);scene.add(m);}
  const red=new THREE.MeshStandardMaterial({color:'#b92230',roughness:.6});
  const kerbs=createKerbSurfaces(scene,track);
  const grassTex=texture(512,(c,s)=>{c.fillStyle='#628052';c.fillRect(0,0,s,s);for(let i=0;i<42000;i++){c.fillStyle=`rgba(${60+random()*40},${70+random()*50},${40+random()*30},.4)`;c.fillRect(random()*s,random()*s,1+random()*4,1+random()*4);}},280);
  {const vergeTex=grassTex.clone();vergeTex.repeat.set(.55,.55);vergeTex.needsUpdate=true;green.map=vergeTex;green.color.set('#b7c79b');green.needsUpdate=true;}const ground=new THREE.Mesh(new THREE.PlaneGeometry(6500,6500),addGroundVariation(new THREE.MeshStandardMaterial({map:grassTex,color:'#adb98e',roughness:1})));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);
  const context=await createSurroundings(scene,track);createCircuitFinish(scene,track);const architecture=createCircuitArchitecture(scene);const rainImpacts=createRainImpacts(scene,track);const lifeDetail=createCircuitLifeDetail(scene,track);
  const concreteMap=texture(512,(c,n)=>{c.fillStyle='#a5aaa6';c.fillRect(0,0,n,n);for(let i=0;i<18000;i++){const v=100+random()*75;c.fillStyle=`rgba(${v},${v},${v},.16)`;c.fillRect(random()*n,random()*n,1+random()*3,1+random()*3);}c.strokeStyle='rgba(50,55,53,.22)';c.lineWidth=2;c.strokeRect(0,0,n,n);for(let i=0;i<4;i++){c.fillStyle='rgba(54,61,56,.16)';c.beginPath();c.arc(i%2?n-32:32,i<2?32:n-32,3,0,Math.PI*2);c.fill();}});
  const concrete=constructionFinish(new THREE.MeshStandardMaterial({color:'#d4d6d0',map:concreteMap,roughness:.86}));
  const steel=new THREE.MeshStandardMaterial({color:'#858f92',metalness:.8,roughness:.34});
  const glass=new THREE.MeshPhysicalMaterial({color:'#5c818e',metalness:.30,roughness:.085,clearcoat:1,clearcoatRoughness:.08});
  const dark=new THREE.MeshStandardMaterial({color:'#263c40',roughness:.65});
  function box(w,h,d,x,y,z,mat=concrete,parent=scene){const geometry=new THREE.BoxGeometry(w,h,d);if(mat.userData.metricTile){const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+x)/mat.userData.metricTile,(p.getZ(i)+z)/mat.userData.metricTile);}const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function sign(text,w,h,x,y,z,rotation=0,color='#dcecde',bg='#1b3429'){
    const t=label(text,color,bg);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.5,emissive:'#88998a',emissiveMap:t,emissiveIntensity:.10}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);return m;
  }
  // Start/finish markings at source-data origin.
  for(let x=-7;x<7;x+=.5)for(let z=0;z<1;z+=.5){const m=new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),((Math.round(x*2)+Math.round(z*2))%2)?dark:white);m.rotation.x=-Math.PI/2;m.position.set(x+.25,.062,z-1);scene.add(m);}
  const grid=new THREE.InstancedMesh(new THREE.BoxGeometry(.08,.015,1.7),white,48);const obj=new THREE.Object3D();
  for(let i=0;i<24;i++){const s=-20-i*8.5,x=i%2?3:-3;for(let k=0;k<2;k++){obj.position.set(x+(k?1:-1),.07,s);obj.updateMatrix();grid.setMatrixAt(i*2+k,obj.matrix);}}scene.add(grid);
  // Armco follows the full source-coordinate circuit.
  const railMat=new THREE.MeshStandardMaterial({color:'#b4babc',metalness:.65,roughness:.45});
  const railLength=5,railPlacements=[];for(const side of [-1,1]){const path=[];for(let s=0;s<=track.length;s+=1)path.push(track.at(Math.min(s,track.length-.001),side*19).p);const cumulative=[0];for(let k=1;k<path.length;k++)cumulative.push(cumulative[k-1]+Math.hypot(path[k].x-path[k-1].x,path[k].z-path[k-1].z));const total=cumulative.at(-1),pieces=Math.max(1,Math.round(total/railLength)),piece=total/pieces;let k=0;const pointAt=d=>{while(k<cumulative.length-2&&cumulative[k+1]<d)k++;const u=(d-cumulative[k])/Math.max(1e-6,cumulative[k+1]-cumulative[k]);return {x:path[k].x+(path[k+1].x-path[k].x)*u,z:path[k].z+(path[k+1].z-path[k].z)*u};};for(let j=0;j<pieces;j++){k=Math.max(0,k-3);const a=pointAt(j*piece),b=pointAt((j+1)*piece),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.05)continue;railPlacements.push({x:(a.x+b.x)/2,z:(a.z+b.z)/2,yaw:Math.atan2(dx,dz),stretch:len/(railLength*.998)});}}const rails=new THREE.InstancedMesh(formedRailGeometry(railLength*.998),railMat,railPlacements.length);railPlacements.forEach((r,i)=>{obj.position.set(r.x,.48,r.z);obj.rotation.set(0,r.yaw,0);obj.scale.set(1,1,r.stretch);obj.updateMatrix();rails.setMatrixAt(i,obj.matrix);});obj.scale.set(1,1,1);
  rails.castShadow=true;rails.receiveShadow=true;scene.add(rails);
  const fenceTexture=texture(1024,(c,s)=>{c.clearRect(0,0,s,s);c.strokeStyle='#81888a';c.lineWidth=4;for(let i=-s;i<s*2;i+=64){c.beginPath();c.moveTo(i,0);c.lineTo(i+s,s);c.stroke();c.beginPath();c.moveTo(i,0);c.lineTo(i-s,s);c.stroke();}});
  fenceTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const fenceMat=new THREE.MeshStandardMaterial({map:fenceTexture,transparent:false,alphaTest:.4,alphaToCoverage:true,roughness:.8,metalness:.18,side:THREE.DoubleSide});
  for(const side of [-1,1]){const p=[],uv=[],idx=[];for(let i=0;i<=track.n;i+=4){const q=track.at(i/track.n*track.length,side*19).p,x=q.x,z=q.z;p.push(x,.85,z,x,2.8,z);uv.push(i/track.n*track.length/2,0,i/track.n*track.length/2,1);const j=p.length/3-2;if(j>=2)idx.push(j-2,j,j-1,j-1,j,j+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();scene.add(new THREE.Mesh(g,fenceMat));}
  // Pit apron and garages: visual prototypes, dimensions pending survey.
  const pitAsphalt=new THREE.MeshStandardMaterial({color:'#9b9f9e',map:asphaltTex,normalMap:asphaltNormal,normalScale:new THREE.Vector2(.09,.09),roughness:.87});pitAsphalt.userData.metricTile=3.0;box(26,.1,535,-32,.00,-257,pitAsphalt);
  box(2.2,1.1,510,-14.6,.55,-260,concrete);
  box(22,6.55,455,-47,7.725,-255);box(.20,4.4,455,-58.0,2.2,-255);createPitArchitecture(scene);box(24,.65,458,-47,11.2,-255,steel);
  // Front curtain wall is panelised by the landmark builder.
  box(1.2,3.3,451,-58.4,8.4,-255,glass);
  const garageColors=['#942a30','#de7425','#607477','#1c315c','#1d5949','#2764a0'];
  for(let i=0;i<30;i++){const z=-42-i*14.4;box(.2,.64,11.4,-35.6,4.4,z,new THREE.MeshStandardMaterial({color:garageColors[Math.floor(i/5)%6]}));box(.25,8,.3,-35.4,7,z+6.7,steel);sign(String(i+1).padStart(2,'0'),2,.8,-35.35,5.0,z,Math.PI/2);}
  // Grandstand with raked terraces, seats and characteristic sculptural canopy.
  const standAssembly=new THREE.Group();standAssembly.name='Aligned main grandstand';scene.add(standAssembly);const standAxis=fitStandToStraight(track);const stands=new THREE.Group();stands.userData={surveyed:false,type:'architectural reference prototype'};standAssembly.add(stands);
  const seatProfile=new THREE.Shape();seatProfile.moveTo(-.25,-.08);seatProfile.lineTo(.22,-.08);seatProfile.quadraticCurveTo(.27,-.06,.27,.14);seatProfile.lineTo(.28,.42);seatProfile.quadraticCurveTo(.28,.46,.21,.46);seatProfile.lineTo(.18,.15);seatProfile.quadraticCurveTo(.16,.015,-.23,.035);seatProfile.quadraticCurveTo(-.28,.02,-.25,-.08);const seatShell=new THREE.ExtrudeGeometry(seatProfile,{depth:.46,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,steps:1,curveSegments:12});seatShell.translate(0,0,-.23);seatShell.rotateY(Math.PI/2);seatShell.userData.seatShell=true;
  const rows=42,columns=360,seats=new THREE.InstancedMesh(seatShell,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.60}),rows*columns);
  for(let r=0;r<rows;r++){
    box(.85,.42,355,29+r*.75+(r>20?2.4:0),1.0+r*.43+(r>20?1.3:0),-255,concrete,stands);
    for(let col=0;col<columns;col++){obj.scale.set(col%30<2?0:1,col%30<2?0:1,col%30<2?0:1);obj.position.set(29+r*.75+(r>20?2.4:0),1.29+r*.43+(r>20?1.3:0),-433+col*.99);obj.rotation.set(0,-Math.PI/2,0);obj.updateMatrix();seats.setMatrixAt(r*columns+col,obj.matrix);seats.setColorAt(r*columns+col,new THREE.Color((col+r*3)%9<4?'#d6ad54':((col+r*3)%9<6?'#bd553a':'#cbc7b4')));}
  }standAssembly.add(seats);
  obj.scale.set(1,1,1);
  box(2.4,.3,357,45.5,10.4,-255,concrete,stands);box(.06,.8,357,44.4,10.8,-255,steel,stands);box(.12,1.0,357,27.94,.50,-255,dark,stands);box(2,.82,357,28.9,.39,-255,concrete,stands);

  const roofMat=constructionFinish(new THREE.MeshPhysicalMaterial({color:'#bec8c6',metalness:.50,roughness:.42,clearcoat:.20,side:THREE.DoubleSide,vertexColors:true}),'roof');
  // Sweeping main roof with circular lantern apertures, derived from architect photos.
  // Dimensions are visual estimates, not a survey or a 1:1 certified replica.
  const roofShape=new THREE.Shape();roofShape.moveTo(15,-445);roofShape.lineTo(74,-445);roofShape.lineTo(74,-65);roofShape.lineTo(15,-65);roofShape.closePath();
  for(let j=0;j<15;j++){const hole=new THREE.Path();hole.absarc(j%2?34:54,-85-j*24,2.7,0,Math.PI*2,true);roofShape.holes.push(hole);}
  const roofGeometry=new THREE.ExtrudeGeometry(roofShape,{depth:.55,bevelEnabled:false,curveSegments:32});
  const rp=roofGeometry.attributes.position,roofColors=new Float32Array(rp.count*3);for(let i=0;i<rp.count;i++){const x=rp.getX(i),z=rp.getY(i),depth=rp.getZ(i);rp.setXYZ(i,x,23.0+Math.pow((x-40)/30,2)*1.5+depth,z);const shade=depth<.1?.73:.97;roofColors.set([shade,shade,shade],i*3);}roofGeometry.setAttribute('color',new THREE.BufferAttribute(roofColors,3));roofGeometry.computeVertexNormals();
  const canopy=new THREE.Mesh(roofGeometry,roofMat);canopy.castShadow=true;canopy.receiveShadow=true;standAssembly.add(canopy);
  const lanternMats=['#8e2329','#bba35b','#a25636'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.45,side:THREE.DoubleSide}));
  for(let j=0;j<15;j++){const x=j%2?34:54,z=-85-j*24;const lining=new THREE.Mesh(new THREE.CylinderGeometry(2.7,2.7,1.1,48,1,true),lanternMats[j%3]);lining.position.set(x,23.5+Math.pow((x-40)/30,2)*1.5,z);standAssembly.add(lining);}
  for(let j=0;j<19;j++){const z=-76-j*19.5;box(.55,24.6,.55,70,12.3,z,steel,standAssembly);}
  // Elliptical bridges are rebuilt as closed shells and connected curtain-wall systems.
  createLotusGrandstands(scene,track,seatShell);
  // Garage facade details: window mullions, door ribs, utility boxes and roof rails.
  // Facade mullions come from the single bay-aligned detail set below.
  for(let i=0;i<30;i++){const z=-42-i*14.4;// The shutters are rolled into the head casing; no ribs across the open bay.
box(.25,.8,.28,-35.4,1.4,z+5.9,new THREE.MeshStandardMaterial({color:'#b62e33',roughness:.55}));box(.27,.57,.41,-35.35,.44,z-5.7,dark);}
  for(let i=0;i<70;i++){box(.06,.78,.06,-35.8,11.9,-33-i*6.35,steel);box(.07,.78,.07,-58.5,11.9,-33-i*6.35,steel);}box(.05,.05,455,-35.8,12.25,-255,steel);box(.05,.05,455,-58.5,12.25,-255,steel);
  // Timing gantry above the start line.
  box(.45,6,.45,-9,3,4,steel);box(.45,6,.45,9,3,4,steel);box(18.6,.65,.65,0,5.9,4,steel);
  sign('SHANGHAI · START / FINISH',14,1.2,0,5.5,3.58,Math.PI);
  const signalMaterials=[];
  for(let i=0;i<5;i++){const mat=new THREE.MeshStandardMaterial({color:'#250909',emissive:'#ff1005',emissiveIntensity:.1});const m=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),mat);m.position.set(-1.2+i*.6,4.7,3.6);scene.add(m);signalMaterials.push(mat);}
  // Sponsor-free distance boards.
  for(const [s,labelText] of [[110,'100'],[60,'150'],[track.length*.87,'150'],[track.length*.88,'100'],[track.length*.89,'50']]){const f=track.at(s,10);const m=sign(labelText,2,1.3,f.p.x,1.6,f.p.z,f.yaw+Math.PI,'#253329','#eee9da');m.castShadow=true;}
  // Gravel and service-edge furniture informed by Tilke aerial photographs; extents approximate.
  const gravelTex=texture(512,(c,size)=>{c.fillStyle='#b1a38b';c.fillRect(0,0,size,size);for(let i=0;i<30000;i++){const grey=135+random()*60;c.fillStyle='rgb('+grey+','+(grey*.94)+','+(grey*.82)+')';c.fillRect(random()*size,random()*size,1+random()*3,1+random()*3);}},70),gravelMat=new THREE.MeshStandardMaterial({map:gravelTex,color:'#d3c8b1',roughness:1});
  {// Gravel traps sit inside the barrier on the outside of corners, as continuous runs (one draw call).
gravelMat.polygonOffset=true;gravelMat.polygonOffsetFactor=-2;gravelMat.polygonOffsetUnits=-2;const runs=[];let run=null;for(let i=0;i<track.n;i+=4){const t=track.frames[i].t,after=track.frames[(i+6)%track.n].t,turn=t.z*after.x-t.x*after.z,outer=turn>0?-1:1,corner=track.curvatures[i]>=.0032;if(corner&&run&&run.outer===outer&&i-run.end<=8){run.end=i+4;}else if(corner){if(run)runs.push(run);run={start:i,end:i+4,outer};}}if(run)runs.push(run);const parts=runs.filter(r=>r.end-r.start>=12).map(r=>track.ribbon(r.outer*11.4,r.outer*16.7,.03,Math.max(0,r.start-4),Math.min(track.n,r.end+4)));if(parts.length){const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());const trap=new THREE.Mesh(merged,gravelMat);trap.name='Corner gravel traps';trap.receiveShadow=true;scene.add(trap);}}
  // Legacy tower bands and mullions removed; rebuilt tower profiles own these joints.
  // Redundant roof strips removed: the joined truss frame supplies the roof support.
  // Trees around the outer circuit, instanced for performance.
  const trees=[];for(let i=0;i<1300;i++){const x=(random()-.5)*2600,z=-500+(random()-.5)*2500;if(track.nearest(x,z).distance>45&&!context.developed(x,z)&&!(x>-65&&x<80&&z>-530&&z<100))trees.push({x,z,h:6+random()*7});if(trees.length>=490)break;}
  const crownParts=[[-1.6,.1,0,2.9],[1.4,.7,.5,3.0],[0,2.6,-.6,2.6],[.4,-1.3,-1.5,2.6]].map(([x,y,z,r])=>{const g=new THREE.IcosahedronGeometry(r,1);g.translate(x,y,z);return g;});const crownGeometry=mergeGeometries(crownParts,false);crownParts.forEach(g=>g.dispose());const crowns=new THREE.InstancedMesh(crownGeometry,new THREE.MeshStandardMaterial({color:'#355c3b',roughness:1}),trees.length),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.23,.35,4,5),new THREE.MeshStandardMaterial({color:'#514d3f',roughness:1}),trees.length);
  trees.forEach((p,i)=>{obj.position.set(p.x,p.h*.62,p.z);obj.scale.set(p.h/9,p.h/9,p.h/9);obj.rotation.set(0,random()*Math.PI,0);obj.updateMatrix();crowns.setMatrixAt(i,obj.matrix);crowns.setColorAt(i,new THREE.Color().setHSL(.27+random()*.08,.22,.18+random()*.14));obj.position.y=2;obj.scale.set(1,1,1);obj.updateMatrix();trunks.setMatrixAt(i,obj.matrix);});scene.add(trunks);crowns.geometry.dispose();crowns.material.dispose();createFoliage(scene,trees,random);
  // Track lighting is a simulation option; not a surveyed lighting installation.

  const buildingGlow=[];const glowMat=new THREE.MeshStandardMaterial({color:'#ffe1a6',emissive:'#ffd39a',emissiveIntensity:0,roughness:.35});buildingGlow.push(glowMat);
  // Building fixtures are illustrative; exact installed fixtures have not been surveyed.
  for(let i=0;i<30;i++){const z=-42-i*14.4;box(.12,.08,10.5,-35.15,4.0,z,glowMat);box(.12,.16,10,-35.05,8.2,z,glowMat);}
  for(let i=0;i<19;i++)box(.2,.12,9,70,20,-75-i*19,glowMat,standAssembly);
  // Remove unsupported light bars that hung beneath the bridge decks.
  const architectural=new THREE.PointLight('#ffd6a0',0,95,2);architectural.position.set(-30,9,-240);scene.add(architectural);
  const trackLighting=createTrackLighting(scene,track);
  // Environment sky and actual geographic sun direction for 7 October, UTC+8 local track time.
  const sky=new Sky();sky.scale.setScalar(9000);sky.visible=false;scene.add(sky);const atmosphere=createAtmosphere(scene,hdr);
  const hemi=new THREE.HemisphereLight('#cedcf2','#52684b',1.2);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffe5ba',3.2);sun.castShadow=true;const shadowSize=Math.min(8192,renderer.capabilities.maxTextureSize);sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;sun.shadow.camera.near=220;sun.shadow.camera.far=480;sun.shadow.bias=-.00001;sun.shadow.normalBias=.006;scene.add(sun,sun.target);
  const moon=new THREE.DirectionalLight('#a5b8e2',0);moon.position.set(120,250,100);scene.add(moon);
  scene.fog=new THREE.FogExp2('#b7c3bd',.00015);
  const pmrem=new THREE.PMREMGenerator(renderer),envScene=new THREE.Scene(),envSky=new Sky();envSky.scale.setScalar(9000);envScene.add(envSky);envSky.visible=false;const reflectionAtmosphere=createAtmosphere(envScene,hdr);
  const mirrorGeometry=track.ribbon(-7.18,7.18,.006);mirrorGeometry.rotateX(Math.PI/2);
  const wetReflection=createWetReflection(mirrorGeometry,{wet:wetUniform,clock:waterClock,rain:rainEnergy,trail:dryTexture,length:track.length,noise:surfaceNoise}),mirror=wetReflection.mirror;mirror.visible=false;scene.add(mirror);
  const rainfall=createWeatherRain(scene,waterClock,standAxis.matrix);
  const environmentCache=new Map();
  let exposure=.95,currentHour=12.5,currentWeather='clear',wetness=0,targetWet=0,lastEnv=null,cloudiness=0,lighting=weatherLighting('clear',12.5);
  const sunDirection=new THREE.Vector3();
  function setEnvironment(weather,hour){
    if(lastEnv&&currentWeather===weather&&currentHour===+hour)return {weather,hour,targetWet};
    currentWeather=weather;currentHour=+hour;sun.shadow.needsUpdate=true;
    lighting=weatherLighting(weather,hour);cloudiness=lighting.cloud;targetWet=lighting.wet;
    const solar=lighting.solar,[dx,dz]=track.data.axis;
    sunDirection.set(solar.east*dz+solar.north*dx,solar.up,solar.east*dx-solar.north*dz).normalize();
    const day=clamp(solar.up*3,0,1),twilight=clamp((solar.up+.16)*4,0,1);
    sky.material.uniforms.turbidity.value=2+cloudiness*12;
    sky.material.uniforms.rayleigh.value=weather==='clear'?2.2:1.2;
    sky.material.uniforms.mieCoefficient.value=.005+cloudiness*.035;
    sky.material.uniforms.mieDirectionalG.value=.80;
    sky.material.uniforms.sunPosition.value.copy(sunDirection);
    sun.castShadow=day>.02;sun.color.set(solar.up<.3?'#ffd2a0':'#fff1dd');sun.intensity=lighting.sunIntensity;
    hemi.intensity=lighting.hemiIntensity;hemi.groundColor.set('#50564c');moon.intensity=lighting.moonIntensity;moon.visible=lighting.moonIntensity>0;atmosphere.set(day,twilight,cloudiness,sunDirection);reflectionAtmosphere.set(day,twilight,cloudiness,sunDirection);context.setNight?.(1-twilight);landmarks.setNight(1-twilight);paddockDetail.setNight(1-twilight);architecture.setNight(1-twilight);lifeDetail.setNight(1-twilight);for(const m of buildingGlow)m.emissiveIntensity=(1-twilight)*2.8;
    const mistColour=new THREE.Color().setRGB(...weatherMistRGB(lighting));
    scene.fog.color.copy(mistColour);scene.fog.density=lighting.fogDensity;
    scene.userData.weatherState={...lighting,mistColour,sunDirection:sunDirection.clone()};
    weatherSurfaces.update(targetWet,waterClock.value,lighting,sunDirection);exposure=lighting.exposure;trackLighting.setNight(lighting.night);architectural.intensity=lighting.night*1700;architectural.visible=lighting.night>0;wetReflection.invalidate();
    for(const key of ['turbidity','rayleigh','mieCoefficient','mieDirectionalG'])envSky.material.uniforms[key].value=sky.material.uniforms[key].value;
    envSky.material.uniforms.sunPosition.value.copy(sunDirection);
    const cacheKey=currentWeather+':'+Math.round(currentHour*12);let cached=environmentCache.get(cacheKey);if(!cached){reflectionAtmosphere.uniforms.clock.value=atmosphere.uniforms.clock.value;cached=pmrem.fromScene(envScene,.015,.5,5000);if(environmentCache.size>=8){const key=environmentCache.keys().next().value;environmentCache.get(key).dispose();environmentCache.delete(key);}environmentCache.set(cacheKey,cached);}lastEnv=cached;scene.environment=cached.texture;
    scene.environmentIntensity=lighting.environmentIntensity;
    return {weather,hour,solar,targetWet};
  }
  const lightCenter=new THREE.Vector3();
  function update(dt,focus){
    atmosphere.update(dt,focus);waterClock.value+=Math.max(0,dt);
    wetness+=(targetWet-wetness)*Math.min(1,dt*(targetWet>wetness?.18:.035));
    track.updateWater(dt,wetness,focus);let changed=false;for(let i=0;i<track.n;i++){const red=Math.round(track.drying[i]*255),green=Math.round((track.dryOffsets[i]+10)/20*255),j=i*4;if(dryPixels[j]!==red||dryPixels[j+1]!==green||dryPixels[j+3]!==255){dryPixels[j]=red;dryPixels[j+1]=green;dryPixels[j+3]=255;changed=true;}}if(changed)dryTexture.needsUpdate=true;wetUniform.value=wetness;landmarks.setWetness(wetness);kerbs.setWetness(wetness);context.setWater?.(waterClock.value,lighting.cloud);paddockDetail.updateTime(waterClock.value,lighting.cloud);asphalt.roughness=1-wetness*.20;asphalt.clearcoat=wetness*.14;asphalt.clearcoatRoughness=.16+rainEnergy.value*.14;white.roughness=.78-wetness*.45;red.roughness=.6-wetness*.36;asphalt.color.setRGB(.62-wetness*.26,.62-wetness*.26,.63-wetness*.26);
    mirror.visible=wetness>.12;weatherSurfaces.update(wetness,waterClock.value,lighting,sunDirection);rainEnergy.value+=(lighting.rain-rainEnergy.value)*Math.min(1,Math.max(0,dt)*2.5);if(dt===0)rainEnergy.value=lighting.rain;
    const intensity=lighting.rain;rainImpacts.update(dt,focus,wetness,intensity,waterClock.value);

    const center=lightCenter.set(focus.x,0,focus.z);snapShadowFocus(center,sunDirection,sun.shadow.camera.right-sun.shadow.camera.left,sun.shadow.mapSize.x,center);if(center.distanceToSquared(sun.target.position)>1e-10||(dt>0&&Number.isFinite(focus.speed)))sun.shadow.needsUpdate=true;sun.target.position.copy(center);sun.position.copy(center).addScaledVector(sunDirection,350);
    trackLighting.update(focus,dt);rainfall.update(focus,lighting,renderer,trackLighting.lights);
    return {wetness,rain:intensity,hour:currentHour,weather:currentWeather};
  }
  const tracksideDetails=createTracksideDetails(scene,track);const detailUpgrade=createCircuitDetailUpgrade(scene,track);
  const landmarks=createCircuitLandmarks(scene,standAxis);const edgeDetail=createTrackEnvironment(scene,track);const paddockDetail=await createPaddockDetail(scene,track);const standEnvelope=createCircuitEnvelope(scene);standAxis.apply(standAssembly);standAxis.apply(architecture.standRoot);standAxis.apply(standEnvelope);standAxis.apply(lifeDetail.standRoot);standAxis.apply(tracksideDetails.standRoot);standAxis.apply(detailUpgrade.standRoot);const environmentBatches=optimizeEnvironmentBatches(scene);const pitVista=capturePitVista(scene);pitVista.userData.skyMaterial=atmosphere.dome.material;
  // Keep transparent glass, dynamic ancestors and shadow flags independent.
  // Indexed geometry stays indexed; shared originals remain usable by the garage vista.
  const architectureBatches=batchStaticMeshes(scene,80);
  const spatialStats=partitionStaticInstances(scene);
  const vistaInstances=optimizeEnvironmentBatches(pitVista,100);const vistaBatches=batchStaticMeshes(pitVista,60);partitionStaticInstances(pitVista,60);const detail=createSceneDetail(scene),vistaDetail=createSceneDetail(pitVista);
  const weatherSurfaces=createWeatherSurfaces([scene,pitVista],{exclude:[asphalt]});pitVista.userData.updateWeather=dt=>{waterClock.value+=Math.max(0,dt);weatherSurfaces.update(targetWet,waterClock.value,lighting,sunDirection);};const otherReflectors=[];scene.traverse(o=>{if(o.isReflector)otherReflectors.push(o);});wetReflection.setPeers(otherReflectors);
  function updateDetail(camera,height,trackView=true,driving=false){if(trackView)paddockDetail.prepare(camera,!driving);const controller=trackView?detail:vistaDetail,before=controller.stats.changes,result=controller.update(camera,height);if(trackView){const half=camera.position.y>80?256:32,c=sun.shadow.camera;if(c.right!==half){c.left=c.bottom=-half;c.right=c.top=half;c.updateProjectionMatrix();sun.shadow.needsUpdate=true;}if(result.changes!==before)sun.shadow.needsUpdate=true;}return result;}const detailStats={world:detail.stats,vista:vistaDetail.stats};
  setEnvironment('clear',12.5);
  function resetConditions(){wetness=targetWet;track.drying.fill(0);track.dryOffsets.fill(0);track.updateWater(0,wetness);}
  function captureConditions(full=false){const state={weather:currentWeather,hour:currentHour,wetness,waterTime:waterClock.value};if(full){state.drying=track.drying.slice();state.dryOffsets=track.dryOffsets.slice();}return state;}
  function restoreConditions(state,a=state,b=a,u=0){setEnvironment(state.weather,state.hour);wetness=state.wetness;waterClock.value=state.waterTime;if(a.drying)for(let i=0;i<track.n;i++){track.drying[i]=a.drying[i]+((b.drying?.[i]??a.drying[i])-a.drying[i])*u;track.dryOffsets[i]=a.dryOffsets[i]+((b.dryOffsets?.[i]??a.dryOffsets[i])-a.dryOffsets[i])*u;}track.updateWater(0,wetness);}
  return {setRubberLine(offsets){const n=offsets.length;for(let i=0;i<1024;i++){const v=offsets[Math.floor(i/1024*n)];rubberPixels[i*4]=Math.max(0,Math.min(255,Math.round((v+10)/20*255)));}rubberTexture.needsUpdate=true;},weatherSurfaces,wetReflection,atmosphere,rainfall,environmentBatches,vistaInstances,kerbs,landmarks,edgeDetail,paddockDetail,standAxis,standAssembly,updateDetail,detailStats,pitVista,standEnvelope,trackLighting,vistaBatches,architectureBatches,setEnvironment,resetConditions,captureConditions,restoreConditions,spatialStats,lifeDetail,update,sun,context,tracksideDetails,get exposure(){return exposure;},get wetness(){return wetness;},get targetWet(){return targetWet;},signalMaterials,road,asphalt,sky,architecture,rainImpacts};
}
