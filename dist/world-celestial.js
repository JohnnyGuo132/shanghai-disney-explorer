import * as T from 'three';
import { astronomySnapshot, equatorialUnitVector, parseShanghaiDateTime } from './assets/sky/astronomy.js';

const RAD = Math.PI / 180;
const clamp01 = value => Math.max(0, Math.min(1, value));

/** Stable observer-facing Moon basis. Surface-pole orientation/libration are approximated. */
export function moonFrame(snapshot) {
  const direction = new T.Vector3().fromArray(snapshot.moonDirection).normalize();
  const front = direction.clone().negate();
  const up = new T.Vector3(0, 1, 0).addScaledVector(direction, -direction.y);
  if (up.lengthSq() < 1e-10) up.set(0, 0, -1).addScaledVector(direction, direction.z);
  up.normalize();
  const right = new T.Vector3().crossVectors(up, front).normalize();
  up.crossVectors(front, right).normalize();
  const sun = new T.Vector3().fromArray(snapshot.sunDirection).normalize();
  const bright = sun.clone().addScaledVector(direction, -sun.dot(direction));
  if (bright.lengthSq() < 1e-12) bright.copy(right);
  else bright.normalize();
  const cosIncidence = 2 * clamp01(snapshot.moonIllumination) - 1;
  const sinIncidence = Math.sqrt(Math.max(0, 1 - cosIncidence * cosIncidence));
  const lightWorld = bright.multiplyScalar(sinIncidence).addScaledVector(front, cosIncidence);
  const lightLocal = new T.Vector3(lightWorld.dot(right), lightWorld.dot(up), lightWorld.dot(front));
  return { direction, front, up, right, lightLocal,
    rotation: new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right, up, front)) };
}

/** Rendering-only spectral tint: three Planck samples, white-balanced at 6500 K.
 * This is a restrained display approximation, not measured RGB photometry.
 */
export function starTint(temperatureK) {
  if (!Number.isFinite(temperatureK)) return [1, 1, 1];
  const temp = T.MathUtils.clamp(temperatureK, 1800, 40000);
  const wavelengths = [610e-9, 550e-9, 460e-9];
  const ratios = wavelengths.map(w => Math.expm1(0.01438776877 / (w * 6500)) / Math.expm1(0.01438776877 / (w * temp)));
  const peak = Math.max(...ratios);
  return ratios.map(v => 0.18 + 0.82 * v / peak);
}

const starVertex = `
uniform mat3 starFrame;
uniform float skyRadius;
uniform float pixelRatio;
uniform float sizeScale;
attribute float magnitude;
attribute vec3 tint;
varying float vAltitude;
varying float vBrightness;
varying vec3 vTint;
void main() {
  vec3 direction = normalize(starFrame * position);
  vAltitude = direction.y;
  vBrightness = pow(10.0, -0.35 * magnitude);
  vTint = tint;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(direction * skyRadius, 1.0);
  gl_PointSize = clamp((2.7 - 0.28 * magnitude) * pixelRatio * sizeScale, 1.0, 7.0);
}`;
const starFragment = `
uniform float nightAmount;
varying float vAltitude;
varying float vBrightness;
varying vec3 vTint;
void main() {
  if (vAltitude <= 0.0 || nightAmount <= 0.001) discard;
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p,p);
  if (r2 >= 1.0) discard;
  float profile = exp(-4.8 * r2) * (1.0 - smoothstep(0.55, 1.0, r2));
  float horizon = smoothstep(0.0, 0.06, vAltitude);
  float alpha = profile * horizon * nightAmount;
  gl_FragColor = vec4(vTint * vBrightness * 1.5, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const moonVertex = `
varying vec2 vDisk;
void main() {
  vDisk = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const moonFragment = `
uniform sampler2D moonMap;
uniform vec3 localLight;
uniform vec3 horizonBasis;
uniform float angularTangent;
uniform float nightAmount;
varying vec2 vDisk;
void main() {
  float r2 = dot(vDisk, vDisk);
  if (r2 >= 1.0) discard;
  // Exact sign of the ray's world Y, before harmless normalization.
  if (horizonBasis.x + angularTangent * dot(horizonBasis.yz, vDisk) <= 0.0) discard;
  vec3 normal = vec3(vDisk, sqrt(max(0.0, 1.0-r2)));
  // NASA full-sphere map; near-side longitude zero is its horizontal center.
  vec2 uv = vec2(0.5 + atan(normal.x, normal.z) / 6.28318530718,
                 0.5 + asin(clamp(normal.y, -1.0, 1.0)) / 3.14159265359);
  vec3 albedo = texture2D(moonMap, uv).rgb;
  float incidence = max(0.0, dot(normal, localLight));
  float lit = pow(incidence, 0.65);
  // Tiny artistic dark-side floor preserves a silhouette; no fake full disk.
  float skyDark = smoothstep(0.0, 0.3, nightAmount);
  vec3 radiance = mix(vec3(.65,.75,.86)+albedo*.45*lit, albedo*(.002+1.25*lit),skyDark);
  float aa = max(fwidth(r2), 0.0002);
  float edge = 1.0 - smoothstep(1.0-aa, 1.0, r2);
  gl_FragColor = vec4(radiance, edge * mix(.35*lit,1.0,skyDark));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Deploy this module next to world-scene.js; astronomy and assets stay in assets/sky/.
 * Async loading only once. setDateTime computes astronomy; update never computes it.
 */
export async function createCelestial(scene, textureLoader) {
  const [catalog, moonMap] = await Promise.all([
    fetch('./assets/sky/catalog.json').then(response => {
      if (!response.ok) throw new Error(`Star catalog HTTP ${response.status}`);
      return response.json();
    }),
    textureLoader.loadAsync('./assets/sky/moon-albedo-2k.jpg'),
  ]);
  if (!Array.isArray(catalog.stars) || !catalog.stars.length) {
    moonMap.dispose(); throw new Error('Invalid star catalog');
  }
  moonMap.colorSpace = T.SRGBColorSpace;
  moonMap.wrapS = T.RepeatWrapping;
  moonMap.wrapT = T.ClampToEdgeWrapping;
  moonMap.minFilter = T.LinearMipmapLinearFilter;
  moonMap.magFilter = T.LinearFilter;
  moonMap.generateMipmaps = true;
  moonMap.needsUpdate = true;

  const root = new T.Group(); root.name = 'actual-date-celestial-sky';
  root.userData.sky = true;
  const records = [...catalog.stars].filter(s => Number.isFinite(s.raHours) && Number.isFinite(s.decDeg) && Number.isFinite(s.magnitude))
    .sort((a,b) => a.magnitude - b.magnitude);
  const count = records.length;
  const positions = new Float32Array(count*3), tints = new Float32Array(count*3), magnitudes = new Float32Array(count);
  records.forEach((star,index) => {
    positions.set(equatorialUnitVector(star.raHours,star.decDeg),index*3);
    tints.set(starTint(star.temperatureK),index*3); magnitudes[index]=star.magnitude;
  });
  const starGeometry = new T.BufferGeometry();
  starGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
  starGeometry.setAttribute('magnitude',new T.BufferAttribute(magnitudes,1));
  starGeometry.setAttribute('tint',new T.BufferAttribute(tints,3));
  starGeometry.setDrawRange(0,count);
  const starMaterial = new T.ShaderMaterial({
    name:'real-catalog-stars',vertexShader:starVertex,fragmentShader:starFragment,
    uniforms:{starFrame:{value:new T.Matrix3()},skyRadius:{value:5000},pixelRatio:{value:1},sizeScale:{value:1},nightAmount:{value:0}},
    transparent:true,depthTest:true,depthWrite:false,blending:T.NormalBlending,fog:false,
  });
  const stars = new T.Points(starGeometry,starMaterial);
  stars.name='HYG-1000-brightest';stars.frustumCulled=false;stars.renderOrder=-900;
  stars.castShadow=stars.receiveShadow=false;
  stars.raycast=()=>{};
  stars.onBeforeRender=renderer=>{starMaterial.uniforms.pixelRatio.value=Math.min(2,renderer.getPixelRatio());};
  const moonMaterial = new T.ShaderMaterial({
    name:'NASA-actual-phase-moon',vertexShader:moonVertex,fragmentShader:moonFragment,
    uniforms:{moonMap:{value:moonMap},localLight:{value:new T.Vector3()},horizonBasis:{value:new T.Vector3()},angularTangent:{value:0},nightAmount:{value:0}},
    transparent:true,depthTest:true,depthWrite:false,blending:T.NormalBlending,fog:false,
  });
  const moon = new T.Mesh(new T.PlaneGeometry(2,2),moonMaterial);
  moon.name='NASA-moon-spherical-disk';moon.frustumCulled=false;moon.renderOrder=-899;
  moon.castShadow=moon.receiveShadow=false;moon.raycast=()=>{};
  root.add(stars,moon);scene.add(root);

  let current=null, frame=null, high=true, disposed=false, calculations=0;
  const cameraWorld = new T.Vector3();
  function setDateTime(date = new Date()) {
    const instant=parseShanghaiDateTime(date);
    if (current?.timestampMs===instant.getTime()) return current;
    current=astronomySnapshot(instant);calculations++;
    frame=moonFrame(current);
    starMaterial.uniforms.starFrame.value.set(...current.equatorialToWorldMatrix);
    moon.quaternion.copy(frame.rotation);
    moonMaterial.uniforms.localLight.value.copy(frame.lightLocal);
    moonMaterial.uniforms.horizonBasis.value.set(frame.direction.y,frame.right.y,frame.up.y);
    moonMaterial.uniforms.angularTangent.value=Math.tan(current.moon.angularRadiusDeg*RAD);
    moon.visible=current.moonAboveHorizon;
    return current;
  }
  function update(_t,camera,night=1) {
    if(disposed)return;
    camera.getWorldPosition(cameraWorld);root.position.copy(cameraWorld);
    const far=Number.isFinite(camera.far)?camera.far:12000;
    const radius=Math.max(1,far*.9);
    const n=Number.isFinite(night)?clamp01(night):0;
    starMaterial.uniforms.skyRadius.value=radius;
    const moonWashout=1-current.moonIllumination*.25*(current.moonAboveHorizon?1:0);
    starMaterial.uniforms.nightAmount.value=n*n*moonWashout;
    moonMaterial.uniforms.nightAmount.value=n;
    stars.visible=n>.01;
    moon.position.copy(frame.direction).multiplyScalar(radius);
    moon.scale.setScalar(radius*moonMaterial.uniforms.angularTangent.value);
    moon.visible=current.moonAboveHorizon;
  }
  function setQuality(value) {
    high=Boolean(value);
    starGeometry.setDrawRange(0,high?count:Math.min(600,count));
    starMaterial.uniforms.sizeScale.value=high?1:.9;
  }
  function dispose() {
    if(disposed)return;disposed=true;root.removeFromParent();
    starGeometry.dispose();starMaterial.dispose();moon.geometry.dispose();moonMaterial.dispose();moonMap.dispose();
  }
  setDateTime(new Date());
  return {setDateTime,update,setQuality,dispose,get snapshot(){return current;},
    get diagnostics(){return {catalogStars:count,drawnStars:starGeometry.drawRange.count,high,astronomyCalculations:calculations,moonAboveHorizon:current.moonAboveHorizon};}};
}
