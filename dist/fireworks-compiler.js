import * as THREE from 'three';

// Original visual-animation compiler, MIT. Metres/seconds; linear drag, SI gravity.
// This is display choreography, not a pyrotechnic engineering specification.
export const palette=['#efba54','#e6efff','#ff244d','#20eb78','#245aff','#d98b32','#f4d48a','#ff2397','#a738ff','#19dfff','#78a4ff'].map(c=>new THREE.Color(c));
export const phases=[
 [0,'overture','绯红初绽',2,.18],[10,'bouquets','玫紫花冠',7,.26],
 [23,'constellations','蓝青星河',9,.23],[35,'golden-willow','翡翠银瀑',3,.27],
 [46,'finale','锦绣金柳',0,.34],[55,'embers','流金余韵',6,.10],
];
const DURATION=60,G=9.81,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function sampleFireworkFlight(p,v,age,drag,gravity,out=[0,0,0]){
 const t=Math.max(0,age),k=Math.max(.001,drag),q=-Math.expm1(-k*t)/k;
 out[0]=p[0]+v[0]*q+.38*(t-q);
 out[1]=p[1]+(v[1]+gravity/k)*q-gravity*t/k;
 out[2]=p[2]+v[2]*q+.13*(t-q);return out;
}
export function compileFireworks(seed=20260916,quality='high'){
 const low=quality==='low'||quality===false,density=low?.48:1;
 let rng=(Number(seed)>>>0)||1,spare=null,order=0,shellId=0;
 const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;};
 const between=(a,b)=>a+(b-a)*random();
 const normal=()=>{if(spare!==null){const x=spare;spare=null;return x;}const r=Math.sqrt(-2*Math.log(Math.max(1e-10,random()))),a=TAU*random();spare=r*Math.sin(a);return r*Math.cos(a);};
 const particles=[],cues=[],shellEvents=[];
 const colored=c=>[2,3,4,7,8,9,10].includes(c),rgb=c=>palette[c].toArray();
 function peakY(y,vy,k){if(vy<=0)return y;const t=Math.log1p(k*vy/G)/k,q=-Math.expm1(-k*t)/k;return y+(vy+G/k)*q-G*t/k;}
 function velocityAt(p,t){const e=Math.exp(-p.drag*t);return[(p.v[0]-.38)*e+.38,(p.v[1]+G/p.drag)*e-G/p.drag,(p.v[2]-.13)*e+.13];}
 function unit(){let x=normal(),y=normal(),z=normal(),l=Math.hypot(x,y,z);return[x/l,y/l,z/l];}
 function add(p,v,color,birth,life,settings={}){
  if(birth<0)throw new RangeError('A shell was scheduled before its launch could begin.');
  const kind=settings.kind??0,drag=settings.drag??between(.35,.57),trail=clamp(settings.trail??between(.24,.45),.15,1.6),limit=between(236,243.5);
  v=v.slice();if(peakY(p[1],v[1],drag)>limit){let lo=0,hi=Math.max(0,v[1]);for(let n=0;n<30;n++){const mid=(lo+hi)/2;if(peakY(p[1],mid,drag)>limit)hi=mid;else lo=mid;}v[1]=lo;}
  // A final strip has fully burned away before the renderer completes at 60 s.
  life=Math.min(life,DURATION-.25-birth-trail);
  const extinctionFloor=settings.extinctionFloor??between(76,90);
  if(kind===0&&sampleFireworkFlight(p,v,life,drag,G)[1]<extinctionFloor){let lo=0,hi=life;for(let n=0;n<30;n++){const mid=(lo+hi)/2;if(sampleFireworkFlight(p,v,mid,drag,G)[1]>extinctionFloor)lo=mid;else hi=mid;}life=lo;}
  if(life<=.08)return null;
  const isColor=colored(color),heat=settings.heat??(isColor?between(.07,.20):between(.48,.77));
  const particle={p:p.slice(),v,c:rgb(color),c2:rgb(settings.color2??color),transition:settings.transition??between(.52,.72),birth,life,size:settings.size??between(.19,.29),drag,gravity:G,twinkle:settings.twinkle??.035,phase:random()*TAU,kind,trail,heat,coreHeat:settings.coreHeat??(isColor?between(.08,.22):between(.50,.80)),order:order++,style:settings.style??'peony',shellId:settings.id??-1,color,color2:settings.color2??color};
  particles.push(particle);return particle;
 }
 function launch(time,x,y,z,id){
  const p=[x*.73+between(-2,2),8,z+between(12,20)],drag=between(.035,.052);
  let lo=20,hi=100;for(let n=0;n<36;n++){const mid=(lo+hi)/2;if(peakY(p[1],mid,drag)>y+.075)hi=mid;else lo=mid;}
  const vy=(lo+hi)/2,apexTime=Math.log1p(drag*vy/G)/drag,fuse=apexTime-between(.10,.19),q=-Math.expm1(-drag*fuse)/drag;
  const v=[(x-p[0]-.38*(fuse-q))/q,vy,(z-p[2]-.13*(fuse-q))/q],birth=time-fuse;
  const head=add(p,v,5,birth,fuse,{kind:2,drag,trail:between(.65,.92),size:between(.18,.24),heat:.30,coreHeat:.45,style:'rocket',id});
  const centre=sampleFireworkFlight(head.p,head.v,fuse,drag,G);
  return{centre,launch:birth,fuse,apexTime,burstVerticalVelocity:velocityAt(head,fuse)[1]};
 }
 function burst(time,x,y,style,color,count,z=-110,accent=1){
  const id=shellId++,flight=launch(time,x,y,z,id),centre=flight.centre;
  const n=Math.round(count*density),ellipse=[between(.89,1.10),between(.85,1.05),between(.78,1.05)],skew=[between(-.10,.10),between(-.07,.12),between(-.10,.10)];
  const make=(index,total,speed,colorIndex,opts={})=>{
   const d=unit(),v=d.map((a,j)=>(a*ellipse[j]+skew[j])*speed*1.24);
   const p=centre.map(a=>a+normal()*.08);
   return add(p,v,colorIndex,time+between(0,.032),between(2.7,3.7),{id,style,drag:between(.39,.61),color2:opts.color2??colorIndex,...opts});
  };
  if(style==='peony'){
   for(let i=0;i<n;i++){const c=random()<.28?accent:color;make(i,n,between(18,29),c,{trail:between(.18,.34),color2:random()<.26?accent:c,transition:between(.61,.79)});}
  }else if(style==='double-pistil'){
   // Simultaneous open outer petals and a smaller contrasting living core.
   for(let i=0;i<n;i++){const outer=i<Math.round(n*.72),c=outer?color:accent;make(i,n,outer?between(24,32):between(8,13),c,{trail:outer?between(.30,.55):between(.17,.30),drag:outer?between(.38,.52):between(.46,.65),color2:outer?color:accent,transition:.70,size:outer?between(.22,.30):between(.20,.26)});}
  }else if(style==='crossette'){
   for(let i=0;i<n;i++){
    const d=unit(),speed=between(20,28),splitAge=between(.95,1.35),parent=add(centre,d.map(v=>v*speed),color,time+between(0,.025),splitAge+.50,{id,style:'crossette-parent',drag:between(.29,.42),trail:between(.50,.72),color2:color,size:between(.24,.31)});
    const split=sampleFireworkFlight(parent.p,parent.v,splitAge,parent.drag,G),carried=velocityAt(parent,splitAge);
    // Four irregular arms in a randomly oriented plane; no screen-facing sticker.
    const normalAxis=new THREE.Vector3(...unit()),u=new THREE.Vector3(...unit()).cross(normalAxis).normalize(),v=new THREE.Vector3().crossVectors(normalAxis,u).normalize(),rotation=between(0,TAU);
    for(let arm=0;arm<4;arm++){
     const a=rotation+arm*TAU/4+between(-.10,.10),speed2=between(8,12),impulse=u.clone().multiplyScalar(Math.cos(a)*speed2).addScaledVector(v,Math.sin(a)*speed2);
     const child=add(split,carried.map((value,j)=>value+impulse.getComponent(j)),accent,parent.birth+splitAge,between(1.5,2.15),{id,style:'crossette-child',drag:between(.48,.70),trail:between(.26,.45),color2:color,transition:between(.5,.65),size:between(.19,.25)});
     if(child){child.parentOrder=parent.order;child.splitAge=splitAge;}
    }
   }
  }else if(style==='palm'){
   const branches=low?7:9,angles=Array.from({length:branches},(_,i)=>i*TAU/branches+between(-.16,.16));
   for(let i=0;i<n;i++){const a=angles[i%branches]+normal()*.024,horizontal=between(17,23),c=random()<.20?accent:color;add(centre,[Math.cos(a)*horizontal,between(20,27),Math.sin(a)*horizontal*.85],c,time+between(0,.04),between(4.0,5.3),{id,style,drag:between(.29,.43),trail:between(.9,1.3),color2:accent,transition:between(.53,.70),size:between(.22,.33)});}
  }else{
   const brocade=style==='brocade';
   for(let i=0;i<n;i++){const d=unit(),speed=between(brocade?25:21,brocade?35:30),c=random()<.20?accent:color;
    add(centre,[d[0]*speed*ellipse[0],d[1]*speed*.76+5,d[2]*speed*ellipse[2]],c,time+between(0,.05),between(5.1,6.5),{id,style,drag:between(.27,.42),trail:between(1.15,1.6),color2:brocade?6:accent,transition:between(.48,.64),twinkle:between(.08,.18),size:between(.20,.28)});
   }
  }
  shellEvents.push({time,position:centre,style,color,radius:style==='double-pistil'?38:style==='palm'?32:36,count:particles.filter(p=>p.shellId===id&&p.kind!==2).length,launch:flight.launch,fuse:flight.fuse,apexTime:flight.apexTime,burstVerticalVelocity:flight.burstVerticalVelocity,shellId:id});
  cues.push({time,color,strength:style==='crossette'?.15:.20,duration:/willow|brocade|palm/.test(style)?3.4:2.5});
 }
 function fan(time,color){
  const id=shellId++;for(let i=0;i<7;i++){
   const p=[(i-3)*8,7,-110+between(-3,3)],drag=between(.032,.044),goal=between(126,134);let lo=20,hi=90;
   for(let n=0;n<32;n++){const mid=(lo+hi)/2;if(peakY(p[1],mid,drag)>goal)hi=mid;else lo=mid;}
   const vy=(lo+hi)/2,apex=Math.log1p(drag*vy/G)/drag;
   add(p,[(i-3)*1.35+between(-.2,.2),vy,between(-.5,.5)],color,time+i*.075,apex+1.8,{id,kind:3,style:'comet-fan',drag,trail:between(.9,1.2),color2:1,transition:.70,size:.31,heat:.18,coreHeat:.25});
  }cues.push({time:time+4.5,color,strength:.11,duration:3});
 }
 // Phrase 1: saturated rose and violet; high launch reads clearly before 6.2 s.
 burst(6.2,0,157,'peony',2,255,-100,7);
 burst(8.2,32,168,'peony',8,160,-112,2);
 burst(10.0,-31,171,'double-pistil',7,265,-109,8);
 burst(13.4,30,185,'double-pistil',8,280,-117,2);
 burst(14.8,-36,182,'peony',7,180,-114,8);
 burst(17.3,-17,176,'crossette',2,32,-109,7);
 burst(20.0,27,186,'peony',7,230,-119,8);
 // Phrase 2: blue/cyan with a breath after each separate crown.
 burst(24.1,-29,180,'peony',4,245,-112,9);
 burst(25.2,35,181,'peony',9,150,-112,4);
 fan(23.2,9);
 burst(27.4,28,199,'double-pistil',4,285,-124,9);
 burst(29.0,-38,174,'peony',9,160,-105,4);
 burst(31.0,-13,187,'crossette',9,34,-115,10);
 burst(33.8,24,178,'palm',9,95,-107,4);
 // Phrase 3: distinct emerald petals, silver cores and silver drooping branches.
 burst(36.8,-27,187,'double-pistil',3,285,-114,1);
 burst(38.3,30,185,'peony',3,180,-116,1);
 burst(40.0,26,201,'palm',3,110,-122,1);
 fan(39.5,3);
 burst(42.8,-13,194,'peony',3,250,-113,9);
 burst(44.0,36,178,'double-pistil',9,185,-109,3);
 burst(45.0,28,187,'crossette',3,34,-118,1);
 // Finale stays staggered: three coloured crowns, then broad gold hanging behind.
 burst(47.0,-37,182,'double-pistil',2,230,-103,7);
 burst(48.05,35,194,'double-pistil',4,240,-121,9);
 burst(49.3,0,204,'peony',3,275,-125,7);
 burst(50.6,-29,195,'brocade',0,220,-117,6);
 burst(51.9,30,200,'willow',0,230,-124,5);
 burst(53.25,0,203,'brocade',0,295,-125,6);
 particles.sort((a,b)=>a.birth-b.birth||a.order-b.order);cues.sort((a,b)=>a.time-b.time);shellEvents.sort((a,b)=>a.time-b.time);
 return{seed:Number(seed)>>>0,quality:low?'low':'high',duration:DURATION,particles,cues,shellEvents,phases,palette,metadata:{headOnly:true,gravity:G,wind:[.38,.13],ceiling:244,extinctionFloor:76,colorTransition:'c2 is linear RGB; transition is normalized age/life',renderer:'continuous analytic ribbons; no detached tail particles',originalGeometry:true}};
}
