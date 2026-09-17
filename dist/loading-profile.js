/**
 * Choose initial resource and rendering limits from browser capabilities.
 * Width is in CSS pixels; deviceMemory is the optional system RAM hint in GiB,
 * not a GPU-memory measurement. A narrow desktop window alone is not mobile.
 * Explicit quality preferences override the automatic capability decision.
 */
export function resolveLoadingProfile({
  coarsePointer = false,
  width = Infinity,
  saveData = false,
  deviceMemory,
  quality,
} = {}) {
  const compactTouch = coarsePointer === true && Number.isFinite(width) && width > 0 && width <= 1024;
  const limitedMemory = Number.isFinite(deviceMemory) && deviceMemory > 0 && deviceMemory <= 4;
  const mobileAssets = quality === 'high' ? false
    : quality === 'low' ? true
      : compactTouch || saveData === true || limitedMemory;
  return {
    mobileAssets,
    high: !mobileAssets,
    pixelRatioCap: mobileAssets ? 1 : 1.5,
    shadowSize: mobileAssets ? 2048 : 4096,
  };
}
