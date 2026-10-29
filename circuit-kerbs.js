import * as THREE from 'three';
// One metre paint modules, with the same measured-in-code profile as the driving surface.
// Colour boundaries use duplicated vertices; no extra draw call per red/white block.
export function createKerbSurfaces(scene,track){
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.70});
 material.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 kerbUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nkerbUV=uv;');shader.fragmentShader='varying vec2 kerbUV;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 q=kerbUV;float aa=max(length(fwidth(q)),.001);float fleck=fract(sin(dot(floor(q*120.),vec2(127.1,311.7)))*43758.5453);float grain=1.-smoothstep(.006,.04,aa);float edgeDirt=pow(abs(q.x-.5)*2.,3.);diffuseColor.rgb*=.96-edgeDirt*.12+(fleck-.5)*.10*grain;
 `);};material.customProgramCacheKey=()=> 'kerb-metric-paint-218';
 const n=Math.round(track.length),width=8,root=new THREE.Group();root.name='Metric Shanghai kerb profiles / 218';scene.add(root);const palette=[new THREE.Color('#d8d6c8'),new THREE.Color('#b92230')],shoulder=new THREE.Color('#5d6263');
 // Photos 07/09/10: red/white kerbs only through corners; the straights have a plain grey shoulder outside the white line.
 // preview.27: the corner mask now comes from track-surfaces.js, the same data that shapes the physics kerb crown.
 const corner=track.surfaces.kerbModules;
 for(const side of [-1,1]){const positions=[],colors=[],uv=[],index=[];
  for(let i=0;i<n;i++){const col=track.surfaces.kerbAt(i+.5,side)?palette[i%2]:shoulder;for(let end=0;end<2;end++){const s=(i+end)*track.length/n;for(let j=0;j<=width;j++){const u=j/width,off=side*(7.2+u*1.15),f=track.at(s,off);positions.push(f.p.x,f.p.y+.0007,f.p.z);colors.push(col.r,col.g,col.b);uv.push(u,s);}}
   const base=i*(width+1)*2;for(let j=0;j<width;j++){const a=base+j,b=a+width+1;if(side>0)index.push(a,b,a+1,a+1,b,b+1);else index.push(a,a+1,b,a+1,b+1,b);}
  }
  // At an extremely tight sampled apex the inside offset can momentarily reverse.
  // Keep every paint face consistently upward rather than leaving two back-facing slivers.
  for(let k=0;k<index.length;k+=3){const a=index[k]*3,b=index[k+1]*3,c=index[k+2]*3;const up=(positions[b+2]-positions[a+2])*(positions[c]-positions[a])-(positions[b]-positions[a])*(positions[c+2]-positions[a+2]);if(up<0)[index[k+1],index[k+2]]=[index[k+2],index[k+1]];}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
  // Split into bounded pieces so most of the lap never enters a driving draw.
  for(let a=0;a<n;a+=80){const count=Math.min(80,n-a),first=a*(width+1)*2,last=(a+count)*(width+1)*2,part=new THREE.BufferGeometry();for(const name of ['position','normal','color','uv']){const attr=g.attributes[name];part.setAttribute(name,new THREE.BufferAttribute(attr.array.slice(first*attr.itemSize,last*attr.itemSize),attr.itemSize));}part.setIndex(Array.from(g.index.array.slice(a*width*6,(a+count)*width*6),v=>v-first));part.computeBoundingBox();part.computeBoundingSphere();const m=new THREE.Mesh(part,material);m.name='Kerb paint and crown';m.receiveShadow=true;root.add(m);}g.dispose();
 }
 return {root,material,modulesPerSide:n,setWetness(v){material.roughness=.70-v*.36;}};
}
