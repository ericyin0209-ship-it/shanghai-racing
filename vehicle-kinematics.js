// Shared SI-unit steering geometry for contact forces and visible wheel pivots.
export function wheelAngles(steer,wheelbase=3.6,trackWidth=1.665){
 if(!Number.isFinite(steer)||Math.abs(steer)<1e-7)return {left:0,right:0};
 const radius=wheelbase/Math.tan(Math.min(1.2,Math.abs(steer)));
 const inner=Math.atan2(wheelbase,Math.max(.2,radius-trackWidth/2));
 const outer=Math.atan2(wheelbase,radius+trackWidth/2);
 return steer>0?{left:inner,right:outer}:{left:-outer,right:-inner};
}
export function relaxContactAngle(previous,target,speed,dt,length=.28){
 const response=-Math.expm1(-Math.max(2,Math.abs(speed))*dt/length);
 return (Number.isFinite(previous)?previous:0)+(target-(Number.isFinite(previous)?previous:0))*response;
}
