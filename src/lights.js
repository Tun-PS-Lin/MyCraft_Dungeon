// Lantern lights and the day/night mood. Every lamp is registered here so the
// loop in main.js can fade them all together when the theme changes.
import * as THREE from 'three';

// A lamp is not a real light. The village has about 75 lanterns, and a real light for each
// would be built into every material's shader; Safari's WebGL can fail on shaders that big.
// So each lamp is just a point in the scene (it moves and hides with whatever it belongs to),
// and a small fixed set of real lights is handed each frame to the lamps nearest the camera.
export const lamps = [];
// day / night are the light's brightness in each mode
export function addLamp(parent, x, y, z, day, night, reach = 9, color = '#ffb35a') {
  const anchor = new THREE.Object3D(); anchor.position.set(x, y, z); parent.add(anchor);
  const light = { anchor, position: anchor.position, color: new THREE.Color(color), intensity: day, distance: reach, decay: 1.6 };
  lamps.push({ light, day, night, seed: lamps.length * 1.7, at: new THREE.Vector3(), d: 0 });
  return light;
}

const pool = [], near = [];
// n real lights, added once; the number never changes, so shaders are never rebuilt
export function createLightPool(scene, n) {
  for (let i = 0; i < n; i++) { const l = new THREE.PointLight('#ffffff', 0, 8, 1.6); scene.add(l); pool.push(l); }
}
const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
// give the real lights to the lamps nearest `focus`. Light adds up, so which real light takes
// which lamp doesn't matter; the last one in line fades out as another lamp comes closer,
// so lamps hand over without popping.
export function updateLightPool(focus) {
  near.length = 0;
  for (const L of lamps) {
    const li = L.light; if (li.intensity < 0.01 || !shown(li.anchor)) continue;
    li.anchor.getWorldPosition(L.at); L.d = L.at.distanceTo(focus) - li.distance * 0.4; near.push(L);
  }
  near.sort((a, b) => a.d - b.d);
  const cut = near.length > pool.length ? near[pool.length].d : Infinity;
  // the lamps left over still brighten the area a little: returned as a warm fill level
  let rest = 0;
  for (let i = pool.length; i < near.length; i++) { const L = near[i], f = 1 - (L.at.distanceTo(focus)) / (L.light.distance * 2); if (f > 0) rest += L.light.intensity * f; }
  if (near.length > pool.length - 1) { const L = near[pool.length - 1]; rest += L.light.intensity * (1 - Math.min(1, (cut - L.d) / 3)) * 0.5; }
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i], L = near[i];
    if (!L) { p.intensity = 0; continue; }
    p.position.copy(L.at); p.color.copy(L.light.color); p.distance = L.light.distance; p.decay = L.light.decay;
    p.intensity = L.light.intensity * Math.min(1, (cut - L.d) / 3);
  }
  return rest;
}

const c = (hex) => new THREE.Color(hex);
const srgb = (hex) => new THREE.Color(hex).convertSRGBToLinear();
export const MOOD = {
  day:   { sky: c('#b9c8ff'), ground: c('#7a5a2c'), hemi: 0.42, sun: c('#ffc67c'), sunI: 1.22, back: srgb('#1c2a12'), exposure: 1.0 },
  night: { sky: c('#3b4c9c'), ground: c('#141228'), hemi: 0.15, sun: c('#7388e0'), sunI: 0.13, back: srgb('#05070f'), exposure: 1.0 },
};
