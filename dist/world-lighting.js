import * as T from 'three';
export function createAtmosphere(renderer,scene,hdr){
 hdr.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(hdr);pmrem.dispose();scene.environment=env.texture;
 const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,uniforms:{image:{value:hdr},night:{value:0},sunset:{value:0},sunDirection:{value:new T.Vector3(0,1,0)}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
 uniform sampler2D image;uniform float night;uniform float sunset;uniform vec3 sunDirection;varying vec3 vDirection;
 void main(){vec3 d=normalize(vDirection);vec2 euv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);vec3 c=texture2D(image,euv).rgb;float horizon=pow(1.-max(d.y,0.),4.);float glow=pow(max(dot(d,sunDirection),0.),8.);c=mix(c,c*vec3(1.15,.76,.57)+vec3(.32,.105,.028)*horizon*(.2+glow),sunset*.75);vec3 n=mix(vec3(.0018,.0045,.012),vec3(.019,.032,.062),horizon);gl_FragColor=vec4(mix(c,n,night),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});const sky=new T.Mesh(new T.SphereGeometry(5000,48,32),skyMat);sky.renderOrder=-1000;scene.add(sky);
 const sun=new T.DirectionalLight('#ffe1b2',3.5);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.normalBias=.07;sun.shadow.bias=-.00005;scene.add(sun,sun.target);
 const hemi=new T.HemisphereLight('#cee0f4','#4b4a31',.36);scene.add(hemi);
 let lastPosition=new T.Vector3(Infinity,0,0),lastAerial=null,quality=true,shadowUpdates=0;const lastDirection=new T.Vector3(),direction=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(),anchor=new T.Vector3(),worldUp=new T.Vector3(0,1,0),warm=new T.Color('#ffc394'),cool=new T.Color('#a7c6f3'),fogNight=new T.Color('#101c30');
 return{sun,get shadowUpdates(){return shadowUpdates;},update(value,camera,aerial,snapshot){
  const altitude=snapshot.sun.altitudeDeg,night=1-T.MathUtils.smoothstep(altitude,-12,2),sunset=(1-T.MathUtils.smoothstep(Math.abs(altitude-1),0,22))*(1-night*.65);sky.position.copy(camera.position);skyMat.uniforms.night.value=night;skyMat.uniforms.sunset.value=sunset;skyMat.uniforms.sunDirection.value.fromArray(snapshot.sunDirection);
  direction.fromArray(altitude>0?snapshot.sunDirection:snapshot.moonAboveHorizon?snapshot.moonDirection:[-.45,.7,.45]).normalize();
  // Keep the cached projection fixed between updates; snap light-space coordinates to texels.
  if(direction.distanceToSquared(lastDirection)>.0000005||camera.position.distanceToSquared(lastPosition)>36||lastAerial!==aerial){
   const span=aerial?750:155,step=span*2/(quality?4096:2048);right.crossVectors(worldUp,direction);if(right.lengthSq()<.0001)right.set(1,0,0);right.normalize();up.crossVectors(direction,right).normalize();anchor.set(aerial?50:camera.position.x,0,aerial?-50:camera.position.z);const x=Math.round(anchor.dot(right)/step)*step,y=Math.round(anchor.dot(up)/step)*step;sun.target.position.copy(right).multiplyScalar(x).addScaledVector(up,y);sun.position.copy(sun.target.position).addScaledVector(direction,1200);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:5,far:2400});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;lastDirection.copy(direction);lastPosition.copy(camera.position);lastAerial=aerial;shadowUpdates++;
  }
  sun.intensity=altitude>0?3.6*T.MathUtils.smoothstep(altitude,0,18):snapshot.moonAboveHorizon?.26*snapshot.moonIllumination:0;sun.color.set('#fff1d4').lerp(warm,sunset).lerp(cool,night);hemi.intensity=.32-night*.13;hemi.color.set('#c6dcf0').lerp(cool,night);scene.environmentIntensity=.73-night*.55;scene.fog.color.set('#b6ccdc').lerp(warm,sunset*.2).lerp(fogNight,night);scene.fog.density=aerial?.00022*Math.min(1,1100/(camera.position.y+600)):.00105;renderer.toneMappingExposure=1.04+night*.14;return night;
 },setQuality(high){quality=high;lastAerial=null;sun.shadow.mapSize.set(high?4096:2048,high?4096:2048);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;}};
}
