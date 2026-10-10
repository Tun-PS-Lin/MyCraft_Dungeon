// Chickens that wander the middle of the plaza and scatter when you get close.
import * as THREE from 'three';
import { B, flat, rng } from './textures.js';
import { groundAt } from './collision.js';
import { makeBlob } from './player.js';

export function createChickens(scene, count = 4) {
  const r = rng(9), hens = [];
  const pickTarget = (h) => { const a = Math.random() * 6.28, d = 2 + Math.random() * 5; h.tx = Math.cos(a) * d * 1.5; h.tz = Math.sin(a) * d; };
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group(), w = flat('#f4f1ea'), y = flat('#e9b62f'), eye = flat('#1d1d1d');
    B(g, 0.45, 0.4, 0.65, w, 0, 0.5, 0, true); B(g, 0.3, 0.34, 0.3, w, 0, 0.86, 0.3, true); B(g, 0.14, 0.1, 0.16, y, 0, 0.84, 0.52, true); B(g, 0.1, 0.12, 0.08, flat('#cf3a30'), 0, 0.74, 0.48, true);
    B(g, 0.08, 0.3, 0.08, y, 0.12, 0.15, 0, true); B(g, 0.08, 0.3, 0.08, y, -0.12, 0.15, 0, true); B(g, 0.06, 0.06, 0.06, eye, 0.16, 0.92, 0.4, true); B(g, 0.06, 0.06, 0.06, eye, -0.16, 0.92, 0.4, true);
    g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    const a = r() * 6.28, d = 3.5 + r() * 3; g.position.set(Math.cos(a) * d * 1.5, 0, Math.sin(a) * d); scene.add(g);
    hens.push({ g, tx: g.position.x, tz: g.position.z, wait: r() * 3, speed: 1, t: r() * 9, blob: makeBlob(scene, 0.8) });
  }
  function update(dt, P, onScare) {
    for (const h of hens) {
      h.t += dt; const px = h.g.position.x, pz = h.g.position.z, base = groundAt(px, pz, 1);
      if (Math.hypot(px - P.x, pz - P.z) < 1.4 && h.speed < 3) {
        const a = Math.atan2(pz - P.z, px - P.x) + (Math.random() - 0.5), d = 3 + Math.random() * 2;
        h.tx = Math.max(-11, Math.min(11, px + Math.cos(a) * d)); h.tz = Math.max(-6, Math.min(6, pz + Math.sin(a) * d)); h.speed = 3.4; h.wait = 0; onScare();
      }
      const dx = h.tx - px, dz = h.tz - pz, dist = Math.hypot(dx, dz); let hop = 0;
      if (h.wait > 0) { h.wait -= dt; h.g.rotation.x = Math.sin(h.t * 3) > 0.8 ? 0.25 : 0; }
      else if (dist < 0.15) { h.wait = 1 + Math.random() * 4; h.speed = 1; pickTarget(h); }
      else {
        h.g.position.x += (dx / dist) * h.speed * dt; h.g.position.z += (dz / dist) * h.speed * dt; hop = Math.abs(Math.sin(h.t * (h.speed > 2 ? 16 : 9))) * 0.08; h.g.rotation.x = 0;
        let d = Math.atan2(dx, dz) - h.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); h.g.rotation.y += d * Math.min(1, dt * 8);
      }
      h.g.position.y = base + hop; h.blob.position.set(h.g.position.x, base + 0.03, h.g.position.z);
    }
  }
  return { update };
}
