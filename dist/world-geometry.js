import * as T from 'three';
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function inside(p,ring){let ok=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])ok=!ok;}return ok;}
export function centroid(ring){let x=0,z=0,n=ring.length-(distance(ring[0],ring.at(-1))<.01?1:0);for(let i=0;i<n;i++){x+=ring[i][0];z+=ring[i][1];}return[x/n,z/n];}
export function area(ring){let a=0;for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;}
export function nearestSegment(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],u=T.MathUtils.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1),0,1),q=[a[0]+dx*u,a[1]+dz*u];return{point:q,distance:distance(p,q),u};}
export function shapeOf(rings){const make=r=>{const p=new T.Path();r.forEach((v,i)=>i?p.lineTo(v[0],-v[1]):p.moveTo(v[0],-v[1]));p.closePath();return p;},s=new T.Shape(make(rings[0]).getPoints());for(const r of rings.slice(1))s.holes.push(make(r));return s;}
export function polygon(rings,y=0,tile=2){const g=new T.ShapeGeometry(shapeOf(rings));g.rotateX(-Math.PI/2);g.translate(0,y,0);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/tile,p.getZ(i)/tile);return g;}
export function ribbon(points,width=5,y=.08,tile=2){const pos=[],uv=[],norm=[],indices=[];let along=0;for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],d=distance(a,b);if(d<.01)continue;const nx=-(b[1]-a[1])/d*width/2,nz=(b[0]-a[0])/d*width/2,k=pos.length/3;pos.push(a[0]+nx,y,a[1]+nz,a[0]-nx,y,a[1]-nz,b[0]+nx,y,b[1]+nz,b[0]-nx,y,b[1]-nz);uv.push(0,along/tile,width/tile,along/tile,0,(along+d)/tile,width/tile,(along+d)/tile);norm.push(0,1,0,0,1,0,0,1,0,0,1,0);indices.push(k,k+2,k+1,k+1,k+2,k+3);along+=d;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);const positions=g.attributes.position,coords=g.attributes.uv;for(let i=0;i<positions.count;i++)coords.setXY(i,positions.getX(i)/tile,positions.getZ(i)/tile);return g;}
export function extrude(ring,h,tile=3){const g=new T.ExtrudeGeometry(shapeOf([ring]),{depth:h,bevelEnabled:false,curveSegments:2});g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv,n=g.attributes.normal;for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getY(i))>.5?p.getX(i):p.getX(i)+p.getZ(i))/tile,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/tile);return g;}
export function makeNavigation(paths,blocked){const nodes=[],byKey=new Map(),edges=[];const index=p=>{const k=p.map(v=>Math.round(v*4)).join(',');if(!byKey.has(k)){byKey.set(k,nodes.length);nodes.push(p);edges.push([]);}return byKey.get(k);};
 const clear=(a,b)=>{const count=Math.max(1,Math.ceil(distance(a,b)/.25));for(let i=0;i<=count;i++){const u=i/count;if(blocked([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]))return false;}return true;};
 for(const path of paths){if(path.private||path.kind==='service')continue;let prev=null;for(const p of path.points){const n=index(p);if(prev!==null&&n!==prev&&clear(nodes[n],nodes[prev])){const w=distance(nodes[n],nodes[prev]);edges[n].push([prev,w]);edges[prev].push([n,w]);}prev=n;}}
 // Join only tiny cartographic gaps with a clear, short walking segment.
 const cells=new Map();nodes.forEach((p,i)=>{const key=`${Math.floor(p[0]/12)},${Math.floor(p[1]/12)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);});
 nodes.forEach((p,i)=>{if(edges[i].length>1)return;let best=-1,dd=8;const cx=Math.floor(p[0]/12),cz=Math.floor(p[1]/12);for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const j of cells.get(`${x},${z}`)||[]){if(j===i||edges[i].some(e=>e[0]===j))continue;const d=distance(p,nodes[j]);if(d<dd&&clear(p,nodes[j])){dd=d;best=j;}}if(best>=0){edges[i].push([best,dd]);edges[best].push([i,dd]);}});
 const seen=new Set(),components=[];for(let root=0;root<nodes.length;root++){if(seen.has(root)||!edges[root].length)continue;const part=[],queue=[root];seen.add(root);for(let i=0;i<queue.length;i++){const id=queue[i];part.push(id);for(const[next]of edges[id])if(!seen.has(next)){seen.add(next);queue.push(next);}}components.push(part);}const main=new Set(components.sort((a,b)=>b.length-a.length)[0]||[]);
 const nearest=p=>{let id=-1,d=Infinity;nodes.forEach((q,i)=>{if(!edges[i].length||blocked(q))return;const v=distance(p,q);if(v<d){d=v;id=i;}});return id;};
 const segments=[];for(let i=0;i<nodes.length;i++)for(const[j]of edges[i])if(j>i&&main.has(i)&&main.has(j))segments.push([i,j]);
 function access(p){if(blocked(p))return[];const candidates=segments.map(([a,b])=>({...nearestSegment(p,nodes[a],nodes[b]),a,b})).filter(c=>c.distance<=60&&clear(p,c.point)).sort((a,b)=>a.distance-b.distance);const best=candidates[0]?.distance??0;return candidates.filter(c=>c.distance<best+8).slice(0,4);}
 const compact=points=>points.filter((p,i)=>!i||distance(p,points[i-1])>.015).map(p=>p.slice());
 function result(points){points=compact(points);return{points,length:points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0)};}
 return{nodes,onMainPath(a,b){const key=p=>p.map(v=>Math.round(v*4)).join(','),ai=byKey.get(key(a)),bi=byKey.get(key(b));return main.has(ai)&&main.has(bi)&&edges[ai].some(e=>e[0]===bi);},nearest(p){const i=nearest(p);return i<0?p:nodes[i];},route(a,b){
  if(distance(a,b)<.1)return blocked(a)?null:result([a,b]);
  const from=access(a),to=access(b);if(!from.length||!to.length)return null;
  const dist=new Float64Array(nodes.length).fill(Infinity),prev=new Int32Array(nodes.length).fill(-1),origin=new Int32Array(nodes.length).fill(-1),done=new Uint8Array(nodes.length);
  from.forEach((c,k)=>{for(const id of[c.a,c.b]){const cost=c.distance+distance(c.point,nodes[id]);if(cost<dist[id]){dist[id]=cost;origin[id]=k;}}});
  for(let iter=0;iter<nodes.length;iter++){let u=-1,best=Infinity;for(let i=0;i<nodes.length;i++)if(!done[i]&&dist[i]<best){u=i;best=dist[i];}if(u<0)break;done[u]=1;for(const[v,w]of edges[u])if(dist[v]>best+w){dist[v]=best+w;prev[v]=u;origin[v]=origin[u];}}
  let best=null,cost=Infinity;
  for(const c of to)for(const end of[c.a,c.b]){const total=dist[end]+distance(nodes[end],c.point)+c.distance;if(total>=cost||origin[end]<0)continue;const points=[];for(let u=end;u>=0;u=prev[u])points.push(nodes[u]);points.reverse();best=result([a,from[origin[end]].point,...points,c.point,b]);cost=best.length;}
  for(const f of from)for(const e of to)if(f.a===e.a&&f.b===e.b){const r=result([a,f.point,e.point,b]);if(r.length<cost){best=r;cost=r.length;}}
  return best;
 }};
}
