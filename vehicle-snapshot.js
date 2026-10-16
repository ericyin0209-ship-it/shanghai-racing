// These are the only wheel fields used by render interpolation. Reuse storage at 120 Hz.
const motionFields=['x','y','z','yaw','yawRate','steer','distance','roll','pitch','speed','bodyVelocity','lateralAcceleration','longitudinalAcceleration'];
const wheelFields=['spin','roadHeight','load','compression'];
export function snapshotVehicle(out,vehicle){
 for(const key of motionFields)out[key]=vehicle[key];
 out.wheels??=[];
 for(let i=0;i<vehicle.wheels.length;i++){
  const wheel=vehicle.wheels[i],previous=out.wheels[i]??(out.wheels[i]={});
  for(const key of wheelFields)previous[key]=wheel[key];
 }
 out.wheels.length=vehicle.wheels.length;return out;
}
export function interpolateWheels(out,previous,current,alpha,replay=false){
 for(let i=0;i<current.length;i++){
  const wheel=current[i],old=previous[i]||wheel,result=out[i]??(out[i]={});
  Object.assign(result,wheel);
  for(const key of wheelFields){const a=Number.isFinite(old[key])?old[key]:wheel[key];result[key]=replay?wheel[key]:a+(wheel[key]-a)*alpha;}
 }
 out.length=current.length;return out;
}
