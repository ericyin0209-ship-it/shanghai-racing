// Continuous world-space variation removes the uniform green carpet and visible tile grids.
export function addGroundVariation(material){
 material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 terrainPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nterrainPoint=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 terrainPoint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=terrainPoint.xz;float large=.5+.5*sin(p.x*.027+sin(p.y*.019)*2.)*sin(p.y*.032);float small=.5+.5*sin(p.x*1.7+sin(p.y*2.3))*sin(p.y*1.3);float mowing=.5+.5*sin(p.x*.23+p.y*.045);diffuseColor.rgb*=.74+large*.22+small*.06+mowing*.035;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,.98,.77),large*.17);
 `);};return material;
}
