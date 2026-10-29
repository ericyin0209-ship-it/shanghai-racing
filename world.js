import {addPitWorkshopDetail} from './pit-workshop-detail.js?v=p34-20261029-r3';
import {weatherLighting,weatherMistRGB} from './weather-state.js?v=229release';
import {weatherNoise} from './weather-noise.js?v=229release';
import {createWeatherSurfaces} from './weather-surfaces.js?v=229release';
import {createWetReflection} from './wet-reflection.js?v=229release';
import {createWeatherRain} from './weather-rain.js?v=229release';
import {optimizeEnvironmentBatches} from './environment-batching.js?v=229release';
import {createKerbSurfaces} from './circuit-kerbs.js?v=229release';
import {createCircuitLandmarks} from './circuit-landmarks.js?v=229release';
import {createTrackEnvironment,formedRailGeometry} from './circuit-track-detail.js?v=229release';
import {createPaddockDetail} from './circuit-paddock.js?v=229release';
import {constructionFinish} from './circuit-surface.js?v=229release';
import {fitStandToStraight} from './stand-alignment.js?v=229release';
import {PIT_LEN,PIT_MID,PIT_Z0,PIT_BAY,PIT_BAYS,PIT_BAY0,PIT_K,STAND_Z0,STAND_ROOF_Z0,STAND_ROOF_Y,SEAT_COLS,STAND_LEN,STAND_MID,seatX,seatTop,LOWER_ROWS,SUITE_X,SUITE_Y0,SUITE_Y1} from './main-straight.js?v=229release';
import {createSceneDetail} from './scene-detail.js?v=229release';
import {createTrackLighting} from './track-lighting.js?v=229release';
import {batchStaticMeshes} from './static-batching.js?v=229release';
import {snapShadowFocus} from './shadow-focus.js?v=229release';
import {createLotusGrandstands,nearLotus} from './lotus-grandstands.js?v=229release';
import {createPitArchitecture} from './pit-architecture.js?v=232';
import {waterRippleGLSL} from './water-ripples.js?v=229release';
import {bridgeCoverGLSL,BRIDGE_DRY} from './road-surface.js?v=229release';
import {createCircuitEnvelope,capturePitVista} from './circuit-envelope.js?v=229release';
import {partitionStaticInstances} from './spatial-batches.js?v=229release';
import {createCircuitLifeDetail} from './circuit-livedetail.js?v=229release';
import * as THREE from 'three';
import {addGroundVariation} from './terrain-shading.js?v=229release';
import {createRainImpacts} from './rain-impact.js?v=229release';
import {createCircuitArchitecture} from './circuit-architecture.js?v=229release';
import {Sky} from './vendor/Sky.js';
import {Reflector} from './vendor/Reflector.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createSurroundings} from './surroundings.js?v=229release';
import {createCircuitBleachers} from './circuit-bleachers.js?v=229release';
import {MAP_GROUND} from './map-bounds.js?v=229release';
import {createTurnOneRunoff} from './circuit-runoff.js?v=229release';
import {createCircuitDetailUpgrade} from './circuit-detail-upgrade.js?v=229release';
import {createTracksideDetails} from './trackside-details.js?v=229release';
import {createFoliage} from './foliage.js?v=229release';
import {createPitLaneVisuals,createPitWetPatch,clearPitLaneClutter} from './pit-lane-visuals.js?v=p34-20261029-r3';
import {unitLabel} from './pit-lane.js?v=p34-20261029-r3';
import {warpPitComplex} from './pit-complex-warp.js?v=p34-20261029-r3';
import {createCircuitFinish} from './circuit-finish.js?v=229release';
import {createAtmosphere} from './atmosphere.js?v=229release';
import {solarPosition,clamp} from './physics.js?v=229release';
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
  const dryPixels=new Uint8Array(track.n*4),dryTexture=new THREE.DataTexture(dryPixels,track.n,1,THREE.RGBAFormat);dryTexture.minFilter=dryTexture.magFilter=THREE.LinearFilter;dryTexture.wrapS=THREE.RepeatWrapping;dryTexture.needsUpdate=true;const wetUniform={value:0},waterClock={value:0},rainEnergy={value:0};const rubberPixels=new Uint8Array(1024*4).fill(128),rubberTexture=new THREE.DataTexture(rubberPixels,1024,1,THREE.RGBAFormat);rubberTexture.minFilter=rubberTexture.magFilter=THREE.LinearFilter;rubberTexture.wrapS=THREE.RepeatWrapping;rubberTexture.needsUpdate=true;asphalt.onBeforeCompile=shader=>{shader.uniforms.waterClock=waterClock;shader.uniforms.rainEnergy=rainEnergy;shader.uniforms.surfaceNoise={value:surfaceNoise};shader.uniforms.roadWet=wetUniform;shader.uniforms.dryTrail={value:dryTexture};shader.uniforms.circuitLength={value:track.length};shader.uniforms.asphaltPhoto={value:asphaltTex};shader.uniforms.rubberLine={value:rubberTexture};shader.vertexShader='varying vec3 wetRoadPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwetRoadPoint=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 wetRoadPoint;\n'+waterRippleGLSL+'\n'+bridgeCoverGLSL+'\nuniform sampler2D dryTrail,surfaceNoise,asphaltPhoto,rubberLine;uniform float rainEnergy;uniform float circuitLength;uniform float roadWet;uniform float waterClock;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat ss=vMapUv.y/.15,oo=vMapUv.x/.15;vec2 wetNoise=texture2D(surfaceNoise,wetRoadPoint.xz*.013).rg;float waterPocket=.5+.5*sin(ss*.039+sin(ss*.013)*2.)*sin(oo*1.7+ss*.011);float waterStanding=smoothstep(4.2,7.,abs(oo))*(.45+.55*waterPocket);float waterPatch=smoothstep(.30,.75,waterStanding*.80+wetNoise.r*.12+wetNoise.g*.08);vec4 trail=texture2D(dryTrail,vec2(fract(ss/circuitLength),.5));float dryOff=trail.g*20.-10.;float localWet=max(0.,roadWet-trail.r*exp(-pow(oo-dryOff,2.)/5.))*(1.-'+BRIDGE_DRY.toFixed(2)+'*bridgeCover(wetRoadPoint.xz));roughnessFactor*=.94+wetNoise.g*.06;vec3 photoNear=texture2D(asphaltPhoto,wetRoadPoint.xz*.34).rgb,photoFar=texture2D(asphaltPhoto,wetRoadPoint.zx*.043+.37).rgb;float aggregate=dot(photoNear,vec3(.3333)),patchy=dot(photoFar,vec3(.3333));float macro=texture2D(surfaceNoise,wetRoadPoint.xz*.0023).r;diffuseColor.rgb*=mix(1.,(.62+aggregate*.85)*(.82+patchy*.36),.8)*(.88+macro*.22);float lineOff=texture2D(rubberLine,vec2(fract(ss/circuitLength),.5)).r*20.-10.;float rubber=exp(-pow((oo-lineOff)/1.45,2.));diffuseColor.rgb*=1.-rubber*(.20+.08*wetNoise.r);roughnessFactor=mix(roughnessFactor,roughnessFactor*.84,rubber);float verge=smoothstep(5.4,7.1,abs(oo));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.10+.010,verge*.55);roughnessFactor=mix(roughnessFactor,max(.13,roughnessFactor*.40),localWet*waterPatch);diffuseColor.rgb*=1.-localWet*.30;');shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
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
  {const vergeTex=grassTex.clone();vergeTex.repeat.set(.55,.55);vergeTex.needsUpdate=true;green.map=vergeTex;green.color.set('#b7c79b');green.needsUpdate=true;}// Mapped ground covers the OSM download box only (CLAUDE.md boundary); UVs keep the old 6500 m texel density.
  const groundGeo=new THREE.PlaneGeometry(MAP_GROUND.width,MAP_GROUND.depth),guv=groundGeo.attributes.uv;for(let i=0;i<guv.count;i++)guv.setXY(i,.5+(guv.getX(i)-.5)*MAP_GROUND.width/6500,.5+(guv.getY(i)-.5)*MAP_GROUND.depth/6500);
  const ground=new THREE.Mesh(groundGeo,addGroundVariation(new THREE.MeshStandardMaterial({map:grassTex,color:'#adb98e',roughness:1})));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;const groundFrame=new THREE.Group();groundFrame.name='Mapped ground (OSM box)';groundFrame.position.set(MAP_GROUND.centre[0],0,MAP_GROUND.centre[1]);groundFrame.rotation.y=MAP_GROUND.angle;groundFrame.add(ground);scene.add(groundFrame);
  // Outside the box: one plain, unlit-looking apron that fades into the fog; nothing is modelled there.
  // Sunk 2 m and depth-offset back so it can never flicker through the mapped ground at long range.
  const apron=new THREE.Mesh(new THREE.CircleGeometry(9000,48),new THREE.MeshStandardMaterial({color:'#6d7a60',roughness:1,polygonOffset:true,polygonOffsetFactor:6,polygonOffsetUnits:6}));apron.name='Plain far-field apron';apron.rotation.x=-Math.PI/2;apron.position.set(MAP_GROUND.centre[0],-2,MAP_GROUND.centre[1]);scene.add(apron);
  const context=await createSurroundings(scene,track);createCircuitBleachers(scene,track,context.data);createCircuitFinish(scene,track);const architecture=createCircuitArchitecture(scene);const rainImpacts=createRainImpacts(scene,track);const lifeDetail=createCircuitLifeDetail(scene,track);
  const concreteMap=texture(512,(c,n)=>{c.fillStyle='#a5aaa6';c.fillRect(0,0,n,n);for(let i=0;i<18000;i++){const v=100+random()*75;c.fillStyle=`rgba(${v},${v},${v},.16)`;c.fillRect(random()*n,random()*n,1+random()*3,1+random()*3);}c.strokeStyle='rgba(50,55,53,.22)';c.lineWidth=2;c.strokeRect(0,0,n,n);for(let i=0;i<4;i++){c.fillStyle='rgba(54,61,56,.16)';c.beginPath();c.arc(i%2?n-32:32,i<2?32:n-32,3,0,Math.PI*2);c.fill();}});
  const concrete=constructionFinish(new THREE.MeshStandardMaterial({color:'#d4d6d0',map:concreteMap,roughness:.86}));
  const steel=new THREE.MeshStandardMaterial({color:'#858f92',metalness:.8,roughness:.34});
  const glass=new THREE.MeshPhysicalMaterial({color:'#5c818e',metalness:.30,roughness:.085,clearcoat:1,clearcoatRoughness:.08});
  const dark=new THREE.MeshStandardMaterial({color:'#263c40',roughness:.65});
  function box(w,h,d,x,y,z,mat=concrete,parent=scene){const geometry=new THREE.BoxGeometry(w,h,d);if(mat.userData.metricTile){const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+x)/mat.userData.metricTile,(p.getZ(i)+z)/mat.userData.metricTile);}const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function sign(text,w,h,x,y,z,rotation=0,color='#dcecde',bg='#1b3429',canvas=[1024,128]){
    const t=label(text,color,bg,...canvas);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.5,emissive:'#88998a',emissiveMap:t,emissiveIntensity:.10}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);return m;
  }
  // Start/finish markings at source-data origin.
  for(let x=-7;x<7;x+=.5)for(let z=0;z<1;z+=.5){const m=new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),((Math.round(x*2)+Math.round(z*2))%2)?dark:white);m.rotation.x=-Math.PI/2;m.position.set(x+.25,.062,z-1);scene.add(m);}
  const grid=new THREE.InstancedMesh(new THREE.BoxGeometry(.08,.015,1.7),white,48);const obj=new THREE.Object3D();
  for(let i=0;i<24;i++){const s=-20-i*8.5,x=i%2?3:-3;for(let k=0;k<2;k++){obj.position.set(x+(k?1:-1),.07,s);obj.updateMatrix();grid.setMatrixAt(i*2+k,obj.matrix);}}scene.add(grid);
  // Armco follows the full source-coordinate circuit.
  const railMat=new THREE.MeshStandardMaterial({color:'#b4babc',metalness:.65,roughness:.45});
  const railLength=5,railPlacements=[];for(const side of [-1,1]){const path=[];for(let s=0;s<=track.length;s+=1)path.push(track.at(Math.min(s,track.length-.001),side*19).p);const cumulative=[0];for(let k=1;k<path.length;k++)cumulative.push(cumulative[k-1]+Math.hypot(path[k].x-path[k-1].x,path[k].z-path[k-1].z));const total=cumulative.at(-1),pieces=Math.max(1,Math.round(total/railLength)),piece=total/pieces;let k=0;const pointAt=d=>{while(k<cumulative.length-2&&cumulative[k+1]<d)k++;const u=(d-cumulative[k])/Math.max(1e-6,cumulative[k+1]-cumulative[k]);return {x:path[k].x+(path[k+1].x-path[k].x)*u,z:path[k].z+(path[k+1].z-path[k].z)*u};};for(let j=0;j<pieces;j++){k=Math.max(0,k-3);const a=pointAt(j*piece),b=pointAt((j+1)*piece),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.05)continue;if(track.barrierOpen(k,side*19))continue;railPlacements.push({x:(a.x+b.x)/2,z:(a.z+b.z)/2,yaw:Math.atan2(dx,dz),stretch:len/(railLength*.998)});}}const rails=new THREE.InstancedMesh(formedRailGeometry(railLength*.998),railMat,railPlacements.length);railPlacements.forEach((r,i)=>{obj.position.set(r.x,.48,r.z);obj.rotation.set(0,r.yaw,0);obj.scale.set(1,1,r.stretch);obj.updateMatrix();rails.setMatrixAt(i,obj.matrix);});obj.scale.set(1,1,1);
  rails.castShadow=true;rails.receiveShadow=true;scene.add(rails);
  const fenceTexture=texture(1024,(c,s)=>{c.clearRect(0,0,s,s);c.strokeStyle='#81888a';c.lineWidth=4;for(let i=-s;i<s*2;i+=64){c.beginPath();c.moveTo(i,0);c.lineTo(i+s,s);c.stroke();c.beginPath();c.moveTo(i,0);c.lineTo(i-s,s);c.stroke();}});
  fenceTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const fenceMat=new THREE.MeshStandardMaterial({map:fenceTexture,transparent:false,alphaTest:.4,alphaToCoverage:true,roughness:.8,metalness:.18,side:THREE.DoubleSide});
  for(const side of [-1,1]){const p=[],uv=[],idx=[];let prevOpen=false;// Catch fence ~4 m tall with a 0.6 m top section cranked towards the track (photos 07, 09); heights are photo estimates.
    for(let i=0;i<=track.n;i+=4){const sAt=i/track.n*track.length,q=track.at(sAt,side*19).p,r=track.at(sAt,side*18.45).p,x=q.x,z=q.z,open=track.barrierOpen(sAt,side*19);p.push(x,.85,z,x,4.0,z,r.x,4.55,r.z);uv.push(sAt/2,0,sAt/2,1,sAt/2,1.18);const j=p.length/3-3;if(j>=3&&!open&&!prevOpen)idx.push(j-3,j,j-2,j-2,j,j+1,j-2,j+1,j-1,j-1,j+1,j+2);prevOpen=open;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();scene.add(new THREE.Mesh(g,fenceMat));}
  // Pit apron and garages: visual prototypes, dimensions pending survey.
  const pitAsphalt=new THREE.MeshStandardMaterial({color:'#9b9f9e',map:asphaltTex,normalMap:asphaltNormal,normalScale:new THREE.Vector2(.09,.09),roughness:.87});pitAsphalt.userData.metricTile=3.0;
  // preview.28: the pit road, its markings and walls come from pit-lane.js geometry (was a 26 m slab and a straight wall)
  const pitLaneVisuals=createPitLaneVisuals(scene,track,{asphalt:pitAsphalt,concrete,fence:fenceMat});
  // Pit building length follows the mapped garages (main-straight.js): 22 bays between the two bridge towers.
  box(22,6.55,PIT_LEN,-47,7.725,PIT_MID);box(.20,4.4,PIT_LEN,-58.0,2.2,PIT_MID);createPitArchitecture(scene);box(24,.65,PIT_LEN+3,-47,11.2,PIT_MID,steel);
  // Front curtain wall is panelised by the landmark builder.
  box(1.2,3.3,PIT_LEN-4,-58.4,8.4,PIT_MID,glass);
  // preview.27: photo 04 shows a white fascia over the doors with large dark bay numbers; the team colour bands were invented
  const fascia=new THREE.MeshStandardMaterial({color:'#e6e7e2',roughness:.55});
  for(let i=0;i<PIT_BAYS;i++){const z=PIT_BAY0-i*PIT_BAY;box(.2,.64,11.4*PIT_K,-35.6,4.4,z,fascia);box(.25,8,.3,-35.4,7,z+PIT_BAY/2-.5,steel);sign(unitLabel(i).padStart(2,'0'),1.6,.9,-35.35,5.05,z,Math.PI/2,'#1f2624','#e9eae5',[256,144]);}
  // Grandstand with raked terraces, seats and characteristic sculptural canopy.
  const standAssembly=new THREE.Group();standAssembly.name='Aligned main grandstand';scene.add(standAssembly);const standAxis=fitStandToStraight(track);const stands=new THREE.Group();stands.userData={surveyed:false,type:'architectural reference prototype'};standAssembly.add(stands);
  const seatProfile=new THREE.Shape();seatProfile.moveTo(-.25,-.08);seatProfile.lineTo(.22,-.08);seatProfile.quadraticCurveTo(.27,-.06,.27,.14);seatProfile.lineTo(.28,.42);seatProfile.quadraticCurveTo(.28,.46,.21,.46);seatProfile.lineTo(.18,.15);seatProfile.quadraticCurveTo(.16,.015,-.23,.035);seatProfile.quadraticCurveTo(-.28,.02,-.25,-.08);const seatShell=new THREE.ExtrudeGeometry(seatProfile,{depth:.46,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,steps:1,curveSegments:12});seatShell.translate(0,0,-.23);seatShell.rotateY(Math.PI/2);seatShell.userData.seatShell=true;seatShell.userData.mainSeat=true;seatShell.userData.lodMetricSize=.50;seatShell.userData.lodThresholds=[42,52,2.2,3.0];
  const rows=42,columns=SEAT_COLS,seats=new THREE.InstancedMesh(seatShell,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.60}),rows*columns);
  for(let r=0;r<rows;r++){
    const stepH=r<LOWER_ROWS?.42:.56;box(.85,stepH,STAND_LEN-2,seatX(r),seatTop(r)-stepH/2,STAND_MID,concrete,stands);
    for(let col=0;col<columns;col++){obj.scale.set(col%30<2?0:1,col%30<2?0:1,col%30<2?0:1);obj.position.set(seatX(r),seatTop(r)+.08,STAND_Z0+col*.99);obj.rotation.set(0,-Math.PI/2,0);obj.updateMatrix();seats.setMatrixAt(r*columns+col,obj.matrix);seats.setColorAt(r*columns+col,new THREE.Color((col+r*3)%9<4?'#d6ad54':((col+r*3)%9<6?'#bd553a':'#cbc7b4')));}
  }standAssembly.add(seats);
  obj.scale.set(1,1,1);
  box(2.4,.3,STAND_LEN,45.5,10.4,STAND_MID,concrete,stands);
  // hospitality band between the tiers, upper-tier fascia and the raked soffit under the upper tier (preview.27)
  box(.14,SUITE_Y1-SUITE_Y0,STAND_LEN,SUITE_X,(SUITE_Y0+SUITE_Y1)/2,STAND_MID,glass,stands);for(let z=STAND_Z0+2;z<-77;z+=4.2)box(.16,SUITE_Y1-SUITE_Y0,.10,SUITE_X-.05,(SUITE_Y0+SUITE_Y1)/2,z,steel,stands);
  box(.22,.18,STAND_LEN,SUITE_X-.1,SUITE_Y0+2.7,STAND_MID,steel,stands);box(1.5,.95,STAND_LEN,SUITE_X+.55,SUITE_Y1+.47,STAND_MID,concrete,stands);box(.05,1.05,STAND_LEN,SUITE_X-.2,SUITE_Y1+1.5,STAND_MID,steel,stands);
  {const a=[seatX(LOWER_ROWS)-.45,seatTop(LOWER_ROWS)-.62],b=[seatX(41)+.45,seatTop(41)-.62],len=Math.hypot(b[0]-a[0],b[1]-a[1]);const soffit=box(len,.3,STAND_LEN,(a[0]+b[0])/2,(a[1]+b[1])/2,STAND_MID,concrete,stands);soffit.rotation.z=Math.atan2(b[1]-a[1],b[0]-a[0]);}box(.06,.8,STAND_LEN,44.4,10.8,STAND_MID,steel,stands);box(.12,1.0,STAND_LEN,27.94,.50,STAND_MID,dark,stands);box(2,.82,STAND_LEN,28.9,.39,STAND_MID,concrete,stands);

  const roofMat=constructionFinish(new THREE.MeshPhysicalMaterial({color:'#bec8c6',metalness:.50,roughness:.42,clearcoat:.20,side:THREE.DoubleSide,vertexColors:true}),'roof');
  // Sweeping main roof with circular lantern apertures, derived from architect photos.
  // Dimensions are visual estimates, not a survey or a 1:1 certified replica.
  const roofShape=new THREE.Shape();roofShape.moveTo(15,STAND_ROOF_Z0);roofShape.lineTo(74,STAND_ROOF_Z0);roofShape.lineTo(74,-65);roofShape.lineTo(15,-65);roofShape.closePath();
  for(let j=0;j<14;j++){const hole=new THREE.Path();hole.absarc(j%2?34:54,-85-j*24,2.7,0,Math.PI*2,true);roofShape.holes.push(hole);}
  const roofGeometry=new THREE.ExtrudeGeometry(roofShape,{depth:.55,bevelEnabled:false,curveSegments:32});
  const rp=roofGeometry.attributes.position,roofColors=new Float32Array(rp.count*3);for(let i=0;i<rp.count;i++){const x=rp.getX(i),z=rp.getY(i),depth=rp.getZ(i);rp.setXYZ(i,x,STAND_ROOF_Y+Math.pow((x-40)/30,2)*1.5+depth,z);const shade=depth<.1?.73:.97;roofColors.set([shade,shade,shade],i*3);}roofGeometry.setAttribute('color',new THREE.BufferAttribute(roofColors,3));roofGeometry.computeVertexNormals();
  const canopy=new THREE.Mesh(roofGeometry,roofMat);canopy.castShadow=true;canopy.receiveShadow=true;standAssembly.add(canopy);
  const lanternMats=['#8e2329','#bba35b','#a25636'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.45,side:THREE.DoubleSide}));
  for(let j=0;j<14;j++){const x=j%2?34:54,z=-85-j*24;const lining=new THREE.Mesh(new THREE.CylinderGeometry(2.7,2.7,1.1,48,1,true),lanternMats[j%3]);lining.position.set(x,STAND_ROOF_Y+.5+Math.pow((x-40)/30,2)*1.5,z);standAssembly.add(lining);}
  for(let j=0;j<17;j++){const z=-76-j*19.5;box(.55,STAND_ROOF_Y+1.6,.55,70,(STAND_ROOF_Y+1.6)/2,z,steel,standAssembly);}
  // Elliptical bridges are rebuilt as closed shells and connected curtain-wall systems.
  // preview.25: the 26 lotus canopies sit 15 m+ from the racing line; a 4-segment, unbevelled shell keeps the same profile at ~1/9 of the triangles.
  const lotusSeat=new THREE.ExtrudeGeometry(seatProfile,{depth:.46,bevelEnabled:false,steps:1,curveSegments:4});lotusSeat.translate(0,0,-.23);lotusSeat.rotateY(Math.PI/2);lotusSeat.userData.seatShell=true;
  await createLotusGrandstands(scene,track,lotusSeat);
  // Garage facade details: window mullions, door ribs, utility boxes and roof rails.
  // Facade mullions come from the single bay-aligned detail set below.
  for(let i=0;i<PIT_BAYS;i++){const z=PIT_BAY0-i*PIT_BAY;// The shutters are rolled into the head casing; no ribs across the open bay.
box(.25,.8,.28,-35.4,1.4,z+5.9*PIT_K,new THREE.MeshStandardMaterial({color:'#b62e33',roughness:.55}));box(.27,.57,.41,-35.35,.44,z-5.7*PIT_K,dark);}
  for(let i=0,n=Math.floor(PIT_LEN/6.35);i<=n;i++){const z=PIT_Z0-(PIT_LEN-n*6.35)/2-i*6.35;box(.06,.78,.06,-35.8,11.9,z,steel);box(.07,.78,.07,-58.5,11.9,z,steel);}box(.05,.05,PIT_LEN,-35.8,12.25,PIT_MID,steel);box(.05,.05,PIT_LEN,-58.5,12.25,PIT_MID,steel);
  // Timing gantry above the start line.
  box(.45,6,.45,-9,3,4,steel);box(.45,6,.45,9,3,4,steel);box(18.6,.65,.65,0,5.9,4,steel);
  sign('SHANGHAI · START / FINISH',14,1.2,0,5.5,3.58,Math.PI);
  const signalMaterials=[];
  for(let i=0;i<5;i++){const mat=new THREE.MeshStandardMaterial({color:'#250909',emissive:'#ff1005',emissiveIntensity:.1});const m=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),mat);m.position.set(-1.2+i*.6,4.7,3.6);scene.add(m);signalMaterials.push(mat);}
  // Sponsor-free distance boards.
  // preview.25: the duplicate board set here was removed; circuit-livedetail places boards from corner entries.
  // Gravel and service-edge furniture informed by Tilke aerial photographs; extents approximate.
  const gravelTex=texture(512,(c,size)=>{c.fillStyle='#b1a38b';c.fillRect(0,0,size,size);for(let i=0;i<30000;i++){const grey=135+random()*60;c.fillStyle='rgb('+grey+','+(grey*.94)+','+(grey*.82)+')';c.fillRect(random()*size,random()*size,1+random()*3,1+random()*3);}},70),gravelMat=new THREE.MeshStandardMaterial({map:gravelTex,color:'#d3c8b1',roughness:1});
  {// Gravel traps sit inside the barrier on the outside of corners, as continuous runs (one draw call).
gravelMat.polygonOffset=true;gravelMat.polygonOffsetFactor=-2;gravelMat.polygonOffsetUnits=-2;// preview.27: runs come from track-surfaces.js, which the physics surface also reads.
const runs=track.surfaces.cornerRuns;const parts=runs.map(r=>track.ribbon(r.outer*11.4,r.outer*16.7,.03,r.from,r.to));if(parts.length){const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());const trap=new THREE.Mesh(merged,gravelMat);trap.name='Corner gravel traps';trap.receiveShadow=true;scene.add(trap);}
  // 2018 SkySat (photo 01): grey asphalt run-off between the kerb and the gravel on the outside of corners; physics reads
  // the same band as paved run-off (track-surfaces.js).
  {const pave=runs.map(r=>track.ribbon(r.outer*8.5,r.outer*11.4,.036,r.from,r.to));if(pave.length){const runoffPave=new THREE.MeshStandardMaterial({color:'#5b6163',roughness:.93,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});const m=new THREE.Mesh(mergeGeometries(pave,false),runoffPave);pave.forEach(g=>g.dispose());m.name='Corner asphalt run-off';m.receiveShadow=true;scene.add(m);}}
  // T1-T2 get their own photo-based run-off layering instead of the generic strip.
  createTurnOneRunoff(scene,track,gravelMat);}
  // Legacy tower bands and mullions removed; rebuilt tower profiles own these joints.
  // Redundant roof strips removed: the joined truss frame supplies the roof support.
  // Trees around the outer circuit, instanced for performance.
  const trees=[];for(let i=0;i<1300;i++){const x=(random()-.5)*2600,z=-500+(random()-.5)*2500;if(track.nearest(x,z).distance>45&&!context.developed(x,z)&&!nearLotus(x,z,8)&&!(x>-65&&x<80&&z>-530&&z<100))trees.push({x,z,h:6+random()*7});if(trees.length>=490)break;}
  const crownParts=[[-1.6,.1,0,2.9],[1.4,.7,.5,3.0],[0,2.6,-.6,2.6],[.4,-1.3,-1.5,2.6]].map(([x,y,z,r])=>{const g=new THREE.IcosahedronGeometry(r,1);g.translate(x,y,z);return g;});const crownGeometry=mergeGeometries(crownParts,false);crownParts.forEach(g=>g.dispose());const crowns=new THREE.InstancedMesh(crownGeometry,new THREE.MeshStandardMaterial({color:'#355c3b',roughness:1}),trees.length),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.23,.35,4,5),new THREE.MeshStandardMaterial({color:'#514d3f',roughness:1}),trees.length);
  trees.forEach((p,i)=>{obj.position.set(p.x,p.h*.62,p.z);obj.scale.set(p.h/9,p.h/9,p.h/9);obj.rotation.set(0,random()*Math.PI,0);obj.updateMatrix();crowns.setMatrixAt(i,obj.matrix);crowns.setColorAt(i,new THREE.Color().setHSL(.27+random()*.08,.22,.18+random()*.14));obj.position.y=2;obj.scale.set(1,1,1);obj.updateMatrix();trunks.setMatrixAt(i,obj.matrix);});scene.add(trunks);crowns.geometry.dispose();crowns.material.dispose();createFoliage(scene,trees,random);
  // Track lighting is a simulation option; not a surveyed lighting installation.

  const buildingGlow=[];const glowMat=new THREE.MeshStandardMaterial({color:'#ffe1a6',emissive:'#ffd39a',emissiveIntensity:0,roughness:.35});buildingGlow.push(glowMat);
  // Building fixtures are illustrative; exact installed fixtures have not been surveyed.
  for(let i=0;i<PIT_BAYS;i++){const z=PIT_BAY0-i*PIT_BAY;box(.12,.08,10.5*PIT_K,-35.15,4.0,z,glowMat);box(.12,.16,10*PIT_K,-35.05,8.2,z,glowMat);}
  for(let i=0;i<18;i++)box(.2,.12,9,70,20,-75-i*19,glowMat,standAssembly);
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
  const trackMirror=track.ribbon(-7.18,7.18,.006),pitMirror=createPitWetPatch(track),mirrorGeometry=mergeGeometries([trackMirror,pitMirror],false);trackMirror.dispose();pitMirror.dispose();mirrorGeometry.rotateX(Math.PI/2);
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
    hemi.intensity=lighting.hemiIntensity;hemi.groundColor.set('#50564c');moon.intensity=lighting.moonIntensity;moon.visible=lighting.moonIntensity>0;atmosphere.set(day,twilight,cloudiness,sunDirection);reflectionAtmosphere.set(day,twilight,cloudiness,sunDirection);context.setNight?.(1-twilight);landmarks.setNight(1-twilight);pitLaneVisuals.setNight(1-twilight);paddockDetail.setNight(1-twilight);architecture.setNight(1-twilight);lifeDetail.setNight(1-twilight);for(const m of buildingGlow)m.emissiveIntensity=(1-twilight)*2.8;
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
  const landmarks=createCircuitLandmarks(scene,standAxis);const edgeDetail=createTrackEnvironment(scene,track);const paddockDetail=await createPaddockDetail(scene,track);const standEnvelope=createCircuitEnvelope(scene);standAxis.apply(standAssembly);standAxis.apply(architecture.standRoot);standAxis.apply(standEnvelope);standAxis.apply(lifeDetail.standRoot);standAxis.apply(tracksideDetails.standRoot);standAxis.apply(detailUpgrade.standRoot);const pitWarp=warpPitComplex(scene,track.pitLane,{keep:[pitLaneVisuals.root]});addPitWorkshopDetail(scene,track.pitLane);const environmentBatches=optimizeEnvironmentBatches(scene);const pitVista=capturePitVista(scene);pitVista.userData.skyMaterial=atmosphere.dome.material;
  // Keep transparent glass, dynamic ancestors and shadow flags independent.
  // Indexed geometry stays indexed; shared originals remain usable by the garage vista.
  const pitClutter=clearPitLaneClutter(scene,track.pitLane,pitLaneVisuals.root);
  const architectureBatches=batchStaticMeshes(scene,80);
  const spatialStats=partitionStaticInstances(scene);
  const vistaInstances=optimizeEnvironmentBatches(pitVista,100);const vistaBatches=batchStaticMeshes(pitVista,60);partitionStaticInstances(pitVista,60);const detail=createSceneDetail(scene),vistaDetail=createSceneDetail(pitVista);
  const weatherSurfaces=createWeatherSurfaces([scene,pitVista],{exclude:[asphalt]});pitVista.userData.updateWeather=dt=>{waterClock.value+=Math.max(0,dt);weatherSurfaces.update(targetWet,waterClock.value,lighting,sunDirection);};const otherReflectors=[];scene.traverse(o=>{if(o.isReflector)otherReflectors.push(o);});wetReflection.setPeers(otherReflectors);
  function updateDetail(camera,height,trackView=true,driving=false){if(trackView)paddockDetail.prepare(camera,!driving);const controller=trackView?detail:vistaDetail,before=controller.stats.changes,result=controller.update(camera,height);if(trackView){const half=camera.position.y>80?256:32,c=sun.shadow.camera;if(c.right!==half){c.left=c.bottom=-half;c.right=c.top=half;c.updateProjectionMatrix();sun.shadow.needsUpdate=true;}if(result.changes!==before)sun.shadow.needsUpdate=true;}return result;}const detailStats={world:detail.stats,vista:vistaDetail.stats};
  setEnvironment('clear',12.5);
  function resetConditions(){wetness=targetWet;track.drying.fill(0);track.dryOffsets.fill(0);track.updateWater(0,wetness);}
  function captureConditions(full=false){const state={weather:currentWeather,hour:currentHour,wetness,waterTime:waterClock.value};if(full){state.drying=track.drying.slice();state.dryOffsets=track.dryOffsets.slice();}return state;}
  function restoreConditions(state,a=state,b=a,u=0){setEnvironment(state.weather,state.hour);wetness=state.wetness;waterClock.value=state.waterTime;if(a.drying)for(let i=0;i<track.n;i++){track.drying[i]=a.drying[i]+((b.drying?.[i]??a.drying[i])-a.drying[i])*u;track.dryOffsets[i]=a.dryOffsets[i]+((b.dryOffsets?.[i]??a.dryOffsets[i])-a.dryOffsets[i])*u;}track.updateWater(0,wetness);}
  return {detailReferences:()=>detail.references(),pitClutter,pitWarp,pitLaneVisuals,setRubberLine(offsets){const n=offsets.length;for(let i=0;i<1024;i++){const v=offsets[Math.floor(i/1024*n)];rubberPixels[i*4]=Math.max(0,Math.min(255,Math.round((v+10)/20*255)));}rubberTexture.needsUpdate=true;},weatherSurfaces,wetReflection,atmosphere,rainfall,environmentBatches,vistaInstances,kerbs,landmarks,edgeDetail,paddockDetail,standAxis,standAssembly,updateDetail,detailStats,pitVista,standEnvelope,trackLighting,vistaBatches,architectureBatches,setEnvironment,resetConditions,captureConditions,restoreConditions,spatialStats,lifeDetail,update,sun,context,tracksideDetails,get exposure(){return exposure;},get wetness(){return wetness;},get targetWet(){return targetWet;},signalMaterials,road,asphalt,sky,architecture,rainImpacts};
}
