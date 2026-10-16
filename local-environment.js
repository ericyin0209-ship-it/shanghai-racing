const HOUR=3600000,KEY='vertex.environment',clockFormats=new Map();
export function weatherFromCode(code,precipitation=0){
 if(!Number.isFinite(precipitation)||precipitation<0||!Number.isInteger(code)||code<0||code>99)throw Error('Invalid weather code');
 if(code>=95||[65,67,82].includes(code)||precipitation>=7.5)return 'storm';
 if([51,53,55,56,57,61,63,66,80,81].includes(code)||precipitation>.1)return 'rain';
 if(code===0)return 'clear';if(code===1||code===2)return 'cloudy';return 'overcast';
}
export function localClock(timestamp=Date.now(),timeZone){
 const opts={year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'};if(timeZone)opts.timeZone=timeZone;
 const date=new Date(timestamp),formatKey=timeZone||'device:'+date.getTimezoneOffset();let formatter=clockFormats.get(formatKey);if(!formatter){try{formatter=new Intl.DateTimeFormat('en-CA',opts);}catch{delete opts.timeZone;formatter=new Intl.DateTimeFormat('en-CA',opts);}if(clockFormats.size>=8)clockFormats.delete(clockFormats.keys().next().value);clockFormats.set(formatKey,formatter);}const parts=formatter.formatToParts(date);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,hour:+p.hour+(+p.minute)/60};
}
export function chooseHourly(previous={},random=Math.random,now=Date.now()){
 const weather=['clear','cloudy','overcast','rain','storm'].filter(w=>w!==previous.weather),hours=[1.5,6.5,9,12.5,17.2,21].filter(h=>h!==previous.hour),pick=a=>a[Math.min(a.length-1,Math.max(0,Math.floor(random()*a.length)))];return {weather:pick(weather),hour:pick(hours),nextAt:now+HOUR};
}
export async function fetchLocalWeather(coords,{fetcher=globalThis.fetch,signal}={}){
 // About kilometre-scale coordinates only. Precise coordinates are never persisted.
 const lat=Math.round(coords.latitude*100)/100,lon=Math.round(coords.longitude*100)/100;if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Invalid location');
 const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:'temperature_2m,weather_code,precipitation',timezone:'auto',forecast_days:'1'});
 const response=await fetcher(url.href,{signal,referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Weather unavailable');const data=await response.json(),c=data.current;if(!c||!Number.isFinite(c.temperature_2m)||!Number.isFinite(c.precipitation))throw Error('Invalid weather data');
 return {weather:weatherFromCode(c.weather_code,c.precipitation),temperature:c.temperature_2m,code:c.weather_code,timeZone:typeof data.timezone==='string'?data.timezone:undefined};
}
export function createLocalEnvironment({storage,now=Date.now,random=Math.random,apply,canApply=()=>true,changed=()=>{},getPosition,fetcher=globalThis.fetch}={}){
 try{storage??=globalThis.localStorage;}catch{}
 let prefs={mode:'auto',consent:false},live=null,coords=null,busy=false,nextFetch=0,lastApplied='',requestId=0,pendingController=null;
 try{const saved=JSON.parse(storage.getItem(KEY)||'null');if(saved&&['auto','hourly','manual'].includes(saved.mode)){prefs={...prefs,mode:saved.mode,consent:saved.consent===true};if(saved.hourly&&['clear','cloudy','overcast','rain','storm'].includes(saved.hourly.weather)&&Number.isFinite(saved.hourly.hour)&&saved.hourly.hour>=0&&saved.hourly.hour<24&&Number.isFinite(saved.hourly.nextAt))prefs.hourly=saved.hourly;}}catch{}
 function persist(){try{storage.setItem(KEY,JSON.stringify(prefs));}catch{}}
 function tick(){
  const time=now();if(!prefs.hourly||time>=prefs.hourly.nextAt){prefs.hourly=chooseHourly(prefs.hourly,random,time);persist();}
  const fresh=prefs.mode==='auto'&&live&&time-live.sampledAt<HOUR,clock=localClock(time,fresh?live.timeZone:undefined),source=prefs.mode==='manual'?'manual':fresh?'live':'hourly';
  const state={mode:prefs.mode,source,clock,busy,temperature:fresh?live.temperature:null,weather:fresh?live.weather:prefs.hourly.weather,hour:fresh?clock.hour:prefs.hourly.hour,nextAt:prefs.hourly.nextAt,weatherCode:fresh?live.code:null};
  const key=[source,state.weather,state.hour].join(':');if(source!=='manual'&&key!==lastApplied&&canApply()){apply?.(state);lastApplied=key;}
  changed(state);if(prefs.mode==='auto'&&coords&&!busy&&time>=nextFetch)void refresh();return state;
 }
 function cancelPending(){requestId++;pendingController?.abort();pendingController=null;busy=false;}
 async function refresh(){
  if(busy||!coords||prefs.mode!=='auto')return;busy=true;const ticket=requestId,controller=new AbortController();pendingController=controller;nextFetch=now()+15*60000;tick();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{const data=await fetchLocalWeather(coords,{fetcher,signal:controller.signal});if(ticket===requestId&&prefs.mode==='auto')live={...data,sampledAt:now()};}
  catch{if(ticket===requestId)nextFetch=now()+5*60000;}
  finally{clearTimeout(timeout);if(ticket===requestId){pendingController=null;busy=false;tick();}}
 }
 async function locate(){
  if(busy)return;cancelPending();prefs.mode='auto';prefs.consent=true;persist();busy=true;const ticket=requestId;changed({...tick(),busy:true});
  try{const position=await getPosition();if(ticket!==requestId)return;coords={latitude:Math.round(position.coords.latitude*100)/100,longitude:Math.round(position.coords.longitude*100)/100};busy=false;nextFetch=0;await refresh();}catch{if(ticket===requestId){coords=null;live=null;busy=false;tick();}}
 }
 return {tick,locate,get consent(){return prefs.consent;},setMode(mode){if(!['auto','hourly','manual'].includes(mode))return;cancelPending();prefs.mode=mode;if(mode==='auto')nextFetch=0;lastApplied='';persist();tick();}};
}
