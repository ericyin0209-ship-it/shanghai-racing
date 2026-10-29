import {clamp,wrap} from './physics.js?v=229release';
import {BRIDGE_Z} from './main-straight.js?v=229release';
// Crown, kerb profile and joints are engineering approximations. No surveyed elevation is available.
// preview.27: the crowned kerb only exists where a kerb is painted (track-surfaces.js); straights have a flat shoulder.
let kerbAt=()=>true;export function setKerbMask(fn){kerbAt=fn;}
export function surfaceHeight(s,offset,length){
 const a=Math.abs(offset),road=.035+Math.max(0,1-(a/7.2)**2)*.018;
 const grain=Math.sin(s*2.13)*.00065+Math.sin(s*5.17+offset)*.0003;
 if(a>7.2&&a<8.35){if(!kerbAt(s,Math.sign(offset)))return .035+grain;const u=(a-7.2)/1.15;return .035+Math.sin(u*Math.PI)*.047+Math.sin(s*7.6)**2*.012;}
 if(a>8.35)return .025+grain;
 return road+grain;
}
// preview.27: the two cross-track bridges (145 x 32 m lens, ellipse 73 x 17 m as used by the rain shelter in weather-rain.js)
// keep the road below them damp rather than flooded; the road shaders read the same cover through bridgeCoverGLSL.
export function bridgeCover(x,z){let e=9;for(const bz of BRIDGE_Z)e=Math.min(e,(x/73)**2+((z-bz)/17)**2);const u=clamp((e-.7)/.3,0,1);return 1-u*u*(3-2*u);}
export const bridgeCoverGLSL=`float bridgeCover(vec2 p){float e=9.;${BRIDGE_Z.map(z=>`e=min(e,pow(p.x/73.,2.)+pow((p.y-(${z.toFixed(1)}))/17.,2.));`).join('')}return 1.-smoothstep(.7,1.,e);}`;
export const BRIDGE_DRY=.65;
export function waterAt(s,offset,wet,length){
 const pockets=.5+.5*Math.sin(s*.039+Math.sin(s*.013)*2)*Math.sin(offset*1.7+s*.011);
 // preview.27: the crown sheds water outward, so standing water collects in the last ~3 m before each edge and the pocket
 // pattern only modulates that band; the same expression runs in the road and wet-reflection shaders (world.js, wet-reflection.js)
 const u=clamp((Math.abs(offset)-4.2)/2.8,0,1),drain=u*u*(3-2*u),standing=drain*(.45+.55*pockets),rubber=Math.exp(-(((offset-2*Math.sin(s*.008))/1.7)**2));
 const depth=wet*wet*(.0003+.0040*standing*standing);
 return {wetness:clamp(wet*(.70+.30*standing),0,1),depth,rubber,gripScale:1-wet*.12*rubber};
}
