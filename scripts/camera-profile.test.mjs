import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraProfile, dampZoom, wheelPixels, zoomDistance } from '../dist/camera-profile.js';

test('fog and shadows remain continuous throughout descent, including former mode boundaries', () => {
  let previous = cameraProfile(0);
  for (let h = .1; h <= 6000; h += .1) {
    const profile = cameraProfile(h);
    assert.ok(profile.fogDensity <= previous.fogDensity + 1e-12);
    assert.ok(Math.abs(profile.fogDensity - previous.fogDensity) < 6e-7);
    assert.ok(Math.abs(profile.shadowSpan - previous.shadowSpan) < .32);
    assert.ok(Math.abs(profile.shadowAnchorBlend - previous.shadowAnchorBlend) < .0006);
    assert.ok(profile.near >= .15 && profile.near <= 80);
    previous = profile;
  }
  assert.equal(cameraProfile(1.8).fogDensity, .00105);
  assert.equal(cameraProfile(720).shadowSpan, 750);
});

test('high aerial views can distinguish 5 mm ground layers with a 24-bit depth buffer', () => {
  const stepsApart = (distance, near) => {
    const far = 18000;
    const depth = z => far / (far - near) - far * near / ((far - near) * z);
    return (depth(distance + .005) - depth(distance)) * (2 ** 24 - 1);
  };
  assert.ok(stepsApart(500, .15) < 1, 'old close plane loses the ground-layer distinction');
  assert.ok(stepsApart(500, cameraProfile(500).near) > 4);
  assert.equal(cameraProfile(1.8).near, .15, 'walking close-ups retain their near plane');
});

test('wheel smoothing is monotonic, frame-rate independent, and reverses without a jump', () => {
  const simulate = fps => {
    let fov = 50;
    for (let n = 0; n < fps / 2; n++) {
      const next = dampZoom(fov, 100, 1 / fps);
      assert.ok(next >= fov && next <= 100);
      fov = next;
    }
    return fov;
  };
  assert.ok(Math.abs(simulate(30) - simulate(120)) < 1e-9);
  const outward = dampZoom(50, 100, 1 / 60);
  const reversed = dampZoom(outward, 12, 1 / 60);
  assert.ok(reversed < outward && reversed > 12);
  assert.equal(dampZoom(50, 100, 0), 50);
});

test('wheel units and aerial zoom retain the full 12–6000 metre range', () => {
  assert.equal(wheelPixels(3, 1, 800), 48);
  assert.equal(wheelPixels(1, 2, 800), 800);
  assert.equal(wheelPixels(120, 0, 800), 120);
  assert.equal(zoomDistance(5999, 10000), 6000);
  assert.equal(zoomDistance(12, -10000), 12);
  assert.ok(Math.abs(zoomDistance(zoomDistance(500, 120), -120) - 500) < 1e-9);
});
