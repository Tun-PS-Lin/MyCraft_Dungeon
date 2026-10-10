// Small floating particles: drifting leaves by day, fireflies by night.
import * as THREE from 'three';
import { BOUNDS } from './config.js';
import { cv, lin } from './textures.js';

const dot = new THREE.CanvasTexture(cv(16, 16, (g) => { const r = g.createRadialGradient(8, 8, 1, 8, 8, 8); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 16, 16); }));
const square = new THREE.CanvasTexture(cv(4, 4, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); }));

function cloud(scene, count, opts) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { seed[i * 4] = BOUNDS.x0 - 4 + Math.random() * (BOUNDS.x1 - BOUNDS.x0 + 8); seed[i * 4 + 1] = Math.random() * 100; seed[i * 4 + 2] = BOUNDS.z0 - 6 + Math.random() * (BOUNDS.z1 - BOUNDS.z0 + 10); seed[i * 4 + 3] = 0.5 + Math.random(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial(Object.assign({ transparent: true, depthWrite: false, opacity: 0, fog: false }, opts));
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  return { pos, seed, geo, mat, pts, count };
}

export function createAmbience(scene) {
  const flies = cloud(scene, 70, { map: dot, color: lin('#eaff7a'), size: 0.42, blending: THREE.AdditiveBlending });
  const leaves = cloud(scene, 46, { map: square, color: lin('#c9a23a'), size: 0.16 });
  // night is 0 by day and 1 at night; quiet is 1 when the particles should hide (indoors)
  function update(time, night, quiet) {
    const show = 1 - quiet;
    flies.mat.opacity = night * show * 0.95; flies.pts.visible = flies.mat.opacity > 0.01;
    if (flies.pts.visible) { for (let i = 0; i < flies.count; i++) { const s = flies.seed, k = i * 4, t = time * 0.35 * s[k + 3] + s[k + 1]; flies.pos[i * 3] = s[k] + Math.sin(t) * 1.6; flies.pos[i * 3 + 1] = 0.7 + (Math.sin(t * 1.7) * 0.5 + 0.5) * 1.8; flies.pos[i * 3 + 2] = s[k + 2] + Math.cos(t * 0.8) * 1.6; } flies.geo.attributes.position.needsUpdate = true; flies.mat.size = 0.36 + Math.sin(time * 3) * 0.06; }
    leaves.mat.opacity = (1 - night) * show * 0.9; leaves.pts.visible = leaves.mat.opacity > 0.01;
    if (leaves.pts.visible) { for (let i = 0; i < leaves.count; i++) { const s = leaves.seed, k = i * 4, t = (time * 0.07 * s[k + 3] + s[k + 1]) % 1; leaves.pos[i * 3] = s[k] + t * 5 + Math.sin(t * 18 + s[k + 1]) * 0.6; leaves.pos[i * 3 + 1] = 9 * (1 - t); leaves.pos[i * 3 + 2] = s[k + 2] + t * 2.5; } leaves.geo.attributes.position.needsUpdate = true; }
  }
  return { update };
}
