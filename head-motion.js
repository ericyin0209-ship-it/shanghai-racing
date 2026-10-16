const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Exact critically damped response: stable across render rates, without overshoot.
function follow(s,target,dt,frequency){if(dt===0)return;const offset=s.value-target,k=s.velocity+frequency*offset,decay=Math.exp(-frequency*dt);s.value=target+(offset+k*dt)*decay;s.velocity=(s.velocity-frequency*k*dt)*decay;}
export function createHeadMotion(){const turn={value:0,velocity:0},lean={value:0,velocity:0};return {reset(){turn.value=turn.velocity=lean.value=lean.velocity=0;},update(dt,{yawRate=0,roll=0}={}){dt=clamp(dt,0,.25);follow(turn,clamp(yawRate*.26,-.10,.10),dt,18);follow(lean,-roll*.25,dt,15);return {turn:turn.value,lean:lean.value};}};}
