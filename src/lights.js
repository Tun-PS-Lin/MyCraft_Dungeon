// Lantern lights and the day/night mood. Every lamp is registered here so the
// loop in main.js can fade them all together when the theme changes.
import * as THREE from 'three';

export const lamps = [];
// day / night are the light's brightness in each mode
export function addLamp(parent, x, y, z, day, night, reach = 9, color = '#ffb35a') {
  const light = new THREE.PointLight(color, day, reach, 1.6);
  light.position.set(x, y, z); parent.add(light);
  lamps.push({ light, day, night, seed: lamps.length * 1.7 });
  return light;
}

const c = (hex) => new THREE.Color(hex);
const srgb = (hex) => new THREE.Color(hex).convertSRGBToLinear();
export const MOOD = {
  day:   { sky: c('#b9c8ff'), ground: c('#7a5a2c'), hemi: 0.42, sun: c('#ffc67c'), sunI: 1.22, back: srgb('#1c2a12'), exposure: 1.0 },
  night: { sky: c('#3b4c9c'), ground: c('#141228'), hemi: 0.15, sun: c('#7388e0'), sunI: 0.13, back: srgb('#05070f'), exposure: 1.0 },
};
