import * as T from 'three';

// Original surface-light animation. Existing materials, textures and normal maps remain in use.
export const phaseOrder=['overture','bouquets','constellations','golden-willow','finale','embers'];
export const castleThemes=[
  ['#164cff','#00d7ee','#ffb940'], // royal blue -> cyan, warm architectural accents
  ['#6914e8','#f11293','#16bde0'], // violet -> magenta, cool side towers
  ['#0647d5','#06dca5','#74a8ff'], // sapphire -> emerald, stars
  ['#00a478','#ffc13c','#16aade'], // emerald masonry, falling gold overhead
  ['#5120ed','#f52399','#00ded0'], // vivid layered finale
  ['#17389a','#dd8328','#487be4'], // blue silhouette -> amber embers
].map(row=>row.map(c=>new T.Color(c)));
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const limit=v=>T.MathUtils.clamp(finite(v),0,1);
const validColor=c=>c?.isColor&&c.toArray().every(Number.isFinite);
const vertexDeclaration='varying vec3 vCastleWorld;\n';
const vertexProjection=`
  vec4 castlePosition=vec4(transformed,1.0);
  #ifdef USE_BATCHING
    castlePosition=batchingMatrix*castlePosition;
  #endif
  #ifdef USE_INSTANCING
    castlePosition=instanceMatrix*castlePosition;
  #endif
  vCastleWorld=(modelMatrix*castlePosition).xyz;
`;
const fragmentDeclaration=`
varying vec3 vCastleWorld;
uniform float uCastleNight,uCastleShow,uCastleTime,uCastleIntensity,uCastleAccent,uCastleYaw,uCastleRole,uCastlePhase;
uniform vec3 uCastlePrimary,uCastleSecondary,uCastleTertiary,uCastleOrigin;
`;
const fragmentProjection=`
  // This runs AFTER lighting and AO, BEFORE reflectedLight is summed into totalDiffuse.
  float castleCos=cos(uCastleYaw),castleSin=sin(uCastleYaw);
  vec3 castleRelative=vCastleWorld-uCastleOrigin;
  vec3 cp=vec3(castleCos*castleRelative.x-castleSin*castleRelative.z,castleRelative.y,castleSin*castleRelative.x+castleCos*castleRelative.z);
  vec3 castleWorldNormal=inverseTransformDirection(normal,viewMatrix);
  vec3 cn=normalize(vec3(castleCos*castleWorldNormal.x-castleSin*castleWorldNormal.z,castleWorldNormal.y,castleSin*castleWorldNormal.x+castleCos*castleWorldNormal.z));
  vec3 toProjector=normalize(vec3(0.,23.,115.)-cp);
  float facing=smoothstep(-.05,.62,dot(cn,toProjector));
  float verticalWall=1.-smoothstep(.32,.78,abs(cn.y));
  float validDepth=smoothstep(12.,28.,115.-cp.z);
  float cone=1.-smoothstep(.58,.96,length(vec2(cp.x,cp.y-27.))/max(12.,115.-cp.z));
  float frontMask=facing*cone*validDepth;
  float wallMask=verticalWall*frontMask;
  float showGate=uCastleNight*uCastleShow;
  float maskedShow=showGate*frontMask;
  float heightMix=smoothstep(6.,56.,cp.y);
  float sideTower=smoothstep(8.,16.,abs(cp.x))*(1.-smoothstep(32.,43.,abs(cp.x)));
  float centerTower=1.-smoothstep(5.,14.,abs(cp.x));
  float lowerTerrace=1.-smoothstep(10.,18.,cp.y);
  vec2 uv=vec2(cp.x,cp.y-25.)*(84./max(15.,115.-cp.z));
  float angle=atan(uv.y,uv.x),radius=length(uv);
  // Slow, coherent motifs: a central rosette plus broad upward travelling storeys.
  float sixRays=pow(.5+.5*cos(angle*6.-uCastleTime*.12),8.);
  float rayMask=smoothstep(3.,6.,radius)*(1.-smoothstep(18.,24.,radius));
  float starRing=exp(-pow((radius-(10.2+1.25*cos(angle*6.-uCastleTime*.08)))*.78,2.));
  float centralMotif=(sixRays*rayMask*.58+starRing*.58)*(1.-smoothstep(21.,30.,abs(uv.x)));
  float ascending=pow(.5+.5*cos(cp.y*.50-uCastleTime*.51+abs(cp.x)*.057),8.);
  float towerSteps=ascending*(.32+.68*smoothstep(12.,42.,cp.y));
  float pier=pow(.5+.5*cos(cp.x*.46),10.)*(1.-smoothstep(43.,60.,cp.y));
  float chapterLift=.85+.15*sin(uCastlePhase*.61);
  vec3 zoning=mix(uCastlePrimary,uCastleSecondary,heightMix*.80);
  zoning=mix(zoning,uCastleTertiary,sideTower*(.25+.20*heightMix));
  zoning=mix(zoning,uCastlePrimary*.62,lowerTerrace*.60);
  zoning=mix(zoning,uCastleSecondary,centerTower*heightMix*.28);
  vec3 motifColor=mix(uCastleSecondary,uCastleTertiary,.22+.50*sideTower);
  float mapLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
  // Neutralize warm pigment only in projected illumination, retain mapped luminance/relief.
  float texturedRelief=clamp(.48+.60*sqrt(max(0.,mapLuma)),.48,1.08);
  texturedRelief*=.54+.46*sqrt(max(0.,dot(cn,toProjector)));
  float amplitude=.94+uCastleIntensity*.66+uCastleAccent*.20;
  vec3 contribution=vec3(0.);
  if(uCastleRole<.5){
    // Suppress the warm floodlight wash locally; original normals, AO and map still shade.
    float suppression=showGate*wallMask;
    reflectedLight.directDiffuse*=mix(1.,.18,suppression);
    reflectedLight.indirectDiffuse*=mix(1.,.26,suppression);
    reflectedLight.directSpecular*=mix(1.,.66,suppression);
    reflectedLight.indirectSpecular*=mix(1.,.76,suppression);
    totalEmissiveRadiance*=mix(1.,.40,suppression);
    vec3 pattern=zoning*(.62+.14*pier)
      +motifColor*(centralMotif*.58+towerSteps*.58)*chapterLift;
    vec3 seams=vec3(1.,.48,.08)*pier*towerSteps*(.07+uCastleAccent*.16);
    contribution=(pattern+seams)*texturedRelief*wallMask*amplitude*1.72*uCastleShow;
    vec3 idle=mix(vec3(.060,.026,.010),vec3(.012,.024,.063),heightMix);
    contribution+=idle*(.55+.45*facing)*(1.-uCastleShow*.90);
  }else if(uCastleRole<1.5){
    // Roof tiers are broad jewel washes, independent of the facade rosette.
    reflectedLight.directDiffuse*=mix(1.,.32,maskedShow);
    reflectedLight.indirectDiffuse*=mix(1.,.38,maskedShow);
    reflectedLight.directSpecular*=mix(1.,.76,maskedShow);
    vec3 roofColor=mix(uCastlePrimary,uCastleTertiary,.55+.25*heightMix);
    float roofTier=.58+.42*pow(.5+.5*cos(cp.y*.55-uCastleTime*.38),5.);
    float roofFacing=.30+.70*frontMask;
    contribution=roofColor*roofTier*roofFacing*(.40+uCastleIntensity*.42)*uCastleShow;
    contribution+=vec3(.012,.027,.068)*.25*(1.-uCastleShow);
  }else{
    // Gold and bronze retain warm identity and sharp material reflections.
    reflectedLight.directDiffuse*=mix(1.,.55,maskedShow);
    reflectedLight.indirectDiffuse*=mix(1.,.65,maskedShow);
    vec3 gild=vec3(1.,.49,.075);
    float crown=.45+.55*smoothstep(22.,56.,cp.y);
    float rising=pow(.5+.5*cos(cp.y*.48-uCastleTime*.45),6.);
    contribution=gild*(.12+uCastleShow*(.26+crown*.34+rising*.26+uCastleAccent*.38))*(.40+.60*frontMask);
  }
  totalEmissiveRadiance+=uCastleNight*contribution;
`;

/** API-compatible surface projection. No material cloning, texture duplication or scene lights. */
export function createCastleShow(castle,yaw=0){
  castle.updateWorldMatrix(true,false);
  const origin=new T.Vector3();castle.getWorldPosition(origin);
  const shared={uCastleNight:{value:0},uCastleShow:{value:0},uCastleTime:{value:0},uCastleIntensity:{value:0},uCastleAccent:{value:0},
    uCastlePrimary:{value:castleThemes[0][0].clone()},uCastleSecondary:{value:castleThemes[0][1].clone()},uCastleTertiary:{value:castleThemes[0][2].clone()},
    uCastleYaw:{value:finite(yaw)},uCastleOrigin:{value:origin},uCastlePhase:{value:0}};
  const materials=new Set(),patches=[],diagnostics={walls:0,roofs:0,metal:0,excluded:[],unsupported:[],patchedShaders:0,missingShaderAnchors:[],version:'v12-jewel-architecture',timeSource:'cue.progress * 60'};
  castle.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
  for(const material of materials){
    const name=material.name||'';
    if((/glass|window|lantern/i.test(name)&&!/frames/i.test(name))||/recess|passage|shadow/i.test(name)){diagnostics.excluded.push(name);continue;}
    if(!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial){diagnostics.unsupported.push(name);continue;}
    const role=/slate|roof|copper/i.test(name)?1:/gold|gild|bronze|metal/i.test(name)?2:0;
    diagnostics[role===0?'walls':role===1?'roofs':'metal']++;
    const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey,baseKey=previousKey.call(material);
    const callback=function(shader,renderer){
      previousCompile.call(this,shader,renderer);
      const vertexAnchor='#include <worldpos_vertex>',fragmentAnchor='#include <aomap_fragment>';
      const sumAnchor='vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;';
      if(!shader.vertexShader.includes(vertexAnchor)||!shader.fragmentShader.includes(fragmentAnchor)||!shader.fragmentShader.includes(sumAnchor)
        ||shader.fragmentShader.indexOf(fragmentAnchor)>shader.fragmentShader.indexOf(sumAnchor)){
        if(!diagnostics.missingShaderAnchors.includes(name))diagnostics.missingShaderAnchors.push(name);return;
      }
      Object.assign(shader.uniforms,shared);shader.uniforms.uCastleRole={value:role};
      shader.vertexShader=vertexDeclaration+shader.vertexShader.replace(vertexAnchor,vertexAnchor+'\n'+vertexProjection);
      shader.fragmentShader=fragmentDeclaration+shader.fragmentShader.replace(fragmentAnchor,fragmentAnchor+'\n'+fragmentProjection);
      diagnostics.patchedShaders++;
    };
    material.onBeforeCompile=callback;material.customProgramCacheKey=()=>baseKey+'|castle-show-v12-jewel-role-'+role;material.needsUpdate=true;
    patches.push({material,previousCompile,previousKey,callback});
  }
  const targetPrimary=new T.Color(),targetSecondary=new T.Color(),targetTertiary=new T.Color();
  let strength=0,disposed=false,projectionTime=0,wasRunning=false,startT=0;
  function update(t,dt,night,cue,active){
    if(disposed)return;
    const delta=T.MathUtils.clamp(finite(dt),0,.1),fast=1-Math.exp(-delta*3.5),colourEase=1-Math.exp(-delta*1.35);
    const inferred=typeof cue?.active==='boolean'?cue.active:!!cue&&phaseOrder.includes(cue.phase)&&finite(cue.progress,1)<1;
    const running=typeof active==='boolean'?active:inferred;
    if(running&&!wasRunning)startT=finite(t);
    if(running)projectionTime=Number.isFinite(cue?.progress)?limit(cue.progress)*60:Math.max(0,finite(t)-startT);
    // Freeze the motif on stop while strength fades; replay/seek follows cue time exactly.
    shared.uCastleTime.value=projectionTime;wasRunning=running;
    strength+=((running?1:0)-strength)*(1-Math.exp(-delta*(running?1.8:1.6)));
    shared.uCastleNight.value+=(limit(night)-shared.uCastleNight.value)*(1-Math.exp(-delta*3));
    shared.uCastleShow.value=strength;
    const intensity=running?T.MathUtils.clamp(finite(cue?.intensity),0,.9):0,accent=running?T.MathUtils.clamp(finite(cue?.accent),0,.6):0;
    shared.uCastleIntensity.value+=(intensity-shared.uCastleIntensity.value)*fast;
    shared.uCastleAccent.value+=(accent-shared.uCastleAccent.value)*fast;
    if(running){
      const phase=Math.max(0,phaseOrder.indexOf(cue?.phase));shared.uCastlePhase.value+=(phase-shared.uCastlePhase.value)*colourEase;
      targetPrimary.copy(castleThemes[phase][0]);if(validColor(cue?.color))targetPrimary.lerp(cue.color,.16);
      targetSecondary.copy(castleThemes[phase][1]);if(validColor(cue?.secondaryColor))targetSecondary.lerp(cue.secondaryColor,.28);
      targetTertiary.copy(castleThemes[phase][2]);
      shared.uCastlePrimary.value.lerp(targetPrimary,colourEase);shared.uCastleSecondary.value.lerp(targetSecondary,colourEase);shared.uCastleTertiary.value.lerp(targetTertiary,colourEase);
    }
    return shared;
  }
  function dispose(){if(disposed)return;for(const p of patches)if(p.material.onBeforeCompile===p.callback){p.material.onBeforeCompile=p.previousCompile;p.material.customProgramCacheKey=p.previousKey;p.material.needsUpdate=true;}disposed=true;}
  return{update,dispose,get strength(){return strength;},get uniforms(){return shared;},get diagnostics(){return diagnostics;}};
}
