import * as T from 'three';

const CAPACITY = 128;
const PALETTE = [0xf6b95c, 0x49d9d1, 0xc58ce8, 0xf46b8f, 0x5998ed, 0xe3a347, 0xf4d295];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const smooth = (a,b,x) => { const q=clamp((x-a)/(b-a),0,1);return q*q*(3-2*q); };

/** Deterministic compiler: only data from shellEvents, never frame-time randomness. */
export function compileSmoke(show) {
  const input=Array.isArray(show?.shellEvents)?show.shellEvents:[];
  const events=input.filter(e=>Number.isFinite(e.time)&&Array.isArray(e.position)&&e.position.length>=3&&e.position.slice(0,3).every(Number.isFinite))
    .map((e,i)=>({...e,position:e.position.slice(0,3),order:i})).sort((a,b)=>a.time-b.time||a.order-b.order);
  let seed=((Number(show?.seed)>>>0)||20260916)^0x76a382d1;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  const puffs=[];
  for(let i=0;i<events.length;i++){
    const event=events[i],willow=/willow|gold/i.test(String(event.style));
    const radius=clamp(Number.isFinite(event.radius)?event.radius:26,12,42);
    const colors=Array.isArray(show?.palette)&&show.palette.length?show.palette:PALETTE;
    const selected=Number.isInteger(event.color)&&event.color>=0&&event.color<colors.length?colors[event.color]:Number.isFinite(event.color)?event.color:0xf6b95c;
    const color=selected?.isColor?selected.clone():Array.isArray(selected)&&selected.length>=3&&selected.slice(0,3).every(Number.isFinite)?new T.Color().setRGB(selected[0],selected[1],selected[2]):new T.Color(selected);
    event.colorLinear=color.toArray();
    // Asymmetric sheets among burned-out fragments, not one ball at the center.
    const count=willow?3:2;
    for(let j=0;j<count;j++){
      const az=random()*Math.PI*2,spread=radius*(.14+random()*.37);
      puffs.push({id:puffs.length,eventIndex:i,
        birth:event.time+.12+random()*.55,life:9+random()*5+(willow?3:0),
        origin:[event.position[0]+Math.cos(az)*spread,
          Math.max(77,event.position[1]+(random()-.35)*radius*.30),
          event.position[2]+Math.sin(az)*spread*.55],
        width:7+radius*(.10+random()*.16),height:3.5+random()*3.5,
        growthX:.8+random()*.65,growthY:.25+random()*.40,
        wind:[.65+random()*.45,.45+random()*.28,-.13-random()*.16],
        spin:(random()-.5)*.025,rotation:(random()-.5)*1.05,
        opacity:.045+random()*.024,seed:random()*90,
      });
    }
  }
  return {events,puffs};
}

/** Analytic state: random access, time rewind and frame-rate independence. Units: metres/seconds. */
export function sampleSmoke(puff,elapsed) {
  const age=elapsed-puff.birth;
  if(age<=0||age>=puff.life)return null;
  const rise=1-Math.exp(-age*.45);
  const fade=smooth(0,1.3,age)*(1-smooth(puff.life*.48,puff.life,age));
  // Slow, continuous shear. All randomness was resolved in compileSmoke.
  const position=[
    puff.origin[0]+puff.wind[0]*age+.7*Math.sin(age*.19+puff.seed)*rise,
    puff.origin[1]+puff.wind[1]*age,
    puff.origin[2]+puff.wind[2]*age+.35*Math.sin(age*.14+puff.seed*.7)*rise,
  ];
  const width=puff.width+puff.growthX*age,height=puff.height+puff.growthY*age;
  // Dilution as sheets expand; limits cumulative opacity during the finale.
  const dilution=Math.sqrt(puff.width*puff.height/(width*height));
  return {age,position,width,height,rotation:puff.rotation+puff.spin*age,opacity:puff.opacity*fade*dilution,seed:puff.seed};
}

const vertexShader=`
attribute vec3 aCenter;
attribute vec4 aShape;
attribute vec3 aLife;
uniform vec3 cameraRightLocal;
uniform vec3 cameraUpLocal;
uniform vec2 viewport;
varying vec2 vP;
varying vec3 vLocal;
varying vec3 vLife;
varying float vFootprint;
void main(){
  vP=position.xy;
  float c=cos(aShape.z),s=sin(aShape.z);
  vec2 offset=position.xy*aShape.xy;
  offset=mat2(c,s,-s,c)*offset;
  vec3 p=aCenter+cameraRightLocal*offset.x+cameraUpLocal*offset.y;
  vLocal=p;
  vLife=vec3(aLife.xy,aShape.w);
  vec4 centerView=modelViewMatrix*vec4(aCenter,1.0);
  vFootprint=2.0*max(1.0,-centerView.z)/(max(1.0,viewport.y)*projectionMatrix[1][1]*max(1.0,min(aShape.x,aShape.y)));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`;

const fragmentShader=`
precision highp float;
uniform vec4 burstPosition[8];
uniform vec3 burstColor[8];
uniform float opacityBudget;
varying vec2 vP;
varying vec3 vLocal;
varying vec3 vLife;
varying float vFootprint;
float hash31(vec3 p){
  p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);
}
float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),
                 mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),
                 mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p,float footprint){
  float sum=0.0,weight=.57,norm=0.0,frequency=1.0;
  for(int octave=0;octave<4;octave++){
    float lod=1.0-smoothstep(.22,.65,footprint*frequency);
    sum+=weight*lod*noise3(p);norm+=weight*lod;
    p=p*2.03+vec3(5.2,1.3,7.1);weight*=.5;frequency*=2.03;
  }
  return sum/max(.001,norm);
}
void main(){
  float age=vLife.x,seed=vLife.y;
  float footprint=max(vFootprint,max(length(dFdx(vP)),length(dFdy(vP))));
  // Advected 3D domain: time is continuous, never fed to a frame hash.
  vec2 p=vP;
  p.x+=.12*sin(p.y*3.7+seed+age*.075);
  p.y+=.16*sin(p.x*2.9+seed*.7+age*.055);
  vec3 domain=vec3(p*vec2(2.35,3.1)+vec2(seed,seed*.37),seed*.19+age*.075);
  float broad=fbm(domain,footprint*3.1);
  float detail=mix(.5,noise3(domain*3.1+vec3(age*.028,-age*.02,0.0)),1.0-smoothstep(.22,.65,footprint*9.61));
  // Irregular eroded sheet edges and holes avoid circles, balls and tiled squares.
  float edgeX=1.0-smoothstep(.35,.99,abs(vP.x));
  float edgeY=1.0-smoothstep(.20,.99,abs(vP.y));
  float strands=smoothstep(.37,.74,broad+.10*(detail-.5));
  float density=strands*edgeX*edgeY*(.55+.45*detail);
  float alpha=min(.072,density*vLife.z*opacityBudget);
  if(alpha<.0003)discard;
  vec3 color=vec3(.027,.034,.044);
  for(int i=0;i<8;i++){
    vec3 d=vLocal-burstPosition[i].xyz;
    float light=burstPosition[i].w*exp(-dot(d,d)/700.0);
    color+=burstColor[i]*light*.48;
  }
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Thin residual smoke behind the castle. Parent already owns castleYaw.
 * setShow(show) compiles shellEvents once; update takes unclamped relative seconds.
 * No canvas, textures, lights, timers, or browser globals. One draw call, <=128 cards.
 */
export function createFireworkSmoke(parent) {
  const base=new T.PlaneGeometry(2,2),geometry=new T.InstancedBufferGeometry();
  geometry.index=base.index;geometry.attributes.position=base.attributes.position;
  geometry.instanceCount=0;
  const centers=new Float32Array(CAPACITY*3),shapes=new Float32Array(CAPACITY*4),lives=new Float32Array(CAPACITY*3);
  geometry.setAttribute('aCenter',new T.InstancedBufferAttribute(centers,3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('aShape',new T.InstancedBufferAttribute(shapes,4).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('aLife',new T.InstancedBufferAttribute(lives,3).setUsage(T.DynamicDrawUsage));
  const burstPosition=Array.from({length:8},()=>new T.Vector4(0,0,0,0));
  const burstColor=Array.from({length:8},()=>new T.Vector3());
  const material=new T.ShaderMaterial({name:'Continuous thin firework smoke',vertexShader,fragmentShader,
    uniforms:{cameraRightLocal:{value:new T.Vector3(1,0,0)},cameraUpLocal:{value:new T.Vector3(0,1,0)},viewport:{value:new T.Vector2(1280,720)},burstPosition:{value:burstPosition},burstColor:{value:burstColor},opacityBudget:{value:1}},
    transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide,blending:T.NormalBlending,fog:false,toneMapped:true});
  const mesh=new T.Mesh(geometry,material);mesh.name='firework-residual-smoke';mesh.frustumCulled=false;
  mesh.renderOrder=7;mesh.visible=false;mesh.castShadow=mesh.receiveShadow=false;mesh.raycast=()=>{};
  const actualViewport=new T.Vector4();
  mesh.onBeforeRender=renderer=>{
    if(renderer.getCurrentViewport){renderer.getCurrentViewport(actualViewport);material.uniforms.viewport.value.set(actualViewport.z,actualViewport.w);}
    else renderer.getDrawingBufferSize(material.uniforms.viewport.value);
  };
  parent.add(mesh);
  const inverseParent=new T.Matrix4(),cameraRotation=new T.Quaternion(),viewMatrix=new T.Matrix4(),depthPoint=new T.Vector3();
  let compiled={events:[],puffs:[]},disposed=false,lastTime=0,peakInstances=0,duration=60;

  function clear(){geometry.instanceCount=0;mesh.visible=false;for(const light of burstPosition)light.w=0;compiled={events:[],puffs:[]};lastTime=0;peakInstances=0;}
  function setShow(show){if(disposed)throw new Error('Smoke disposed');clear();compiled=compileSmoke(show);duration=Number.isFinite(show?.duration)&&show.duration>0?show.duration:60;return compiled.puffs.length;}
  function update(elapsed,camera){
    if(disposed)return;
    if(!Number.isFinite(elapsed)||!camera){mesh.visible=false;geometry.instanceCount=0;return;}
    lastTime=elapsed;
    parent.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
    inverseParent.copy(parent.matrixWorld).invert();camera.getWorldQuaternion(cameraRotation);
    material.uniforms.cameraRightLocal.value.set(1,0,0).applyQuaternion(cameraRotation).transformDirection(inverseParent);
    material.uniforms.cameraUpLocal.value.set(0,1,0).applyQuaternion(cameraRotation).transformDirection(inverseParent);
    viewMatrix.copy(camera.matrixWorld).invert().multiply(parent.matrixWorld);
    const active=[];
    for(const puff of compiled.puffs){
      const state=sampleSmoke(puff,elapsed);if(!state||state.opacity<.0003)continue;
      depthPoint.fromArray(state.position).applyMatrix4(viewMatrix);
      if(depthPoint.z>2)continue;
      active.push({puff,state,depth:depthPoint.z});
    }
    // Only a stress-input finale should reach the cap; retain strongest sheets.
    if(active.length>CAPACITY){active.sort((a,b)=>b.state.opacity-a.state.opacity||a.puff.id-b.puff.id);active.length=CAPACITY;}
    active.sort((a,b)=>a.depth-b.depth||a.puff.id-b.puff.id); // far -> near for alpha blending
    for(let i=0;i<active.length;i++){
      const s=active[i].state;centers.set(s.position,i*3);
      shapes.set([s.width*.5,s.height*.5,s.rotation,s.opacity],i*4);
      lives.set([s.age,s.seed,0],i*3);
    }
    for(const name of ['aCenter','aShape','aLife']){
      const attr=geometry.attributes[name];attr.clearUpdateRanges();if(active.length)attr.addUpdateRange(0,active.length*attr.itemSize);attr.needsUpdate=true;
    }
    geometry.instanceCount=active.length;mesh.visible=active.length>0;peakInstances=Math.max(peakInstances,active.length);
    // Avoid a finale becoming a screen-wide gray veil when many low-alpha sheets overlap.
    material.uniforms.opacityBudget.value=Math.min(1,Math.sqrt(30/Math.max(1,active.length)))*(1-smooth(duration-4,duration,elapsed));
    const flashes=[];
    for(const event of compiled.events){
      const age=elapsed-event.time;if(age<0||age>1.65)continue;
      const energy=smooth(0,.075,age)*Math.exp(-age*2.3);
      flashes.push({event,energy});
    }
    flashes.sort((a,b)=>b.energy-a.energy||a.event.order-b.event.order);
    for(let i=0;i<8;i++){
      const light=flashes[i];
      if(light){burstPosition[i].set(...light.event.position,light.energy);burstColor[i].fromArray(light.event.colorLinear);}
      else{burstPosition[i].set(0,0,0,0);burstColor[i].set(0,0,0);}
    }
  }
  function dispose(){if(disposed)return;clear();disposed=true;mesh.removeFromParent();geometry.dispose();material.dispose();base.dispose();}
  return {setShow,update,clear,dispose,mesh,get diagnostics(){return {instances:geometry.instanceCount,capacity:CAPACITY,compiledPuffs:compiled.puffs.length,events:compiled.events.length,peakInstances,elapsed:lastTime};}};
}
