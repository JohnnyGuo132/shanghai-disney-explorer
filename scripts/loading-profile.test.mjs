import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoadingProfile } from '../dist/loading-profile.js';

const full = { mobileAssets: false, high: true, pixelRatioCap: 1.5, shadowSize: 4096 };
const mobile = { mobileAssets: true, high: false, pixelRatioCap: 1, shadowSize: 2048 };

test('compact touch devices start with smaller textures and lower rendering limits', () => {
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: true, width: 390, deviceMemory: 8 }), mobile);
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: true, width: 1024 }), mobile);
});

test('desktop windows retain full quality even when resized to a narrow viewport', () => {
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: false, width: 1920, deviceMemory: 8 }), full);
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: false, width: 390, deviceMemory: 8 }), full);
  assert.deepEqual(resolveLoadingProfile(), full);
});

test('large coarse-pointer tablets retain full quality unless another capability asks for less', () => {
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: true, width: 1025, deviceMemory: 8 }), full);
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: true, width: 1366, deviceMemory: 8 }), full);
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: true, width: 1366, deviceMemory: 4 }), mobile);
});

test('an explicit high quality choice takes priority over all automatic reductions', () => {
  assert.deepEqual(resolveLoadingProfile({
    coarsePointer: true, width: 390, saveData: true, deviceMemory: 2, quality: 'high',
  }), full);
});

test('an explicit low quality choice applies on desktop as well as touch devices', () => {
  assert.deepEqual(resolveLoadingProfile({
    coarsePointer: false, width: 1920, saveData: false, deviceMemory: 16, quality: 'low',
  }), mobile);
});

test('data-saving requests reduce initial resources regardless of pointer and viewport', () => {
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: false, width: 1920, saveData: true }), mobile);
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: true, width: 1366, saveData: true }), mobile);
});

test('only a reported positive RAM hint at or below four GiB triggers the memory fallback', () => {
  for (const deviceMemory of [.25, .5, 1, 2, 4]) {
    assert.deepEqual(resolveLoadingProfile({ deviceMemory }), mobile);
  }
  for (const deviceMemory of [undefined, null, NaN, Infinity, 0, -1, 8, 16]) {
    assert.deepEqual(resolveLoadingProfile({ deviceMemory }), full);
  }
});

test('unavailable viewport dimensions do not classify a device as compact', () => {
  for (const width of [undefined, NaN, Infinity, 0, -1]) {
    assert.deepEqual(resolveLoadingProfile({ coarsePointer: true, width }), full);
  }
  assert.deepEqual(resolveLoadingProfile({ coarsePointer: true, width: 390, quality: 'auto' }), mobile);
});
