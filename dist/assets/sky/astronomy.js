/** Shanghai park astronomy adapter. Native ESM; no Three.js dependency.
 * SunCalc 2.0.2 is vendored unchanged under BSD-2-Clause.
 * Directions: X east, Y up, Z south. Angles explicitly named Deg/Rad.
 * Intended for visual sky rendering, not precision observing/navigation.
 */
import * as SunCalc from './vendor/suncalc-2.0.2.js';

export const OBSERVER = Object.freeze({
  latitude: 31.14575, longitude: 121.65532,
  timeZone: 'Asia/Shanghai', utcOffsetMinutes: 480,
});
const RAD = Math.PI / 180, DAY = 86400000, OFFSET = 480 * 60000;
const phaseNames = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
const phaseKeys = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'];
const dayCache = new Map();
const mod = (n, d) => ((n % d) + d) % d;

/** Date/epoch = absolute instant. Offset-free ISO = Shanghai UTC+8, never host local time.
 * Date-only means Shanghai 00:00. Invalid calendar dates and 24:00 are rejected.
 * Fixed UTC+8 is deliberate; historical Shanghai daylight-saving rules are not modeled.
 */
export function parseShanghaiDateTime(value = new Date()) {
  if (value instanceof Date || typeof value === 'number') {
    const date = new Date(value instanceof Date ? value.getTime() : value);
    if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid date/time');
    return date;
  }
  if (typeof value !== 'string') throw new TypeError('Expected Date, epoch milliseconds, or ISO date/time');
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/);
  if (!m) throw new RangeError('Use YYYY-MM-DDTHH:mm[:ss][Z|±HH:mm]');
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] || '0', m[5] || '0', m[6] || '0'].map(Number);
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || s > 59) throw new RangeError('Invalid calendar date/time');
  const civil = new Date(0);
  civil.setUTCFullYear(y, mo - 1, d);
  civil.setUTCHours(h, mi, s, Number((m[7] || '').padEnd(3, '0')));
  if (civil.getUTCFullYear() !== y || civil.getUTCMonth() !== mo - 1 || civil.getUTCDate() !== d) throw new RangeError('Invalid calendar date');
  let offset = OBSERVER.utcOffsetMinutes;
  if (m[8] === 'Z') offset = 0;
  else if (m[8]) {
    const oh = Number(m[8].slice(1, 3)), om = Number(m[8].slice(4, 6));
    if (oh > 23 || om > 59) throw new RangeError('Invalid UTC offset');
    offset = (m[8][0] === '-' ? -1 : 1) * (60 * oh + om);
  }
  return new Date(civil.getTime() - offset * 60000);
}

export function shanghaiDateTime(value = new Date()) {
  return new Date(parseShanghaiDateTime(value).getTime() + OFFSET).toISOString().slice(0, 19) + '+08:00';
}

/** Azimuth: 0 north, 90 east, 180 south, 270 west. Altitude above horizontal. */
export function horizontalDirection(azimuthDeg, altitudeDeg) {
  const a = azimuthDeg * RAD, h = altitudeDeg * RAD, c = Math.cos(h);
  return [c * Math.sin(a), Math.sin(h), -c * Math.cos(a)];
}

function eventRecord(date, midnightMs) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  return Object.freeze({ iso: shanghaiDateTime(date), utcISO: date.toISOString(), minutes: (date.getTime() - midnightMs) / 60000 });
}

// SunCalc 2.0.2 getMoonTimes resets to UTC midnight internally. Scan our actual
// Shanghai civil day instead; otherwise local 00:00–08:00 events can be lost.
function localMoonEvents(midnightMs) {
  const moonAltitude = ms => {
    const p = SunCalc.getMoonPosition(new Date(ms), OBSERVER.latitude, OBSERVER.longitude);
    const angularRadiusDeg = 0.2725 * Math.asin(6378.14 / p.distance) / RAD;
    return p.altitude + angularRadiusDeg + 0.09;
  };
  const rises = [], sets = [];
  const step = 10 * 60000;
  let previousTime = midnightMs, previousAltitude = moonAltitude(midnightMs);
  const startAbove = previousAltitude > 0;
  for (let t = midnightMs + step; t <= midnightMs + DAY; t += step) {
    const altitude = moonAltitude(t);
    if ((previousAltitude <= 0 && altitude > 0) || (previousAltitude > 0 && altitude <= 0)) {
      let lo = previousTime, hi = t, flo = previousAltitude;
      while (hi - lo > 500) {
        const mid = (lo + hi) / 2, fm = moonAltitude(mid);
        if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
      }
      const time = (lo + hi) / 2;
      if (time < midnightMs + DAY) (altitude > previousAltitude ? rises : sets).push(eventRecord(new Date(time), midnightMs));
    }
    previousTime = t; previousAltitude = altitude;
  }
  return { rises: Object.freeze(rises), sets: Object.freeze(sets),
    alwaysUp: !rises.length && !sets.length && startAbove,
    alwaysDown: !rises.length && !sets.length && !startAbove,
    criterion: 'Approximate upper limb, standard refraction; not terrain horizon. Visibility uses apparent center altitude separately.' };
}

/** All event times refer to the selected Shanghai civil date, independent of input hour. */
export function dailyEvents(value = new Date()) {
  const localDate = shanghaiDateTime(value).slice(0, 10);
  if (dayCache.has(localDate)) return dayCache.get(localDate);
  const midnightMs = parseShanghaiDateTime(localDate).getTime();
  const solar = SunCalc.getTimes(new Date(midnightMs + 12 * 3600000), OBSERVER.latitude, OBSERVER.longitude);
  const events = {};
  for (const [key, date] of Object.entries(solar)) events[key] = eventRecord(date, midnightMs);
  const moon = localMoonEvents(midnightMs);
  const result = Object.freeze({ localDate, ...events, moon: Object.freeze(moon),
    moonrise: moon.rises[0] || null, moonset: moon.sets[0] || null });
  if (dayCache.size >= 32) dayCache.delete(dayCache.keys().next().value);
  dayCache.set(localDate, result);
  return result;
}

function multiply3(a, b) {
  const out = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) out[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return out;
}
function rotateZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
function rotateY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }

/** Row-major matrix: J2000 equatorial unit vectors -> Three world unit vectors.
 * Mean sidereal time + IAU 1976 precession; UTC approximates UT1.
 * Omits stellar proper motion, aberration, nutation, and stellar refraction.
 */
export function stellarFrame(value = new Date()) {
  const date = parseShanghaiDateTime(value), jd = date.getTime() / DAY + 2440587.5;
  const days = jd - 2451545, t = days / 36525;
  const gmstDeg = mod(280.46061837 + 360.98564736629 * days + 0.000387933 * t * t - t * t * t / 38710000, 360);
  const localSiderealTimeRad = mod(gmstDeg + OBSERVER.longitude, 360) * RAD;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) * RAD / 3600;
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) * RAD / 3600;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) * RAD / 3600;
  const precession = multiply3(multiply3(rotateZ(z), rotateY(-theta)), rotateZ(zeta));
  const sl = Math.sin(localSiderealTimeRad), cl = Math.cos(localSiderealTimeRad);
  const sp = Math.sin(OBSERVER.latitude * RAD), cp = Math.cos(OBSERVER.latitude * RAD);
  const ofDateToWorld = [-sl, cl, 0, cp * cl, cp * sl, sp, sp * cl, sp * sl, -cp];
  return { julianDateUTC: jd, gmstDeg, localSiderealTimeRad,
    equatorialToWorldMatrix: multiply3(ofDateToWorld, precession),
    ofDateToWorldMatrix: ofDateToWorld };
}

export function equatorialUnitVector(raHours, decDeg) {
  const a = raHours * 15 * RAD, d = decDeg * RAD, c = Math.cos(d);
  return [c * Math.cos(a), c * Math.sin(a), Math.sin(d)];
}

export function transformDirection(matrix, vector) {
  return [0, 1, 2].map(row => matrix[row * 3] * vector[0] + matrix[row * 3 + 1] * vector[1] + matrix[row * 3 + 2] * vector[2]);
}

/** Optional CPU helper; for repeated rendering use one shared matrix on a Points cloud. */
export function starDirections(catalog, value = new Date(), frame = stellarFrame(value)) {
  const stars = Array.isArray(catalog) ? catalog : catalog.stars;
  return stars.map(star => {
    const direction = transformDirection(frame.equatorialToWorldMatrix, equatorialUnitVector(star.raHours, star.decDeg));
    return { ...star, direction, aboveHorizon: direction[1] > 0,
      altitudeDeg: Math.asin(Math.max(-1, Math.min(1, direction[1]))) / RAD };
  });
}

/** Actual date/time sky. Negative moonDirection.y is retained: never force a night moon. */
export function astronomySnapshot(value = new Date(), options = {}) {
  const date = parseShanghaiDateTime(value), localISO = shanghaiDateTime(date);
  const rawSun = SunCalc.getPosition(date, OBSERVER.latitude, OBSERVER.longitude);
  const rawMoon = SunCalc.getMoonPosition(date, OBSERVER.latitude, OBSERVER.longitude);
  const light = SunCalc.getMoonIllumination(date);
  const sunDirection = horizontalDirection(rawSun.azimuth, rawSun.altitude);
  const moonDirection = horizontalDirection(rawMoon.azimuth, rawMoon.altitude);
  const angularRadiusDeg = 0.2725 * Math.asin(6378.14 / rawMoon.distance) / RAD;
  const phaseIndex = Math.round(light.phase * 8) % 8;
  const events = dailyEvents(date), frame = stellarFrame(date);
  const snapshot = {
    instantISO: date.toISOString(), timestampMs: date.getTime(), localDateTime: localISO,
    shanghaiDate: localISO.slice(0, 10), shanghaiTime: localISO.slice(11, 16), ...OBSERVER,
    sunDirection, moonDirection,
    sun: { direction: sunDirection, azimuthDeg: rawSun.azimuth, altitudeDeg: rawSun.altitude, aboveHorizon: rawSun.altitude > 0 },
    moon: { direction: moonDirection, azimuthDeg: rawMoon.azimuth, altitudeDeg: rawMoon.altitude,
      aboveHorizon: rawMoon.altitude > 0, upperLimbAboveHorizon: rawMoon.altitude + angularRadiusDeg > 0,
      distanceKm: rawMoon.distance, angularRadiusDeg, illumination: light.fraction, phase: light.phase,
      phaseName: phaseNames[phaseIndex], phaseKey: phaseKeys[phaseIndex], waxing: light.waxing,
      brightLimbAngleDeg: light.angle, parallacticAngleDeg: rawMoon.parallacticAngle,
      brightLimbTiltRad: (light.angle - rawMoon.parallacticAngle) * RAD },
    moonIllumination: light.fraction, phase: light.phase, moonPhase: light.phase,
    moonPhaseName: phaseNames[phaseIndex], moonPhaseKey: phaseKeys[phaseIndex], moonAboveHorizon: rawMoon.altitude > 0,
    sunriseISO: events.sunrise?.iso || null, sunsetISO: events.sunset?.iso || null,
    sunsetMinutes: events.sunset?.minutes ?? null, moonriseISO: events.moonrise?.iso || null,
    moonsetISO: events.moonset?.iso || null, events,
    ...frame,
  };
  if (options.catalog) snapshot.stars = starDirections(options.catalog, date, frame);
  return snapshot;
}

/** Date presets are local civil times; dusk uses that day's calculated sunset. */
export function presetDateTime(localDate, preset) {
  const day = shanghaiDateTime(parseShanghaiDateTime(localDate)).slice(0, 10);
  if (preset === 'daylight') return parseShanghaiDateTime(day + 'T14:00');
  if (preset === 'starry') return parseShanghaiDateTime(day + 'T21:00');
  if (preset === 'dusk') {
    const sunset = dailyEvents(day).sunset;
    if (!sunset) return null;
    return parseShanghaiDateTime(sunset.iso);
  }
  throw new RangeError('Preset must be daylight, dusk, or starry');
}
