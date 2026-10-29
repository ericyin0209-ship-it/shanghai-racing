// Deterministic visual suspension response to a pit-stop release. Metres / seconds.
// Analytic damped modes sampled from the service clock: pause, replay and low FPS use the same pose.
export const PIT_DROP_TIME=.15,PIT_REAR_DELAY=.02;
export function pitJackHeight(age,rear=false){const t=age-(rear?PIT_REAR_DELAY:0);if(t<=0)return .075;if(t>=PIT_DROP_TIME)return 0;/* fast release, then tyre loading; no ease-in/out hover */const u=t/PIT_DROP_TIME;return .075*(1-u*u);}
function mode(age,amp,decay,hz){return age<=0||age>1.2?0:-amp*Math.exp(-decay*age)*Math.sin(2*Math.PI*hz*age);}
export function pitLanding(state){const t=state?.t,at=state?.dropAtT;if(!Number.isFinite(t)||!Number.isFinite(at))return {front:0,rear:0,heave:0,pitch:0,head:0,age:-1};
 const age=t-at-PIT_DROP_TIME,front=mode(age,.022,11,6.0),rear=mode(age-PIT_REAR_DELAY,.020,10,5.5),head=mode(age,.007,9,4.3);
 return {front,rear,heave:rear+(front-rear)*(1.93/3.6),pitch:-Math.atan2(front-rear,3.6),head,age};}
