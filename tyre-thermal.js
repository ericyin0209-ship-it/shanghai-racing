const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function tyreOperatingRange(compound){return compound==='wet'?[55,75]:compound==='intermediate'?[65,85]:[80,100];}
// Two thermal masses, SI power balance. Coefficients are simulator estimates,
// not proprietary Pirelli measurements. Pressure is displayed in psi.
export function conditionTyres(vehicle){
 const compound=vehicle.setup.compound;
 const temperature=compound==='wet'?55:compound==='intermediate'?60:70;
 for(const w of vehicle.wheels){w.temperature=w.carcassTemperature=temperature;w.pressure=vehicle.setup.pressure+(temperature-28)*.025;}
 vehicle.temperature=temperature;
}
export function stepTyreThermal(w,{speed,ambient=20,wetness=0,dt,basePressure=24}){
 const core=Number.isFinite(w.carcassTemperature)?w.carcassTemperature:w.temperature;
 const v=Math.max(0,speed),wet=clamp(wetness,0,1),load=Math.max(0,w.load);
 const slipWork=(Math.abs(w.forceX*v*Math.sin(w.slipAngle))+Math.abs(w.forceZ*v*w.slipRatio))*.43;
 const rolling=load*v*.008;
 const coupling=(w.temperature-core)*24;
 const air=(w.temperature-ambient)*(7+v*.22+wet*v*.31);
 const road=(w.temperature-(ambient+12*(1-wet)))*(w.contact?13:0);
 const surfaceRate=(slipWork+rolling-coupling-air-road)/2600;
 const brakeLeak=(w.brakeTemperature-core)*1.3;
 w.temperature=clamp(w.temperature+surfaceRate*dt,ambient,150);
 w.carcassTemperature=clamp(core+(coupling+brakeLeak-(core-ambient)*7)*dt/15000,ambient,140);
 w.pressure=basePressure+(w.carcassTemperature-28)*.025;
 return w;
}
