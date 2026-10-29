import {solarPosition,clamp} from './physics.js?v=229release';
export const weatherPresets={clear:{cloud:0,wet:0,rain:0},cloudy:{cloud:.40,wet:0,rain:0},overcast:{cloud:.82,wet:0,rain:0},rain:{cloud:.93,wet:.58,rain:.48},storm:{cloud:1,wet:1,rain:1}};
export function weatherLighting(weather,hour){const preset=weatherPresets[weather]||weatherPresets.clear,solar=solarPosition(+hour),day=clamp(solar.up*3,0,1),twilight=clamp((solar.up+.16)*4,0,1),night=1-twilight,dusk=(1-day)*twilight,c=preset.cloud;
 return {...preset,solar,day,twilight,night,dusk,sunIntensity:day*(3.8*Math.pow(1-c,1.8)+.04),hemiIntensity:.54+twilight*(.07+c*.24),moonIntensity:night*(.24-c*.17),environmentIntensity:.72+twilight*.62,exposure:1.16-twilight*.20+dusk*.06,mistDensity:.000012+dusk*(1-c)*.000065+preset.rain*(.00045+preset.rain*.0014),mistHeight:5+preset.rain*7,fogDensity:.000055+c*c*.00020,wind:[1.3+preset.rain*2.6,.5+preset.rain*.7],cloudShadow:c>.1&&c<.75?.55:0};
}

export function weatherMistRGB(s){const day=[.38,.47,.55],night=[.031,.043,.060],warm=[.56,.37,.24];return day.map((v,i)=>{const value=v+(night[i]-v)*s.night;return value+(warm[i]-value)*s.dusk*.45;});}
