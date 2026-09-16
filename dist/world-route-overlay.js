import * as T from 'three';
// Conforms to the walking surface, including bridge decks. No depth-disabled lines.
export function createRouteOverlay(scene,heightAt){
 const group=new T.Group();group.name='visitor_navigation';scene.add(group);
 const materials=[new T.MeshBasicMaterial({color:'#f3faff',depthWrite:false}),new T.MeshBasicMaterial({color:'#287bdc',depthWrite:false}),new T.MeshBasicMaterial({color:'#17b993',depthWrite:false})];
 function clear(){for(const m of [...group.children]){m.geometry.dispose();group.remove(m);}}
 const surface=p=>heightAt(p)-1.8+.23;
 function strip(points,width,offset,material){const positions=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<.001)continue;const nx=-(b[1]-a[1])/d*width/2,nz=(b[0]-a[0])/d*width/2,ay=surface(a)+offset,by=surface(b)+offset;positions.push(a[0]+nx,ay,a[1]+nz,b[0]+nx,by,b[1]+nz,a[0]-nx,ay,a[1]-nz,a[0]-nx,ay,a[1]-nz,b[0]+nx,by,b[1]+nz,b[0]-nx,by,b[1]-nz);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));const m=new T.Mesh(g,material);m.renderOrder=offset===0?1:2;group.add(m);return m;
 }
 function show(route){clear();if(!route||route.points.length<2)return;const points=[route.points[0]],arrows=[];let nextArrow=9,travelled=0;
  for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(d/2));for(let j=1;j<=n;j++)points.push([T.MathUtils.lerp(a[0],b[0],j/n),T.MathUtils.lerp(a[1],b[1],j/n)]);
   if(d>.01)while(nextArrow<travelled+d){const u=(nextArrow-travelled)/d,p=[T.MathUtils.lerp(a[0],b[0],u),T.MathUtils.lerp(a[1],b[1],u)],dx=(b[0]-a[0])/d,dz=(b[1]-a[1])/d,y=surface(p)+.035;arrows.push(p[0]+dx*.95,y,p[1]+dz*.95,p[0]-dx*.65+dz*.68,y,p[1]-dz*.65-dx*.68,p[0]-dx*.65-dz*.68,y,p[1]-dz*.65+dx*.68);nextArrow+=12;}travelled+=d;
  }
  strip(points,1.15,0,materials[0]);strip(points,.78,.015,materials[1]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(arrows,3));const a=new T.Mesh(g,materials[0]);a.renderOrder=3;group.add(a);
  [points[0],points.at(-1)].forEach((p,i)=>{const ring=new T.Mesh(new T.RingGeometry(1.4,2.2,32).rotateX(-Math.PI/2),materials[i?1:2]);ring.position.set(p[0],surface(p)+.04,p[1]);ring.renderOrder=4;group.add(ring);const pin=new T.Mesh(new T.SphereGeometry(.36,10,8),materials[i?1:2]);pin.position.set(p[0],surface(p)+1.7,p[1]);pin.renderOrder=4;group.add(pin);});
 }
 return{show,clear};
}
