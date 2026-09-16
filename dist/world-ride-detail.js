import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Original mechanical/boarding detail, MIT. Uses the existing metre-scaled ride
// hierarchy; does not move rides, replace their animation or claim surveyed detail.
export function createRideDetails(scene,{rides=[],data,materials={}}={}){
 const owned=[],records=[],followers=[],changes=[],warnings=[];let high=true,disposed=false;
 const color=(name,c,r,m=0)=>{const v=new T.MeshStandardMaterial({name:'ride_detail_'+name,color:c,roughness:r,metalness:m,envMapIntensity:.65});owned.push(v);return v;};
 const steel=color('brushed_stainless','#a5b5bc',.37,.78),dark=color('rubber_and_brake','#23323a',.87,.12),brass=color('antique_brass','#bb9855',.37,.70),ivory=color('ivory_enamel','#e6d6ae',.43,.15),blue=color('blue_operator_enamel','#345978',.42,.30),violet=color('purple_station_steel','#765489',.47,.42),orange=color('safety_ochre','#e8b253',.54,.10),aqua=color('dumbo_seat_enamel','#73a3a5',.45,.17),red=color('emergency_button','#b53033',.53);
 const world=new T.Vector3(),cameraPosition=new T.Vector3(),up=new T.Vector3(0,1,0),matrix=new T.Matrix4(),inverse=new T.Matrix4();
 const tri=g=>(g.index?.count??g.attributes.position.count)/3;
 const group=(parent,name)=>{const g=new T.Group();g.name=name;g.userData.rideDetail=true;parent.add(g);return g;};
 function batch(parent,name){
  const root=group(parent,name),parts=new Map();
  function add(g,m,p=[0,0,0],q=null,s=null){const transform=new T.Matrix4().compose(new T.Vector3(...p),q||new T.Quaternion(),s?new T.Vector3(...s):new T.Vector3(1,1,1));g.applyMatrix4(transform);for(const attr of Object.keys(g.attributes))if(!['position','normal','uv'].includes(attr))g.deleteAttribute(attr);if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!parts.has(m))parts.set(m,[]);parts.get(m).push(g);}
  const rotate=(x=0,y=0,z=0)=>new T.Quaternion().setFromEuler(new T.Euler(x,y,z));
  const box=(w,h,d,m,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>add(new T.BoxGeometry(w,h,d),m,[x,y,z],rotate(rx,ry,rz));
  const cylinder=(rt,rb,h,m,x=0,y=0,z=0,rx=0,rz=0,n=14)=>add(new T.CylinderGeometry(rt,rb,h,n),m,[x,y,z],rotate(rx,0,rz));
  function beam(a,b,r,m,n=8){const v=new T.Vector3(...a),w=new T.Vector3(...b),d=w.clone().sub(v),q=new T.Quaternion().setFromUnitVectors(up,d.clone().normalize());add(new T.CylinderGeometry(r,r,d.length(),n),m,v.add(w).multiplyScalar(.5).toArray(),q);}
  function pipe(points,r,m,segments=28){add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,7,false),m);}
  function ring(radius,tube,m,y=0,arc=Math.PI*2,start=0){const g=new T.TorusGeometry(radius,tube,8,Math.max(12,Math.round(96*arc/(Math.PI*2))),arc);g.rotateX(Math.PI/2);g.rotateY(start);add(g,m,[0,y,0]);}
  function finish(){for(const[m,geos]of parts){const geometry=mergeGeometries(geos,false);if(!geometry)throw Error('Ride detail geometry merge failed');geos.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,m);mesh.name=name+'__'+m.name;mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.rideDetail=true;mesh.raycast=()=>{};root.add(mesh);}parts.clear();return root;}
  return{root,add,box,cylinder,beam,pipe,ring,finish,rotate};
 }
 function entry(ride){const near=group(ride.group,'ride_detail_near_'+ride.key),medium=group(ride.group,'ride_detail_medium_'+ride.key),record={key:ride.key,anchor:ride.group,near,medium};records.push(record);return record;}
 function flange(b,x,y,z,r=.105){b.cylinder(r,r,.045,steel,x,y,z,0,0,16);for(let i=0;i<4;i++){const a=i*Math.PI*.5+.3;b.cylinder(.018,.018,.022,dark,x+Math.cos(a)*r*.67,y+.032,z+Math.sin(a)*r*.67,0,0,6);}}
 function controlDesk(b,x,y,z,paint=blue){
  // Sloping sealed console with a tapered pedestal, visor, controls and conduits.
  b.cylinder(.24,.34,.77,paint,x,y+.43,z,0,0,8);b.box(.95,.23,.66,paint,x,y+.94,z,-.20);b.box(.80,.026,.49,dark,x,y+1.07,z,-.20);b.box(.30,.028,.19,steel,x-.18,y+1.103,z-.04,-.20);b.box(.24,.009,.13,blue,x-.18,y+1.126,z-.04,-.20);
  for(let i=0;i<3;i++)b.cylinder(.032,.041,.035,i===2?red:ivory,x+.08+i*.12,y+1.116,z+.15,0,0,12);
  b.cylinder(.059,.066,.045,red,x+.31,y+1.14,z-.12,0,0,12);b.cylinder(.085,.085,.015,orange,x+.31,y+1.108,z-.12,0,0,14);
  b.pipe([[x,y+.12,z-.2],[x-.22,y+.10,z-.2],[x-.35,y+.12,z-.34],[x-.35,y+.86,z-.34]],.025,dark,14);flange(b,x,y+.028,z,.37);
 }
 function guard(b,a,z,length,y,mat){for(let i=0;i<=Math.round(length/.72);i++){const x=a+i*length/Math.round(length/.72);b.beam([x,y,z],[x,y+1.1,z],.034,mat);flange(b,x,y+.03,z,.08);}b.beam([a,y+1.10,z],[a+length,y+1.10,z],.043,mat);b.beam([a,y+.46,z],[a+length,y+.46,z],.025,steel);}
 function staircase(b,x,z,top,paint){const n=16,run=.30,width=1.58;for(let i=0;i<n;i++){const xx=x+i*run,h=top-i*(top-.70)/n;b.box(run+.028,.075,width,steel,xx,h,z);b.box(.04,.025,width,orange,xx-run*.40,h+.048,z);}
  for(const side of[-1,1]){const zz=z+side*(width*.5-.03);b.beam([x-.12,top-.18,zz],[x+n*run,.62,zz],.09,paint);b.beam([x-.12,top+1.07,zz],[x+n*run,1.72,zz],.038,steel);for(let i=0;i<n;i+=3){const xx=x+i*run,h=top-i*(top-.70)/n;b.beam([xx,h,zz],[xx,h+1.07,zz],.027,paint);}}}
 function instancedFollowers(record,prototype,targets){
  const dynamic=[];prototype.traverse(o=>{if(!o.isMesh)return;const mesh=new T.InstancedMesh(o.geometry,o.material,targets.length);mesh.name='ride_detail_followers_'+record.key+'_'+o.material.name;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;mesh.raycast=()=>{};mesh.userData.rideDetail=true;record.near.add(mesh);dynamic.push(mesh);});
  followers.push({record,targets:targets.map(t=>({...t,correction:t.cancelScale?new T.Matrix4().makeScale(1/t.object.scale.x,1/t.object.scale.y,1/t.object.scale.z):new T.Matrix4()})),meshes:dynamic});prototype.removeFromParent();
 }
 const find=k=>rides.find(r=>r.key===k);
 {
  const ride=find('carousel');if(ride){const record=entry(ride),b=batch(record.medium,'carousel_entry_and_skirt'),fine=batch(record.near,'carousel_hinges_and_controls');
   // Matches asset: deck top .70m, stationary step .18m, front opening at +Z.
   for(const y of[.24,.49])b.ring(11.84,.045,brass,y);
   for(let i=0;i<48;i++){const a=i/48*Math.PI*2,x=Math.sin(a)*11.84,z=Math.cos(a)*11.84;b.cylinder(.048,.061,.20,ivory,x,.365,z,0,0,10);fine.cylinder(.024,.024,.025,brass,x,.49,z,0,0,8);}
   // A true inclined threshold, kept inside the pre-existing fence openings.
   const ramp=new T.BufferGeometry(),verts=[-1.25,.18,12.95,1.25,.18,12.95,-1.25,.70,11.40,1.25,.70,11.40];ramp.setAttribute('position',new T.Float32BufferAttribute(verts,3));ramp.setIndex([0,1,2,1,3,2]);ramp.computeVertexNormals();b.add(ramp,ivory);
   for(let i=1;i<8;i++){const z=12.95-i*1.55/8,y=.18+i*.52/8;b.box(2.36,.015,.045,brass,0,y+.012,z);}
   for(const side of[-1,1]){const x=side*1.46,z=12.52;fine.cylinder(.06,.08,1.34,brass,x,.85,z,0,0,16);flange(fine,x,.21,z,.13);for(const y of[.48,1.21])fine.cylinder(.085,.085,.13,steel,x,y,z,0,0,12);
    // Open gate leaf swings toward the perimeter; a clear central boarding lane.
    const end=[x+side*.80,1.35,z-.70];fine.beam([x,1.35,z],end,.034,dark);fine.beam([x,.53,z],[end[0],.53,end[2]],.026,dark);for(let i=1;i<=5;i++){const q=i/5;fine.beam([x+side*.80*q,.53,z-.70*q],[x+side*.80*q,1.35,z-.70*q],.018,brass);}
   }
   controlDesk(fine,1.92,.18,12.34,blue);b.finish();fine.finish();
   const rotor=ride.group.getObjectByName('rotor');if(rotor){const moving=batch(rotor,'ride_detail_rotating_pole_sockets');rotor.traverse(o=>{if(/^horse_\d+$/.test(o.name)){flange(moving,o.position.x,.741,o.position.z,.115);moving.cylinder(.065,.065,.14,brass,o.position.x,.826,o.position.z,0,0,12);}});const root=moving.finish();record.rotating=root;changes.push(root);}else warnings.push('carousel rotor missing: pole sockets skipped');
  }
 }
 {
  const ride=find('rex');if(ride){const record=entry(ride),b=batch(record.medium,'rex_elevated_boarding_galleries'),fine=batch(record.near,'rex_platform_gates_and_controls');
   // Original lower queue deck is .69m. Car footplate is ~3.89m when docked.
   // Separate upper boarding galleries align to it, outside the moving track.
   for(const side of[-1,1]){const z=side*5.30,y=3.76;b.box(14.15,.16,1.95,steel,0,y-.08,z);for(const x of[-6,-2,2,6]){b.beam([x,.73,z],[x,y-.16,z],.095,violet);b.beam([x-.52,.76,z],[x+.52,y-.20,z],.052,violet);}
    b.box(14.0,.023,.12,orange,0,y+.015,side*4.40);guard(b,-7,side*6.21,14,y,violet);staircase(b,7.18,z,y,violet);
    for(let i=0;i<52;i++)fine.box(.027,.018,1.64,dark,-6.90+i*.27,y+.013,z);
    for(let row=0;row<5;row++){const x=-2.8+row*1.27;for(const dx of[-.53,.53])fine.beam([x+dx,y,side*4.37],[x+dx,y+1.10,side*4.37],.025,violet);fine.beam([x-.53,y+.99,side*4.37],[x+.53,y+.99,side*4.37],.028,steel);fine.cylinder(.048,.048,.13,steel,x-.53,y+.67,side*4.37,0,0,12);fine.box(.14,.15,.06,dark,x+.47,y+.81,side*4.37);}
   }
   controlDesk(fine,-6.0,3.76,5.30,violet);b.finish();fine.finish();
   const car=ride.group.getObjectByName('car');if(car){const m=batch(car,'ride_detail_rc_guide_brakes');
    for(const x of[-2.47,2.47])for(const side of[-1,1]){const z=side*1.64;
     m.box(.78,.16,.35,violet,x,-.09,z);m.cylinder(.115,.115,.16,dark,x-.23,-.39,z,Math.PI/2,0,18);m.cylinder(.115,.115,.18,steel,x+.23,-.39,z,Math.PI/2,0,18);
     m.box(.22,.48,.07,steel,x, -.19,z+side*.21);m.box(.46,.10,.22,dark,x,-.23,z);m.cylinder(.073,.073,.30,steel,x,.09,z,0,Math.PI/2,16);m.cylinder(.035,.035,.49,steel,x+.20,.09,z,0,Math.PI/2,12);
     for(const dx of[-.28,.28])m.cylinder(.026,.026,.034,brass,x+dx,.012,z,0,0,6);
     m.pipe([[x,.20,z+side*.22],[x+.35,.33,z+side*.25],[x+.65,.41,z],[x+.65,.48,side*.78]],.019,dark,14);
    }
    for(let row=0;row<5;row++)for(let col=0;col<4;col++){const x=-2.8+row*1.27,z=(col-1.5)*.88;m.box(.12,.17,.06,steel,x+.31,2.27,z+.38);m.cylinder(.029,.029,.09,red,x+.25,2.28,z+.395,Math.PI/2,0,10);}
    record.car=m.finish();changes.push(record.car);
   }else warnings.push('rex car missing: dynamic hardware skipped');
  }
 }
 {
  const ride=find('dumbo');if(ride){const record=entry(ride),b=batch(record.medium,'dumbo_perimeter_and_hub'),fine=batch(record.near,'dumbo_gate_hardware');
   // Existing platform radius14m; clear front entry is 2.9m wide.
   for(let i=0;i<88;i++){const a=i/88*Math.PI*2;if(Math.abs(Math.sin(a))<.115&&Math.cos(a)>0)continue;const x=Math.sin(a)*13.65,z=Math.cos(a)*13.65;b.beam([x,.28,z],[x,1.30,z],.026,aqua);if(i%4===0)flange(fine,x,.29,z,.085);}
   for(const y of[.55,1.30]){const points=[];for(let i=0;i<=110;i++){const a=.13+i/110*(Math.PI*2-.26);points.push([Math.sin(a)*13.65,y,Math.cos(a)*13.65]);}b.pipe(points,.037,ivory,130);}
   for(const y of[.65,1.45,2.42])b.ring(2.055,.075,brass,y);for(const side of[-1,1]){fine.cylinder(.075,.095,1.3,brass,side*1.60,.89,13.48);fine.box(.29,.13,.18,ivory,side*1.60,1.32,13.48);}
   b.finish();fine.finish();
   const rotor=ride.group.children.find(o=>o.isGroup&&!o.userData.rideDetail&&o.children.some(c=>c.isMesh&&c.geometry?.type==='SphereGeometry'&&c.position.length()>10));
   if(rotor){const arms=batch(rotor,'ride_detail_dumbo_hydraulic_arms');const targets=rotor.children.filter(o=>o.isMesh&&o.geometry?.type==='SphereGeometry'&&Math.hypot(o.position.x,o.position.z)>10);
    targets.forEach((pod,i)=>{const a=Math.atan2(pod.position.z,pod.position.x),at=(r,y,side=0)=>[Math.cos(a)*r-Math.sin(a)*side,y,Math.sin(a)*r+Math.cos(a)*side];
     arms.beam(at(1.65,2.70),at(7.35,3.70),.11,aqua,12);arms.beam(at(7.35,3.70),at(10.73,3.43),.047,steel,12);arms.beam(at(2.0,3.0,.20),at(10.45,3.28,.20),.044,brass);
     for(const r of[1.7,10.7]){const y=r<2?2.73:3.42;arms.beam(at(r,y,-.25),at(r,y,.25),.17,steel,16);for(const side of[-1,1])arms.beam(at(r,y,side*.25),at(r,y,side*.30),.065,brass,6);}
    });record.rotating=arms.finish();changes.push(record.rotating);
    const prototype=batch(new T.Group(),'dumbo_open_cockpit');
    prototype.box(1.18,.13,.69,dark,0,.56,.04);prototype.box(1.16,.53,.12,aqua,0,.87,.39,-.12);for(const x of[-.56,.56]){prototype.pipe([[x,.61,-.3],[x,.92,-.30],[x,1.0,.24],[x,.87,.43]],.044,aqua,22);prototype.cylinder(.075,.075,.13,steel,x,.74,.25,0,Math.PI/2,16);}
    prototype.pipe([[-.53,.75,.22],[-.53,.92,-.33],[-.34,.91,-.43],[.34,.91,-.43],[.53,.92,-.33],[.53,.75,.22]],.040,steel,28);
    prototype.box(.18,.045,.09,dark,0,.91,-.43);prototype.box(.91,.075,.31,steel,0,-.16,-.80);for(let i=0;i<7;i++)prototype.box(.027,.010,.24,dark,-.36+i*.12,-.116,-.80);
    for(const x of[-.38,.38])prototype.beam([x,.20,-.35],[x,-.17,-.72],.035,aqua);
    const proto=prototype.finish();instancedFollowers(record,proto,targets.map(object=>({object,cancelScale:true})));record.pods=targets.length;
   }else warnings.push('dumbo rotor/pods missing: no dynamic attachments created');
  }
 }
 function update(_t,camera){if(disposed)return;if(camera)camera.getWorldPosition(cameraPosition);
  for(const r of records){r.anchor.getWorldPosition(world);const d=camera?world.distanceTo(cameraPosition):0;r.medium.visible=d<(high?270:180);r.near.visible=d<(high?115:72);if(r.rotating)r.rotating.visible=d<(high?160:95);if(r.car)r.car.visible=d<(high?150:95);}
  for(const f of followers){if(!f.record.near.visible)continue;f.record.anchor.updateWorldMatrix(true,true);inverse.copy(f.record.anchor.matrixWorld).invert();f.targets.forEach(({object,correction},i)=>{matrix.multiplyMatrices(inverse,object.matrixWorld).multiply(correction);f.meshes.forEach(mesh=>mesh.setMatrixAt(i,matrix));});f.meshes.forEach(mesh=>mesh.instanceMatrix.needsUpdate=true);}
 }
 function diagnostics(){const result={rides:[],warnings,materials:owned.length,drawCalls:0,triangles:0,visibleDrawCalls:0};for(const r of records){const roots=[r.medium,r.near,r.rotating,r.car].filter(Boolean),stats={key:r.key,drawCalls:0,triangles:0,movingCockpits:r.pods??0};for(const root of roots)root.traverse(o=>{if(o.isMesh){stats.drawCalls++;stats.triangles+=tri(o.geometry)*(o.isInstancedMesh?o.count:1);if(root.visible)result.visibleDrawCalls++;}});result.drawCalls+=stats.drawCalls;result.triangles+=stats.triangles;result.rides.push(stats);}return result;}
 function dispose(){if(disposed)return;disposed=true;const geos=new Set();for(const r of records)for(const root of[r.medium,r.near,r.rotating,r.car].filter(Boolean)){root.traverse(o=>{if(o.isMesh)geos.add(o.geometry);});root.removeFromParent();}geos.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());}
 update(0);return{update,setQuality(v){high=Boolean(v);},dispose,get diagnostics(){return diagnostics();},roots:records};
}
