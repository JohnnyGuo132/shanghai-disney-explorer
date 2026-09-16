import * as T from 'three';
import {inside,distance,area,nearestSegment} from './world-geometry.js';
import {vegetationViewDistance,vegetationDetailFade} from './vegetation-view.js';
export function createUnderstory(scene,data,sources,blocked,paths){
 let seed=70422;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},positions=[];
 const publicPaths=paths.filter(p=>!p.private);
 for(const f of data.features.filter(f=>f.properties.layer==='vegetation'&&f.geometry.type==='Polygon')){
  const r=f.geometry.coordinates[0],xs=r.map(p=>p[0]),zs=r.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),wood=/wood|forest|scrub/.test(Object.values(f.properties.tags||{}).join(' ')),garden=Math.abs(area(r))<12000&&!wood;
  const localPaths=publicPaths.filter(p=>p.points.some(q=>q[0]>minX-22&&q[0]<maxX+22&&q[1]>minZ-22&&q[1]<maxZ+22));
  if(!localPaths.length)continue;const spacing=garden?1.35:2.3,n=Math.min(750,Math.ceil((maxX-minX)*(maxZ-minZ)/(spacing*spacing)));
  for(let i=0;i<n;i++){const x=minX+rand()*(maxX-minX),z=minZ+rand()*(maxZ-minZ),p=[x,z];if(!inside(p,r)||blocked(p)||f.geometry.coordinates.slice(1).some(h=>inside(p,h)))continue;
   let pathDistance=Infinity;for(const path of localPaths)for(let j=1;j<path.points.length;j++)pathDistance=Math.min(pathDistance,nearestSegment(p,path.points[j-1],path.points[j]).distance-path.width/2);
   if(pathDistance<.4||pathDistance>19)continue;
   const patch=Math.sin(x*.27+Math.cos(z*.12))*Math.cos(z*.2),flower=garden&&pathDistance<4.1&&patch>-.25;
   let type=flower?(patch>.45?4:3):pathDistance<2.5?2:rand()<.38?1:0,scale=type===0?.62+rand()*.32:type===1?1.05+rand()*.75:type===2?1.2+rand()*1.8:type===3?1.1+rand()*.45:1.3+rand()*.65;
   positions.push({x,z,y:.05,angle:rand()*Math.PI*2,scale,type});
   if(flower)for(let k=0;k<3;k++){const px=x+(rand()-.5)*1.2,pz=z+(rand()-.5)*1.2;if(inside([px,pz],r)&&!blocked([px,pz]))positions.push({x:px,z:pz,y:.05,angle:rand()*6.28,scale:scale*(.8+rand()*.3),type});}
  }
 }
 const batches=sources.map((source,type)=>{const out=[],capacity=positions.filter(p=>p.type===type).length;source.updateMatrixWorld(true);source.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld),mat=o.material.clone();mat.alphaTest=.35;mat.transparent=false;mat.alphaToCoverage=true;mat.side=T.DoubleSide;mat.metalness=0;mat.roughness=1;mat.envMapIntensity=.3;if(type===0)mat.color.multiply(new T.Color('#8baf77'));mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=.73+.23*roughnessFactor;');};mat.customProgramCacheKey=()=> 'matte-botany-v7';const mesh=new T.InstancedMesh(g,mat,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;scene.add(mesh);out.push(mesh);});return out;}),dummy=new T.Object3D(),lastPosition=new T.Vector3(Infinity,0,0);let last=-1,high=true;
 let lastFov=NaN;
 return{count:positions.length,setQuality:v=>{high=v;last=-1;},update(t,camera){const lensChanged=camera.fov!==lastFov;if(last>=0&&!lensChanged&&t-last<.12)return;if(last>=0&&!lensChanged&&camera.position.distanceToSquared(lastPosition)<.25)return;last=t;lastFov=camera.fov;lastPosition.copy(camera.position);const counts=Array(sources.length).fill(0);for(let index=0;index<positions.length;index++){const p=positions[index],horizontal=distance([p.x,p.z],[camera.position.x,camera.position.z]),d=vegetationViewDistance(horizontal,camera.position.y-p.y,camera.fov),range=high?(p.type<2?83:58):(p.type<2?48:35),fade=vegetationDetailFade(d,range);if(fade<=0)continue;dummy.position.set(p.x,p.y-(1-fade)*.12,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale*fade);dummy.updateMatrix();for(const mesh of batches[p.type]){mesh.setMatrixAt(counts[p.type],dummy.matrix);mesh.setColorAt(counts[p.type],new T.Color().setHSL(.21,.03,.82+(index%7)*.024));}counts[p.type]++;}batches.forEach((arr,i)=>arr.forEach(m=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}));}};
}
