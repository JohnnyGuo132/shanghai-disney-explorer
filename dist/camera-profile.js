// Render decisions use the camera's physical position, never the destination UI mode.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (value, min, max) => {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
};

export function cameraProfile(height) {
  const h = Math.max(0, height);
  const altitudeBlend = smoothstep(h, 8, 240);
  const distantFog = .00022 * Math.min(1, 1100 / (h + 600));
  return {
    fogDensity: .00105 + (distantFog - .00105) * altitudeBlend,
    shadowSpan: 155 + 595 * smoothstep(h, 10, 300),
    shadowAnchorBlend: smoothstep(h, 20, 320),
    // Centimetre-scale ground layers need more depth precision in the aerial view.
    // Keep the close plane at 15 cm for walking and increase it continuously aloft.
    near: clamp(.15 + Math.max(0, h - 3) * .025, .15, 80)
  };
}

// Exponential response has the same speed at 30, 60 and 120 fps and never overshoots.
export function dampZoom(current, target, dt) {
  const next = current + (target - current) * -Math.expm1(-12 * Math.max(0, dt));
  return Math.abs(next - target) < .0001 ? target : next;
}

export function wheelPixels(delta, mode, pageHeight) {
  return delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
}

export function zoomDistance(distance, delta, min = 12, max = 6000) {
  return clamp(distance * Math.exp(clamp(delta * .001, -.5, .5)), min, max);
}
