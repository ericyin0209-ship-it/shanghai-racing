import {lotusViews} from './lotus-grandstands.js?v=225b';
export function createCircuitInspection(camera,controls,getTrack=()=>null){
 const poses={overview:{label:'场地全景',eye:[-320,240,260],target:[0,12,-250],fov:39},stand:{label:'主看台',eye:[-2,3,-290],target:[44,16,-265],fov:56},pit:{label:'维修区',eye:[-12,2.2,-230],target:[-36,5.6,-256],fov:54},bridge:{label:'玻璃桥',eye:[0,3.2,-120],target:[0,24.5,-57],fov:60}};
 poses.paddock={label:'水上建筑',eye:[-230,18,-200],target:[-135,3,-240],fov:52};
 poses.roof={label:'顶棚与结构',eye:[90,66,-310],target:[38,18,-255],fov:58};
 poses.standRear={label:'主看台背面',eye:[112,13,-275],target:[69,9,-253],fov:64};
 poses.lotus={label:'莲叶看台',fov:58};poses.lotusRear={label:'莲叶看台背面',fov:62};
 const panel=document.createElement('nav');panel.id='circuit-inspection';panel.setAttribute('aria-label','场地细节');for(const [key,p]of Object.entries(poses)){const button=document.createElement('button');button.textContent=p.label;button.dataset.circuitView=key;button.onclick=()=>{let eye=p.eye,target=p.target;if(key==='lotus'||key==='lotusRear'){const v=lotusViews.find(v=>v.name==='K看台')||lotusViews[0];if(!v)return;const [cx,cz]=v.centre,[nx,nz]=v.front,[ax,az]=v.axis;if(key==='lotusRear'){eye=[cx-nx*40+ax*30,7,cz-nz*40+az*30];target=[cx-nx*8,9,cz-nz*8];}else{eye=[cx+nx*30+ax*45,4,cz+nz*30+az*45];target=[cx,13,cz];}}camera.position.set(...eye);controls.target.set(...target);camera.fov=p.fov;camera.updateProjectionMatrix();controls.update();for(const b of panel.children)b.classList.toggle('active',b===button);};panel.append(button);}document.getElementById('garage').append(panel);return panel;
}
