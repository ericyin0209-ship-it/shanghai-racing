import * as THREE from 'three';
import {wrap,grip,clamp,angle,steeringLimit} from './physics.js';
export function createRacingLine(scene,track){
 const n=1000,spacing=track.length/n,offsets=new Float64Array(n),points=[];
 for(let i=0;i<n;i++){const a=track.at(i*spacing-12).t,b=track.at(i*spacing+12).t,cross=a.z*b.x-a.x*b.z;offsets[i]=-Math.sign(cross)*Math.min(5.4,Math.abs(cross)*13);}
 // Lap-wide curvature minimisation under track bounds, then a cyclic braking envelope.
 for(let pass=0;pass<90;pass++){for(let i=0;i<n;i++){const prev=track.at((i-1)*spacing,offsets[(i+n-1)%n]).p,next=track.at((i+1)*spacing,offsets[(i+1)%n]).p,f=track.at(i*spacing),desired=prev.add(next).multiplyScalar(.5).sub(f.p).dot(f.normal);offsets[i]=clamp(offsets[i]*.6+desired*.4,-5.4,5.4);}}
 for(let i=0;i<n;i++)points.push(track.at(i*spacing,offsets[i]).p);const curvature=new Float64Array(n),speeds=new Float64Array(n);for(let i=0;i<n;i++){const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n],ab=b.clone().sub(a),bc=c.clone().sub(b);curvature[i]=Math.acos(clamp(ab.clone().normalize().dot(bc.clone().normalize()),-1,1))/Math.max(.1,(ab.length()+bc.length())/2);}
 function plan(wet,temp,wear,compound='medium'){const g=grip(wet,temp,wear,compound);for(let i=0;i<n;i++)speeds[i]=clamp(Math.sqrt(12.5*g/Math.max(curvature[i]*1.25-.0025*g,.00012)),8,88);for(let p=0;p<3;p++)for(let i=n-1;i>=0;i--){const j=(i+1)%n,d=points[i].distanceTo(points[j]);speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[j]**2+2*12*g*d));}for(let p=0;p<2;p++)for(let i=0;i<n;i++){const j=(i+1)%n;speeds[j]=Math.min(speeds[j],Math.sqrt(speeds[i]**2+2*7*g*spacing));}}
 plan(0,85,0);const count=n,geom=new THREE.PlaneGeometry(1,1),material=new THREE.MeshBasicMaterial({transparent:true,opacity:.42,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,side:THREE.DoubleSide}),mesh=new THREE.InstancedMesh(geom,material,count);mesh.name="Full-lap racing guidance";mesh.userData.dynamic=true;mesh.userData.batchExclude=true;mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);const holoTime={value:0},holo=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,uniforms:{time:holoTime},
 vertexShader:`varying vec2 vUv;varying float vDist;varying vec3 vTint;void main(){vUv=uv;vec3 c=vec3(1.);
#ifdef USE_INSTANCING_COLOR
c=instanceColor;
#endif
vTint=c;vec4 world=modelMatrix*instanceMatrix*vec4(position,1.);vec4 view=viewMatrix*world;vDist=-view.z;gl_Position=projectionMatrix*view;}`,
 fragmentShader:`uniform float time;varying vec2 vUv;varying float vDist;varying vec3 vTint;void main(){float x=abs(vUv.x-.5)*2.;
 float rails=smoothstep(.82,.94,x)*(1.-smoothstep(.97,1.,x));float core=1.-smoothstep(.0,.16,x);float fill=(1.-x)*.16;
 float scan=.55+.45*sin(vUv.y*6.2832*2.-time*9.);float pulse=smoothstep(.70,1.,fract(vUv.y-time*1.6));
 float warn=step(vTint.g+.2,vTint.r);vec3 green=vec3(.22,1.,.55),amber=vec3(1.,.55,.16);vec3 col=mix(green,amber,warn*.85);
 float a=(rails*1.15+core*.55*scan+fill+pulse*.35*core)*smoothstep(1.5,7.,vDist)*(1.-smoothstep(70.,170.,vDist));
 gl_FragColor=vec4(col*a*1.9,a);}`});
const dummy=new THREE.Object3D(),color=new THREE.Color();let clock=1,lastWet=-1,routeStart=0,target=0;
 function prepare(dt,vehicle){clock+=dt;if(clock>.6||Math.abs(vehicle.wetness-lastWet)>.03){plan(vehicle.wetness||0,vehicle.temperature,vehicle.wear,vehicle.setup?.compound);clock=0;lastWet=vehicle.wetness||0;}}
 function sample(s){const f=wrap(s,track.length)/spacing,i=Math.floor(f),u=f-i,j=(i+1)%n;return {p:points[i].clone().lerp(points[j],u),speed:speeds[i]*(1-u)+speeds[j]*u};}
 function drive(vehicle){const near=track.nearest(vehicle.x,vehicle.z),lookDistance=clamp(5+vehicle.speed*.20,6,22),look=sample(near.s+lookDistance),dx=look.p.x-vehicle.x,dz=look.p.z-vehicle.z,distance=Math.max(1,Math.hypot(dx,dz)),error=angle(Math.atan2(dx,dz)-vehicle.yaw),steer=clamp(Math.atan2(2*3.55*Math.sin(error),distance)/steeringLimit(vehicle.speed),-1,1);let wanted=sample(near.s).speed*.90;const g=grip(vehicle.wetness||0,vehicle.temperature,vehicle.wear,vehicle.setup?.compound);for(let d=10;d<=240;d+=10)wanted=Math.min(wanted,Math.sqrt((sample(near.s+d).speed*.90)**2+2*10*g*d));return {stability:true,steer,throttle:clamp((wanted-vehicle.speed)*.30,0,1)*clamp(1-Math.max(Math.abs(vehicle.rearSlip||0)*4,Math.abs(vehicle.slip||0)*3,Math.abs(steer)*.35),.15,1),brake:clamp((vehicle.speed-wanted)*.35,0,1)};}
 let colourAge=1,lastSpeed=-100,placed=false,lastMode=-1;
 function update(dt,vehicle,mode,enabled){
  prepare(dt,vehicle);mesh.visible=!!enabled;if(!enabled)return;holoTime.value+=dt;const onboard=mode===1||mode===3;if(mesh.material!==(onboard?holo:material))mesh.material=onboard?holo:material;
  const near=track.nearest(vehicle.x,vehicle.z),start=Math.floor(near.s/spacing);routeStart=start;target=speeds[(start+3)%n]*3.6;
  // Fixed lap-wide geometry must never be rewritten as a short moving window.
  if(!placed||lastMode!==mode){for(let i=0;i<count;i++){const next=(i+1)%n,p=points[i],q=points[next];dummy.position.copy(p).lerp(q,.5);dummy.position.y=track.height((i+.5)*spacing,(offsets[i]+offsets[next])*.5)+(mode===1||mode===3?.06:.035);dummy.rotation.set(-Math.PI/2,0,Math.atan2(q.x-p.x,q.z-p.z));dummy.scale.set(mode===1||mode===3?.95:mode===2?.60:.36,mode===1||mode===3?spacing*1.02:Math.min(2.1,spacing*.42),1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;placed=true;lastMode=mode;}
  colourAge+=dt;if(colourAge>.12||Math.abs(vehicle.speed-lastSpeed)>1){for(let i=0;i<count;i++){const excess=vehicle.speed-speeds[i];color.set(excess>2?'#ff3849':excess>-.8?'#ffc943':'#48e0a1');mesh.setColorAt(i,color);}mesh.instanceColor.needsUpdate=true;colourAge=0;lastSpeed=vehicle.speed;}
  return {target};
 }
 function drawVisor(camera,canvas,enabled){
  canvas.hidden=!enabled;if(!enabled)return;const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  // The road guidance is the same physical full-lap mesh in all four cameras.
  const x=w*.5,y=h*.40,delta=Math.round((camera.userData.liveSpeed??target)-target),bw=150,bh=42,warn=delta>3,ink=warn?'255,176,74':'92,255,160';c.save();
 c.beginPath();c.moveTo(x-bw/2+9,y-bh/2);c.lineTo(x+bw/2,y-bh/2);c.lineTo(x+bw/2,y+bh/2-9);c.lineTo(x+bw/2-9,y+bh/2);c.lineTo(x-bw/2,y+bh/2);c.lineTo(x-bw/2,y-bh/2+9);c.closePath();
 c.fillStyle='rgba(6,30,18,.28)';c.fill();c.shadowColor=`rgba(${ink},.9)`;c.shadowBlur=7;c.strokeStyle=`rgba(${ink},.75)`;c.lineWidth=1;c.stroke();
 c.textAlign='center';c.fillStyle=`rgba(${ink},.85)`;c.font='600 9px ui-monospace,Menlo,monospace';c.fillText('TARGET · KM/H',x,y-8);
 c.font='700 18px ui-monospace,Menlo,monospace';c.fillStyle=warn?'rgba(255,214,150,.95)':'rgba(214,255,232,.95)';c.fillText(target.toFixed(0)+(warn?'  ▼'+delta:''),x,y+13);
 c.shadowBlur=0;c.fillStyle=`rgba(${ink},.07)`;for(let yy=y-bh/2+2;yy<y+bh/2;yy+=3)c.fillRect(x-bw/2+1,yy,bw-2,1);c.restore();
 }
 return {update,prepare,sample,drive,drawVisor,mesh,points,speeds,offsets};
}
