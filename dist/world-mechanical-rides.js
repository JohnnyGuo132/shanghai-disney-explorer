import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// These are original interpretations of the visible ride mechanisms.
export function createMechanicalRides(scene,data,materials,woodyAsset){
 const rides=[],animated=[],emissive=[];
 const metal=new T.MeshStandardMaterial({color:'#bac5ca',metalness:.72,roughness:.38}),dark=new T.MeshStandardMaterial({color:'#26363e',metalness:.5,roughness:.58}),blue=new T.MeshStandardMaterial({color:'#497aa0',metalness:.35,roughness:.45}),seat=new T.MeshStandardMaterial({color:'#263a4a',roughness:.92}),cream=new T.MeshStandardMaterial({color:'#d5c8a0',roughness:.8}),brown=new T.MeshStandardMaterial({color:'#8e5126',roughness:.74}),rubber=new T.MeshStandardMaterial({color:'#232927',roughness:.95});
 const glow=new T.MeshStandardMaterial({color:'#91bde0',emissive:'#76b9f3',roughness:.35});emissive.push({material:glow,intensity:1.6});
 const add=(g,m,parent,x=0,y=0,z=0)=>{if(m===materials.paving){const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+x)/2,(p.getZ(i)+z)/2);}const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,p,x,y,z)=>add(new T.BoxGeometry(w,h,d),m,p,x,y,z);
 const cyl=(rt,rb,h,m,p,x=0,y=0,z=0,n=24)=>add(new T.CylinderGeometry(rt,rb,h,n),m,p,x,y,z);
 function pipe(points,r,m,p,n=24){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),n,r,6,false),m,p);}
 function strut(a,b,r,m,p){const v=new T.Vector3(...a),w=new T.Vector3(...b),d=w.clone().sub(v),o=cyl(r,r,d.length(),m,p);o.position.copy(v.add(w).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
 function merge(root){root.updateMatrixWorld(true);const buckets=new Map(),old=[];root.traverse(o=>{if(!o.isMesh)return;const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix);if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);old.push(o);});old.forEach(o=>o.removeFromParent());for(const[m,geos]of buckets){add(mergeGeometries(geos,false),m,root);geos.forEach(g=>g.dispose());}}
 function make(key){const p=data.landmarks.find(v=>v.key===key),g=new T.Group();g.position.set(p.x,.15,p.z);g.userData.landmark=key;g.userData.pickHeight=key==='jetpacks'?10:6;scene.add(g);rides.push({key,group:g});return g;}
 function fence(g,r,mat){for(let i=0;i<72;i++){const a=i/72*Math.PI*2;if(i>15&&i<20)continue;strut([Math.cos(a)*r,.15,Math.sin(a)*r],[Math.cos(a)*r,1.22,Math.sin(a)*r],.035,mat,g);}for(const y of [.35,1.18]){const points=[];for(let i=20;i<=87;i++){const a=i/72*Math.PI*2;points.push([Math.cos(a)*r,y,Math.sin(a)*r]);}pipe(points,.032,mat,g,150);}}
 function restraint(g,x,y,z){pipe([[x-.24,y-.3,z],[x-.24,y+.25,z-.08],[x-.16,y+.4,z-.14],[x+.16,y+.4,z-.14],[x+.24,y+.25,z-.08],[x+.24,y-.3,z]],.045,rubber,g,20);}
 {
  const g=make('jetpacks'),fixed=new T.Group();g.add(fixed);cyl(18,18,.25,materials.paving,fixed,0,.125,0,96);fence(fixed,17.4,dark);cyl(2.7,3.5,1.4,metal,fixed,0,.9,0);cyl(1.7,2.5,5,blue,fixed,0,3.8,0);cyl(1.82,1.82,.12,glow,fixed,0,3.5,0);cyl(1.3,1.7,1.6,metal,fixed,0,7.1,0);cyl(.05,1.3,2,metal,fixed,0,8.9,0);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;strut([Math.cos(a)*2.5,1.3,Math.sin(a)*2.5],[Math.cos(a)*1.75,4.2,Math.sin(a)*1.75],.05,dark,fixed);}
  merge(fixed);const rotor=new T.Group();g.add(rotor);
  for(let i=0;i<12;i++){const pivot=new T.Group();pivot.rotation.y=i/12*Math.PI*2;rotor.add(pivot);const arm=new T.Group();pivot.add(arm);
   strut([1.4,5.2,0],[14,4.4,0],.14,metal,arm);strut([1.9,4.55,0],[13.7,4.1,0],.09,dark,arm);strut([2.3,2.1,0],[7.3,4.6,0],.11,metal,arm);cyl(.23,.23,.65,blue,arm,2,5.2,0).rotation.x=Math.PI/2;merge(arm);
   const pod=new T.Group();pod.position.set(14,3.5,0);pivot.add(pod);box(1.9,.22,1.6,metal,pod,0,0,0);box(1.85,1.4,.2,blue,pod,0,.65,.56);
   for(const x of[-.48,.48]){box(.62,.18,.75,seat,pod,x,.25,-.1);const back=box(.62,1,.2,seat,pod,x,.79,.33);back.rotation.x=-.12;restraint(pod,x,.82,-.12);box(.55,.06,.38,dark,pod,x,-.44,-.75);strut([x,-.02,-.54],[x,-.43,-.71],.04,metal,pod);}
   for(const x of[-1.03,1.03]){cyl(.22,.29,1.5,metal,pod,x,.62,.22);cyl(.16,.22,.28,dark,pod,x,-.27,.22);cyl(.15,.15,.03,glow,pod,x,-.42,.22);for(const yy of [.23,.87])cyl(.25,.25,.07,blue,pod,x,yy,.22);}
   merge(pod);animated.push(t=>{const lift=Math.sin(t*.42+i*.52)*.055;arm.rotation.z=lift;pod.position.y=3.5+lift*13;});
  }animated.push(t=>rotor.rotation.y=t*.075);
 }
 {
  const g=make('slinky'),fixed=new T.Group();g.add(fixed);cyl(13,13,.23,materials.paving,fixed,0,.115,0,96);fence(fixed,12.4,brown);
  const path=a=>[Math.cos(a)*8.6,1.3+.6*Math.sin(a*2),Math.sin(a)*8.6];
  for(const side of[-.6,.6]){const points=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2,p=path(a);points.push([p[0]+Math.cos(a)*side,p[1],p[2]+Math.sin(a)*side]);}pipe(points,.095,dark,fixed,190);}
  for(let i=0;i<60;i++){const a=i/60*Math.PI*2,p=path(a);strut([p[0]-Math.cos(a)*.78,p[1]-.12,p[2]-Math.sin(a)*.78],[p[0]+Math.cos(a)*.78,p[1]-.12,p[2]+Math.sin(a)*.78],.08,metal,fixed);if(i%4===0)strut([p[0],.2,p[2]],[p[0],p[1]-.1,p[2]],.13,brown,fixed);}
  cyl(2.4,2.65,.75,brown,fixed,0,.6,0,64);cyl(2.25,2.25,.12,cream,fixed,0,1,0,64);for(let i=0;i<25;i++){const a=i*2.4,r=Math.sqrt(i/25)*2;const o=add(new T.SphereGeometry(.27,8,6),brown,fixed,Math.cos(a)*r,1.16,Math.sin(a)*r);o.scale.y=.7;}merge(fixed);
  const cars=[];for(let i=0;i<15;i++){const car=new T.Group();g.add(car);box(1.8,.25,1.28,brown,car,0,.18,0);box(1.8,.66,.16,cream,car,0,.61,.48);box(1.6,.18,.76,seat,car,0,.4,-.03);for(const x of[-.87,.87])box(.12,.62,1.2,brown,car,x,.57,0);for(const x of[-.43,.43])restraint(car,x,.76,-.35);
   for(const z of[-.43,.43])for(const x of[-.65,.65]){const wheel=cyl(.23,.23,.12,rubber,car,x,-.02,z,16);wheel.rotation.z=Math.PI/2;}
   const spring=[];for(let k=0;k<=90;k++){const a=k/90*Math.PI*8;spring.push([Math.cos(a)*1.06,.7+Math.sin(a)*.95,.7+k/90*.5]);}pipe(spring,.048,metal,car,90);merge(car);cars.push(car);
  }
  const head=new T.Group();g.add(head);const body=add(new T.SphereGeometry(1,24,18),brown,head,0,1,0);body.scale.set(1,1.2,.9);const muzzle=add(new T.SphereGeometry(.65,20,14),cream,head,0,.62,-.82);muzzle.scale.set(1.25,.62,1);const nose=add(new T.SphereGeometry(.32,16,12),rubber,head,0,.79,-1.39);nose.scale.set(1,.7,.7);for(const x of[-.45,.45]){const eye=add(new T.SphereGeometry(.28,16,12),cream,head,x,1.62,-.68);eye.scale.z=.55;add(new T.SphereGeometry(.12,12,8),rubber,head,x,1.63,-.84);const ear=add(new T.SphereGeometry(.6,18,12),brown,head,x*2.3,.6,.05);ear.scale.set(.43,1.9,.48);}merge(head);
  const tail=new T.Group();g.add(tail);const hind=add(new T.SphereGeometry(.85,20,14),brown,tail,0,.8,0);hind.scale.set(1,1,.8);pipe([[0,1,.4],[0,1.6,.9],[.3,2,1.3],[.6,1.7,1.3]],.10,brown,tail);merge(tail);
  animated.push(t=>{function place(o,a){const p=path(a);o.position.set(p[0],p[1]+.345,p[2]);o.rotation.set(0,-a,0);o.rotateX(-Math.atan(1.2/8.6*Math.cos(a*2)));}cars.forEach((o,i)=>place(o,-t*.13+i*.315));place(head,-t*.13-.3);place(tail,-t*.13+15*.315);});
 }
 if(woodyAsset){
  const g=make('woody'),fixed=new T.Group();g.add(fixed);cyl(13.2,13.2,.22,materials.paving,fixed,0,.11,0,96);fence(fixed,12.85,brown);cyl(2.7,2.7,.45,materials.wall,fixed,0,.45,0,48);cyl(1.8,2.5,.8,brown,fixed,0,1.05,0,48);merge(fixed);
  for(let i=0;i<6;i++){const wagon=woodyAsset.scene.clone(true);wagon.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=false;o.material.envMapIntensity=.5;}});g.add(wagon);const mixer=new T.AnimationMixer(wagon);woodyAsset.animations.forEach(clip=>mixer.clipAction(clip).play());animated.push(t=>{const a=t*.11+i/6*Math.PI*2;wagon.position.set(Math.cos(a)*8.6,.24,Math.sin(a)*8.6);wagon.rotation.y=-a;mixer.setTime(t+i*.9);});}
 }
 return{rides,animated,emissive};
}
