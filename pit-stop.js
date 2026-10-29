// preview.28: pit stop state machine, run inside the fixed 120 Hz physics step so every timing below is simulation time
// and independent of the render frame rate. Replaces the old waypoint + 7 s timer service (pit-service.js).
// Sequence (event driven, each step starts when its condition is met, durations are per action):
//   booked -> pit road -> limiter line -> box approach (assist takes over / manual guidance) -> stopped + alignment check
//   -> jacks engage and lift -> per corner: gun on, undo, wheel off, wheel on, tighten, done -> drop -> crew clear
//   -> release light -> leave box -> limiter off at the pit lane end line.
// Action durations are fitted to typical 2023-24 F1 stops (about 2.3-2.8 s stationary); no random failures are added.
import {clamp,angle,steeringLimit} from './physics.js?v=229release';
import {FRONT_ARM,REAR_ARM} from './physics.js?v=229release';
import {pitJackHeight} from './pit-dynamics.js?v=232';
import {PIT_V} from './pit-lane.js?v=p34-20261029-r3';
export const CORNERS=['FL','FR','RL','RR'];
// per-corner start offsets give the four crews slightly different rhythm (fixed, not random)
const CREW_OFFSET={FL:0,FR:.035,RL:.06,RR:.02};
export const EXIT_GUIDE=9,EXIT_BAND=.15;// manual exit: guided distance (m along the pit lane) and steering band around the assisted line
// after a push-back the service waits while the front tyre-off men (the pushers) go back round their gunners to their wheels
export const PUSH_RESET=3.8;
export const STEP={jackIn:.16,lift:.22,gunOn:.17,undo:.22,wheelOff:.60,wheelOn:.72,seat:.08,tighten:.22,signal:.07,drop:.15,clear:.50,lights:.12};
// fixed per-corner tempo (crews are not identical); multiplies the hand-work durations
const CREW_TEMPO={FL:1,FR:1.06,RL:.97,RR:1.04};
// adjust: the crew adapt to this much error by stepping / shuffling; beyond it the car is waved round (no stretched arms)
export const ALIGN={perfect:{dz:.35,dv:.30,yaw:.055},adjust:{dz:.9,dv:.45,yaw:.11},missed:3.5};
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export function createPitStop(track,{onEvent=()=>{}}={}){
 const pit=track.pitLane,L=pit.length;let mode='assist';
 const S={phase:'idle',compound:'medium',booked:false,t:0,stopAt:0,stopPose:null,previousCompound:null,align:null,corners:{},lift:{front:0,rear:0},jack:{front:0,rear:0},release:false,lightGreen:false,assistBlend:0,pushBack:0,stops:0,stationary:0,log:[]};
 const box=pit.box,uStop=pit.U.box,vBox=pit.nearest(box.x,box.z).v,vFast=PIT_V.fast;
 const emit=(name,data={})=>{S.log.push([+S.t.toFixed(3),name]);if(S.log.length>200)S.log.shift();onEvent(name,{...data,state:S});};
 function resetCorners(){for(const c of CORNERS)S.corners[c]={step:'wait',t:0,gun:0,nut:1,old:0,fresh:0,done:false,gunOnAtT:null,undoAtT:null,offAtT:null,oldDoneT:null,freshAtT:null,seatAtT:null,tightAtT:null,doneAtT:null};S.blockers=[];S.blockedSince=null;S.blockedWarned=false;S.dropAtT=null;S.releaseAtT=null;}
 resetCorners();
 // lateral target along the lane for the assisted approach (fast lane -> box), and for leaving the box
 const approachV=u=>{const k=smooth((u-(uStop-40))/30);return vFast+(vBox-vFast)*k;};
 const leaveV=(u,u0)=>{const k=smooth((u-u0-2)/22);return vBox+(vFast-vBox)*k;};
 function driveAlong(v,vAt,targetSpeed,c){const q=pit.nearest(c.x,c.z),look=Math.max(3.2,c.speed*.55),p=pit.point(q.u+look,vAt(q.u+look)),e=angle(Math.atan2(p.x-c.x,p.z-c.z)-c.yaw),d=Math.hypot(p.x-c.x,p.z-c.z);
  const steer=clamp(Math.atan2(2*3.6*Math.sin(e),d)/steeringLimit(c.speed),-1,1),err=targetSpeed-c.speed;return {steer,throttle:clamp(err*.5,0,.6),brake:clamp(-err*.55,0,1),stability:true};}
 // car front axle along the lane relative to the box mark; lateral offset; heading error
 function alignment(c){const fx=c.x+Math.sin(c.yaw)*FRONT_ARM,fz=c.z+Math.cos(c.yaw)*FRONT_ARM,q=pit.nearest(c.x,c.z),qf=pit.nearest(fx,fz),mark=uStop+FRONT_ARM;return {dz:qf.u-mark,dv:q.v-vBox,yaw:angle(c.yaw-pit.sample(q.u).yaw),u:q.u};}
 const api={
  get phase(){return S.phase;},get state(){return S;},get mode(){return mode;},setMode(m){mode=m==='manual'?'manual':'assist';},
  get active(){return ['box','stopped','service','release','leave','pushback','creep'].includes(S.phase);},
  get serviceLift(){return S.lift;},
  book(compound='medium'){if(['stopped','service','release','pushback','leave','done'].includes(S.phase))return 'locked';S.pushDelay=0;S.serviceAdj=0;S.compound=compound;if(S.booked){emit('rebooked',{compound});return 'updated';}S.bookingId=(S.bookingId||0)+1;S.booked=true;if(S.phase==='idle')S.phase='booked';emit('booked',{compound});return 'booked';},
  cancel(v){const was=S.phase;if(['stopped','service','release','pushback'].includes(was))return false;S.booked=false;if(['booked','pitlane','box','creep'].includes(was)){S.phase=was==='booked'?'idle':'drive-through';}if(v)v.pitLimiter=v.pitLimiter&&S.phase!=='idle';S.assistBlend=0;emit('cancelled');return true;},
  reset(v){S.pushDelay=0;S.serviceAdj=0;S.inZone=false;S.speeding=false;S.stopAt=0;S.releaseAt=0;S.pushAt=0;S.dropAt=0;S.clear=0;S.stationary=0;S.stopPose=null;S.previousCompound=null;S.align=null;S.phase='idle';S.booked=false;S.lift={front:0,rear:0};S.jack={front:0,rear:0};S.release=S.lightGreen=false;resetCorners();if(v){v.serviceLift=null;v.pitLimiter=false;}},
  // called once per physics step before stepVehicle; returns an input override, or null to leave the driver in control
  update(dt,c,driverInput,{fitTyres,wetness=0,clearance=null}={}){S.t+=dt;const decel=6.5*(1-.45*Math.min(1,wetness));// assisted braking plan: about 3.6 m/s2 on a soaked track
  const q=pit.nearest(c.x,c.z),onRoad=pit.onRoad(c.x,c.z,.5),inZone=onRoad&&q.u>pit.U.limitStart&&q.u<pit.U.limitEnd;
   // pit lane entry/exit and the speed limiter (assist: automatic at the lines; manual: the driver presses L)
   if(onRoad&&S.phase==='booked'&&q.u<uStop-80){S.phase='pitlane';emit('entered');}
   if(inZone&&!S.inZone){S.inZone=true;emit('limit-start');if(mode==='assist'||S.phase==='box')c.pitLimiter=true;else if(!c.pitLimiter)emit('limiter-needed');}
   if(S.inZone&&(!inZone)&&q.u>=pit.U.limitEnd-1){S.inZone=false;emit('limit-end');if(mode==='assist')c.pitLimiter=false;}
   if(!onRoad&&S.inZone){S.inZone=false;}
   if(S.inZone&&c.speed>pit.limit+.4&&!c.pitLimiter){if(!S.speeding)emit('speeding',{kmh:c.speed*3.6});S.speeding=true;}else S.speeding=false;
   if(S.phase==='drive-through'&&(!onRoad||q.u>pit.U.limitEnd+5))S.phase='idle';
   // approach to the box
   if(S.phase==='pitlane'&&q.u>uStop-Math.max(75,mode==='assist'?c.speed*c.speed/(2*decel)+15:0)&&q.u<uStop+2){S.phase='box';S.assistBlend=0;emit('approach');}
   if(S.phase==='box'||S.phase==='creep'){const a=alignment(c);S.align=a;
    if(a.dz>ALIGN.missed&&c.speed>.5){S.phase='pitlane-missed';emit('missed');}
    else if(c.speed<.05){S.stationary+=dt;if(S.stationary>.15){S.stationary=0;const ok=Math.abs(a.dz)<=ALIGN.adjust.dz&&Math.abs(a.dv)<=ALIGN.adjust.dv&&Math.abs(a.yaw)<=ALIGN.adjust.yaw;
      if(ok){S.phase='stopped';S.stopAt=S.t;S.previousCompound=c.setup?.compound||'medium';S.stopPose={x:c.x,z:c.z,yaw:c.yaw};S.dropAt=0;S.clear=0;S.lightGreen=false;S.guided=false;S.align={...a,grade:Math.abs(a.dz)<=ALIGN.perfect.dz&&Math.abs(a.dv)<=ALIGN.perfect.dv&&Math.abs(a.yaw)<=ALIGN.perfect.yaw?'perfect':'adjusted'};resetCorners();emit('stopped',{align:S.align});}
      else if(a.dz<-ALIGN.adjust.dz&&Math.abs(a.dv)<=1.2){S.phase='creep';emit('short',{align:a});}
      else if(a.dz>ALIGN.adjust.dz&&a.dz<=ALIGN.missed&&Math.abs(a.dv)<=1.2){S.phase='pushback';S.pushBack=a.dz;S.pushAt=S.t;S.pushDelay=PUSH_RESET;emit('overshoot',{align:a});}
      else {S.phase='realign';emit('realign',{align:a});}}}
    else S.stationary=0;
    if(S.phase==='box'||S.phase==='creep'){if(mode==='assist'||S.phase==='creep'&&mode==='assist'){S.assistBlend=Math.min(1,S.assistBlend+dt/.45);const rem=uStop-q.u,vmax=S.phase==='creep'?1.2:Math.min(pit.limit,Math.sqrt(2*decel*Math.max(0,rem-.02))),target=rem<.03?0:vmax,cmd=driveAlong(c,approachV,target,c);if(rem<.25&&c.speed<1.4){cmd.throttle=0;cmd.brake=1;}
      if(S.assistBlend<1&&driverInput){const k=S.assistBlend;for(const key of ['steer','throttle','brake'])cmd[key]=driverInput[key]*(1-k)+cmd[key]*k;}return cmd;}
     return null;}}
   if(S.phase==='pitlane-missed'){if(!onRoad||q.u>pit.U.limitEnd)S.phase='booked';return null;}
   if(S.phase==='realign'){// a large offset: leave the box area and come round again (no reversing in an F1 car)
    S.phase='pitlane-missed';return null;}
   if(S.phase==='pushback'){// mechanics roll the car back onto the mark at walking pace; brakes off, wheels turn backwards
    const step=S.t-S.pushAt<.9?0:Math.min(S.pushBack,.55*dt);for(const w of c.wheels)w.spin-=step/.36;S.pushBack-=step;c.x-=Math.sin(c.yaw)*step;c.z-=Math.cos(c.yaw)*step;c.distance-=step;c.speed=0;if(S.pushBack<=1e-3){S.phase='box';S.stationary=.2;}return {steer:0,throttle:0,brake:0};}
   if(S.phase==='stopped'||S.phase==='service'){if(S.phase==='stopped')S.phase='service';c.speed=0;c.lateralSpeed=0;c.yawRate=0;if(S.stopPose){c.x=S.stopPose.x;c.z=S.stopPose.z;c.yaw=S.stopPose.yaw;}
    serviceStep(dt,fitTyres,c,clearance);c.serviceLift=S.lift;return {steer:0,throttle:0,brake:1};}
   if(S.phase==='release'){c.serviceLift=null;// the car may only move once the light is green
    if(mode==='assist'){S.phase='leave';S.leaveU=q.u;emit('leaving');}else if(driverInput&&driverInput.throttle>.05){S.phase='leave';S.leaveU=q.u;emit('leaving');}else return {steer:0,throttle:0,brake:1};}
   if(S.phase==='leave'){if(mode==='assist'){if(q.u>S.leaveU+26){S.phase='done';emit('handback');return null;}return driveAlong(c,u=>leaveV(u,S.leaveU),pit.limit*.98,c);}
    // manual exit guide: for the first EXIT_GUIDE m the steering is held within EXIT_BAND of the assisted exit line (the
    // release check covers exactly that band), throttle and brakes stay with the driver
    if(q.u<S.leaveU+EXIT_GUIDE){const g=driveAlong(c,u=>leaveV(u,S.leaveU),pit.limit*.98,c),d=driverInput||{steer:0,throttle:0,brake:0};if(!S.guided){S.guided=true;emit('exit-guided');}
     return {...d,steer:clamp(d.steer||0,g.steer-EXIT_BAND,g.steer+EXIT_BAND)};}
    if(q.u>S.leaveU+26)S.phase='done';return null;}
   if(S.phase==='done'){if(!onRoad||q.u>pit.U.limitEnd+2){S.phase='idle';S.booked=false;emit('rejoined');}return null;}
   return null;}
 };
 // service: jacks, four corners and release, each step gated by the previous event
 function serviceStep(dt,fitTyres,c,clearance){const t=S.t-S.stopAt,adj=.85+(S.align?.grade==='adjusted'?.12:0)+(S.pushDelay||0);S.serviceAdj=adj;
  // jacks: the front jack is already square in front of the nose, the rear jack man steps in behind the car
  S.jack.front=clamp((t-.03-adj)/STEP.jackIn,0,1);S.jack.rear=clamp((t-.10-adj)/STEP.jackIn,0,1);
  const allDone=CORNERS.every(k=>S.corners[k].done);
  if(!allDone){S.lift.front=.075*smooth((t-.03-adj-STEP.jackIn)/STEP.lift);S.lift.rear=.075*smooth((t-.10-adj-STEP.jackIn)/STEP.lift);}
  for(const k of CORNERS){const w=S.corners[k],front=k[0]==='F',liftOK=(front?S.lift.front:S.lift.rear)>.035;w.t+=dt;const tc=t-CREW_OFFSET[k]-adj;
   if(w.step==='wait'&&tc>.05){w.step='gunOn';w.t=0;w.gunOnAtT=S.t;}
   // each gunner reacts to his own end of the car coming up, with a fixed per-corner reaction (not all on one frame)
   if(w.step==='gunOn'){w.gun=smooth(w.t/STEP.gunOn);if(liftOK&&w.liftSeen==null)w.liftSeen=S.t;if(w.t>=STEP.gunOn*CREW_TEMPO[k]&&w.liftSeen!=null&&S.t-w.liftSeen>=CREW_OFFSET[k]*1.4){w.step='undo';w.t=0;w.undoAtT=S.t;emit('gun',{corner:k,action:'undo'});}}
   if(w.step==='undo'){const tu=STEP.undo*CREW_TEMPO[k];w.nut=1-w.t/tu;if(w.t>=tu){w.nut=0;w.step='wheelOff';w.t=0;w.offAtT=S.t;emit('wheel-off',{corner:k});}}
   if(w.step==='wheelOff'){w.old=clamp(w.t/(STEP.wheelOff*CREW_TEMPO[k]),0,1);w.gun=1-.6*smooth(w.t/.12);if(w.old>=.82&&w.fresh===0){w.fresh=.0001;w.freshAtT=S.t;}if(w.old>=1&&w.oldDoneT==null)w.oldDoneT=S.t;}
   if(w.step!=='wheelOff'&&w.old>0&&w.old<1){w.old=clamp(w.old+dt/(STEP.wheelOff*CREW_TEMPO[k]),0,1);if(w.old>=1&&w.oldDoneT==null)w.oldDoneT=S.t;}
   if(w.fresh>0&&w.fresh<1){w.fresh=clamp(w.fresh+dt/(STEP.wheelOn*CREW_TEMPO[k]),0,1);if(w.fresh>=1){w.step='seat';w.t=0;w.seatAt=S.t;w.seatAtT=S.t;fitTyres?.(k,S.compound);emit('wheel-on',{corner:k});}}
   if(w.step==='seat'){w.gun=.4+.6*smooth(w.t/STEP.seat);if(w.t>=STEP.seat){w.step='tighten';w.t=0;w.tightAtT=S.t;emit('gun',{corner:k,action:'tighten'});}}
   if(w.step==='tighten'){w.gun=1;w.nut=clamp((w.t-.06)/(STEP.tighten-.06),0,1);if(w.t>=STEP.tighten*CREW_TEMPO[k]){w.nut=1;w.step='signal';w.t=0;}}
   if(w.step==='signal'&&w.t>=STEP.signal){w.step='done';w.done=true;w.doneAt=t;w.doneAtT=S.t;emit('corner-done',{corner:k});}
  }
  if(allDone){if(!S.dropAt){S.dropAt=t;S.dropAtT=S.t;emit('drop');}const d=t-S.dropAt;S.lift.front=pitJackHeight(d);S.lift.rear=pitJackHeight(d,true);
   if(d>STEP.drop+.02){S.jack.front=1-clamp((d-STEP.drop-.02)/.16,0,1);S.jack.rear=1-clamp((d-STEP.drop-.02)/.16,0,1);}
   // release gate: every corner confirmed tight (above), the car is back on its tyres, and the real positions of the
   // crew, guns, jacks and loose tyres are clear of the exit channel (clearance(), from the pit box). With no clearance
   // source (headless use) the old fixed clear-out time is the fallback.
   const down=d>STEP.drop+.02&&S.lift.front<=1e-4&&S.lift.rear<=1e-4&&S.jack.front<=0&&S.jack.rear<=0;// both jacks released; their real positions are checked by clearance()
   if(down&&!S.lightGreen){const c=clearance?clearance():{clear:d-STEP.drop>=STEP.clear,blockers:[]};S.blockers=c.blockers;S.clear=c.clear?1:clamp((d-STEP.drop)/STEP.clear,0,.99);
    if(!c.clear){if(S.blockedSince==null)S.blockedSince=t;else if(t-S.blockedSince>3&&!S.blockedWarned){S.blockedWarned=true;emit('release-blocked',{blockers:c.blockers});}}
    if(c.clear){S.lightGreen=true;S.releaseAt=t;S.releaseAtT=S.t;S.stops++;S.lastStationary=t+STEP.lights;emit('release',{stationary:t});}}
   if(S.lightGreen&&t-S.releaseAt>=STEP.lights){S.phase='release';S.dropAt=0;S.clear=0;S.lift={front:0,rear:0};}}
 }
 return api;
}
