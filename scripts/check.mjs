// Read-only distribution checker. Install this file at scripts/check.mjs.
// node scripts/check.mjs [--root=dist] [--base-url=http://127.0.0.1:4173/repo-name/]
// Default dist is resolved from this script's parent project, not the working directory.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const arg=name=>process.argv.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(arg('--root')||path.join(project,'dist'));
async function main(){
async function walk(dir){const entries=await fs.readdir(dir,{withFileTypes:true}),out=[];for(const e of entries){const f=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(f));else out.push({path:path.relative(root,f).split(path.sep).join('/'),bytes:(await fs.stat(f)).size});}return out;}
const files=await walk(root),all=new Map(files.map(f=>[f.path,f])),lower=new Map(files.map(f=>[f.path.toLowerCase(),f.path]));
const textFiles=files.filter(f=>/\.(?:html|css|js|json|md|txt)$/.test(f.path)),texts=new Map(await Promise.all(textFiles.map(async f=>[f.path,await fs.readFile(path.join(root,f.path),'utf8')])));
const refs=[],bareImports=[],rootAbsolute=[],externalRuntime=[],dataURIs=[];
function reference(owner,value,kind,relativeTo='file'){
 if(/^(?:data:|blob:|#|mailto:|tel:|javascript:)/i.test(value)){if(value.startsWith('data:'))dataURIs.push({owner,kind});return;}
 if(/^(?:https?:)?\/\//i.test(value)){if(kind!=='html-link')externalRuntime.push({owner,value,kind});return;}
 if(value.startsWith('/')){rootAbsolute.push({owner,value,kind});return;}
 const clean=decodeURIComponent(value.split(/[?#]/)[0]);
 if(!clean)return;
 let resolved=path.posix.normalize(path.posix.join(relativeTo==='document'?'':path.posix.dirname(owner),clean));
 if(resolved==='.'||resolved.endsWith('/'))resolved=path.posix.join(resolved,'index.html');
 const actual=all.has(resolved)?resolved:lower.get(resolved.toLowerCase());
 refs.push({owner,value,kind,resolved,exists:!!actual,caseCorrect:actual===resolved,...(actual&&actual!==resolved?{actual}:{}),escapesRoot:resolved==='..'||resolved.startsWith('../')});
}
for(const [name,text]of texts){
 if(name.endsWith('.html')){
  for(const m of text.matchAll(/\b(src|href|poster|action)\s*=\s*['"]([^'"]+)['"]/gi))reference(name,m[2],m[1]==='href'?'html-link':'html-resource');
  for(const m of text.matchAll(/<script\b[^>]*type=['"]importmap['"][^>]*>([\s\S]*?)<\/script>/gi)){const map=JSON.parse(m[1]);for(const v of Object.values(map.imports||{}))reference(name,v,'importmap');}
  for(const m of text.matchAll(/http-equiv=['"]refresh['"][^>]*content=['"][^'"]*url=([^'">]+)/gi))reference(name,m[1],'html-refresh');
 }
 if(name.endsWith('.css'))for(const m of text.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi))reference(name,m[1],'css-url');
 if(name.endsWith('.js')){
  for(const m of text.matchAll(/^\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?['"]([^'"]+)['"]/gm)){
   if(m[1].startsWith('.')||m[1].startsWith('/')||m[1].startsWith('http'))reference(name,m[1],'module-import');else bareImports.push({owner:name,specifier:m[1]});
  }
  if(!name.startsWith('vendor/')&&!name.includes('/vendor/')){
   for(const m of text.matchAll(/\b(?:fetch|loadAsync|load)\(\s*['"]([^'"]+\.(?:json|glb|gltf|hdr|jpg|jpeg|png|webp|wasm))['"]/g))reference(name,m[1],'literal-load','document');
   for(const m of text.matchAll(/\b(?:src|href)\s*=\s*['"]([^'"]+)['"]/g))if(/^[./]|^https?:/.test(m[1]))reference(name,m[1],'runtime-property','document');
  }
 }
}
const glbs=[],invalidGLBs=[];
for(const f of files.filter(f=>f.path.endsWith('.glb'))){
 try{
  const b=await fs.readFile(path.join(root,f.path));
  if(b.length<20||b.readUInt32LE(0)!==0x46546c67||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length||b.readUInt32LE(16)!==0x4e4f534a)throw Error('Invalid GLB v2 header or declared byte length');
  let offset=12;while(offset<b.length){if(offset+8>b.length)throw Error('Truncated GLB chunk header');const length=b.readUInt32LE(offset);if(length%4||offset+8+length>b.length)throw Error('Invalid GLB chunk alignment or length');offset+=8+length;}
  const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));if(j.asset?.version!=='2.0')throw Error('Missing glTF 2.0 asset declaration');
  const uris=[...(j.images||[]),...(j.buffers||[])].filter(x=>x.uri).map(x=>x.uri);for(const uri of uris)reference(f.path,uri,'gltf-resource');glbs.push({path:f.path,bytes:f.bytes,extensionsRequired:j.extensionsRequired||[],externalResources:uris.filter(u=>!u.startsWith('data:')).length});
 }catch(error){invalidGLBs.push({path:f.path,error:error.message});}
}
const layout=JSON.parse(texts.get('assets/landmarks/layout.json')||'[]');for(const e of layout)if(e.file)reference('world-scene.js','./assets/landmarks/'+e.file,'registry-load','document');
for(const n of ['classical_window','timber_storefront','urban_storefront','carousel','rex','woody','heritage-lamp','cast-iron-bench','stone-edging','shrub','fern','grass-tuft','orange-flowers','white-flowers'])reference('world-scene.js','./assets/landmarks/'+n+'.glb','generated-load','document');
for(const n of ['paving','grass','wall','roof'])for(const suffix of ['diff','nor','rough'])reference('world-scene.js',`./assets/realism/${n}_${suffix}.jpg`,'generated-texture','document');
for(const n of ['draco_wasm_wrapper.js','draco_decoder.wasm'])reference('world-scene.js','./vendor/draco/'+n,'decoder-load','document');
const missing=refs.filter(r=>!r.exists),caseMismatches=refs.filter(r=>r.exists&&!r.caseCorrect),bareUnknown=bareImports.filter(r=>r.specifier!=='three');
const oversized=files.filter(f=>f.bytes>=100*1024*1024);
const expectedAttributions=['LICENSE.txt','LICENSE-SCOPE.md','credits.html','assets/LICENSES.txt','assets/Fireworks-MIT.txt','vendor/LICENSE.txt','vendor/DRACO-LICENSE.txt','vendor/N8AO-LICENSE.txt','vendor/POSTPROCESSING-LICENSE.txt','assets/sky/CREDITS.md','assets/sky/licenses/SunCalc-BSD-2-Clause.txt','assets/sky/licenses/HYG-CC-BY-SA-4.0.md','assets/geography/manifest.json','assets/landmarks/ARCHITECTURE-SOURCES.md','assets/landmarks/LANDSCAPE-SOURCES.md','assets/landmarks/V8-SOURCES.md','assets/landmarks/BOTANY-SOURCES.json','assets/landmarks/FLOWER-SOURCES.json','assets/landmarks/FANTASY-SOURCES.json'];
const attributionFailures=expectedAttributions.filter(p=>!all.has(p)||!texts.get(p)?.trim());
const syntaxFailures=[],originalJS=[...texts].filter(([name])=>name.endsWith('.js')&&!name.startsWith('vendor/')&&!name.includes('/vendor/'));
for(const [name,source]of originalJS){const r=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8',maxBuffer:1024*1024});if(r.error||r.status!==0)syntaxFailures.push({path:name,error:r.error?.message||r.stderr.trim()||'node --check failed'});}
const report={root,summary:{files:files.length,totalBytes:files.reduce((s,f)=>s+f.bytes,0),glbs:glbs.length,checkedReferences:refs.length,originalJS:originalJS.length,attributionFiles:expectedAttributions.length},missing,caseMismatches,rootAbsolute,bareUnknown,invalidGLBs,attributionFailures,syntaxFailures};
const baseURL=arg('--base-url');
if(baseURL){
 if(!baseURL.endsWith('/'))throw Error('--base-url must end with / so project-relative resolution is tested.');
 const base=new URL(baseURL),todo=[...new Set(['index.html','explore.html','map.html','credits.html',...refs.filter(r=>r.exists).map(r=>r.resolved)])],results=[];
 for(let offset=0;offset<todo.length;offset+=6)await Promise.all(todo.slice(offset,offset+6).map(async file=>{const url=new URL(file,base);try{const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(15000)}),finalURL=new URL(response.url),mime=response.headers.get('content-type')||'',js=/\.js$/.test(file),expectedMime=js?/javascript|ecmascript/.test(mime):file.endsWith('.wasm')?/application\/wasm/.test(mime):file.endsWith('.html')?/text\/html/.test(mime):file.endsWith('.json')?/application\/json/.test(mime):/\.(?:jpg|jpeg|png|webp)$/.test(file)?/^image\//.test(mime):!/text\/html/.test(mime);results.push({file,url:url.href,status:response.status,mime,expectedMime,length:response.headers.get('content-length'),staysUnderPrefix:finalURL.origin===base.origin&&finalURL.pathname.startsWith(base.pathname)});}catch(e){results.push({file,url:url.href,error:e.message});}}));
 report.http={baseURL,requests:results.length,failures:results.filter(r=>r.error||r.status!==200||!r.expectedMime||!r.staysUnderPrefix),results};
}
const failures=[...missing.map(r=>`Missing: ${r.owner} -> ${r.value} (${r.resolved})`),...caseMismatches.map(r=>`Case mismatch: ${r.owner} -> ${r.resolved}; actual ${r.actual}`),...rootAbsolute.map(r=>`Root-absolute URL: ${r.owner} -> ${r.value}`),...bareUnknown.map(r=>`Unknown bare import: ${r.owner} -> ${r.specifier}`),...invalidGLBs.map(r=>`Invalid GLB: ${r.path}: ${r.error}`),...attributionFailures.map(p=>`Missing/empty attribution: ${p}`),...syntaxFailures.map(r=>`JS syntax: ${r.path}\n${r.error}`),...oversized.map(f=>`File exceeds 100 MiB: ${f.path}`),...(report.http?.failures||[]).map(r=>`HTTP: ${r.url}: ${r.error||`${r.status}, ${r.mime}, MIME match=${r.expectedMime}`}`)];
console.log(`Checked ${report.summary.files} files (${(report.summary.totalBytes/1048576).toFixed(2)} MiB), ${refs.length} local references, ${glbs.length} GLBs, ${originalJS.length} original JS modules and ${expectedAttributions.length} attribution files.`);
if(report.http)console.log(`HTTP prefix probe: ${report.http.requests} requests, ${report.http.failures.length} failures (${baseURL}).`);
if(failures.length){console.error(`FAIL: ${failures.length} issue(s).`);for(const failure of failures)console.error(failure);process.exitCode=1;}else console.log('PASS: references, filename case, subpath URLs, GLB structure, JS syntax and attribution files.');
}
main().catch(error=>{console.error(`FAIL: ${error.message}`);process.exitCode=1;});
