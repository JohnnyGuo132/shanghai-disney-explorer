import test from 'node:test';
import assert from 'node:assert/strict';
import {vegetationViewDistance,treeViewRange,treeDetailLevel,vegetationDetailFade} from '../dist/vegetation-view.js';

test('tree detail does not switch the whole forest at a camera height of 150 m',()=>{
 const detail=height=>treeDetailLevel(1,vegetationViewDistance(40,height-6,50));
 assert.equal(detail(149.99),1);
 assert.equal(detail(150.01),1);
 assert.ok(Math.abs(treeViewRange(150.01)-treeViewRange(149.99))<.3);
 assert.equal(treeDetailLevel(1,vegetationViewDistance(40,720,50)),2);
});

test('zooming the lens changes projected tree size even at a fixed position',()=>{
 const wide=vegetationViewDistance(200,5,74),narrow=vegetationViewDistance(200,5,30);
 assert.ok(narrow<200&&wide>200);
 assert.equal(treeDetailLevel(1,wide),2);
 assert.equal(treeDetailLevel(1,narrow),1);
});

test('near and distant tree detail retain hysteresis when scrolling reverses',()=>{
 assert.equal(treeDetailLevel(1,50),0);
 assert.equal(treeDetailLevel(0,60),0);
 assert.equal(treeDetailLevel(1,60),1);
 assert.equal(treeDetailLevel(0,69),1);
 assert.equal(treeDetailLevel(1,241),2);
 assert.equal(treeDetailLevel(2,220),2);
 assert.equal(treeDetailLevel(1,220),1);
 assert.equal(treeDetailLevel(2,189),1);
 assert.equal(treeDetailLevel(0,5,false),1);
});

test('ascending fades nearby plants before they leave the detail range',()=>{
 const fades=[55,60,65,70,75,80,85].map(height=>vegetationDetailFade(vegetationViewDistance(20,height),83));
 assert.equal(fades[0],1);
 assert.equal(fades.at(-1),0);
 assert.ok(fades.some(value=>value>0&&value<1));
 for(let i=1;i<fades.length;i++)assert.ok(fades[i]<=fades[i-1]);
 assert.equal(vegetationDetailFade(83,83),0);
});

test('tree visibility range grows continuously and remains bounded in both quality modes',()=>{
 for(const high of [true,false]){
  let previous=treeViewRange(0,high);
  assert.equal(previous,high?540:340);
  for(let height=1;height<=6000;height++){
   const next=treeViewRange(height,high);
   assert.ok(next>=previous&&next<=2300);
   assert.ok(next-previous<11);
   previous=next;
  }
 }
});
