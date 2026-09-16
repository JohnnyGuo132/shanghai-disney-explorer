// Screen-size distances keep detail selection continuous when the camera zooms
// or rises above a tree. No navigation-mode flag is involved.
const smoothstep=(value,min,max)=>{const x=Math.max(0,Math.min(1,(value-min)/(max-min)));return x*x*(3-2*x);};
const referenceTangent=Math.tan(50*Math.PI/360);

export function vegetationViewDistance(horizontalDistance,verticalDistance,fov=50){
 const angle=Math.max(10,Math.min(120,fov))*Math.PI/360;
 return Math.hypot(horizontalDistance,verticalDistance)*Math.tan(angle)/referenceTangent;
}

export function treeViewRange(height,high=true){
 const ground=high?540:340;
 return ground+(2300-ground)*smoothstep(height,65,350);
}

export function treeDetailLevel(previous,distance,high=true){
 const farLimit=high?215:130;
 if(previous===2?distance>farLimit-25:distance>farLimit+25)return 2;
 return high&&(previous===0?distance<=68:distance<51)?0:1;
}

export function vegetationDetailFade(distance,range){
 return 1-smoothstep(distance,range-16,range);
}
