// Original scene-navigation helpers. Distances are in scene metres.
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function routeMetrics(points){
 const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+distance(points[i-1],points[i]));
 return{cumulative,length:cumulative.at(-1)||0};
}
export function routeProgress(points,metrics,position){
 let best={distance:Infinity,along:0,index:1};
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=distance(a,b),u=Math.max(0,Math.min(1,((position[0]-a[0])*dx+(position[1]-a[1])*dz)/(length*length||1))),d=distance(position,[a[0]+dx*u,a[1]+dz*u]);if(d<best.distance)best={distance:d,along:metrics.cumulative[i-1]+u*length,index:i};}
 return{...best,remaining:Math.max(0,metrics.length-best.along)};
}
export function routeInstruction(points,metrics,progress){
 if(progress.remaining<4)return'即将到达观景点';
 for(let i=progress.index;i<points.length-1;i++){
  const ahead=metrics.cumulative[i]-progress.along;if(ahead<-.1||ahead>65)continue;
  const a=points[i-1],b=points[i],c=points[i+1],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],angle=Math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1]);
  if(Math.abs(angle)>.5)return ahead<=5?`现在${angle>0?'向右':'向左'}沿步道转弯`:`${Math.round(ahead/5)*5} 米后${angle>0?'向右':'向左'}沿步道转弯`;
 }
 return'沿蓝色路线继续前行';
}
export const formatDistance=m=>m>=1000?(m/1000).toFixed(1)+' 公里':Math.max(0,Math.round(m))+' 米';
export const formatWalkTime=(m,speed=2)=>m/speed<60?'不到 1 分钟':Math.ceil(m/speed/60)+' 分钟';
