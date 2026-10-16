// Only wet-weather, simplified recovery and low-speed safety indications are modelled.
export function lightState({active=false,wetness=0,raining=false,speed=0,throttle=0,brake=0,elapsed=0}={}){
 const rain=active&&(raining||wetness>.12),harvesting=active&&speed>5&&(brake>.08||throttle<.08),stopped=active&&speed<20/3.6;
 return {rain,harvesting,stopped,on:(rain||harvesting)&&((elapsed*4)%1<.52),amberOn:stopped&&((elapsed*2)%1<.5)};
}
