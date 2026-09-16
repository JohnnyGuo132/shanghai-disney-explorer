import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
export function createModernWindow(source){
 const root=new T.Group(),mats=new Map();source.traverse(o=>{if(o.isMesh)mats.set(o.material.name,o.material);});
 const metal=new T.MeshStandardMaterial({name:'facade_brushed_aluminium',color:'#64727a',metalness:.65,roughness:.45}),glass=new T.MeshStandardMaterial({name:'facade_glass',color:'#c8e3e7',roughness:.13,transparent:true,opacity:.13}),plaster=new T.MeshStandardMaterial({name:'facade_interior_plaster',color:'#c4bb9f',roughness:.95}),wood=mats.get('facade_oak_wood')||new T.MeshStandardMaterial({name:'facade_oak_wood',color:'#82654b',roughness:.8}),fabric=new T.MeshStandardMaterial({name:'facade_curtain_linen',color:'#aeb7b5',roughness:1,side:T.DoubleSide}),light=new T.MeshStandardMaterial({name:'facade_interior_light',color:'#f6e5c9',emissive:'#ffc786',emissiveIntensity:.5});
 const buckets=new Map();function add(geometry,material,interior=true){const key=(interior?'interior__':'exterior__')+material.name;if(!buckets.has(key))buckets.set(key,{material,geometries:[]});buckets.get(key).geometries.push(geometry);}
 function box(w,h,d,x,y,z,material,interior=true){add(new T.BoxGeometry(w,h,d).translate(x,y+h/2,z),material,interior);}
 box(1.5,2.4,.06,0,0,-1.62,plaster);box(.04,2.4,1.6,-.73,0,-.8,plaster);box(.04,2.4,1.6,.73,0,-.8,plaster);box(1.5,.04,1.6,0,0,-.8,wood);box(1.5,.04,1.6,0,2.36,-.8,plaster);
 for(const x of[-.67,.67])box(.075,1.98,.15,x,.3,-.05,metal,false);for(const y of[.3,2.205])box(1.42,.075,.15,0,y,-.05,metal,false);box(.046,1.86,.065,0,.375,-.04,metal,false);box(1.28,.042,.065,0,1.5,-.04,metal,false);box(1.26,1.84,.013,0,.38,-.095,glass,false);box(1.49,.085,.32,0,.26,.075,metal,false);
 box(1.05,.06,.43,0,.74,-1.15,wood);for(const x of[-.43,.43])for(const z of[-1.3,-.99])box(.045,.74,.045,x,0,z,metal);box(.42,.07,.38,.08,.43,-.65,wood);box(.42,.45,.04,.08,.44,-.46,wood);for(const x of[-.1,.26])box(.04,.43,.04,x,0,-.65,metal);
 for(let i=0;i<4;i++)box(.16,.035,.24,-.25,.8+i*.036,-1.1,new T.MeshStandardMaterial({name:'facade_book_'+i,color:['#334f6d','#a48a62','#697568','#964f43'][i],roughness:.9}));
 for(const side of[-1,1]){const vertices=[];for(let i=0;i<20;i++){const x0=side*.56+(i/20-.5)*.2,x1=side*.56+((i+1)/20-.5)*.2,z0=-.2+Math.sin(i/20*Math.PI*8)*.024,z1=-.2+Math.sin((i+1)/20*Math.PI*8)*.024;vertices.push(x0,.32,z0,x1,.32,z1,x0,2.2,z0,x1,.32,z1,x1,2.2,z1,x0,2.2,z0);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();add(geo,fabric);}
 box(.24,.035,.24,0,2.2,-.9,light);box(.012,.15,.012,0,2.23,-.9,metal);

 // Original V9 furnishings use the existing material buckets. All new vertices
 // stay behind the 0.32 m host wall and inside the original room envelope.
 const bookMats=[0,1,2,3].map(i=>buckets.get('interior__facade_book_'+i).material);
 function cylinder(rt,rb,h,x,y,z,mat,n=12){add(new T.CylinderGeometry(rt,rb,h,n).translate(x,y+h/2,z),mat);}
 function sphere(r,x,y,z,mat){add(new T.SphereGeometry(r,10,6).translate(x,y,z),mat);}
 function beam(a,b,r,mat){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),g=new T.CylinderGeometry(r,r,d.length(),7);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate(...av.add(bv).multiplyScalar(.5).toArray());add(g,mat);}
 function book(x,y,z,w,h,color){box(w,h,.13,x,y,z,bookMats[color]);box(w-.008,h-.015,.007,x,y+.008,z+.067,plaster);for(const yy of[y+.025,y+h-.025])box(w*.8,.006,.004,x,yy,z+.072,metal);}
 // A full desk drawer and a reading lamp anchor the close foreground.
 box(.84,.105,.065,0,.615,-.910,wood);box(.73,.068,.008,0,.634,-.873,bookMats[2]);for(const x of[-.20,.20])sphere(.012,x,.668,-.860,metal);
 cylinder(.071,.077,.018,.31,.801,-1.15,metal,14);cylinder(.012,.017,.215,.31,.819,-1.15,metal,10);
 const shade=new T.LatheGeometry([[.10,0],[.065,.12],[.055,.12],[.085,0]].map(p=>new T.Vector2(...p)),18);shade.translate(.31,1.025,-1.15);add(shade,plaster);cylinder(.077,.077,.005,.31,1.029,-1.15,light,16);
 cylinder(.031,.027,.066,.115,.80,-1.025,plaster,14);const handle=new T.TorusGeometry(.019,.006,4,12).rotateY(Math.PI/2).translate(.15,.835,-1.025);add(handle,plaster);
 box(.20,.032,.13,.085,.80,-1.235,bookMats[0]);box(.188,.021,.12,.085,.805,-1.233,plaster);box(.012,.004,.086,.115,.834,-1.231,bookMats[3]);
 // A shallow rear bookcase and layered framed relief provide distant detail.
 for(const x of[-.652,-.348])box(.021,.81,.16,x,1.06,-1.455,wood);box(.32,.81,.024,-.50,1.06,-1.537,wood);
 for(const y of[1.06,1.32,1.58,1.84]){box(.34,.022,.19,-.50,y,-1.44,wood);if(y<1.8)for(let i=0;i<4;i++)book(-.606+i*.069,y+.023,-1.416,.055,.18+(i%2)*.018,i%4);}
 box(.60,.52,.026,.16,1.33,-1.563,wood);box(.55,.47,.010,.16,1.355,-1.543,plaster);box(.47,.39,.007,.16,1.395,-1.532,bookMats[0]);
 for(const[x,y,r,c]of[[-.025,1.51,.073,1],[.145,1.57,.095,2],[.29,1.49,.06,3]]){const g=new T.CircleGeometry(r,18).scale(1,.66,1).translate(x,y,-1.526);add(g,bookMats[c]);}
 // Chair structure, floor edge inlay and a compact ceiling track add depth.
 beam([-.10,.14,-.65],[.26,.14,-.65],.012,metal);for(const x of[-.59,.59])box(.011,.003,1.10,x,.044,-.92,wood);
 box(1.12,.027,.09,0,2.325,-1.38,metal);for(const x of[-.39,0,.39]){cylinder(.035,.039,.080,x,2.242,-1.38,metal,12);cylinder(.031,.031,.006,x,2.235,-1.38,light,12);}

 for(const[name,bucket]of buckets){const g=mergeGeometries(bucket.geometries,false),mesh=new T.Mesh(g,bucket.material);mesh.name=name;root.add(mesh);bucket.geometries.forEach(g=>g.dispose());}return root;
}
