// Never include a build version or a display name in these persistent keys/IDs.
export const PROFILE_KEY='vertex.driverArchive';
export const PROFILE_BACKUP_KEY='vertex.driverArchive.backup';
export const CURRENT_MAP={id:'shanghai-international-circuit',name:'上海国际赛车场'};
export const CURRENT_CAR={id:'aston-martin-amr23',name:'Aston Martin AMR23'};
const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const finite=(n,max=1e12)=>Number.isFinite(n)&&n>=0&&n<=max;
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const clone=value=>JSON.parse(JSON.stringify(value));
function blank(date){return {format:'vertex-driver-archive',schema:1,firstPlayedAt:date,replicas:{}};}
export function validateProfile(value){
 if(!value||value.format!=='vertex-driver-archive'||value.schema!==1||!iso(value.firstPlayedAt)||!value.replicas||typeof value.replicas!=='object'||Array.isArray(value.replicas))throw Error('Invalid archive');
 const out=blank(new Date(value.firstPlayedAt).toISOString());const entries=Object.entries(value.replicas);if(entries.length>10000)throw Error('Archive too large');
 for(const [id,r] of entries){
  if(!safeId(id)||!r||!finite(r.playSeconds)||!r.maps||!r.cars||typeof r.maps!=='object'||typeof r.cars!=='object'||Array.isArray(r.maps)||Array.isArray(r.cars)||Object.keys(r.maps).length>1000||Object.keys(r.cars).length>1000)throw Error('Invalid counters');
  const copy={playSeconds:r.playSeconds,maps:{},cars:{}};
  for(const [key,m]of Object.entries(r.maps)){
   if(!m||!safeId(key)||!Number.isSafeInteger(m.laps)||m.laps<0||!Number.isSafeInteger(m.validLaps)||m.validLaps<0||m.validLaps>m.laps||!(m.bestSeconds===null||finite(m.bestSeconds)&&m.bestSeconds>0))throw Error('Invalid map');
   copy.maps[key]={name:String(m.name).slice(0,100),laps:m.laps,validLaps:m.validLaps,bestSeconds:m.bestSeconds};
  }
  for(const [key,c]of Object.entries(r.cars)){if(!c||!safeId(key)||!finite(c.metres))throw Error('Invalid car');copy.cars[key]={name:String(c.name).slice(0,100),metres:c.metres};}
  out.replicas[id]=copy;
 }
 return out;
}
const best=(a,b)=>a==null?b:b==null?a:Math.min(a,b);
// Monotonic per-launch counters make repeated backup imports idempotent.
export function mergeProfiles(a,b){
 const out=clone(a);if(Date.parse(b.firstPlayedAt)<Date.parse(out.firstPlayedAt))out.firstPlayedAt=b.firstPlayedAt;
 for(const [id,r]of Object.entries(b.replicas)){
  const target=out.replicas[id]??={playSeconds:0,maps:{},cars:{}};target.playSeconds=Math.max(target.playSeconds,r.playSeconds);
  for(const [key,m]of Object.entries(r.maps)){const old=target.maps[key];target.maps[key]=old?{name:m.name,laps:Math.max(old.laps,m.laps),validLaps:Math.max(old.validLaps,m.validLaps),bestSeconds:best(old.bestSeconds,m.bestSeconds)}:clone(m);}
  for(const [key,c]of Object.entries(r.cars)){const old=target.cars[key];target.cars[key]={name:c.name,metres:Math.max(old?.metres||0,c.metres)};}
 }
 return out;
}
export function summarizeProfile(profile){
 const result={firstPlayedAt:profile.firstPlayedAt,playSeconds:0,maps:{},cars:{}};
 for(const r of Object.values(profile.replicas)){
  result.playSeconds+=r.playSeconds;
  for(const [key,m]of Object.entries(r.maps)){const v=result.maps[key]??={name:m.name,laps:0,validLaps:0,bestSeconds:null};v.laps+=m.laps;v.validLaps+=m.validLaps;v.bestSeconds=best(v.bestSeconds,m.bestSeconds);}
  for(const [key,c]of Object.entries(r.cars)){const v=result.cars[key]??={name:c.name,metres:0};v.metres+=c.metres;}
 }
 return result;
}
export function createPlayerProfile({storage,now=()=>new Date().toISOString(),id=globalThis.crypto?.randomUUID?.()||'run-'+Date.now()+'-'+Math.random().toString(36).slice(2)}={}){
 let warning=false;try{storage??=globalThis.localStorage;}catch{warning=true;}let profile=blank(now());const local={playSeconds:0,maps:{},cars:{}};
 function read(key){try{const text=storage.getItem(key);return text?validateProfile(JSON.parse(text)):null;}catch{warning=true;return null;}}
 const primary=read(PROFILE_KEY),backup=primary?null:read(PROFILE_BACKUP_KEY);if(primary)profile=mergeProfiles(profile,primary);else if(backup)profile=mergeProfiles(profile,backup);
 // Preserve an unreadable record before attempting any fresh save.
 if(!primary)try{const raw=storage.getItem(PROFILE_KEY);if(raw)storage.setItem(PROFILE_KEY+'.unreadable',raw);}catch{warning=true;}
 let dirty=true,lastSavedRaw=null,lastMap=null,lastCar=null;
 function absorbOwn(){
  const previous=profile.replicas[id];if(!previous||previous===local)return;
  local.playSeconds=Math.max(local.playSeconds,previous.playSeconds);
  for(const [key,m]of Object.entries(previous.maps)){
   const old=local.maps[key];if(!old)local.maps[key]={...m};
   else{old.laps=Math.max(old.laps,m.laps);old.validLaps=Math.max(old.validLaps,m.validLaps);old.bestSeconds=best(old.bestSeconds,m.bestSeconds);}
  }
  for(const [key,c]of Object.entries(previous.cars)){const old=local.cars[key];if(old)old.metres=Math.max(old.metres,c.metres);else local.cars[key]={...c};}
 }
 function own(){profile.replicas[id]=local;}
 function register(map=CURRENT_MAP,car=CURRENT_CAR){
  if(!safeId(map.id)||!safeId(car.id))throw Error('Invalid identity');
  if(!local.maps[map.id]){local.maps[map.id]={name:map.name,laps:0,validLaps:0,bestSeconds:null};dirty=true;}
  if(!local.cars[car.id]){local.cars[car.id]={name:car.name,metres:0};dirty=true;}
  lastMap=map;lastCar=car;own();
 }
 function save(){
  try{
   const previous=storage.getItem(PROFILE_KEY);
   if(!dirty&&previous===lastSavedRaw)return true;
   let validPrevious=previous===lastSavedRaw&&previous!==null;
   if(previous&&!validPrevious){try{const latest=validateProfile(JSON.parse(previous));profile=mergeProfiles(profile,latest);absorbOwn();validPrevious=true;}catch{warning=true;}}
   own();const serialized=JSON.stringify(profile);
   if(serialized!==previous){
    // A full backup must not prevent saving current progress when storage is full.
    if(validPrevious)try{storage.setItem(PROFILE_BACKUP_KEY,previous);}catch{warning=true;}
    storage.setItem(PROFILE_KEY,serialized);
   }
   lastSavedRaw=serialized;dirty=false;return true;
  }catch{warning=true;return false;}
 }
 register();save();
 return {register,get warning(){return warning;},play(seconds){if(finite(seconds,30)&&seconds>0){local.playSeconds+=seconds;dirty=true;}},drive(metres,map=CURRENT_MAP,car=CURRENT_CAR){if(!finite(metres,100)||metres===0)return;if(map!==lastMap||car!==lastCar)register(map,car);local.cars[car.id].metres+=metres;dirty=true;},lap(result,map=CURRENT_MAP){register(map);if(!finite(result.time)||result.time<=0)return;const m=local.maps[map.id];m.laps++;dirty=true;if(result.valid){m.validLaps++;m.bestSeconds=best(m.bestSeconds,result.time);}save();},save,snapshot(){own();return summarizeProfile(profile);},export(){save();return JSON.stringify(profile,null,2);},import(text){if(text.length>8e6)throw Error('Archive too large');const incoming=validateProfile(JSON.parse(text));profile=mergeProfiles(profile,incoming);absorbOwn();own();dirty=true;save();return summarizeProfile(profile);}};
}
