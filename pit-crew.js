import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
// preview.31: Aston Martin pit crew on authored action clips. Model and clips: assets/models/pit-crew-v31.glb, built by
// assets-src/crew/build_crew_v31.py (body form: Blender Studio Human Base Meshes, CC0; suit, gloves, shoes, helmet made
// there) and animate_crew_v31.py (keyframed clips, baked from IK controls). Clip list: assets/models/pit-crew-v31-clips.json.
//
// Every frame pit-box-scene.js gives each role an intent:
//   anchor {o, f, l}     clip space: the serviced corner's hub on the floor (wheel crews) or the car frame (jacks,
//                        stabilisers, chief), axes car-left (x), up (y), car-forward (z) - the clips' own space
//   offset {x, z, yaw}   extra placement inside the anchor (idle clips authored at the origin)
//   clips [{name, t, w, loop}] clips sampled at times t (seconds) with weights w (a short crossfade has two)
//   hands {L, R}         contact targets {p, w}: the palm centre is pulled onto p with weight w (gun grips, a seated tyre,
//                        a jack bar), on top of the clip, by a two-bone solve that keeps the clip's elbow plane
// The clip plays in simulation time (paused, slow motion and replay seek all follow it). The carried object's pose is the
// clip's 'prop' bone (api.prop(role)), so a carried gun, tyre or jack handle moves with the hands that hold it.
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const SHADOW_ONLY=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
function cloneSkinned(source){const clone=source.clone(true),dst=new Map();clone.traverse(o=>{if(o.isBone)dst.set(o.name,o);});
 clone.traverse(o=>{if(!o.isSkinnedMesh)return;const sk=o.skeleton;o.bind(new THREE.Skeleton(sk.bones.map(b=>dst.get(b.name)),sk.boneInverses.map(m=>m.clone())),o.bindMatrix.clone());});return clone;}
const ROLES=['FL-gun','FL-off','FL-on','FR-gun','FR-off','FR-on','RL-gun','RL-off','RL-on','RR-gun','RR-off','RR-on','front-jack','rear-jack','stab-L','stab-R','chief'];
// build variation by role (fixed, not random): jack men a little taller and broader, wheel crews mixed
const BUILD={'front-jack':[1.03,1.04],'rear-jack':[1.02,1.05],'chief':[1.0,1.0],'stab-L':[.99,1.02],'stab-R':[1.01,1.0]},WHEEL_BUILD=[[.98,1.0],[1.0,1.03],[1.02,.98],[.99,1.01]];
const BONE=n=>n.replace('.','');   // glTF node names drop Blender's '.'
const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),va=V(),vb=V(),vc=V(),m4=new THREE.Matrix4();
const bp0=V(),bp1=V(),bs0=V(),bs1=V(),bq0=new THREE.Quaternion(),bq1=new THREE.Quaternion(),bw=new THREE.Matrix4(),bl=new THREE.Matrix4(),smoothstep=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// rotate a bone so the world point `from` (on its chain) swings to `to`, about the bone's own joint
function aimWorld(bone,from,to){const p=bone.getWorldPosition(va),d0=vb.copy(from).sub(p),d1=vc.copy(to).sub(p);if(d0.lengthSq()<1e-10||d1.lengthSq()<1e-10)return;
 qa.setFromUnitVectors(d0.normalize(),d1.normalize());bone.getWorldQuaternion(qb);qb.premultiply(qa);const pq=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();bone.quaternion.copy(pq.multiply(qb)).normalize();bone.updateMatrixWorld(true);}
// two-bone solve (upper, lower, end): the end joint to target; the middle joint stays on the side the clip put it
// (an optional pole keeps it on that side when the clip's limb is near straight or bent the wrong way, e.g. knees forward)
function twoBone(upper,lower,end,target,pole=null,forcePole=false){const A=upper.getWorldPosition(V()),B=lower.getWorldPosition(V()),C=end.getWorldPosition(V());
 const l1=A.distanceTo(B),l2=B.distanceTo(C),d=clamp(A.distanceTo(target),.02,l1+l2-1e-3);const dir=target.clone().sub(A).normalize();
 const bend=B.clone().sub(A);bend.addScaledVector(dir,-bend.dot(dir));
 if(pole){const pp=pole.clone().addScaledVector(dir,-pole.dot(dir));if(pp.lengthSq()>1e-8&&(forcePole||bend.lengthSq()<1e-4||bend.dot(pp)<.02*Math.sqrt(pp.lengthSq())))bend.copy(pp);}
 if(bend.lengthSq()<1e-8){bend.copy(Math.abs(dir.y)<.9?V(0,1,0):V(1,0,0));bend.addScaledVector(dir,-bend.dot(dir));}bend.normalize();
 const ca=clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1),sa=Math.sqrt(1-ca*ca);const B2=A.clone().addScaledVector(dir,l1*ca).addScaledVector(bend,l1*sa);
 aimWorld(upper,B,B2);aimWorld(lower,end.getWorldPosition(V()),A.clone().addScaledVector(dir,d));}
// arm to a wrist target keeping the hand's world orientation, so the palm (8.5 cm from the wrist) lands where it was aimed
function armTo(c,n,wrist){const hb=c.bone('hand.'+n),q=hb.getWorldQuaternion(new THREE.Quaternion());let pole=null;if(c.role.startsWith('stab-')){const lat=c.bone('thigh.L').getWorldPosition(V()).sub(c.bone('thigh.R').getWorldPosition(V())).setY(0).normalize(),forward=lat.clone().cross(V(0,1,0));pole=c.bone('upperarm.'+n).getWorldPosition(V()).addScaledVector(lat,n==='L'?.12:-.12).addScaledVector(forward,.14).add(V(0,-.45,0));}twoBone(c.bone('upperarm.'+n),c.bone('forearm.'+n),hb,wrist,pole,!!pole);
 hb.quaternion.copy(hb.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)).normalize();hb.updateMatrixWorld(true);}
const flexA=V(),flexB=V(),flexC=V();
function jointFlex(c,a,b,d){flexB.setFromMatrixPosition(c.bone(b).matrixWorld);flexA.setFromMatrixPosition(c.bone(a).matrixWorld).sub(flexB).normalize();flexC.setFromMatrixPosition(c.bone(d).matrixWorld).sub(flexB).normalize();return clamp((Math.PI-Math.acos(clamp(flexA.dot(flexC),-1,1)))/2.1,0,1);}
export async function createPitCrew(scene,{assetBase='',onError=null}={}){
 const root=new THREE.Group();root.name='Aston Martin pit crew (preview.31)';root.visible=false;scene.add(root);
 // preview.33: the whole crew uses the rebuilt model and its clips (pit-crew-v33.glb, assets-src/crew/build_crew_v33.py +
 // animate_crew_v33.py); pit-crew-v32.glb is kept on disk but no longer loaded. The v33 clip list holds every preview.31 clip
 // under the same name (re-baked on the new model) plus the p33_ performances
 let gltf33,meta={},meta33={};
 try{gltf33=await new GLTFLoader().loadAsync(assetBase+'assets/models/pit-crew-v34.glb?v=p34-20261029-r3');meta33=await (await fetch(assetBase+'assets/models/pit-crew-v34-clips.json?v=p34-20261029-r3')).json();meta=meta33;}
 catch(e){onError?.(e);throw e;}
 // the exporter drops channels a clip never changes; three.js would then keep whatever an earlier clip left in that bone
 // (a jack man stuck in his side-step pose while the ready clip plays), so each clip gets constant rest-pose tracks for them
 const prep=g=>{const bonesT=[];g.scene.traverse(o=>{if(o.isBone)bonesT.push(o);if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  for(const clip of g.animations){const has=new Set(clip.tracks.map(t=>t.name));
   for(const b of bonesT){if(!has.has(b.name+'.position'))clip.tracks.push(new THREE.VectorKeyframeTrack(b.name+'.position',[0],b.position.toArray()));
    if(!has.has(b.name+'.quaternion'))clip.tracks.push(new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',[0],b.quaternion.toArray()));}}
  return {template:g.scene,clips:Object.fromEntries(g.animations.map(a=>[a.name,a]))};};
 const SET33=prep(gltf33),SET32=SET33,SAMPLE={has:()=>true}   /* every role is a preview.33 performer (the sample was FL-gun, FL-off, FL-on, front-jack) */;
 const setOf=role=>SAMPLE.has(role)?SET33:SET32;
 let ground=()=>0;
 const crew=ROLES.map((role,i)=>{const set=setOf(role),obj=cloneSkinned(set.template);const [h,w]=BUILD[role]||WHEEL_BUILD[i%4];
  const holder=new THREE.Group();holder.name='crew '+role;holder.add(obj);obj.scale.setScalar(h);/* uniform: a wider-than-tall scale shears every joint, so IK and planted feet land ~1 cm off and slide */root.add(holder);
  const B={};obj.traverse(o=>{if(o.isBone)B[o.name]=o;});const bone=n=>B[BONE(n)];
  const meshes=[];obj.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;meshes.push(o);}});const bones=[];obj.traverse(o=>{if(o.isBone)bones.push(o);});
  const lod0=meshes.filter(m=>/lod0/.test(m.name)),lod1=meshes.filter(m=>/lod1/.test(m.name));
  const group=list=>({set visible(v){for(const m of list)m.visible=v;},get visible(){return !!list[0]?.visible;}});
  return {role,set,v33:SAMPLE.has(role),obj:holder,inner:obj,bone,mixer:new THREE.AnimationMixer(obj),actions:{},lod0:group(lod0),lod1:group(lod1),lod0m:lod0,lod1m:lod1,lod1Mats:lod1.map(m=>m.material),
   clothMeshes:meshes.filter(m=>m.morphTargetInfluences?.length>=2),scale:h,palm:{L:V(0,.085,0),R:V(0,.085,0)},bones,lastW:bones.map(()=>new THREE.Matrix4()),snap:bones.map(()=>new THREE.Matrix4()),snapT:null,snapDur:.15,pelvisI:bones.findIndex(b=>b.name==='pelvis'),regime:null,lock:{L:null,R:null},step:{L:null,R:null},ankPrev:{L:null,R:null},lastT:null,lastPos:null,adj:V(),short:V(),reached:false,feetDown:{L:true,R:true},handWorld:{L:null,R:null},err:{L:0,R:0},seen:false};});
 const byRole=Object.fromEntries(crew.map(c=>[c.role,c]));
 // palm centre in each hand bone's frame, from the rest pose: 85 % of the way to the knuckles, a little toward the palm
 for(const c of crew){c.inner.updateMatrixWorld(true);for(const n of ['L','R']){const hb=c.bone('hand.'+n),ix=c.bone('index1.'+n),px=c.bone('pinky1.'+n),tb=c.bone('thumb1.'+n);if(!hb||!ix||!px||!tb)continue;
  const w=hb.getWorldPosition(V()),k=ix.getWorldPosition(V()).add(px.getWorldPosition(V())).multiplyScalar(.5),along=k.clone().sub(w),pc=w.clone().addScaledVector(along,.85);
  const across=ix.getWorldPosition(V()).sub(px.getWorldPosition(V())),palmN=along.clone().cross(across).normalize();if(palmN.dot(tb.getWorldPosition(V()).sub(w))<0)palmN.negate();pc.addScaledVector(palmN,.012);
  c.palm[n]=hb.worldToLocal(pc.clone());}}
 // Anatomical bind axes, independent of the exported idle pose (which can have curled fingers).
 for(const c of crew){c.restQ={};c.palmAxis={};c.fingerAxis={};const sk=c.lod0m[0]?.skeleton;if(!sk)continue;const bm=new Map(sk.bones.map((b,i)=>[b,sk.boneInverses[i].clone().invert()]));for(const b of sk.bones){const m=bm.get(b).clone(),parent=bm.get(b.parent);if(parent)m.premultiply(parent.clone().invert());const p=V(),q=new THREE.Quaternion(),z=V();m.decompose(p,q,z);c.restQ[b.name]=q.normalize();}
  for(const n of ['L','R']){const m=bm.get(c.bone('hand.'+n)),inv=m.clone().invert(),w=V().setFromMatrixPosition(m),i=V().setFromMatrixPosition(bm.get(c.bone('index1.'+n))),p=V().setFromMatrixPosition(bm.get(c.bone('pinky1.'+n))),along=i.clone().add(p).multiplyScalar(.5).sub(w),normal=along.clone().cross(i.clone().sub(p)).normalize();if(normal.x*(n==='L'?-1:1)<0)normal.negate();c.palmAxis[n]=normal.clone().transformDirection(inv);c.fingerAxis[n]=along.clone().transformDirection(inv);c.palm[n]=w.clone().addScaledVector(along,.85).addScaledVector(normal,.012).applyMatrix4(inv);}}
 const gaits={};
 const action=(c,name)=>{if(c.actions[name])return c.actions[name];const clip=c.set.clips[name];if(!clip)return null;const a=c.mixer.clipAction(clip);a.play();a.setEffectiveWeight(0);c.actions[name]=a;return a;};
 let time=0;
 const api={root,crew,byRole,clips:SET32.clips,clips33:SET33.clips,meta,meta33,
  setGround(fn){ground=fn;},
  show(v){root.visible=v;},
  // release check: simplified capsules (torso, head, arms, hands, legs, feet), world space
  limbs(){const out=[];for(const c of crew){if(!c.obj.visible||!c.seen)continue;const P=n=>c.bone(n)?.getWorldPosition(V()),k=c.scale,seg=(a,b,r,part)=>{if(a&&b)out.push({role:c.role,part,a,b,r:r*k});};
   const neck=P('neck'),head=P('head');seg(P('pelvis'),neck,.17,'torso');if(head)seg(head,head.clone().add(V(0,.2*k,0)),.15,'head');
   for(const s of ['L','R']){const hand=P('hand.'+s);seg(P('upperarm.'+s),P('forearm.'+s),.06,'arm');seg(P('forearm.'+s),hand,.055,'forearm');seg(hand,c.handWorld[s]||hand,.05,'hand');
    seg(P('thigh.'+s),P('shin.'+s),.085,'thigh');seg(P('shin.'+s),P('foot.'+s),.065,'shin');seg(P('foot.'+s),P('toes.'+s),.055,'foot');}}return out;},
  bodies(){return crew.filter(c=>c.obj.visible&&c.seen).map(c=>{const p=c.bone('pelvis').getWorldPosition(V());return {role:c.role,x:p.x,z:p.z,r:.3*c.scale,y:p.y};});},
  // a second contact pass after the box has placed a tool from this frame's hands (jack bars): palms onto the given points
  reach(role,targets,adapt=false){const c=byRole[role];if(!c?.seen)return;for(const n of ['L','R']){const p=targets[n];if(!p)continue;const hb=c.bone('hand.'+n),pw=hb.localToWorld(c.palm[n].clone());
   armTo(c,n,hb.getWorldPosition(V()).add(p.clone().sub(pw)));c.handWorld[n]=hb.localToWorld(c.palm[n].clone());c.err[n]=c.handWorld[n].distanceTo(p);
   if(adapt){const sf=p.clone().sub(c.handWorld[n]);sf.y=0;c.short.addScaledVector(sf,.5);c.reached=true;}}},
  // Preserve the planted ankle and both leg lengths while turning the knee around the hip/ankle axis.
  // Only needed while a loose tyre is being drawn past the legs; never translate the worker to hide contact.
  clearTyreLegs(role,w,halfWidth){const c=byRole[role];if(!c?.seen||!w?.visible)return;
   w.updateMatrixWorld(true);const wp=w.getWorldPosition(V());if(c.bone('pelvis').getWorldPosition(V()).distanceTo(wp)>1.9)return;const inv=w.matrixWorld.clone().invert();c.avoidAngles??={};
   for(const kind of ['leg','arm'])for(const n of ['L','R']){const names=kind==='leg'?['thigh.','shin.','foot.']:['upperarm.','forearm.','hand.'],radii=kind==='leg'?[.085,.065]:[.060,.055],upper=c.bone(names[0]+n),middle=c.bone(names[1]+n),end=c.bone(names[2]+n),A=upper.getWorldPosition(V()),B=middle.getWorldPosition(V()),C=end.getWorldPosition(V());
    const score=k=>{let hit=0;for(const [u,v,r] of [[A,k,radii[0]],[k,C,radii[1]]])for(let i=0;i<=8;i++){const q=u.clone().lerp(v,i/8).applyMatrix4(inv);hit=Math.max(hit,Math.min(halfWidth+r-Math.abs(q.x),.36+r-Math.hypot(q.y,q.z)));}return hit;};
    const axis=C.clone().sub(A).normalize(),centre=A.clone().addScaledVector(axis,B.clone().sub(A).dot(axis)),radial=B.clone().sub(centre);if(radial.length()<.025)continue;
    let angle=0,bs=score(B);if(bs>.022)for(const deg of [-15,15,-30,30,-45,45,-60,60]){const h=score(radial.clone().applyAxisAngle(axis,deg*Math.PI/180).add(centre))+Math.abs(deg)*.00012;if(h<bs){angle=deg*Math.PI/180;bs=h;}}
    const key=w.uuid+kind+n,prev=c.avoidAngles[key]||0,dt=Math.max(0,Math.min(c.frameDt||0,.1)),blend=1-Math.exp(-dt*24),value=prev+(angle-prev)*blend;c.avoidAngles[key]=value;if(Math.abs(value)<.001)continue;
    const target=radial.clone().applyAxisAngle(axis,value).add(centre),q=end.getWorldQuaternion(new THREE.Quaternion());aimWorld(upper,B,target);aimWorld(middle,end.getWorldPosition(V()),C);end.quaternion.copy(end.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)).normalize();end.updateMatrixWorld(true);
   }},
  // world pose of what the role carries (the clip's prop bone): matrix with x = gun body / wheel axle, y = up
  // a walking clip's ground travel (authored on the spot): the planted foot's backward slide, sampled once; dist(t) and its
  // inverse time(d) let a path advance exactly as fast as the feet push, so planted feet stay put
  gait(name){if(gaits[name])return gaits[name];const c=crew[0],act=action(c,name);if(!act)return null;const dur=act.getClip().duration,N=60,cum=[0];let prev=null;
   for(const a of Object.values(c.actions))a.setEffectiveWeight(0);act.setEffectiveWeight(1);c.obj.position.set(0,0,0);c.obj.quaternion.identity();
   for(let i=0;i<=N;i++){for(const pm of c.mixer._bindings)pm.buffer.fill(1e30,pm.valueSize,3*pm.valueSize);act.time=dur*i/N;c.mixer.update(0);c.obj.updateMatrixWorld(true);
    const f={L:c.obj.worldToLocal(c.bone('foot.L').getWorldPosition(V())),R:c.obj.worldToLocal(c.bone('foot.R').getWorldPosition(V()))},n=f.L.y<f.R.y?'L':'R';
    if(prev)cum.push(cum[i-1]+Math.max(0,prev[n].z-f[n].z));prev=f;}
   act.setEffectiveWeight(0);const D=cum[N],dist=t=>{const k=Math.floor(t/dur),x=(t-k*dur)/dur*N,i=Math.min(N-1,Math.floor(x));return k*D+cum[i]+(cum[i+1]-cum[i])*(x-i);};
   const time=d=>{let lo=0,hi=(Math.floor(d/D)+1)*dur;for(let j=0;j<40;j++){const m=(lo+hi)/2;if(dist(m)<d)lo=m;else hi=m;}return hi;};
   return gaits[name]={dist,time,speed:D/dur};},
  prop(role,out=new THREE.Matrix4()){const b=byRole[role]?.bone('prop');return b?out.copy(b.matrixWorld):null;},
  update(intents,camera){if(!root.visible)return;time=intents.__time??time;const cam=camera?.position;
   for(const c of crew){const T=intents[c.role];c.obj.visible=!!T;if(!T)continue;
    const seek=c.lastT!=null&&(time<c.lastT||time-c.lastT>.3);if(seek){c.snapT=null;c.regime=null;c.blendKey=null;c.adj.set(0,0,0);c.short.set(0,0,0);c.reached=false;c.lookYaw=0;c.lock.L=c.lock.R=c.step.L=c.step.R=null;c.ankPrev.L=c.ankPrev.R=null;}
    const A=T.anchor,off=T.offset;c.obj.position.copy(A.o);m4.makeBasis(A.l,V(0,1,0),A.f);c.obj.quaternion.setFromRotationMatrix(m4);
    if(off){c.obj.position.addScaledVector(A.l,off.x||0).addScaledVector(A.f,off.z||0);if(off.yaw)c.obj.quaternion.multiply(qa.setFromAxisAngle(V(0,1,0),off.yaw));}
    // contact adaptation: when a fixed hand target (reach(...,true), not something the person carries) was out of the arm's reach last frame, the body leans that way (feet stay
    // planted, legs re-solve), up to 15 cm, easing back once nothing is held
    {const dt0=c.lastT==null?0:clamp(time-c.lastT,0,.1);if(c.reached&&!c.v33){c.adj.addScaledVector(c.short,Math.min(1,dt0*10));if(c.adj.length()>.15)c.adj.setLength(.15);}else c.adj.multiplyScalar(Math.max(0,1-dt0*4));
     c.short.set(0,0,0);c.reached=false;c.obj.position.add(c.adj);}
    c.obj.position.y=ground(c.obj.position.x,c.obj.position.z);
    // three.js only writes a bone when its animated value changed since the last frame; the IK and blends below edit bones
    // after the mixer, so its two value caches are voided to have every frame start from the clip pose
    for(const b of c.bones)b.scale.set(1,1,1);
    for(const pm of c.mixer._bindings)pm.buffer.fill(1e30,pm.valueSize,3*pm.valueSize);
    for(const a of Object.values(c.actions))a.setEffectiveWeight(0);
    for(const k of T.clips||[]){const a=action(c,k.name);if(!a)continue;const dur=a.getClip().duration;a.enabled=true;a.setEffectiveWeight(k.w);a.time=k.loop?((k.t%dur)+dur)%dur:clamp(k.t,0,dur);}
    c.mixer.update(0);c.obj.updateMatrixWorld(true);
    const dt=c.lastT==null?0:time-c.lastT;c.lastT=time;c.frameDt=dt;
    // a change of placement (anchored clip -> walking path -> pick-up spot ...): every bone blends from where it was last
    // frame to the new pose over 0.15 s in world space, so nothing jumps when the clip's origin moves
    // (T.blendTime: seconds, or 'auto' = by how far the pelvis has to travel, for a slow return to a set-out spot; the feet
    // keep stepping under it)
    const reg=(T.epoch||0)+':'+(T.regime||'anchor')+(T.perfKey?':'+T.perfKey:'');const newBooking=c.epoch!=null&&c.epoch!==T.epoch;c.epoch=T.epoch;if(c.seen&&c.blendKey!=null&&c.blendKey!==reg&&dt>=0&&dt<.3){for(let i=0;i<c.bones.length;i++)c.snap[i].copy(c.lastW[i]);c.snapT=0;
     const bt=newBooking?'auto':T.blendTime;c.snapDur=bt==='auto'?clamp(c.bone('pelvis').getWorldPosition(V()).distanceTo(bp0.setFromMatrixPosition(c.lastW[c.pelvisI]))/.7,.6,2.5):bt||.15;}c.blendKey=reg;c.regime=T.regime||'anchor';
    if(c.snapT!=null&&c.snapT<c.snapDur&&dt>=0&&dt<.3){c.snapT+=dt;const w=smoothstep(c.snapT/c.snapDur);
     for(let i=0;i<c.bones.length;i++){const b=c.bones[i];c.snap[i].decompose(bp0,bq0,bs0);b.matrixWorld.decompose(bp1,bq1,bs1);bp0.lerp(bp1,w);bq0.slerp(bq1,w);
      bw.compose(bp0,bq0,bs1);bl.copy(b.parent.matrixWorld).invert().multiply(bw);bl.decompose(b.position,b.quaternion,b.scale);b.quaternion.normalize();b.scale.set(1,1,1);b.updateMatrix();b.matrixWorld.multiplyMatrices(b.parent.matrixWorld,b.matrix);}
     c.inner.updateMatrixWorld(true);}else if(c.snapT!=null&&c.snapT>=c.snapDur)c.snapT=null;
    // planted feet stay where they are on the floor; when the body has moved too far from one, it takes a step
    const pel=c.bone('pelvis').getWorldPosition(V()),jumped=c.lastPos&&c.lastPos.distanceTo(pel)>.8&&c.snapT==null;c.lastPos=(c.lastPos||V()).copy(pel);
    if(dt<0||dt>.3||jumped){c.lock.L=c.lock.R=c.step.L=c.step.R=null;c.ankPrev.L=c.ankPrev.R=null;}
    const fwd=c.bone('thigh.L').getWorldPosition(V()).sub(c.bone('thigh.R').getWorldPosition(V())).cross(V(0,1,0));fwd.y=0;fwd.normalize();
    for(const n of ['L','R']){const fb=c.bone('foot.'+n),ank=fb.getWorldPosition(V()),g=ground(ank.x,ank.z);
     const lv=c.ankPrev[n]&&dt>0?ank.distanceTo(c.ankPrev[n])/dt:0;c.ankPrev[n]=ank.clone();/* the clip foot's world speed: a stance foot on a walking path is still */const planted=ank.y-g<.115&&lv<.25;let want=null;
     // a foot leaves its lock only by stepping (lifted), never by sliding or snapping to where the clip has it: when the clip
     // moves a low foot fast (a crossfade or an unlifted shuffle), when it lifts away from the lock, or when the body has moved
     // too far, the foot steps from the lock to the clip's foot
     const low=ank.y-g<.115;
     // preview.33 performances: the clip itself says when a foot is planted (contact windows measured on the bake); the
     // foot is held where it landed for that window and otherwise follows the clip - no generic steps or re-plants
     const perf=c.v33&&T.clips?.length===1&&meta33[T.clips[0].name]?.contacts,pw=perf&&perf[n];
     const on=pw&&pw.some(([a,b])=>T.clips[0].t>=a&&T.clips[0].t<=b);
     // a lock let go away from where the clip has the foot (a phase stretched or cut by the stop's timing): the foot steps
     // across, lifted, instead of sliding or snapping
     if(pw&&!c.step[n]){if(on||low&&c.snapT!=null){if(!c.lock[n])c.lock[n]=ank.clone();want=c.lock[n];}   /* a low foot also holds through a phase blend */else{if(c.lock[n]&&c.lock[n].distanceTo(ank)>.015){c.step[n]={from:c.lock[n].clone(),s:0};want=c.lock[n];}c.lock[n]=null;}}
     else if(c.step[n]){const st=c.step[n];if(st.s>.75&&lv>=.25&&(st.ext||0)<.3)st.ext=(st.ext||0)+dt;else st.s+=dt/.22;/* the foot stays up until the clip's foot settles; if it keeps moving (a slow glide), it comes down on a fixed spot */
      if(st.s>.75&&!st.fix&&(st.ext||0)>=.3)st.fix=ank.clone();const tg=st.fix||ank,u=Math.min(1,st.s),h=u<.2?u/.2:u>.8?(1-u)/.2:1,m=clamp((u-.15)/.7,0,1);want=st.from.clone().lerp(tg,m*m*(3-2*m));want.y+=.065*Math.sqrt(Math.max(0,h));if(u>=1){c.step[n]=null;c.lock[n]=low?tg.clone():null;want=c.lock[n];}}
     else if(c.lock[n]){const dl=c.lock[n].distanceTo(ank);if(dl>.13||!low||dl>.03&&lv>=.25){c.step[n]={from:c.lock[n].clone(),s:0};want=c.lock[n];c.lock[n]=null;}else want=c.lock[n];}
     else if(low)c.lock[n]=ank.clone();
     if(want){const q=fb.getWorldQuaternion(new THREE.Quaternion());twoBone(c.bone('thigh.'+n),c.bone('shin.'+n),fb,want,fwd);fb.quaternion.copy(fb.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)).normalize();fb.updateMatrixWorld(true);}
     else{/* knees never bend backwards: re-solve a standing leg whose knee the clip blend left behind the hip-ankle line */
      const h=c.bone('thigh.'+n).getWorldPosition(V()),k=c.bone('shin.'+n).getWorldPosition(V()),ha=ank.clone().sub(h),tt=clamp(k.clone().sub(h).dot(ha)/ha.lengthSq(),0,1);
      if(k.y-ground(k.x,k.z)>.12&&k.clone().sub(h.clone().addScaledVector(ha,tt)).dot(fwd)<.005){const q=fb.getWorldQuaternion(new THREE.Quaternion());twoBone(c.bone('thigh.'+n),c.bone('shin.'+n),fb,ank.clone(),fwd);fb.quaternion.copy(fb.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)).normalize();fb.updateMatrixWorld(true);}}}
    for(const n of ['L','R']){const hb=c.bone('hand.'+n),pw=hb.localToWorld(c.palm[n].clone()),h=T.hands?.[n];
     if(h&&h.w>0){const wr=hb.getWorldPosition(V()).add(h.p.clone().sub(pw).multiplyScalar(clamp(h.w,0,1)));armTo(c,n,wr);
      c.handWorld[n]=hb.localToWorld(c.palm[n].clone());c.err[n]=c.handWorld[n].distanceTo(h.p);}
     else{c.handWorld[n]=pw;c.err[n]=0;}}
    // Free hands settle palm-to-thigh with relaxed fingers. Tool-holding hands keep their authored grips.
    c.relax??={L:0,R:0};const lateral=c.bone('thigh.L').getWorldPosition(V()).sub(c.bone('thigh.R').getWorldPosition(V())).setY(0).normalize();
    for(const n of ['L','R']){const target=T.relaxHands?.includes(n)?1:0,k=dt>0?1-Math.exp(-Math.min(dt,.1)*14):0;c.relax[n]+=(target-c.relax[n])*k;const w=c.relax[n],pa=c.palmAxis[n];if(w<.001||!pa)continue;
     const upper=c.bone('upperarm.'+n),fore=c.bone('forearm.'+n),hand=c.bone('hand.'+n),shoulder=upper.getWorldPosition(V()),elbow=fore.getWorldPosition(V()),currentWrist=hand.getWorldPosition(V()),length=shoulder.distanceTo(elbow)+elbow.distanceTo(currentWrist),forward=lateral.clone().cross(V(0,1,0)).normalize(),walking=T.clips?.[0]?.name==='walk',swing=walking?Math.cos((T.clips[0].t%1)*Math.PI*2)*(n==='L'?1:-1)*16*Math.PI/180:0,targetWrist=shoulder.clone().add(V(0,-length*.94*Math.cos(swing),0)).addScaledVector(forward,-length*.94*Math.sin(swing)+.035).addScaledVector(lateral,n==='L'?.08:-.08),pole=shoulder.clone().addScaledVector(forward,.20).addScaledVector(lateral,n==='L'?.10:-.10).add(V(0,-.30,0));twoBone(upper,fore,hand,currentWrist.clone().lerp(targetWrist,w),pole,true);

     const finger=c.fingerAxis[n].clone(),palm=pa.clone().addScaledVector(finger,-pa.dot(finger)).normalize(),fd=c.bone('hand.'+n).getWorldPosition(V()).sub(c.bone('forearm.'+n).getWorldPosition(V())).normalize(),pd=lateral.clone().multiplyScalar(n==='L'?-1:1);pd.addScaledVector(fd,-pd.dot(fd));if(pd.lengthSq()<1e-8){pd.copy(Math.abs(fd.y)<.9?V(0,1,0):V(1,0,0));pd.addScaledVector(fd,-pd.dot(fd));}pd.normalize();const A=new THREE.Matrix4().makeBasis(palm,finger,palm.clone().cross(finger)),B=new THREE.Matrix4().makeBasis(pd,fd,pd.clone().cross(fd)),hb=c.bone('hand.'+n),q=new THREE.Quaternion().setFromRotationMatrix(B.multiply(A.invert())),current=hb.getWorldQuaternion(new THREE.Quaternion()).slerp(q,w);hb.quaternion.copy(hb.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(current)).normalize();
     for(const f of ['index','middle','ring','pinky','thumb'])for(let j=1;j<=3;j++){const b=c.bone(f+j+'.'+n),rq=b&&c.restQ[b.name];if(rq)b.quaternion.slerp(rq,w*.80);}hb.updateMatrixWorld(true);c.handWorld[n]=hb.localToWorld(c.palm[n].clone());}
    {const hb=c.bone('head'),target=T.gaze;let want=0;if(target){const p=hb.getWorldPosition(V()),d=target.clone().sub(p).setY(0);if(d.lengthSq()>.01)want=clamp(Math.atan2(fwd.z*d.x-fwd.x*d.z,fwd.x*d.x+fwd.z*d.z),-.52,.52);}
     const k=dt<=0?0:1-Math.exp(-Math.min(dt,.1)*8);c.lookYaw=(c.lookYaw||0)+(want-(c.lookYaw||0))*k;
     if(Math.abs(c.lookYaw)>.001){const world=hb.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromAxisAngle(V(0,1,0),c.lookYaw));hb.quaternion.copy(hb.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world)).normalize();hb.updateMatrixWorld(true);}}
    for(const n of ['L','R']){const fp=c.bone('foot.'+n).getWorldPosition(V()),down=fp.y-ground(fp.x,fp.z)<.095;if(down&&!c.feetDown[n])api.onStep?.(fp);c.feetDown[n]=down;}
    const knee=Math.max(jointFlex(c,'thigh.L','shin.L','foot.L'),jointFlex(c,'thigh.R','shin.R','foot.R')),elbow=Math.max(jointFlex(c,'upperarm.L','forearm.L','hand.L'),jointFlex(c,'upperarm.R','forearm.R','hand.R'));
    for(const m of c.clothMeshes){m.morphTargetInfluences[0]=knee;m.morphTargetInfluences[1]=elbow;}
    const d=cam?cam.distanceTo(c.obj.position):0,near=d<24;
    for(const m of c.lod0m){m.visible=near;m.castShadow=false;}
    c.lod1m.forEach((m,i)=>{m.visible=d<60||!near;m.material=near?SHADOW_ONLY:c.lod1Mats[i];m.castShadow=d<45;});
    for(const b of c.bones){b.quaternion.normalize();b.scale.set(1,1,1);}c.inner.updateMatrixWorld(true);
    for(let i=0;i<c.bones.length;i++)c.lastW[i].copy(c.bones[i].matrixWorld);
    c.seen=true;}}
 };
 return api;
}
