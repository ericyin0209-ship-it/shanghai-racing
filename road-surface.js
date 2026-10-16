import {clamp,wrap} from './physics.js';
// Crown, kerb profile and joints are engineering approximations. No surveyed elevation is available.
export function surfaceHeight(s,offset,length){
 const a=Math.abs(offset),road=.035+Math.max(0,1-(a/7.2)**2)*.018;
 const grain=Math.sin(s*2.13)*.00065+Math.sin(s*5.17+offset)*.0003;
 if(a>7.2&&a<8.35){const u=(a-7.2)/1.15;return .035+Math.sin(u*Math.PI)*.047+Math.sin(s*7.6)**2*.012;}
 if(a>8.35)return .025+grain;
 return road+grain;
}
export function waterAt(s,offset,wet,length){
 const pockets=.5+.5*Math.sin(s*.039+Math.sin(s*.013)*2)*Math.sin(offset*1.7+s*.011);
 const edge=clamp((Math.abs(offset)-3)/4,0,1),rubber=Math.exp(-(((offset-2*Math.sin(s*.008))/1.7)**2));
 const depth=wet*wet*(.0003+.0028*pockets*pockets+.0015*edge);
 return {wetness:clamp(wet*(.65+.35*pockets),0,1),depth,rubber,gripScale:1-wet*.12*rubber};
}
