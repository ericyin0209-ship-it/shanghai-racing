// Arc instrument for the driving HUD. Draws only when a displayed value changes,
// at most at the HUD rate (30 Hz), into the existing #speed-dial canvas.
const TAU=Math.PI*2,START=Math.PI*.80,SWEEP=Math.PI*1.40,MAX_SPEED=360;
export function createHudGauge(canvas){
 if(!canvas)return {draw(){}};
 const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,cx=W/2,cy=H*.56,R=H*.42;
 let last='';
 // Static layer: ticks and labels are drawn once and reused.
 const base=document.createElement('canvas');base.width=W;base.height=H;
 {const b=base.getContext('2d');b.lineCap='round';
  b.strokeStyle='#ffffff12';b.lineWidth=14;b.beginPath();b.arc(cx,cy,R,START,START+SWEEP);b.stroke();
  for(let v=0;v<=MAX_SPEED;v+=10){const a=START+SWEEP*v/MAX_SPEED,major=v%50===0,r0=R-(major?26:20),r1=R-14;
   b.strokeStyle=major?'#cfe9df99':'#9fb9b044';b.lineWidth=major?2.4:1.2;b.beginPath();b.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);b.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);b.stroke();
}
 }
 const speedGradient=c.createLinearGradient(cx-R,0,cx+R,0);speedGradient.addColorStop(0,'#2fd3a6');speedGradient.addColorStop(.62,'#b8f36a');speedGradient.addColorStop(1,'#ffd25e');
 const segments=15;
 function segColour(i){return i<6?'#3df28f':i<11?'#ff4155':'#5aa8ff';}
 return {draw(v){
  const kmh=Math.max(0,(v.speed||0)*3.6),rpm=v.rpm||4500,gear=v.gear||0,thr=v.throttle||0,brk=v.brake||0,limiter=!!v.pitLimiter;
  const lit=Math.round(Math.max(0,Math.min(1,(rpm-6500)/5800))*segments);
  const key=Math.round(kmh)+':'+lit+':'+gear+':'+Math.round(thr*20)+':'+Math.round(brk*20)+':'+limiter;
  if(key===last)return;last=key;
  c.clearRect(0,0,W,H);c.drawImage(base,0,0);c.lineCap='round';
  // speed arc with a soft glow, one blurred stroke only
  const end=START+SWEEP*Math.min(1,kmh/MAX_SPEED);
  if(kmh>.5){c.save();c.shadowColor='#7dffb8';c.shadowBlur=14;c.strokeStyle=speedGradient;c.lineWidth=10;c.beginPath();c.arc(cx,cy,R,START,end);c.stroke();c.restore();
   c.fillStyle='#ffffff';c.beginPath();c.arc(cx+Math.cos(end)*R,cy+Math.sin(end)*R,5,0,TAU);c.fill();}
  // shift lights across the top
  const sw=W*.042,gap=W*.012,total=segments*sw+(segments-1)*gap,x0=cx-total/2,y0=10;
  for(let i=0;i<segments;i++){const on=i<lit,x=x0+i*(sw+gap);c.fillStyle=on?segColour(i):'#ffffff10';if(on&&lit>=segments-1&&Math.floor(performance.now()/90)%2)c.fillStyle='#d6e8ff';c.beginPath();c.roundRect(x,y0,sw,9,3);c.fill();}
  // throttle / brake inner arcs
  const ri=R-62;c.lineWidth=5;
  c.strokeStyle='#ffffff10';c.beginPath();c.arc(cx,cy,ri,Math.PI*.95,Math.PI*1.40);c.stroke();c.beginPath();c.arc(cx,cy,ri,Math.PI*1.60,Math.PI*2.05);c.stroke();
  if(brk>.01){c.strokeStyle='#ff4d5e';c.beginPath();c.arc(cx,cy,ri,Math.PI*1.40-Math.PI*.45*brk,Math.PI*1.40);c.stroke();}
  if(thr>.01){c.strokeStyle='#5cf2a2';c.beginPath();c.arc(cx,cy,ri,Math.PI*1.60,Math.PI*1.60+Math.PI*.45*thr);c.stroke();}
  // gear
  c.textAlign='center';c.textBaseline='middle';c.fillStyle=limiter?'#ffc94a':'#eafff4';c.font='700 54px ui-monospace,Menlo,monospace';c.fillText(gear?String(gear):'N',cx,cy+4);
  c.font='600 12px ui-monospace,Menlo,monospace';c.fillStyle='#8fb3a8';c.fillText(limiter?'PIT LIMIT':'GEAR',cx,cy-40);
 }};
}
