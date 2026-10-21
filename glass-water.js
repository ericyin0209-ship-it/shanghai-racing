import * as THREE from 'three';
// Individual impacts accumulate and coalesce; heavy beads accelerate under gravity and leave narrow wet trails.
export function createGlassWater(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=320;const ctx=canvas.getContext('2d'),image=ctx.createImageData(1024,320),texture=new THREE.CanvasTexture(canvas);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
 const drops=[],trails=[];let strength=0,clock=0,spawn=0;
 const add=()=>drops.push({x:Math.random()*1024,y:Math.random()*320,r:.55+Math.random()*1.7,v:0,seed:Math.random()*8,age:0,pin:.6+Math.random()*2.7});
 function paint(){const data=image.data;for(let i=0;i<data.length;i+=4){data[i]=data[i+1]=128;data[i+2]=255;data[i+3]=255;}function pixel(x,y,nx,ny){x=Math.floor(x);y=Math.floor(y);if(x<0||x>=1024||y<0||y>=320)return;const i=(y*1024+x)*4;data[i]=128+nx*105;data[i+1]=128+ny*105;data[i+2]=220;}
 for(const t of trails)for(let y=Math.floor(t.y0);y<t.y1;y++)for(let x=Math.floor(t.x-1);x<=t.x+1;x++)pixel(x,y,(x-t.x)*t.life*.35,0);
 for(const d of drops){const r=d.r;for(let y=Math.floor(d.y-r*1.45);y<=d.y+r*1.45;y++)for(let x=Math.floor(d.x-r);x<=d.x+r;x++){const nx=(x-d.x)/r,ny=(y-d.y)/(r*1.45),q=nx*nx+ny*ny;if(q<1)pixel(x,y,nx*.8,ny*.8);}}
 ctx.putImageData(image,0,0);texture.needsUpdate=true;}
 function setRain(value){strength=value;if(value>0&&drops.length===0){for(let i=0;i<380;i++)add();}paint();}
 function update(dt){if(strength<=0&&drops.length===0&&trails.length===0)return;clock+=dt;if(clock<.05)return;const step=Math.min(clock,.12);clock=0;spawn+=step*strength*65;while(spawn>=1){spawn--;if(drops.length<600)add();}for(const d of drops){d.age+=step;if(d.r>2.5||d.r>1.7&&d.age>d.pin)d.v=Math.min(90,d.v+step*30*d.r);const old=d.y;d.y+=d.v*step;d.x+=Math.sin(d.seed+d.y*.028)*d.v*step*.035;if(d.v>8)trails.push({x:d.x,y0:old,y1:d.y,life:1});if(d.y>325){if(strength>0){d.y=-4;d.r=.7+Math.random();d.v=0;d.age=0;}else d.r=0;}d.r+=step*(strength>0?strength*.018:-.028);if(d.r<.35)d.r=0;}
 // Spatial bins make merging stable without a quadratic all-pairs pass.
 const bins=new Map();for(const d of drops){if(d.r<=0)continue;const bx=Math.floor(d.x/8),by=Math.floor(d.y/8);for(let y=by-1;y<=by+1;y++)for(let x=bx-1;x<=bx+1;x++)for(const other of bins.get(x+':'+y)||[])if(other.r>0&&d.r>0&&Math.hypot(d.x-other.x,d.y-other.y)<(d.r+other.r)*.7){d.r=Math.min(4.5,Math.sqrt(d.r*d.r+other.r*other.r));d.v=Math.max(d.v,other.v);d.age=Math.max(d.age,other.age);other.r=0;}const k=bx+':'+by;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(d);}for(let i=drops.length-1;i>=0;i--)if(drops[i].r===0)drops.splice(i,1);for(let i=trails.length-1;i>=0;i--){trails[i].life-=step*(strength>0?.32:.7);if(trails[i].life<=0)trails.splice(i,1);}if(trails.length>1400)trails.splice(0,trails.length-1400);paint();}
 setRain(0);return {texture,setRain,update,get wetness(){return Math.min(1,drops.length/460);},get dropCount(){return drops.length;}};
}
