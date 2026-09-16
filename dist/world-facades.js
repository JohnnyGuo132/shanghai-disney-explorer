import * as T from 'three';
import {area,distance,polygon,nearestSegment,inside} from './world-geometry.js';
const interior=new T.MeshStandardMaterial({color:'#282a26',roughness:1,side:T.DoubleSide});
const timberMaterials=new Map();

// Façades are constructed as thick walls with real apertures. Interiors sit
// behind those apertures, so the depth survives changes in viewing angle.
export function buildFacade({ring,height,land,wall,roof,trim,add,box,paths,placements,kit,rand}){
 if(!timberMaterials.has(land))timberMaterials.set(land,new T.MeshStandardMaterial({color:land==='treasure'?'#5c4937':'#77725d',roughness:.87}));
 const timber=timberMaterials.get(land);
 const center=ring.reduce((a,p)=>[a[0]+p[0]/ring.length,a[1]+p[1]/ring.length],[0,0]);
 add(polygon([ring],height,2.4),roof);add(polygon([ring],.13,2),interior);
 for(let edge=0;edge<ring.length-1;edge++){
  const a=ring[edge],b=ring[edge+1],length=distance(a,b);if(length<.3)continue;
  const sign=area(ring)>0?-1:1,nx=-(b[1]-a[1])/length*sign,nz=(b[0]-a[0])/length*sign,angle=Math.atan2(nx,nz),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
  const world=(x,y,z)=>[cx+Math.cos(angle)*x+nx*z,y,cz-Math.sin(angle)*x+nz*z];
  const block=(w,h,d,material,x,y,z)=>{const p=world(x,y,z),m=box(w,h,d,material,...p);m.rotation.y=angle;return m;};
  let nearest=Infinity,front=false;for(const path of paths){if(path.private)continue;for(let i=1;i<path.points.length;i++){const n=nearestSegment([cx,cz],path.points[i-1],path.points[i]);if(n.distance<nearest){nearest=n.distance;front=(n.point[0]-cx)*nx+(n.point[1]-cz)*nz>0;}}}
  const shape=new T.Shape();shape.moveTo(-length/2,0);shape.lineTo(length/2,0);shape.lineTo(length/2,height);shape.lineTo(-length/2,height);shape.closePath();
  const openings=[];const classic=!['tomorrow','zootopia'].includes(land),rural=['adventure','treasure','toy'].includes(land),shopType=rural?'timber':classic?'timber':'modern',spacing=3.65,columns=Math.floor((length-.7)/spacing),rows=Math.min(4,Math.floor((height-.5)/3.4));
  function aperture(type,x,y){const spec=kit[type],hole=spec.opening;const [x0,y0,x1,y1]=hole;const depth=spec.depth??(type==='classical'?1.6:type==='timber'?1.8:2),halfWidth=spec.halfWidth??(type==='classical'?.75:2.1);for(const xx of [x-halfWidth,x+halfWidth]){const back=world(xx,y,-(depth+.09));if(!inside([back[0],back[2]],ring))return;}if(y+y1>=height-.35||x+x0<=-length/2+.2||x+x1>=length/2-.2)return;
   const p=new T.Path();p.moveTo(x+x0,y+y0);p.lineTo(x+x0,y+y1);p.lineTo(x+x1,y+y1);p.lineTo(x+x1,y+y0);p.closePath();shape.holes.push(p);openings.push({x,y,w:x1-x0,h:y1-y0});
   const location=world(x,y,0);placements.push({type,x:location[0],y:location[1],z:location[2],angle});
   // The dark back plane remains at all distances. It is behind the complete
   // furnished room, never coplanar with the visible glazing.
   block(x1-x0,y1-y0,.06,interior,x+(x0+x1)/2,y+y0,-(depth+.06));
   const sillY=y+y0-.15;block(x1-x0+.25,.14,.35,trim,x+(x0+x1)/2,sillY,.1);
   for(const sx of[x+x0-.06,x+x1+.06])block(.12,y1-y0+.16,.16,trim,sx,y+y0-.08,-.04);
   block(x1-x0+.38,.14,.23,trim,x+(x0+x1)/2,y+y1+.02,.01);
  }
  const street=nearest<45&&front&&length>6.2;
  const shop=street&&height>4.3;
  if(shop)aperture(shopType,0,.12);
  if(nearest<95||Math.abs(area(ring))<1800){for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const x=(col-(columns-1)/2)*spacing,y=.55+row*3.4;if(row===0&&shop&&Math.abs(x)<3.4)continue;aperture(classic?'classical':'modernWindow',x,y);}}
  const geometry=new T.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:false,curveSegments:1});geometry.translate(0,0,-.32);const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.3,uv.getY(i)/2.3);geometry.rotateY(angle);geometry.translate(cx,0,cz);add(geometry,wall);
  block(length+.1,.35,.42,trim,0,.08,-.1);
  block(length+.12,.15,.34,trim,0,height-.45,.05);block(length+.24,.17,.46,trim,0,height-.2,.08);block(length+.33,.08,.58,trim,0,height-.02,.08);
  if(rows>1)for(let row=1;row<rows;row++)block(length,.09,.1,trim,0,row*3.4+.22,.025);
  if(classic&&length>3){for(const x of[-length/2+.2,length/2-.2]){for(let y=.55;y<height-.7;y+=.52)block(.32,.38,.1,trim,x,y,.015);}}
  if(rural&&street){for(let x=-length/2+.6;x<length/2;x+=4.3)block(.16,height-.8,.23,timber,x,.35,.08);block(length,.19,.25,timber,0,height-.7,.1);}
  if(nearest<60&&length>5){const x=length/2-.34;block(.055,height-.5,.07,timber,x,.2,.24);for(let y=.8;y<height;y+=1.7)block(.1,.08,.13,trim,x,y,.24);}
 }
 if(Math.abs(area(ring))<500&&!['tomorrow','zootopia'].includes(land)){
  const verts=[],uv=[],h=height+Math.min(4.5,Math.sqrt(Math.abs(area(ring)))*.13);for(let i=0;i<ring.length-1;i++){let p=ring[i],q=ring[i+1];if(area(ring)>0)[p,q]=[q,p];verts.push(p[0],height,p[1],q[0],height,q[1],center[0],h,center[1]);uv.push(p[0]/2,p[1]/2,q[0]/2,q[1]/2,center[0]/2,center[1]/2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();add(g,roof);
  if(rand()>.55){const m=box(.9,1.8,.95,wall,center[0],h-.45,center[1]);box(1.12,.17,1.12,trim,m.position.x,h+1.28,m.position.z);}
 }
}

export function createFacadeDetails(scene,sources,placements,emissive){
 const groups=[];for(const[type,source]of Object.entries(sources)){source.updateMatrixWorld(true);const entries=placements.filter(p=>p.type===type),meshes=[];source.traverse(o=>{if(!o.isMesh)return;const material=o.material.clone(),name=material.name||'';material.envMapIntensity=.35;if(/glass/i.test(name)){material.transparent=true;material.opacity=.15;material.depthWrite=false;material.roughness=.16;material.metalness=0;material.emissiveIntensity=0;}else if(/interior_light|lamp|bulb/i.test(name)){emissive.push({material,intensity:1.4});}else{material.roughness=Math.max(.68,material.roughness);if(o.name.startsWith('interior__')){material.emissive=new T.Color('#d9ae78');material.emissiveMap=material.map;emissive.push({material,intensity:.68});
  // An analytic warm ceiling wash varies across the room, leaving recesses dark.
  // Geometry positions here are in module space, before the facade instance transform.
  const ceiling=type==='classical'||type==='modernWindow'?2.15:2.95,depth=type==='modern'?2:type==='timber'?1.8:1.6;
  material.onBeforeCompile=shader=>{shader.uniforms.uRoomLamp={value:new T.Vector3(0,ceiling,-depth*.53)};shader.vertexShader='varying vec3 vRoomPosition;varying vec3 vRoomNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoomPosition=position;vRoomNormal=normal;');shader.fragmentShader='varying vec3 vRoomPosition;varying vec3 vRoomNormal;uniform vec3 uRoomLamp;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nvec3 roomLight=uRoomLamp-vRoomPosition;float roomDistance=length(roomLight);float roomFacing=.3+.7*max(dot(normalize(vRoomNormal),normalize(roomLight)),0.);float roomWash=.17+.95*roomFacing/(1.+roomDistance*roomDistance*.43);totalEmissiveRadiance*=roomWash;');};material.customProgramCacheKey=()=> 'room-lamp-v9-'+type;
}}
   const mesh=new T.InstancedMesh(o.geometry.clone().applyMatrix4(o.matrixWorld),material,entries.length);mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;scene.add(mesh);meshes.push(mesh);});groups.push({entries,meshes});}
 const dummy=new T.Object3D();let last=-1,high=true;const lastPosition=new T.Vector3(Infinity,0,0);
 return{count:placements.length,setQuality:v=>{high=v;last=-1;},update(t,camera){if(last>=0&&t-last<.35)return;if(last>=0&&camera.position.distanceToSquared(lastPosition)<1)return;last=t;lastPosition.copy(camera.position);for(const {entries,meshes}of groups){let count=0;for(const p of entries){const d=Math.hypot(camera.position.x-p.x,camera.position.z-p.z);if(d>(high?190:115)||camera.position.y>180)continue;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(1);dummy.updateMatrix();for(const mesh of meshes)mesh.setMatrixAt(count,dummy.matrix);count++;}for(const mesh of meshes){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}}}};
}
