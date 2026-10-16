const fields=['sessionTime','lapTime','rollVelocity','pitchVelocity','energy','fuel','x','y','z','speed','steer','rpm','yawRate','lateralSpeed','roll','pitch','distance','bodyVelocity','floorContact','downforce','slip','throttle','brake','deliveredThrottle','longitudinalAcceleration','lateralAcceleration','temperature','wear'];
const wheelFields=['spin','omega','roadHeight','compression','load','slipRatio','slipAngle','temperature','carcassTemperature','pressure','brakeTemperature'];
export function interpolateReplayFrame(a,b,u){
 const frame=structuredClone(a),blend=Math.max(0,Math.min(1,u));
 for(const key of fields)if(Number.isFinite(a[key])&&Number.isFinite(b[key]))frame[key]=a[key]+(b[key]-a[key])*blend;
 frame.yaw=a.yaw+Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*blend;
 frame.wheels.forEach((wheel,i)=>{for(const key of wheelFields)if(Number.isFinite(a.wheels[i]?.[key])&&Number.isFinite(b.wheels[i]?.[key]))wheel[key]=a.wheels[i][key]+(b.wheels[i][key]-a.wheels[i][key])*blend;});
 return frame;
}
