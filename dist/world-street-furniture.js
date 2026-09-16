import * as T from 'three';

export function createStreetFurniture(scene,lamp,bench,lampPositions,benchPositions,emissive){
 const dummy=new T.Object3D(),records=[];
 function batch(source,positions,range){
  source.updateMatrixWorld(true);const meshes=[];
  source.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld),material=o.material.clone();material.envMapIntensity=.45;
   if(material.name==='lamp_glass'){material.depthWrite=false;material.opacity=.12;}
   if(material.name==='lamp_bulb'){material.emissive.set('#ffd7a0');emissive.push({material,intensity:2.5});}
   const mesh=new T.InstancedMesh(geometry,material,positions.length);mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=material.name!=='lamp_glass';scene.add(mesh);meshes.push(mesh);
  });records.push({positions,range,meshes});
 }
 batch(lamp,lampPositions,155);batch(bench,benchPositions,105);
 let last=-1,high=true,lastX=Infinity,lastZ=Infinity;
 return{setQuality:v=>{high=v;last=-1;},update(t,camera){if(t-last<.4)return;if(last>=0&&Math.hypot(camera.position.x-lastX,camera.position.z-lastZ)<2)return;last=t;lastX=camera.position.x;lastZ=camera.position.z;
  for(const record of records){let count=0;const range=record.range*(high?1:.65);for(const [x,z,rotation=0]of record.positions){if(Math.hypot(x-lastX,z-lastZ)>range)continue;dummy.position.set(x,.09,z);dummy.rotation.set(0,rotation,0);dummy.updateMatrix();for(const mesh of record.meshes)mesh.setMatrixAt(count,dummy.matrix);count++;}for(const mesh of record.meshes){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}}
 }};
}
