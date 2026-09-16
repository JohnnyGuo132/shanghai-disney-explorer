import * as T from 'three';
import {centroid,distance,extrude} from './world-geometry.js';

// Footprint proxies make small windows and roofs one stable click target.
// They are raycast-only and are never drawn over the real architecture.
export function createBuildingPicker(data,heroes,buildingResult){
 const targets=[],byKey=new Map(),material=new T.MeshBasicMaterial({side:T.DoubleSide});
 const landmark=id=>data.landmarks.find(p=>p.key===(id==='port'?'pirates':id));
 for(const hero of heroes){const record=landmark(hero.id);if(!record)continue;hero.group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(hero.group);targets.push({record,box,objects:[hero.group]});byKey.set(record.key,record);}
 for(const ride of buildingResult.rides){const record=landmark(ride.key);if(!record)continue;ride.group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(ride.group);if(ride.group.userData.pickHeight)box.max.y=Math.max(box.max.y,ride.group.position.y+ride.group.userData.pickHeight);targets.push({record,box,objects:[ride.group]});byKey.set(record.key,record);}
 for(const item of buildingResult.selectable){const {feature,ring,height}=item,p=centroid(ring),region=data.lands.reduce((a,b)=>distance(p,[a.x,a.z])<distance(p,[b.x,b.z])?a:b),name=feature.properties.name||feature.properties.tags?.['name:zh']||feature.properties.tags?.name;
  const record={key:'building:'+feature.properties.osm_id,name:name||region.name+' · 街区建筑',land:region.name,landKey:region.key,x:p[0],z:p[1],height,generic:true,ring};
  const mesh=new T.Mesh(extrude(ring,height+.4,3),material);mesh.updateMatrixWorld(true);targets.push({record,objects:[mesh],box:new T.Box3().setFromObject(mesh)});byKey.set(record.key,record);
 }
 const ray=new T.Raycaster(),ndc=new T.Vector2(),point=new T.Vector3();
 return{byKey,targets,pick(clientX,clientY,canvas,camera){const r=canvas.getBoundingClientRect();ndc.set((clientX-r.left)/r.width*2-1,1-(clientY-r.top)/r.height*2);ray.setFromCamera(ndc,camera);let closest=null;
  for(const target of targets){if(!ray.ray.intersectBox(target.box,point))continue;if(closest&&!target.box.containsPoint(camera.position)&&point.distanceTo(camera.position)>closest.distance+5)continue;const hit=ray.intersectObjects(target.objects,true)[0];if(hit&&(!closest||hit.distance<closest.distance))closest={record:target.record,point:hit.point,distance:hit.distance};}
  // The ground should occlude buildings behind the viewer's ground intersection.
  if(closest&&ray.ray.direction.y<0){const groundDistance=(.1-ray.ray.origin.y)/ray.ray.direction.y;if(groundDistance>0&&closest.distance>groundDistance+2)return null;}
  return closest;
 }};
}
