import {stepBrakeThermal} from './brake-thermal.js';
import {conditionTyres,stepTyreThermal} from './tyre-thermal.js';
// SI units. Four contact patches; development coefficients, not Aston Martin telemetry.
import {wheelAngles,relaxContactAngle} from './vehicle-kinematics.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=(v,l)=>((v%l)+l)%l;
export const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
export const defaultSetup={frontWing:28,rearWing:32,spring:145,damping:15,rideHeight:38,differential:55,brakeBalance:56,pressure:23,compound:'medium',damage:true};
export function grip(wetness,temp=85,wear=0,compound='medium'){
 const rain=compound==='wet'?1.04-wetness*.20:compound==='intermediate'?1.07-wetness*.30:1-wetness*.60;
 const dryPenalty=compound==='wet'&&wetness<.25?.72:compound==='intermediate'&&wetness<.15?.85:1;
 const tempScale=clamp(1-Math.abs(temp-(compound==='wet'?65:compound==='intermediate'?75:90))*.004,.65,1);
 return rain*dryPenalty*tempScale*(1-.28*wear)*(compound==='soft'?1.045:compound==='hard'?.955:1);
}
export const steeringLimit=speed=>.46/(1+speed*.016);
// AMR23 / 2023 regulations: 3600 mm wheelbase, 44.5–46.0 % static front weight (Aston Martin
// technical specification). Use 45.25 %: centre of gravity 1.971 m behind the front axle.
// The visual model's origin sits CG_TO_MODEL_ORIGIN ahead of the centre of gravity.
// Rear tyres are much wider (405 vs 305 mm section): give the rear axle more peak grip. Calibrated so the
// handling balance (yaw-rate gain, lift-off response) stays where it was with the old 53.6 % front weight.
export const AXLE_GRIP=[.94,1.12];
export const FRONT_ARM=1.971,REAR_ARM=1.629,CG_TO_MODEL_ORIGIN=FRONT_ARM-1.67;
const mounts=[['FL',.8325,FRONT_ARM],['FR',-.8325,FRONT_ARM],['RL',.7855,-REAR_ARM],['RR',-.7855,-REAR_ARM]];
export function createVehicle(setup={}){const settings={...defaultSetup,...setup};return {x:0,y:.04,z:0,yaw:0,speed:0,steer:0,yawRate:0,slip:0,temperature:28,wear:0,throttle:0,brake:0,gear:0,distance:0,offroad:false,lateralSpeed:0,longitudinalAcceleration:0,lateralAcceleration:0,frontSlip:0,rearSlip:0,brakeBalance:settings.brakeBalance/100,pitLimiter:false,manual:false,rpm:4500,setup:settings,bodyVelocity:0,roll:0,pitch:0,rollVelocity:0,pitchVelocity:0,downforce:0,floorContact:0,energy:1,fuel:100,damage:{frontWing:0,rearWing:0,suspension:0},wheels:mounts.map(([id,x,z])=>({id,x,z,roadHeight:.035,compression:0,load:1957,omega:0,spin:0,temperature:28,brakeTemperature:110,wear:0,pressure:settings.pressure,slipRatio:0,slipAngle:0,forceX:0,forceZ:0,waterDepth:0,contact:true,curb:false})),service:null};}
export function resetVehicleMotion(v,surface){
 for(const key of ['speed','steer','yawRate','slip','lateralSpeed','longitudinalAcceleration','lateralAcceleration','frontSlip','rearSlip','throttle','brake','bodyVelocity','roll','pitch','rollVelocity','pitchVelocity','downforce','floorContact','deliveredThrottle'])v[key]=0;
 v.gear=0;v.rpm=4500;v.offroad=false;const co=Math.cos(v.yaw),si=Math.sin(v.yaw);let mean=0;
 for(const w of v.wheels){const x=v.x+co*w.x+si*w.z,z=v.z-si*w.x+co*w.z,road=surface?.(x,z)||{height:.035};w.roadHeight=w.previousRoad=road.height;mean+=road.height/4;w.omega=w.slipRatio=w.slipAngle=w.relaxedSlipAngle=w.forceX=w.forceZ=w.compression=0;w.contact=true;w.curb=!!road.curb;w.waterDepth=road.depth||0;w.load=798*9.81*(w.z>0?REAR_ARM:FRONT_ARM)/3.6/2;}
 v.y=mean+((v.setup?.rideHeight??38)-38)*.001;return v;
}
export function repairVehicle(v,{tyres=true}={}){v.damage={frontWing:0,rearWing:0,suspension:0};v.fuel=100;v.energy=1;for(const w of v.wheels)w.brakeTemperature=110;if(tyres)for(const w of v.wheels){w.wear=0;w.temperature=65;w.pressure=v.setup.pressure;}if(tyres)conditionTyres(v);v.wear=0;}
export function impactVehicle(v,speed,{location='front'}={}){if(v.setup.damage===false||speed<.5)return;const severity=clamp(speed/75,.006,.65);if(location==='front')v.damage.frontWing=clamp(v.damage.frontWing+severity,0,.95);if(location==='rear')v.damage.rearWing=clamp(v.damage.rearWing+severity,0,.95);v.damage.suspension=clamp(v.damage.suspension+severity*(location==='side'?.7:.45),0,.8);}
export function resolveBarrierImpact(v,outwardNormal){
 const norm=Math.hypot(outwardNormal.x,outwardNormal.z);if(norm<1e-8)return {normalSpeed:0,location:null};
 const nx=outwardNormal.x/norm,nz=outwardNormal.z/norm,si=Math.sin(v.yaw),co=Math.cos(v.yaw);
 const vx=si*v.speed+co*v.lateralSpeed,vz=co*v.speed-si*v.lateralSpeed,normalSpeed=Math.max(0,vx*nx+vz*nz);
 if(normalSpeed===0)return {normalSpeed:0,location:null};
 const approach=si*nx+co*nz,location=approach>.55?'front':approach<-.55?'rear':'side';
 // Remove normal energy, retain tangent motion for a glancing contact.
 const tx=(vx-nx*normalSpeed)*.97,tz=(vz-nz*normalSpeed)*.97;
 const afterX=tx-nx*normalSpeed*.035,afterZ=tz-nz*normalSpeed*.035;
 v.speed=Math.max(0,afterX*si+afterZ*co);v.lateralSpeed=afterX*co-afterZ*si;
 v.yawRate*=.75;v.slip=Math.atan2(v.lateralSpeed,Math.max(1,v.speed));
 impactVehicle(v,normalSpeed,{location});return {normalSpeed,location};
}
function springStep(value,velocity,target,frequency,dt){const acceleration=(target-value)*frequency*frequency-velocity*frequency*1.90;velocity+=acceleration*dt;return [value+velocity*dt,velocity];}
export function stepVehicle(v,input,dt,environment){
 const settings=v.setup||defaultSetup,mass=798,gravity=9.81,co=Math.cos(v.yaw),si=Math.sin(v.yaw),wet=environment.wetness||0;
 let pedal=clamp(input.throttle,0,1);let requestedSteer=clamp(input.steer,-1,1)*steeringLimit(v.speed);if(input.stability){const available=9.81*1.7*grip(wet,v.temperature,v.wear,settings.compound)*.78*(1+(v.downforce||0)/(mass*gravity));const safe=Math.atan(3.6*available/Math.max(8,v.speed*v.speed));requestedSteer=clamp(requestedSteer,-safe,safe);const rearSlip=Math.max(Math.abs(v.wheels[2].slipRatio),Math.abs(v.wheels[3].slipRatio));const cornerDemand=Math.abs(Math.tan(requestedSteer))*v.speed*v.speed/(3.6*Math.max(1,available));pedal*=clamp(1-cornerDemand*.38-Math.max(0,rearSlip-.06)*2.2,.18,1);}v.throttle+=clamp(pedal-v.throttle,-dt*12,dt*4);v.brake=clamp(input.brake,0,1);v.steer+=(requestedSteer-v.steer)*(1-Math.exp(-dt*(input.stability?7:12)));
 const wing=(settings.frontWing+settings.rearWing)/60,ride=clamp(1-Math.abs(settings.rideHeight-38)*.006,.7,1);
 v.downforce=(1.8+wing*1.65)*v.speed*v.speed*ride*(1-v.damage.frontWing*.28-v.damage.rearWing*.34);
 const frontAero=clamp(.43+(settings.frontWing-settings.rearWing)*.003-v.damage.frontWing*.13,.27,.58);
 const transferLong=clamp(-v.longitudinalAcceleration*mass*.30/3.6,-1100,1100),transferLat=clamp(v.lateralAcceleration*mass*.30/1.62,-1700,1700);
 let mean=0,offCount=0,forceSide=0,forceForward=0,moment=0,appliedDrive=0;
 const speed=Math.max(.1,v.speed),power=480000*(v.energy>.05?1:.85)*(v.fuel>0?1:0),drive=Math.min(10500,power/Math.max(18,speed))*v.throttle;
 const braking=mass*(22+speed*speed*.00065)*v.brake;
 const frontAngles=wheelAngles(v.steer,3.6,1.665);
 for(let i=0;i<4;i++){
  const w=v.wheels[i],front=i<2,wx=v.x+co*w.x+si*w.z,wz=v.z-si*w.x+co*w.z;
  const surface=environment.surface?.(wx,wz)||{height:.035,wetness:wet,depth:0,gripScale:1,offroad:environment.offroad,curb:false};

  w.roadHeight=surface.height;w.curb=surface.curb;w.waterDepth=surface.depth||0;mean+=surface.height*.25;offCount+=surface.offroad?1:0;
  const staticLoad=mass*gravity*(front?REAR_ARM:FRONT_ARM)/3.6/2;
  const aero=v.downforce*(front?frontAero:1-frontAero)/2;
  const pitchHeight=-w.z*v.pitch,rollHeight=w.x*v.roll;
  const compression=clamp(surface.height-v.y-pitchHeight-rollHeight+(settings.rideHeight-38)*.001,-.09,.075);
  w.compression=compression;
  const roadVelocity=(surface.height-(w.previousRoad??surface.height))/dt;w.previousRoad=surface.height;
  const suspension=clamp(compression*settings.spring*1000+clamp(roadVelocity,-1,1)*settings.damping*200,-staticLoad*.9,staticLoad*1.5);
  const load=staticLoad+aero+(front?transferLong:-transferLong)*.5+(w.x<0?transferLat:-transferLat)*.5+suspension*.25;
  w.load=Math.max(0,load)*(1-v.damage.suspension*.2);w.contact=w.load>50;
  const pressureFactor=clamp(1-Math.abs(w.pressure-24)*.018,.8,1),aquaplane=clamp(w.waterDepth*speed*speed*(settings.compound==='wet'?.035:settings.compound==='intermediate'?.075:.18),0,.65);
  const mu=1.70*(front?AXLE_GRIP[0]:AXLE_GRIP[1])*grip(surface.wetness??wet,w.temperature,w.wear,settings.compound)*pressureFactor*(surface.offroad?.38:1)*(surface.gripScale??1)*(1-aquaplane);
  const limit=Math.max(1,w.load*mu*Math.pow(Math.max(.25,w.load/2000),-.12));
  const longitudinal=speed-v.yawRate*w.x,lateral=v.lateralSpeed+v.yawRate*w.z,steer=front?(i===0?frontAngles.left:frontAngles.right)*(1-v.damage.suspension*.12):0;
  const alpha=angle(steer-Math.atan2(lateral,Math.max(2,longitudinal)));w.slipAngle=alpha;
  w.relaxedSlipAngle=w.contact?relaxContactAngle(w.relaxedSlipAngle,alpha,longitudinal,dt):0;
  const diff=clamp(settings.differential/100,.1,.95),rearShare=front?0:clamp(.5+(i===2?1:-1)*v.yawRate*.08*diff,.3,.7);
  const lateralDemand=w.contact?limit*Math.tanh((front?12:13)*w.relaxedSlipAngle):0;
  // Optional driving assistance budgets traction per contact patch. Cutting
  // engine torque must leave cornering force available on the driven axle.
  const reserve=Math.sqrt(Math.max(0,limit*limit-lateralDemand*lateralDemand));
  const requestedDrive=drive*rearShare,requestedBrake=braking*(front?v.brakeBalance:1-v.brakeBalance)/2;
  const driveForce=input.stability?Math.min(requestedDrive,reserve*.94):requestedDrive;
  const brakeForce=input.stability?Math.min(requestedBrake,reserve*.97):requestedBrake;
  appliedDrive+=driveForce;const demanded=driveForce-brakeForce;
  // Scale the longitudinal and lateral demands together. Saturated drive must not
  // abruptly erase rear cornering force: that created a runaway launch spin.
  const combined=Math.hypot(demanded,lateralDemand),saturation=Math.min(1,limit/Math.max(1,combined));
  const fz=demanded*saturation,fx=lateralDemand*saturation;
  w.forceX=fx;w.forceZ=fz;w.slipRatio=demanded/limit*.065;if(v.brake>.1&&-demanded>limit)w.slipRatio=-clamp((-demanded/limit-1)*.45,.1,1);else if(demanded>limit)w.slipRatio=clamp((demanded/limit-1)*.35,.08,.65);
  const omegaTarget=Math.max(0,longitudinal*(1+w.slipRatio)/.36);w.omega+=(omegaTarget-w.omega)*(1-Math.exp(-dt*35));w.spin+=w.omega*dt;
  forceSide+=fx*Math.cos(steer)+fz*Math.sin(steer);forceForward+=fz*Math.cos(steer)-fx*Math.sin(steer);moment+=w.z*(fx*Math.cos(steer)+fz*Math.sin(steer))-w.x*(fz*Math.cos(steer)-fx*Math.sin(steer));
  stepBrakeThermal(w,{force:brakeForce*saturation,speed:Math.abs(longitudinal),front,ambient:environment.ambient??20,dt});
  stepTyreThermal(w,{speed,ambient:environment.ambient??20,wetness:surface.wetness??wet,dt,basePressure:settings.pressure});
  w.wear=clamp(w.wear+speed*dt*.000002*(settings.compound==='soft'?1.5:settings.compound==='hard'?.7:1)*(1+Math.abs(alpha)*8+Math.abs(w.slipRatio)*5),0,1);
 }
 v.deliveredThrottle=drive>1?v.throttle*clamp(appliedDrive/drive,0,1):v.throttle;
 const oldSpeed=v.speed,drag=(.72+wing*.35)*speed*speed+.018*mass*gravity+(offCount?offCount*320:0);
 v.speed=clamp(v.speed+(forceForward-drag)/mass*dt,0,v.pitLimiter?80/3.6:98);
 const yawAcceleration=moment/1300,vYaw=v.yawRate+yawAcceleration*dt,maxYaw=1.8;
 v.yawRate=clamp(vYaw,-maxYaw,maxYaw);v.lateralSpeed=clamp(v.lateralSpeed+(forceSide/mass-v.speed*v.yawRate)*dt,-v.speed*.5,v.speed*.5);
 if(v.speed<2){const target=v.speed*Math.tan(v.steer)/3.6;v.yawRate+=(target-v.yawRate)*(1-Math.exp(-dt*12));v.lateralSpeed*=Math.exp(-dt*8);}
 v.longitudinalAcceleration=(v.speed-oldSpeed)/dt;v.lateralAcceleration=forceSide/mass;v.slip=Math.atan2(v.lateralSpeed,Math.max(1,v.speed));v.frontSlip=(v.wheels[0].slipAngle+v.wheels[1].slipAngle)/2;v.rearSlip=(v.wheels[2].slipAngle+v.wheels[3].slipAngle)/2;
 v.yaw=angle(v.yaw+v.yawRate*dt);v.x+=(Math.sin(v.yaw)*v.speed+Math.cos(v.yaw)*v.lateralSpeed)*dt;v.z+=(Math.cos(v.yaw)*v.speed-Math.sin(v.yaw)*v.lateralSpeed)*dt;
 const rideDrop=clamp(v.downforce/(settings.spring*4000),0,.023),targetY=mean-rideDrop+(settings.rideHeight-38)*.001;
 [v.y,v.bodyVelocity]=springStep(v.y,v.bodyVelocity,targetY,clamp(settings.damping*.8,8,20),dt);
 const centerRoad=environment.surface?.(v.x,v.z)?.height??mean,clearance=.045+v.y-centerRoad-Math.abs(v.roll)*.5-Math.abs(v.pitch)*.8;v.floorContact=v.speed>12?clamp((.009-clearance)/.012,0,1):0;if(v.floorContact>0)v.speed=Math.max(0,v.speed-v.floorContact*dt*.55);
 const frontMean=(v.wheels[0].roadHeight+v.wheels[1].roadHeight)/2,rearMean=(v.wheels[2].roadHeight+v.wheels[3].roadHeight)/2;
 const stiffness=clamp(145/settings.spring,.65,1.5),aeroPlatform=1/(1+v.downforce/(mass*gravity)*.18);
 // Stiff F1 platform: about 1° nose-down at full braking and under 1° of roll at peak cornering (estimates).
 const targetPitch=clamp((rearMean-frontMean)/3.6-v.longitudinalAcceleration*.00042*stiffness*aeroPlatform,-.02,.02),targetRoll=clamp((v.wheels[0].roadHeight+v.wheels[2].roadHeight-v.wheels[1].roadHeight-v.wheels[3].roadHeight)/3.33+v.lateralAcceleration*.00034*stiffness*aeroPlatform,-.016,.016);
 [v.pitch,v.pitchVelocity]=springStep(v.pitch,v.pitchVelocity,targetPitch,13,dt);[v.roll,v.rollVelocity]=springStep(v.roll,v.rollVelocity,targetRoll,14,dt);
 v.temperature=v.wheels.reduce((a,w)=>a+w.temperature,0)/4;v.wear=v.wheels.reduce((a,w)=>a+w.wear,0)/4;v.offroad=offCount>1;v.distance+=v.speed*dt;
 v.energy=clamp(v.energy+dt*(v.brake*.016-v.throttle*.005),0,1);v.fuel=Math.max(0,v.fuel-dt*(.005+v.throttle*.016));
 const gearSpeeds=[0,15,24,33,43,54,65,77,98];if(!v.manual){if(v.speed<.4&&v.throttle<.05)v.gear=0;else{v.gear=Math.max(1,v.gear);if(v.gear<8&&v.speed>gearSpeeds[v.gear]*.94)v.gear++;if(v.gear>1&&v.speed<gearSpeeds[v.gear-1]*.84)v.gear--;}}
 const desiredRPM=clamp(12000*v.speed/gearSpeeds[Math.max(1,v.gear)],4500,12500);v.rpm+=(desiredRPM-v.rpm)*(1-Math.exp(-dt*20));return v;
}
export class LapTimer{
  constructor(length){this.length=length;this.reset(0);}
  reset(s=0){this.previous=s;this.progress=s;this.nextGate=1;this.lap=1;this.elapsed=0;this.totalTime=0;this.best=Infinity;this.valid=true;this.last=null;this.history=[];this.offTime=0;}
  relocate(s){this.previous=s;this.valid=false;}
  update(s,dt,offroad){
    this.elapsed+=dt;
    this.offTime=offroad?this.offTime+dt:0;if(this.offTime>.5)this.valid=false;
    let ds=s-this.previous;if(ds<-this.length/2)ds+=this.length;if(ds>this.length/2)ds-=this.length;
    this.previous=s;
    if(Math.abs(ds)>Math.max(20,dt*120)){this.valid=false;return null;}
    this.progress+=ds;
    // Ordered thirds prevent reset, reversing and finish-line shortcuts from producing a lap.
    const gate=(this.nextGate/3)*this.length;
    if(this.progress>=gate){
      this.nextGate++;
      if((this.nextGate-1)%3===0){
        const result={time:this.elapsed,valid:this.valid,lap:this.lap};
        if(result.valid)this.best=Math.min(this.best,result.time);
        this.last=result;this.history.push(result);this.lap++;this.elapsed=0;this.valid=true;this.offTime=0;
        return result;
      }
    }
    return null;
  }
}
export function solarPosition(hour,day=280,latitude=31.336835,longitude=121.21838){
  const rad=Math.PI/180, b=2*Math.PI*(day-81)/364;
  const equation=9.87*Math.sin(2*b)-7.53*Math.cos(b)-1.5*Math.sin(b);
  const solarHour=hour+(4*(longitude-120)+equation)/60;
  const declination=23.45*rad*Math.sin(2*Math.PI*(284+day)/365);
  const h=(solarHour-12)*15*rad,lat=latitude*rad;
  return {east:-Math.cos(declination)*Math.sin(h),north:Math.cos(lat)*Math.sin(declination)-Math.sin(lat)*Math.cos(declination)*Math.cos(h),up:Math.sin(lat)*Math.sin(declination)+Math.cos(lat)*Math.cos(declination)*Math.cos(h)};
}
