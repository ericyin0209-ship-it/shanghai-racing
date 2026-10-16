const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Lumped thermal energy balance. Capacities/duct coefficients are simulator estimates.
export function stepBrakeThermal(w,{force=0,speed=0,front=true,ambient=20,dt=0}={}){
 const temperature=w.brakeTemperature??ambient,capacity=front?1700:1450;
 const heat=Math.max(0,force)*Math.max(0,speed)*.86;
 const convection=(9+Math.max(0,speed)*.65)*(temperature-ambient);
 const radiation=5.670374419e-8*.78*.21*((temperature+273.15)**4-(ambient+273.15)**4);
 w.brakeTemperature=clamp(temperature+(heat-convection-radiation)*Math.max(0,dt)/capacity,ambient,1300);
 return w.brakeTemperature;
}
export function brakeGlow(temperature){const hot=clamp((temperature-520)/650,0,1);return hot*hot*4.5;}
