import * as THREE from 'three';
export const introDuration=7.2;
export const detailDuration=5.4;
const surfaces=[
 {camera:[.62,.40,2.78],target:[.23,.19,2.20],fov:32,label:'FRONT WING / CARBON WEAVE'},
 {camera:[1.20,.24,.05],target:[.53,.09,-.15],fov:32,label:'FLOOR EDGE / CARBON'},
 {camera:[1.10,.56,-.35],target:[.54,.35,-.55],fov:32,label:'SIDEPOD / COMPOSITE'},
 {camera:[.40,.67,1.68],target:[0,.42,1.42],fov:31,label:'MONOCOQUE / CARBON'},
 {camera:[.44,.98,.27],target:[.12,.70,.06],fov:34,label:'COCKPIT RIM / CARBON'},
 {camera:[.57,1.08,.56],target:[.24,.80,.12],fov:33,label:'HALO / COMPOSITE'},
 {camera:[1.03,.56,1.17],target:[.56,.33,1.55],fov:34,label:'FRONT SUSPENSION / CARBON'},
 {camera:[1.05,.51,-1.35],target:[.49,.31,-1.70],fov:34,label:'REAR SUSPENSION / CARBON'},
 {camera:[.85,.95,-2.68],target:[.32,.78,-2.04],fov:32,label:'REAR WING / CARBON'}];
export const detailShots=surfaces.flatMap(shot=>[shot,{...shot,camera:shot.camera.map((v,i)=>i===0?-v:v),target:shot.target.map((v,i)=>i===0?-v:v)}]);
export function chooseIntroShots(random=Math.random,previous=[]){
 const available=detailShots.map((_,i)=>i).filter(i=>!previous.includes(i)),chosen=[];
 for(let i=0;i<3;i++){const index=Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)));chosen.push(available.splice(index,1)[0]);}return chosen;
}
export function introShot(age,shots=[0,2,4],variation=0){
 if(age<detailDuration){const length=detailDuration/3,stage=Math.min(2,Math.floor(Math.max(0,age)/length)),t=Math.max(0,(age-stage*length)/length),shot=detailShots[shots[stage]],drift=(t-.5)*(.75+variation*.5);
  return {...shot,camera:shot.camera.map((x,i)=>x+(i===0?-.045:i===1?.012:-.035)*drift),fov:shot.fov+variation*1.4,light:Math.sin(Math.PI*t)**.65,stage};}
 return {light:0,stage:3,logo:Math.min(1,(age-detailDuration)/.55)};
}
// Cover must be painted before preparation; reveal requires a subsequent track frame.
export function createIntroGate(prepare,onError=()=>{}){
 let phase='idle',frames=0;
 return {get phase(){return phase;},get ready(){return phase==='drawn';},cover(){if(phase==='idle')phase='cover';},rendered(){
  if(phase==='cover'&&++frames>=2){phase='preparing';Promise.resolve().then(prepare).then(()=>{phase='ready';},error=>{phase='failed';onError(error);});}
  else if(phase==='ready')phase='drawn';
 }};
}
export function createSessionIntro(camera){
 let age=0,running=false,finish=null,shots=[],variation=0,gate=null,skip=false,fade=-1,options={},handoffAt=0;
 const overlay=document.getElementById('session-intro'),shade=document.getElementById('intro-shade'),logo=document.getElementById('intro-logo'),progress=document.getElementById('intro-progress'),caption=overlay.querySelector('.intro-caption span'),button=document.getElementById('intro-skip'),look=new THREE.Vector3();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function complete(success=true){if(!running)return;running=false;if(success){overlay.dataset.entryMs=String(Math.round(performance.now()-handoffAt));overlay.dataset.entryKind=skip?'skip':'animation';}overlay.hidden=true;overlay.style.opacity='1';overlay.removeAttribute('aria-busy');document.body.classList.remove('session-intro');button.disabled=false;const fn=finish;finish=null;if(success)fn?.();}
 button.onclick=()=>{if(!running||skip)return;skip=true;handoffAt=performance.now();button.disabled=true;shade.style.opacity='1';logo.style.opacity='0';gate.cover();overlay.setAttribute('aria-busy','true');};
 return {get running(){return running;},get exposure(){return .025+.82*introShot(age,shots,variation).light;},begin(done,settings={}){
  if(running)return;options=settings;shots=chooseIntroShots(Math.random,shots);variation=Math.random();age=0;fade=-1;skip=false;handoffAt=0;finish=done;running=true;
  gate=createIntroGate(()=>options.prepare?.(),error=>{complete(false);options.onError?.(error);});overlay.hidden=false;overlay.style.opacity='1';button.disabled=false;document.body.classList.add('session-intro');caption.textContent=detailShots[shots[0]].label;logo.style.opacity='0';shade.style.opacity='1';progress.style.transform='scaleX(0)';
 },rendered(){if(running)gate.rendered();},update(dt){
  if(!running)return;dt=Math.max(0,Math.min(dt,.25));age+=dt*(reduced?4:1);const shot=introShot(age,shots,variation);
  if(age>=introDuration&&!handoffAt)handoffAt=performance.now();
  if(age>=detailDuration){gate.cover();overlay.setAttribute('aria-busy','true');}
  if(gate.phase==='idle'){
   caption.textContent=shot.label;camera.position.set(...shot.camera);camera.lookAt(look.set(...shot.target));camera.fov=shot.fov;camera.updateProjectionMatrix();shade.style.opacity=String(1-shot.light);
  }else{shade.style.opacity='1';caption.textContent='正在加载模型与地图';}
  logo.style.opacity=String(skip?0:shot.logo||0);logo.style.transform=`translate(-50%,-50%) scale(${1+.012*Math.max(0,Math.min(1.8,age-detailDuration))})`;progress.style.transform=`scaleX(${Math.min(1,age/introDuration)})`;
  if(gate.ready&&(skip||age>=introDuration)){if(fade<0)fade=0;fade+=dt;overlay.style.opacity=String(Math.max(0,1-fade/.20));if(fade>=.20)complete();}
 }};
}
