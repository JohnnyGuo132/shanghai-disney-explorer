import * as THREE from 'three';
import {compileFireworks,sampleFireworkFlight,palette} from './fireworks-compiler.js';
import {createFireworkSmoke} from './world-firework-smoke.js';
export {compileFireworks,sampleFireworkFlight};
const clamp=THREE.MathUtils.clamp,smooth=THREE.MathUtils.smoothstep,DURATION=60;

// Each visible star has a head and a single continuous curved ribbon. Both
// evaluate the same drag/gravity flight, avoiding rings of regularly stamped dots.
const flightGLSL=`
vec3 flight(vec3 origin,vec3 velocity,float age,float drag,float gravity){
 float k=max(.001,drag),e=exp(-k*age),q=(1.-e)/k;
 return origin+vec3(velocity.x*q+.38*(age-q),(velocity.y+gravity/k)*q-gravity*age/k,velocity.z*q+.13*(age-q));
}
float combustion(float age,float life,float phase){
 float variation=.91+.09*sin(age*2.3+phase)*sin(age*1.7+phase*1.41);
 return smoothstep(0.,.025,age)*pow(1.-smoothstep(life*.50,life,age),.72)*variation;
}
vec3 starColor(vec3 color,vec3 nextColor,float age,float life,float transition){
 float p=clamp(age/max(.001,life),0.,1.);
 return mix(color,nextColor,smoothstep(max(.12,transition-.08),min(.98,transition+.14),p));
}`;
const headVertex=`
attribute vec3 aVelocity,aColor,aColor2;attribute vec4 aLife,aExtra;attribute vec2 aTrail,aBurn;
uniform float uTime,uHeight,uGain;varying vec3 vColor;varying float vAlpha,vHeat;
#include <fog_pars_vertex>
${flightGLSL}
void main(){
 float age=uTime-aLife.x,life=aLife.y;float alive=step(0.,age)*(1.-step(life,age));
 vec3 p=flight(position,aVelocity,clamp(age,0.,max(life,.001)),aLife.w,aExtra.x);
 vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
 float burn=combustion(max(0.,age),max(life,.001),aExtra.z);
 vAlpha=alive*burn*uGain;vColor=starColor(aColor,aColor2,max(age,0.),max(life,.001),aBurn.x);
 vHeat=aBurn.y*exp(-max(age,0.)*5.5);
 float pixels=aLife.z*uHeight*.5*projectionMatrix[1][1]/max(1.,-mvPosition.z);
 gl_PointSize=clamp(pixels*(.65+.35*burn),2.2,9.);
 if(alive<.5||mvPosition.z>-.15){vAlpha=0.;gl_Position=vec4(2.,2.,2.,1.);}
 #include <fog_vertex>
}`;
const headFragment=`
varying vec3 vColor;varying float vAlpha,vHeat;
#include <fog_pars_fragment>
void main(){
 vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.||vAlpha<.001)discard;
 float profile=exp(-r*7.)+.075*exp(-r*2.8);float alpha=vAlpha*profile*(1.-smoothstep(.7,1.,r));
 vec3 radiance=vColor*(6.0+vHeat*2.)+vec3(1.,.85,.67)*vHeat*exp(-r*26.)*3.;
 gl_FragColor=vec4(radiance,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;
const ribbonVertex=`
attribute vec3 aOrigin,aVelocity,aColor,aColor2;attribute vec4 aLife,aExtra;attribute vec2 aTrail,aBurn;
uniform float uTime,uHeight,uGain;varying vec3 vColor;varying float vAlpha;varying vec2 vRibbon;
#include <fog_pars_vertex>
${flightGLSL}
void main(){
 float age=uTime-aLife.x,life=max(.001,aLife.y),history=max(.025,aTrail.x);
 float sampleAge=age-position.x*history;
 float sampleTime=clamp(sampleAge,0.,life);
 vec3 p=flight(aOrigin,aVelocity,sampleTime,aLife.w,aExtra.x);
 vec3 ahead=flight(aOrigin,aVelocity,sampleTime+.014,aLife.w,aExtra.x);
 vec4 mvPosition=modelViewMatrix*vec4(p,1.);
 vec4 viewAhead=modelViewMatrix*vec4(ahead,1.);
 vec4 projected=projectionMatrix*mvPosition,projectedAhead=projectionMatrix*viewAhead;
 vec2 tangent=projectedAhead.xy/max(.01,projectedAhead.w)-projected.xy/max(.01,projected.w);
 tangent.x*=projectionMatrix[1][1]/projectionMatrix[0][0];
 tangent=length(tangent)>.000001?normalize(tangent):vec2(0.,1.);
 float taper=pow(1.-position.x,1.35),burn=combustion(sampleTime,life,aExtra.z);
 float widthPixels=(2.65+aLife.z*.65)*(.74+.26*taper);
 float halfWidth=widthPixels*max(1.,-mvPosition.z)/(uHeight*projectionMatrix[1][1]);
 mvPosition.xy+=vec2(-tangent.y,tangent.x)*position.y*halfWidth;
 gl_Position=projectionMatrix*mvPosition;
 float exists=step(0.,sampleAge)*(1.-step(life,sampleAge))*step(0.,age)*(1.-step(life+history,age));
 // Broad energy envelope with a tiny non-periodic-looking grain; no strobing.
 float grain=.88+.12*sin(sampleAge*19.7+aExtra.z)*sin(sampleAge*11.3+aExtra.z*2.1);
 vAlpha=exists*burn*taper*grain*uGain*(.58+.30*aTrail.y);
 vColor=starColor(aColor,aColor2,sampleTime+position.x*.4,life,aBurn.x);vRibbon=position.xy;
 if(mvPosition.z>-.15||age<0.||age>life+history){vAlpha=0.;gl_Position=vec4(2.,2.,2.,1.);}
 #include <fog_vertex>
}`;
const ribbonFragment=`
varying vec3 vColor;varying float vAlpha;varying vec2 vRibbon;
#include <fog_pars_fragment>
void main(){
 float core=exp(-vRibbon.y*vRibbon.y*4.6),edge=1.-smoothstep(.68,1.,abs(vRibbon.y));
 float alpha=vAlpha*core*edge;if(alpha<.001)discard;
 gl_FragColor=vec4(vColor*7.2,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;

export function createFireworks(scene,{orientationYaw=0,quality='high',maxParticles=6000,gain=1}={}){
 const capacity=Math.round(clamp(maxParticles,1024,6000)),baseGain=clamp(gain,0,1.5);
 const origin=new Float32Array(capacity*3),velocity=new Float32Array(capacity*3),color=new Float32Array(capacity*3),color2=new Float32Array(capacity*3),burn=new Float32Array(capacity*2),life=new Float32Array(capacity*4),extra=new Float32Array(capacity*4),trail=new Float32Array(capacity*2);
 const fields={aVelocity:[velocity,3],aColor:[color,3],aColor2:[color2,3],aBurn:[burn,2],aLife:[life,4],aExtra:[extra,4],aTrail:[trail,2]},headGeo=new THREE.BufferGeometry(),ribbonGeo=new THREE.InstancedBufferGeometry();
 headGeo.setAttribute('position',new THREE.BufferAttribute(origin,3).setUsage(THREE.DynamicDrawUsage));ribbonGeo.setAttribute('aOrigin',new THREE.InstancedBufferAttribute(origin,3).setUsage(THREE.DynamicDrawUsage));
 for(const[name,[array,size]]of Object.entries(fields)){headGeo.setAttribute(name,new THREE.BufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));ribbonGeo.setAttribute(name,new THREE.InstancedBufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));}
 const segments=18,vertices=[],indices=[];for(let i=0;i<=segments;i++){vertices.push(i/segments,-1,0,i/segments,1,0);if(i<segments){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
 ribbonGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));ribbonGeo.setIndex(indices);ribbonGeo.instanceCount=0;headGeo.setDrawRange(0,0);
 const uniforms=THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uTime:{value:0},uHeight:{value:1080},uGain:{value:baseGain}}]);
 const makeMaterial=(vertexShader,fragmentShader)=>new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,fog:true,side:THREE.DoubleSide});
 const headMat=makeMaterial(headVertex,headFragment),ribbonMat=makeMaterial(ribbonVertex,ribbonFragment),points=new THREE.Points(headGeo,headMat),ribbons=new THREE.Mesh(ribbonGeo,ribbonMat),group=new THREE.Group();
 group.name='castle_fireworks';group.rotation.y=orientationYaw;group.visible=false;points.name='incandescent_stars';ribbons.name='continuous_curved_ember_trails';points.frustumCulled=ribbons.frustumCulled=false;ribbons.renderOrder=8;points.renderOrder=9;group.add(ribbons,points);scene.add(group);
 const size=new THREE.Vector2();points.onBeforeRender=ribbons.onBeforeRender=renderer=>{renderer.getDrawingBufferSize(size);uniforms.uHeight.value=size.y;};
 const smoke=createFireworkSmoke(group),death=new Float64Array(capacity),free=new Uint32Array(capacity);let freeCount=capacity,highWater=0,live=0,peak=0,dropped=0,cursor=0,active=false,disposed=false,show=null,startTime=0,elapsed=0,lastElapsed=0,currentQuality=quality==='low'?'low':'high';
 const cue={color:new THREE.Color(),secondaryColor:new THREE.Color(),intensity:0,accent:0,phase:'idle',phaseLabel:'未开始',progress:0};
 const status={active:false,state:'idle',elapsed:0,duration:DURATION,particles:0,capacity,peakParticles:0,droppedParticles:0,phase:'idle',seed:0,quality:currentQuality,renderer:'continuous-ribbons'};
 function sync(){Object.assign(status,{active,elapsed,particles:live,peakParticles:peak,droppedParticles:dropped,phase:cue.phase,quality:currentQuality});return status;}
 function clear(){life.fill(0);death.fill(0);freeCount=capacity;for(let i=0;i<capacity;i++)free[i]=capacity-i-1;live=highWater=peak=dropped=cursor=0;headGeo.setDrawRange(0,0);ribbonGeo.instanceCount=0;headGeo.attributes.aLife.needsUpdate=ribbonGeo.attributes.aLife.needsUpdate=true;}
 function resetCue(){cue.intensity=cue.accent=cue.progress=0;cue.phase='idle';cue.phaseLabel='未开始';cue.color.setRGB(0,0,0);cue.secondaryColor.setRGB(0,0,0);}
 function start(t=0,seed=20260916){if(disposed)throw Error('Fireworks has been disposed');if(!Number.isFinite(t))throw TypeError('Finite start time required');clear();if(!show||show.seed!==(Number(seed)>>>0)||show.quality!==currentQuality)show=compileFireworks(seed,currentQuality);smoke.setShow({...show,palette});startTime=t;elapsed=lastElapsed=0;uniforms.uGain.value=baseGain;active=true;group.visible=true;status.state='playing';status.seed=show.seed;resetCue();update(t,0);return sync();}
 function stop(){active=false;group.visible=false;clear();smoke.clear();resetCue();status.state='stopped';return sync();}
 function update(t,dt=0,camera=null){
  if(disposed||!active||!Number.isFinite(t))return cue;const next=clamp(t-startTime,0,DURATION);if(next<lastElapsed)clear();elapsed=next;lastElapsed=next;
  for(let i=0;i<highWater;i++)if(death[i]>0&&death[i]<=elapsed){death[i]=0;free[freeCount++]=i;live--;}
  let min=capacity,max=-1;
  while(cursor<show.particles.length&&show.particles[cursor].birth<=elapsed){const p=show.particles[cursor++],history=p.trail??.25,end=p.birth+p.life+history;if(end<=elapsed)continue;if(!freeCount){dropped++;continue;}const i=free[--freeCount],j=i*3,k=i*4;origin.set(p.p,j);velocity.set(p.v,j);color.set(p.c,j);color2.set(p.c2??p.c,j);burn.set([p.transition??.62,p.coreHeat??p.heat??.3],i*2);life.set([p.birth,p.life,p.size,p.drag],k);extra.set([p.gravity,p.twinkle,p.phase,p.kind],k);trail.set([history,p.heat??.5],i*2);death[i]=end;highWater=Math.max(highWater,i+1);live++;min=Math.min(min,i);max=Math.max(max,i);}
  if(max>=min){for(const[name,a]of Object.entries(headGeo.attributes)){a.clearUpdateRanges();a.addUpdateRange(min*a.itemSize,(max-min+1)*a.itemSize);a.needsUpdate=true;}for(const[name,a]of Object.entries(ribbonGeo.attributes)){if(name==='position')continue;a.clearUpdateRanges();a.addUpdateRange(min*a.itemSize,(max-min+1)*a.itemSize);a.needsUpdate=true;}}
  headGeo.setDrawRange(0,highWater);ribbonGeo.instanceCount=highWater;uniforms.uTime.value=elapsed;uniforms.uGain.value=baseGain*(1-smooth(elapsed,58,60));peak=Math.max(peak,live);if(camera)smoke.update(elapsed,camera);
  let section=show.phases[0],previous=section;for(const p of show.phases){if(p[0]>elapsed)break;previous=section;section=p;}const blend=smooth(elapsed,section[0],section[0]+1.8);cue.color.copy(palette[previous[3]]).lerp(palette[section[3]],blend);cue.secondaryColor.copy(palette[previous[5]??[8,4,4,9,7,0][show.phases.indexOf(previous)]]).lerp(palette[section[5]??[8,4,4,9,7,0][show.phases.indexOf(section)]],blend);
  let accent=0,weight=0,rr=0,gg=0,bb=0;for(const c of show.cues){const age=elapsed-c.time;if(age<0)break;if(age>c.duration)continue;const a=smooth(age,0,.45)*(1-smooth(age,.45,c.duration))*c.strength;accent+=a;weight+=a;rr+=palette[c.color].r*a;gg+=palette[c.color].g*a;bb+=palette[c.color].b*a;}
  if(weight>0){const m=Math.min(.6,weight);cue.color.r=cue.color.r*(1-m)+rr/weight*m;cue.color.g=cue.color.g*(1-m)+gg/weight*m;cue.color.b=cue.color.b*(1-m)+bb/weight*m;}
  const envelope=smooth(elapsed,0,2)*(1-smooth(elapsed,55,60));cue.intensity=Math.min(.72,(previous[4]+(section[4]-previous[4])*blend+Math.min(.30,accent))*envelope);cue.accent=Math.min(.45,accent)*envelope;cue.phase=section[1];cue.phaseLabel=section[2];cue.progress=elapsed/DURATION;
  if(elapsed>=DURATION){active=false;group.visible=false;live=0;headGeo.setDrawRange(0,0);ribbonGeo.instanceCount=0;smoke.clear();cue.intensity=cue.accent=0;status.state='completed';}sync();return cue;
 }
 function setQuality(v){currentQuality=v===false||v==='low'?'low':'high';}
 function dispose(){if(disposed)return;stop();group.removeFromParent();headGeo.dispose();ribbonGeo.dispose();headMat.dispose();ribbonMat.dispose();smoke.dispose();disposed=true;status.state='disposed';}
 clear();return{start,stop,update,setQuality,dispose,points,ribbons,group,cue,get active(){return active;},get status(){return sync();}};
}
