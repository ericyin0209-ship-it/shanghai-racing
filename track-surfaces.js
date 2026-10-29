// preview.27: one surface layout shared by everything that draws or drives on the verge. Before this, the kerb modules,
// the T1-T2 run-off, the corner run-off/gravel strips and the 11-16 m grey band were drawn in four modules, while
// physics treated everything beyond 8.35 m as grass (0.38 grip) and the kerb crown ran the whole lap.
// Bands per side, by offset from the centreline (m); visual references in each drawing module.
//   0-7.2 track asphalt | 7.2-8.35 kerb (corners) or flat grey shoulder (straights, photos 09/10)
//   8.35-11 grass verge  | 11-16 paved run-off (drawn grey on the whole lap) | 16-19 grass to the barrier line
//   corners: 8.5-11.4 paved run-off, 11.4-16.7 gravel (photo 01) | T1/T2: their own layers below (photos 01/02/07)
// Grip factors are estimates for relative behaviour, not measured friction coefficients.
export const SURFACE_VERSION=2;
// Lap records made with this layout are kept apart from older records (old ones stay readable under the old entry).
export const LAP_MAP={id:'shanghai-international-circuit-surface-v2',name:'上海国际赛车场 · 表面数据 v2'};
export const SURFACE_GRIP={asphalt:1,kerb:1,shoulder:.96,runoff:.9,paint:.86,gravel:.3,grass:.38};
export const SURFACE_WET_GRIP={paint:.62,kerb:.88};
export const LOOSE_SURFACES=new Set(['gravel','grass']);
export const RUNOFF_T12={s0:95,s1:565};
// [side, s0, s1, inner, outer, type]; side +1 is the outside of the right-hand T1, -1 the outside of the left-hand T2
export const T12_LAYERS=[[1,230,445,8.55,12.2,'paint'],[1,95,230,8.55,15.6,'runoff'],[1,230,445,12.2,15.6,'runoff'],[-1,450,565,8.55,14.2,'runoff'],[1,95,445,15.6,18.6,'gravel'],[-1,450,565,14.2,18.6,'gravel']];
export function createSurfaceMap(track,pit=null){
 const {length,n,frames,curvatures}=track;
 // kerb modules: 1 m pieces; a module is a corner if curvature within +-18 samples exceeds 0.0055, short gaps merged
 const modules=Math.round(length),corner=new Uint8Array(modules),cn=curvatures.length;
 for(let i=0;i<modules;i++){const c=Math.round(i/length*cn);let k=0;for(let j=-18;j<=18;j++)k=Math.max(k,curvatures[(c+j+cn)%cn]);corner[i]=k>.0055?1:0;}
 for(let pass=0;pass<2;pass++)for(let i=0;i<modules;i++)if(!corner[i]){let a=i;while(a<modules&&!corner[a])a++;if(a-i<25)for(let j=i;j<a;j++)corner[j]=1;i=a;}
 // preview.28: side-aware; the right-side kerb is left out where the pit entry/exit road crosses the kerb band
 const kerbAt=(s,side=0)=>{const i=((Math.floor(s)%modules)+modules)%modules;return corner[i]===1&&!(side<0&&pit?.kerbClear.has(i));};
 // corner run-off runs on the outside of corners (sample indices on track.n), excluding T1-T2
 const runs=[];let run=null;for(let i=0;i<n;i+=4){const t=frames[i].t,after=frames[(i+6)%n].t,turn=t.z*after.x-t.x*after.z,outer=turn>0?-1:1,isCorner=curvatures[i]>=.0032;if(isCorner&&run&&run.outer===outer&&i-run.end<=8){run.end=i+4;}else if(isCorner){if(run)runs.push(run);run={start:i,end:i+4,outer};}}if(run)runs.push(run);
 const inT12=r=>{const mid=(r.start+r.end)/2*length/n;return mid>RUNOFF_T12.s0&&mid<RUNOFF_T12.s1;};
 const cornerRuns=runs.filter(r=>r.end-r.start>=12&&!inT12(r)).map(r=>({...r,from:Math.max(0,r.start-4),to:Math.min(n,r.end+4)}));
 // ribbons span frames [from,to]; index by floor so the run ends where the drawn strip ends
 const cornerSide=new Int8Array(n);for(const r of cornerRuns)for(let i=r.from;i<Math.min(n,r.to);i++)cornerSide[i]=r.outer;
 const wrapS=s=>((s%length)+length)%length;
 function typeAt(s,offset){
  const a=Math.abs(offset),side=Math.sign(offset)||1;s=wrapS(s);
  if(a<=7.2)return 'asphalt';
  if(a<8.35)return kerbAt(s,side)?'kerb':'shoulder';
  if(s>RUNOFF_T12.s0&&s<RUNOFF_T12.s1)for(const [ls,s0,s1,lo,hi,type] of T12_LAYERS)if(ls===side&&s>=s0&&s<=s1&&a>=lo&&a<hi)return type;
  const i=Math.min(n-1,Math.floor(s/length*n));
  if(cornerSide[i]===side){if(a>=8.5&&a<11.4)return 'runoff';if(a>=11.4&&a<16.7)return 'gravel';}
  if(a>=11&&a<16)return 'runoff';
  return 'grass';
 }
 function grip(type,wet=0){const g=SURFACE_GRIP[type]??1,w=SURFACE_WET_GRIP[type];return w==null?g:g*(1-wet)+g*w*wet;}
 return {version:SURFACE_VERSION,kerbAt,typeAt,grip,cornerRuns,kerbModules:corner};
}
