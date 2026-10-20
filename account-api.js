// Small REST adapter; passwords are sent to Supabase over HTTPS and never persisted.
export class AccountError extends Error {constructor(code,status=0){super(code);this.code=code;this.status=status;}}
export function createAccountAPI(config,{storage=globalThis.localStorage,fetcher=globalThis.fetch,location=globalThis.location,history=globalThis.history,crypto=globalThis.crypto}={}){
 const origin=config.supabaseUrl?.replace(/\/$/,'')||'';
 const configured=/^https:\/\/[^/]+$/.test(origin)&&!!config.publishableKey&&!/^sb_secret_/.test(config.publishableKey);
 // Reject the older JWT service-role key too: it must never be a browser credential.
 let privileged=false;try{privileged=JSON.parse(atob(config.publishableKey.split('.')[1])).role==='service_role';}catch{}
 const enabled=configured&&!privileged;
 const sessionKey='vertex.auth.'+origin,pkceKey=sessionKey+'.pkce';let refreshJob=null;
 function load(){try{return JSON.parse(storage.getItem(sessionKey)||'null');}catch{return null;}}
 function save(value){if(value)storage.setItem(sessionKey,JSON.stringify(value));else storage.removeItem(sessionKey);}
 async function request(path,{method='GET',body,token,headers={}}={}){
  if(!enabled)throw new AccountError('unavailable');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetcher(origin+path,{method,signal:controller.signal,cache:'no-store',headers:{apikey:config.publishableKey,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body?JSON.stringify(body):undefined});let data=null;try{data=await response.json();}catch{}
   if(!response.ok)throw new AccountError(data?.error_code||data?.code||'request_failed',response.status);return data;
  }catch(e){if(e instanceof AccountError)throw e;throw new AccountError('network');}finally{clearTimeout(timeout);}
 }
 function keep(data){if(!data?.access_token||!data?.refresh_token)throw new AccountError('invalid_session');const session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600),user:data.user};save(session);return session;}
 async function session(){const stored=load();if(!stored?.access_token)return null;if(stored.expires_at>Date.now()/1000+90)return stored;
  if(!refreshJob)refreshJob=(async()=>{const refresh=async()=>{const latest=load();if(!latest)return null;if(latest.expires_at>Date.now()/1000+90)return latest;try{return keep(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:latest.refresh_token}}));}catch(e){if(e.status===400||e.status===401)save(null);throw e;}};return globalThis.navigator?.locks?globalThis.navigator.locks.request(sessionKey,refresh):refresh();})().finally(()=>refreshJob=null);return refreshJob;
 }
 const redirect=()=>{const url=new URL(location.href);url.search='';url.hash='';return url.href;};
 const base64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 async function challenge(maxAge=600000){const verifier=base64(crypto.getRandomValues(new Uint8Array(48)));const hashed=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));storage.setItem(pkceKey,JSON.stringify({verifier,created:Date.now(),maxAge}));return hashed;}
 async function callback(){const url=new URL(location.href);if(!url.searchParams.has('code')&&!url.searchParams.has('error'))return null;const code=url.searchParams.get('code'),error=url.searchParams.get('error');for(const key of ['code','error','error_description','error_code'])url.searchParams.delete(key);history.replaceState(null,'',url.href);const raw=storage.getItem(pkceKey);storage.removeItem(pkceKey);if(error)throw new AccountError('oauth_cancelled');let flow;try{flow=JSON.parse(raw);}catch{}if(!code||!flow?.verifier||Date.now()-flow.created>(flow.maxAge||600000))throw new AccountError('expired_callback');return keep(await request('/auth/v1/token?grant_type=pkce',{method:'POST',body:{auth_code:code,code_verifier:flow.verifier}}));}
 return {enabled,sessionKey,load,session,callback,
  async login(email,password){if(!config.emailEnabled)throw new AccountError('unavailable');return keep(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}));},
  async signup(email,password){if(!config.emailEnabled)throw new AccountError('unavailable');const hash=await challenge(86400000);const data=await request('/auth/v1/signup?redirect_to='+encodeURIComponent(redirect()),{method:'POST',body:{email,password,code_challenge:hash,code_challenge_method:'s256'}});return data?.access_token?keep(data):null;},
  async oauth(name){const provider=config.providers?.[name];if(!enabled||!provider?.enabled||!provider.provider)throw new AccountError('unavailable');const hash=await challenge();const url=new URL(origin+'/auth/v1/authorize');url.search=new URLSearchParams({provider:provider.provider,redirect_to:redirect(),code_challenge:hash,code_challenge_method:'s256'});location.assign(url.href);},
  async recover(email){const hash=await challenge(86400000);const url=new URL(redirect());url.searchParams.set('vertex_recovery','1');await request('/auth/v1/recover?redirect_to='+encodeURIComponent(url.href),{method:'POST',body:{email,code_challenge:hash,code_challenge_method:'s256'}});},
  async updatePassword(password){const s=await session();if(!s)throw new AccountError('session_expired');return request('/auth/v1/user',{method:'PUT',token:s.access_token,body:{password}});},
  async logout(){const s=load();save(null);storage.removeItem(pkceKey);if(s)try{await request('/auth/v1/logout?scope=local',{method:'POST',token:s.access_token});}catch{/* Local logout still completes offline. */}},
  async user(){const s=await session();if(!s)return null;return request('/auth/v1/user',{token:s.access_token});},
  async readProfile(id){const s=await session();if(!s||s.user?.id!==id)throw new AccountError('session_expired');const rows=await request('/rest/v1/vertex_profiles?id=eq.'+encodeURIComponent(id)+'&select=*',{token:s.access_token});return rows?.[0]||null;},
  async writeProfile(id,revision,payload){const s=await session();if(!s||s.user?.id!==id)throw new AccountError('session_expired');const rows=await request(revision===null?'/rest/v1/vertex_profiles':'/rest/v1/vertex_profiles?id=eq.'+encodeURIComponent(id)+'&revision=eq.'+revision,{method:revision===null?'POST':'PATCH',token:s.access_token,headers:{Prefer:'return=representation'},body:revision===null?{id,...payload,revision:1}:{...payload,revision:revision+1}});return rows?.[0]||null;}
 };
}
