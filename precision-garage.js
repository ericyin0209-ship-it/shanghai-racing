import {GLTFLoader} from './vendor/GLTFLoader.js';
// Shared metre-scale assets: service props never alter the player's AMR23 mesh.
export async function upgradeGarageEquipment(group){
 const asset=await new GLTFLoader().loadAsync('assets/models/service-equipment.glb');
 const replacements=new Set(['1.10 m mechanic workstation','2.05 m spares cabinet']);
 group.traverse(o=>{if(replacements.has(o.name))o.visible=false;});
 // The old loose socket tray belonged to the replaced worktop.
 const details=group.children.find(o=>o.name==='Pit service / spares / electronics');
 if(details)for(const o of details.children){if(Math.abs(o.position.x+5.98)<.01&&Math.abs(o.position.y-1.113)<.01)o.visible=false;}
 asset.scene.name='Precision pit equipment / metres';
 asset.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.detailSource='precision-equipment-v2';}});
 group.add(asset.scene);group.userData.precisionEquipment=true;
 return asset.scene;
}
