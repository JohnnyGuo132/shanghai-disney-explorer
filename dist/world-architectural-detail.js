import * as T from 'three';

// Original, metre-scale construction details. No image overlays or asset downloads.
// Dist integration: create after castle material/show setup and createBuildings.
// `data` and `paths` are the SAME inputs passed to createBuildings.
export function createArchitecturalDetail(scene,{castle,heroes=[],buildingResult,materials={},data,paths=[]}={}){
 const root=new T.Group();root.name='architectural_details_v13';scene.add(root);
 const ownedMaterials=new Set(),buckets=new Map(),chunks=[],anchors=[],castleChecks=[],pipeTemplates=new Map(),pipeInstances=new Map(),ownedRoots=[];let recordingPipe=null;
 const diagnostics={version:13,pipes:0,guards:0,castleBlocks:0,rejectedCastleBlocks:0,rejectedPipeOpenings:0,triangles:0,meshes:0,visibleTriangles:0,visibleMeshes:0,anchors,castleChecks};
 const mat=(name,color,metalness,roughness)=>{const m=new T.MeshStandardMaterial({name,color,metalness,roughness,envMapIntensity:.34});ownedMaterials.add(m);return m;};
 const iron=mat('detail_forged_iron','#344240',.63,.53),copper=mat('detail_aged_copper','#66786b',.68,.61),zinc=mat('detail_brushed_zinc','#839293',.72,.52),stone=mat('detail_carved_sill_stone','#cbbda4',0,.88);
 // Reuse supplied physical stone maps without mutating their wrapping/repeat.
 if(materials.wall){for(const k of ['map','normalMap','roughnessMap'])stone[k]=materials.wall[k]??null;stone.normalScale.set(.38,.38);}
 const clamp=T.MathUtils.clamp,up=new T.Vector3(0,1,0),dummy=new T.Object3D();
 const area=r=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
 const inside=(p,r)=>{let b=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],c=r[j];if((a[1]>p[1])!==(c[1]>p[1])&&p[0]<(c[0]-a[0])*(p[1]-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;};
 const landAt=(x,z)=>data?.lands?.reduce((a,b)=>Math.hypot(b.x-x,b.z-z)<Math.hypot(a.x-x,a.z-z)?b:a)?.key??'mickey';
 const nearPath=(x,z,nx,nz)=>{let d=Infinity,front=false;for(const p of paths){if(p.private)continue;for(let i=1;i<p.points.length;i++){const a=p.points[i-1],b=p.points[i],dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1),qx=a[0]+dx*u,qz=a[1]+dz*u,dd=Math.hypot(qx-x,qz-z);if(dd<d){d=dd;front=(qx-x)*nx+(qz-z)*nz>0;}}}return{d,front};};
 const merge=geos=>{const attrs={position:[],normal:[],uv:[]};let count=0;for(const source of geos){const g=source.index?source.toNonIndexed():source;count+=g.attributes.position.count;for(const k of Object.keys(attrs))attrs[k].push(g.attributes[k]?.array??new Float32Array(g.attributes.position.count*(k==='uv'?2:3)));if(g!==source)g.dispose();}const out=new T.BufferGeometry();for(const[k,arrays]of Object.entries(attrs)){const all=new Float32Array(count*(k==='uv'?2:3));let off=0;for(const a of arrays){all.set(a,off);off+=a.length;}out.setAttribute(k,new T.BufferAttribute(all,k==='uv'?2:3));}out.computeBoundingBox();out.computeBoundingSphere();return out;};
 function put(g,m,transform,parent=root,cell=null){if(recordingPipe){if(recordingPipe.built)g.dispose();else recordingPipe.geos.push(g);return;}g.applyMatrix4(transform);const key=parent.uuid+'/'+(cell??'castle')+'/'+m.uuid;let b=buckets.get(key);if(!b){b={geos:[],m,parent,cell};buckets.set(key,b);}b.geos.push(g);}
 const matrix=(x,y,z,angle=0)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();return dummy.matrix.clone();};
 const box=(w,h,d,x,y,z)=>new T.BoxGeometry(w,h,d).translate(x,y,z);
 const beam=(a,b,r,segments=8)=>{const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p),g=new T.CylinderGeometry(r,r,v.length(),segments);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,v.normalize()));return g.translate(...p.add(q).multiplyScalar(.5).toArray());};
 const tube=(pts,r,segments=12)=>new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),segments,r,7,false);
 const placements=buildingResult?.placements??[],buildings=buildingResult?.selectable??[];
 const byBuilding=new Map(),placementOwner=new Map();
 // A short probe behind the exterior wall identifies the original owning footprint.
 for(const p of placements){const back=[p.x-Math.sin(p.angle)*.2,p.z-Math.cos(p.angle)*.2];const b=buildings.find(b=>inside(back,b.ring));if(b){if(!byBuilding.has(b))byBuilding.set(b,[]);byBuilding.get(b).push(p);placementOwner.set(p,b);}}
 for(const b of buildings){if(b.feature?.properties?.tags?.building==='roof')continue;const ring=b.ring,h=b.height,owner=byBuilding.get(b)??[];
  for(let i=0;i<ring.length-1;i++){const a=ring[i],c=ring[i+1],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<5.2)continue;const sign=area(ring)>0?-1:1,nx=-(c[1]-a[1])/len*sign,nz=(c[0]-a[0])/len*sign,cx=(a[0]+c[0])/2,cz=(a[1]+c[1])/2,angle=Math.atan2(nx,nz),co=Math.cos(angle),si=Math.sin(angle),near=nearPath(cx,cz,nx,nz);if(!near.front||near.d>32||h<4)continue;
   const land=landAt(cx,cz),modern=['tomorrow','zootopia'].includes(land),metal=modern?zinc:['adventure','treasure'].includes(land)?copper:iron,px=len/2-.34;
   const windowConflict=owner.some(p=>{const localX=(p.x-cx)*co-(p.z-cz)*si,plane=(p.x-cx)*si+(p.z-cz)*co,half={classical:.75,modernWindow:.75,timber:2.1,modern:2.1}[p.type]??.75;return Math.abs(plane)<.03&&Math.abs(localX-px)<half+.07;});
   if(windowConflict){diagnostics.rejectedPipeOpenings++;continue;}
   const wx=cx+co*px,wz=cz-si*px;if(buildings.some(other=>other!==b&&[.24,.5].some(d=>inside([wx+nx*d,wz+nz*d],other.ring))))continue;const M=matrix(wx,0,wz,angle),cell=`${Math.floor(wx/32)},${Math.floor(wz/32)}`;
   const templateKey=h.toFixed(3);if(!pipeTemplates.has(templateKey))pipeTemplates.set(templateKey,{geos:[],built:false});recordingPipe=pipeTemplates.get(templateKey);const instanceKey=cell+'/'+metal.uuid+'/'+templateKey;if(!pipeInstances.has(instanceKey))pipeInstances.set(instanceKey,{template:recordingPipe,material:metal,matrices:[],cell});pipeInstances.get(instanceKey).matrices.push(M);
   // Axis exactly matches world-facades' existing .055 x .07 square downpipe.
   // A .054 radius cylinder encloses it instead of creating a duplicate beside it.
   put(beam([0,.2,.24],[0,h-.3,.24],.054,10),metal,M,root,cell);
   for(let y=.8;y<h-.15;y+=1.7){put(new T.CylinderGeometry(.089,.089,.096,12).translate(0,y+.04,.24),metal,M,root,cell);put(box(.116,.075,.09,0,y+.04,.205),metal,M,root,cell);for(const x of[-.046,.046])put(new T.SphereGeometry(.014,6,4).translate(x,y+.04,.316),metal,M,root,cell);}
   // Folded collector and offset neck stand beyond the existing cornice lip.
   put(tube([[0,h-.39,.24],[0,h-.22,.3],[0,h-.09,.44]],.054,7),metal,M,root,cell);
   put(new T.CylinderGeometry(.13,.065,.22,10,1,true).translate(0,h+.005,.44),metal,M,root,cell);
   put(new T.TorusGeometry(.13,.014,5,12).rotateX(Math.PI/2).translate(0,h+.115,.44),metal,M,root,cell);
   put(tube([[0,.32,.24],[0,.18,.27],[0,.13,.37],[0,.12,.49]],.056,8),metal,M,root,cell);
   // Open dark mouth; no cap over a visibly hollow downspout.
   put(new T.TorusGeometry(.056,.009,5,10).translate(0,.12,.49),metal,M,root,cell);
   recordingPipe.built=true;recordingPipe=null;diagnostics.pipes++;anchors.push({kind:'pipe',building:b.feature?.properties?.osm_id,x:wx,z:wz,height:h,angle,land});
  }
 }
 for(const template of pipeTemplates.values()){template.geometry=merge(template.geos);template.geos.forEach(g=>g.dispose());template.geos=[];}
 for(const b of pipeInstances.values()){const g=b.template.geometry,mesh=new T.InstancedMesh(g,b.material,b.matrices.length);mesh.name='detail_drain_'+b.cell;b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);chunks.push({mesh,box:mesh.boundingBox.clone(),castle:false,triangles:g.attributes.position.count/3*b.matrices.length});}
 // One repeated original guard design is instanced in spatial cells. No doors altered.
 const railParts=[],supportParts=[];
 for(const x of[-.84,.84]){railParts.push(beam([x,.83,.43],[x,1.58,.43],.024));railParts.push(beam([x,1.55,.43],[x,1.55,.01],.02));railParts.push(beam([x,.87,.43],[x,.87,.01],.02));railParts.push(box(.075,.095,.035,x,1.55,.0125));railParts.push(new T.SphereGeometry(.042,8,5).translate(x,1.61,.43));}
 railParts.push(beam([-.86,1.56,.43],[.86,1.56,.43],.027,10));railParts.push(beam([-.84,.88,.43],[.84,.88,.43],.018));
 for(const x of[-.56,0,.56]){railParts.push(beam([x,.89,.43],[x,1.52,.43],.012,6));for(const s of[-1,1]){const pts=[];for(let j=0;j<=18;j++){const a=j/18*Math.PI*1.8,r=.135*(1-j/24);pts.push([x+s*(.04+Math.sin(a)*r),1.2+Math.cos(a)*r,.43]);}railParts.push(tube(pts,.009,18));}}
 // Corbels tuck under the actual sill: opening .36, sill base .21, front .275.
 const profile=new T.Shape();profile.moveTo(.015,-.07);profile.lineTo(.245,.21);profile.lineTo(.015,.21);profile.closePath();
 for(const x of[-.38,.38]){const g=new T.ExtrudeGeometry(profile,{depth:.13,bevelEnabled:true,bevelThickness:.009,bevelSize:.009,bevelSegments:1,steps:1});g.rotateY(Math.PI/2);g.translate(x-.065,0,.26);supportParts.push(g);}
 const railGeo=merge(railParts),supportGeo=merge(supportParts);railGeo.translate(0,-.54,0);railParts.forEach(g=>g.dispose());supportParts.forEach(g=>g.dispose());
 const instanced=new Map();let guardIndex=0;
 for(const p of placements){if(p.type!=='classical'||p.y<3||p.y>8)continue;const land=landAt(p.x,p.z);if(!['mickey','fantasy','gardens'].includes(land))continue;const own=placementOwner.get(p),co=Math.cos(p.angle),si=Math.sin(p.angle);if(!own||[-.89,.89].some(x=>!inside([p.x+co*x-si*.035,p.z-si*x-co*.035],own.ring)))continue;const n=nearPath(p.x,p.z,si,co);if(!n.front||n.d>27||guardIndex++%2)continue;const key=`${Math.floor(p.x/32)},${Math.floor(p.z/32)}`;if(!instanced.has(key))instanced.set(key,[]);instanced.get(key).push(p);diagnostics.guards++;anchors.push({kind:'guard',x:p.x,y:p.y,z:p.z,angle:p.angle,land});}
 for(const [cell,list]of instanced)for(const [geo,m]of[[railGeo,iron],[supportGeo,stone]]){const mesh=new T.InstancedMesh(geo,m,list.length);mesh.name='detail_window_guards_'+cell;list.forEach((p,i)=>mesh.setMatrixAt(i,matrix(p.x,p.y,p.z,p.angle)));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);chunks.push({mesh,box:mesh.boundingBox.clone(),castle:false,triangles:(geo.index?.count??geo.attributes.position.count)/3*list.length});}
 if(castle){
  castle.updateWorldMatrix(true,true);const inv=castle.matrixWorld.clone().invert(),query=new T.Group();
  // Build a tiny temporary ray query from the lower 2.65 m only. Full-castle
  // brute-force raycasts on every new block would otherwise delay startup.
  castle.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const g=o.geometry,p=g.attributes.position,index=g.index,M=inv.clone().multiply(o.matrixWorld),pos=[],v=[new T.Vector3(),new T.Vector3(),new T.Vector3()];for(let i=0;i<(index?.count??p.count);i+=3){for(let j=0;j<3;j++)v[j].fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(M);if(Math.min(...v.map(p=>p.y))>2.65||Math.max(...v.map(p=>p.y))<.5)continue;for(const q of v)pos.push(...q.toArray());}if(!pos.length)return;const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));geom.computeVertexNormals();geom.computeBoundingSphere();const mesh=new T.Mesh(geom,o.material);mesh.userData.source=o;query.add(mesh);});query.updateMatrixWorld(true);
  const ray=new T.Raycaster(),dir=new T.Vector3(0,0,-1),castleRoot=new T.Group();castleRoot.name='castle_fitted_rusticated_base';castle.add(castleRoot);ownedRoots.push(castleRoot);
  const hit=(x,y)=>{ray.set(new T.Vector3(x,y,25),dir);return ray.intersectObjects(query.children,false)[0];};
  for(const side of[-1,1])for(let row=0;row<3;row++)for(let col=0;col<10;col++){
   const x=side*(5.4+col*1.03+(row%2)*.29),y=.98+row*.47,w=.985,h=.425,samples=[[x,y],[x-w/2,y-h/2],[x+w/2,y-h/2],[x-w/2,y+h/2],[x+w/2,y+h/2]].map(([x,y])=>hit(x,y));
   const first=samples[0],valid=first&&/palace_(peach_sandstone|carved_limestone|warm_rose_masonry|ivory_tower_stone)$/.test(first.object.material.name)&&samples.every(p=>p&&p.object.material===first.object.material&&p.face.normal.z>.985&&Math.abs(p.point.z-first.point.z)<.009);
   if(!valid){diagnostics.rejectedCastleBlocks++;continue;}
   const z=first.point.z,shape=new T.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelThickness:.008,bevelSize:.012,bevelSegments:1,steps:1});
   // Preserve the exact parent stone material and its show shader callback.
   // Source-owned material/textures must never be disposed by this module.
   const uv=g.attributes.uv;for(let j=0;j<uv.count;j++)uv.setXY(j,(uv.getX(j)+x)/2.3,(uv.getY(j)+y)/2.3);
   put(g,first.object.material,matrix(x,y,z+.003),castleRoot,'base');diagnostics.castleBlocks++;castleChecks.push({x,y,z,w,h,material:first.object.material.name,maxPlaneError:Math.max(...samples.map(p=>Math.abs(p.point.z-z)))});
  }
  query.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
 }
 for(const b of buckets.values()){const geo=merge(b.geos);b.geos.forEach(g=>g.dispose());const mesh=new T.Mesh(geo,b.m);mesh.name=b.parent===root?'detail_drain_'+b.cell:'castle_rusticated_stone';mesh.receiveShadow=true;b.parent.add(mesh);b.parent.updateWorldMatrix(true,false);const box=geo.boundingBox.clone().applyMatrix4(b.parent.matrixWorld);chunks.push({mesh,box,castle:b.parent!==root,triangles:geo.attributes.position.count/3});}
 diagnostics.triangles=chunks.reduce((s,c)=>s+c.triangles,0);diagnostics.meshes=chunks.length;
 let high=true,last=-Infinity,lastPosition=new T.Vector3(Infinity,Infinity,Infinity);const cameraPosition=new T.Vector3();
 function update(t,camera){if(!camera||t-last<.25)return;camera.getWorldPosition(cameraPosition);if(cameraPosition.distanceToSquared(lastPosition)<1&&last!==-Infinity)return;last=t;lastPosition.copy(cameraPosition);diagnostics.visibleTriangles=diagnostics.visibleMeshes=0;for(const c of chunks){const range=c.castle?(high?125:90):(high?64:42),visible=cameraPosition.y<115&&c.box.distanceToPoint(cameraPosition)<range;c.mesh.visible=visible;if(visible){diagnostics.visibleTriangles+=c.triangles;diagnostics.visibleMeshes++;}}}
 // Hide until first update; avoids flashing all park details during initial frames.
 chunks.forEach(c=>c.mesh.visible=false);
 return{root,diagnostics,update,setQuality(value){high=!!value;last=-Infinity;},dispose(){const geos=new Set(chunks.map(c=>c.mesh.geometry));geos.add(railGeo);geos.add(supportGeo);for(const g of geos)g.dispose();for(const m of ownedMaterials)m.dispose();for(const c of chunks)c.mesh.removeFromParent();for(const r of ownedRoots)r.removeFromParent();root.removeFromParent();}};
}
