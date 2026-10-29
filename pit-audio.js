// Pit stop sound: every effect is synthesised here in WebAudio (no recorded or third-party samples) and played through
// an HRTF panner at the object that makes it: wheel guns at the hubs, jacks at the nose and gearbox, tyres at the wheel,
// crew footsteps where each foot lands, and a garage room tone at the box. The listener follows the render camera.
import * as THREE from 'three';
const CORNERS=['FL','FR','RL','RR'];
export function createPitAudio(){
 let ctx,master,helmet,noise,brown,room=null,enabled=false,steps=0;const tmp=new THREE.Vector3(),fwd=new THREE.Vector3(),upv=new THREE.Vector3(),last={front:0,rear:0,phase:'idle'};
 function unlock(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=0;helmet=ctx.createBiquadFilter();helmet.type='lowpass';helmet.frequency.value=16000;master.connect(helmet);helmet.connect(ctx.destination);
  noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const a=noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
  brown=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const b=brown.getChannelData(0);let n=0;for(let i=0;i<b.length;i++){n=(n+(Math.random()*2-1)*.02)/1.02;b[i]=n*3.5;}}
  ctx.resume().catch(()=>{});}
 const live=()=>ctx&&ctx.state==='running'&&enabled,stats={};
 function panner(p,ref=1.6){const n=ctx.createPanner();n.panningModel='HRTF';n.distanceModel='inverse';n.refDistance=ref;n.rolloffFactor=1.15;n.maxDistance=260;if(n.positionX){n.positionX.value=p.x;n.positionY.value=p.y;n.positionZ.value=p.z;}else n.setPosition(p.x,p.y,p.z);n.connect(master);return n;}
 // one-shot graph: sources -> ... -> out(panner); everything is disconnected once the last source ends
 function shot(kind,p,build,ref){stats[kind]=(stats[kind]||0)+1;const out=panner(p,ref),nodes=[out],t=ctx.currentTime+.005;let open=0;const end=()=>{if(--open>0)return;for(const n of nodes)n.disconnect();};
  build({t,add:n=>{nodes.push(n);return n;},src:(s,at,dur)=>{nodes.push(s);open++;s.onended=end;s.start(at);s.stop(at+dur);return s;},out});}
 function env(g,t,level,attack,hold,release){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+attack);g.gain.setValueAtTime(level,t+attack+hold);g.gain.exponentialRampToValueAtTime(.0001,t+attack+hold+release);}
 // pneumatic wheel gun: rattling impacts (noise gated at the hammer rate) over the motor whine; undo rises, tighten falls and ends on a hard click
 function gun(p,action,dur=.22){if(!live())return;shot('gun',p,({t,add,src,out})=>{const tight=action==='tighten';
  const ns=add(ctx.createBufferSource());ns.buffer=noise;ns.loop=true;const bp=add(ctx.createBiquadFilter());bp.type='bandpass';bp.frequency.value=2900;bp.Q.value=1.1;const gate=add(ctx.createGain());gate.gain.value=.5;
  const ham=add(ctx.createOscillator());ham.type='square';ham.frequency.setValueAtTime(tight?52:62,t);ham.frequency.linearRampToValueAtTime(tight?40:70,t+dur);const hamDepth=add(ctx.createGain());hamDepth.gain.value=.5;ham.connect(hamDepth);hamDepth.connect(gate.gain);
  const g=add(ctx.createGain());env(g,t,.55,.006,dur-.04,.05);ns.connect(bp);bp.connect(gate);gate.connect(g);g.connect(out);
  const wh=add(ctx.createOscillator());wh.type='sawtooth';wh.frequency.setValueAtTime(tight?1380:980,t);wh.frequency.linearRampToValueAtTime(tight?1040:1420,t+dur);const wf=add(ctx.createBiquadFilter());wf.type='bandpass';wf.frequency.value=1300;wf.Q.value=2.2;const wg=add(ctx.createGain());env(wg,t,.12,.01,dur-.04,.05);wh.connect(wf);wf.connect(wg);wg.connect(out);
  src(ns,t,dur+.06);src(ham,t,dur+.06);src(wh,t,dur+.06);
  if(tight)ping(t+dur,2600,.22,.045,{add,src,out});},1.4);}
 function ping(t,hz,level,decay,{add,src,out}){const o=add(ctx.createOscillator());o.type='triangle';o.frequency.value=hz;const g=add(ctx.createGain());env(g,t,level,.002,0,decay);o.connect(g);g.connect(out);src(o,t,decay+.02);}
 function thump(t,hz,level,decay,{add,src,out},drop=.6){const o=add(ctx.createOscillator());o.type='sine';o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(hz*drop,t+decay);const g=add(ctx.createGain());env(g,t,level,.004,0,decay);o.connect(g);g.connect(out);src(o,t,decay+.02);}
 function burst(t,hz,type,level,decay,{add,src,out},q=.8){const s=add(ctx.createBufferSource());s.buffer=noise;const f=add(ctx.createBiquadFilter());f.type=type;f.frequency.value=hz;f.Q.value=q;const g=add(ctx.createGain());env(g,t,level,.003,0,decay);s.connect(f);f.connect(g);g.connect(out);src(s,t,decay+.02);}
 // jack: steel cradle meeting the jacking point, then the lever load; drop is a heavier thud of the tyres meeting the floor
 function jack(p,up){if(!live())return;shot('jack',p,k=>{if(up){burst(k.t,900,'bandpass',.32,.05,k,1.4);ping(k.t,1850,.08,.09,k);thump(k.t+.01,95,.42,.16,k);}else{thump(k.t,72,.6,.22,k,.55);burst(k.t,380,'lowpass',.35,.09,k);}},1.8);}
 // wheel off / on: rubber and rim sliding off the hub pegs; the new wheel seats with a short metallic knock
 function tyre(p,on){if(!live())return;shot('tyre',p,k=>{burst(k.t,on?1500:1100,'bandpass',.12,.16,k,.7);thump(k.t+(on?.02:.12),on?140:110,.34,.12,k);if(on)ping(k.t+.03,3100,.05,.05,k);},1.4);}
 // safety-boot footstep on concrete; alternates two hashed tunings so a run of steps is not one repeated click
 function step(p,weight=1){if(!live())return;const v=(steps++*7919)%5;shot('step',p,k=>{burst(k.t,1700+v*160,'bandpass',.07*weight,.035,k,1.1);thump(k.t,90+v*6,.09*weight,.05,k);},1.1);}
 function release(p){if(!live())return;shot('release',p,k=>{burst(k.t,4200,'highpass',.06,.35,k,.5);},1.6);}// air hoses vented as the guns are lifted away
 function setRoom(p,level){if(!ctx)return;if(!room&&level>0){const s=ctx.createBufferSource();s.buffer=brown;s.loop=true;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=520;const g=ctx.createGain();g.gain.value=0;const pn=panner(p,6);s.connect(f);f.connect(g);g.connect(pn);s.start();room={s,f,g,pn};}
  if(room)room.g.gain.setTargetAtTime(level,ctx.currentTime,.6);}
 const soundLog=[],logSound=(k,t)=>{soundLog.push([k,t]);if(soundLog.length>64)soundLog.splice(0,32);};   // dev-tools: [sound, pit clock] for the landing timeline check
 const hub=(car,k,out=.18)=>{const spin=car.userData.wheels?.[CORNERS.indexOf(k)];if(!spin)return car.position.clone();spin.getWorldPosition(tmp);const side=k[1]==='L'?1:-1;return tmp.clone().add(new THREE.Vector3(side*out,0,0).applyQuaternion(car.quaternion));};
 const local=(car,x,y,z)=>new THREE.Vector3(x,y,z).applyMatrix4(car.matrixWorld);
 return {unlock,step,stats,soundLog,get output(){return helmet;},get context(){return ctx;},
  // pit-stop events carry the corner; positions are read from the car's actual hubs at that moment
  event(name,data,car){if(!car||!live())return;const k=data.corner;
   if(name==='gun')gun(hub(car,k,.32),data.action);else if(name==='wheel-off')tyre(hub(car,k,.45),false);else if(name==='wheel-on')tyre(hub(car,k,.3),true);else if(name==='release')release(local(car,0,.6,0));},
  // per frame: listener = camera; jack contacts from the lift heights; room tone while a stop is running near the box
  update(camera,{on,cockpit,state,car,box}){if(!ctx)return;enabled=on;const t=ctx.currentTime,L=ctx.listener;master.gain.setTargetAtTime(on?.9:0,t,.05);helmet.frequency.setTargetAtTime(cockpit?3400:16000,t,.1);
   camera.getWorldPosition(tmp);camera.getWorldDirection(fwd);upv.set(0,1,0).applyQuaternion(camera.quaternion);
   if(L.positionX){L.positionX.setValueAtTime(tmp.x,t);L.positionY.setValueAtTime(tmp.y,t);L.positionZ.setValueAtTime(tmp.z,t);L.forwardX.setValueAtTime(fwd.x,t);L.forwardY.setValueAtTime(fwd.y,t);L.forwardZ.setValueAtTime(fwd.z,t);L.upX.setValueAtTime(upv.x,t);L.upY.setValueAtTime(upv.y,t);L.upZ.setValueAtTime(upv.z,t);}else{L.setPosition(tmp.x,tmp.y,tmp.z);L.setOrientation(fwd.x,fwd.y,fwd.z,upv.x,upv.y,upv.z);}
   if(state&&car){const f=state.lift.front,r=state.lift.rear;if(f>.004&&last.front<=.004)jack(local(car,0,.25,2.9),true);if(r>.004&&last.rear<=.004)jack(local(car,0,.35,-2.75),true);if(state.dropAt&&f<=.0005&&last.front>.0005){jack(local(car,0,.1,1.2),false);logSound('drop-front',state.t);}if(state.dropAt&&r<=.0005&&last.rear>.0005){jack(local(car,0,.1,-1.3),false);logSound('drop-rear',state.t);}   /* the thud on the frame the tyres reach the floor (lift 0), not before */last.front=f;last.rear=r;}
   const busy=state&&!['idle','done','booked'].includes(state.phase);setRoom(new THREE.Vector3(box.x-4,1.5,box.z),busy&&on?.05:0);}
 };
}
