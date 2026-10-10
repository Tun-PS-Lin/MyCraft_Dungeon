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

// The wolf companion, unlocked by the achievement. It trots after the player and
// sits when they stop. It is hidden until activate() is called.
export function createWolf(scene, blocked) {
  const g = new THREE.Group(), fur = flat('#e9e6df'), fur2 = flat('#cfcac0'), dark = flat('#2a2623');
  const body = new THREE.Group(); g.add(body);
  B(body, 0.5, 0.48, 1.05, fur, 0, 0.62, 0, true); B(body, 0.56, 0.52, 0.45, fur2, 0, 0.66, 0.38, true); B(body, 0.5, 0.1, 0.2, flat('#c23b32'), 0, 0.7, 0.62, true);
  const head = new THREE.Group(); head.position.set(0, 0.86, 0.72); body.add(head);
  B(head, 0.46, 0.44, 0.4, fur, 0, 0, 0, true); B(head, 0.24, 0.2, 0.26, fur2, 0, -0.08, 0.3, true); B(head, 0.1, 0.08, 0.06, dark, 0, -0.02, 0.44, true);
  B(head, 0.12, 0.18, 0.08, fur, 0.15, 0.3, -0.05, true); B(head, 0.12, 0.18, 0.08, fur, -0.15, 0.3, -0.05, true); B(head, 0.06, 0.07, 0.04, dark, 0.12, 0.06, 0.21, true); B(head, 0.06, 0.07, 0.04, dark, -0.12, 0.06, 0.21, true);
  const tail = new THREE.Group(); tail.position.set(0, 0.74, -0.52); body.add(tail); B(tail, 0.16, 0.16, 0.5, fur2, 0, 0, -0.22, true);
  const legs = [[0.16, 0.36], [-0.16, 0.36], [0.16, -0.38], [-0.16, -0.38]].map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 0.42, z); B(p, 0.15, 0.44, 0.15, fur, 0, -0.2, 0, true); g.add(p); return p; });
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  g.visible = false; scene.add(g);
  const blob = makeBlob(scene, 1.1); blob.visible = false;
  const s = { x: 0, z: 0, yaw: 0, phase: 0, sit: 0, active: false };

  return {
    isActive: () => s.active,
    activate(P) { s.active = true; s.x = P.x + 1.6; s.z = P.z + 0.6; g.visible = blob.visible = true; },
    update(dt, time, P) {
      if (!s.active) return;
      let dx = P.x - s.x, dz = P.z - s.z; const dist = Math.hypot(dx, dz);
      if (dist > 13) { s.x = P.x - Math.sin(P.yaw) * 1.6; s.z = P.z - Math.cos(P.yaw) * 1.6; } // lost: catch up at once
      let moving = false;
      if (dist > 2.3) {
        const sp = Math.min(8.2, 1.5 + dist * 1.9), nx = s.x + (dx / dist) * sp * dt, nz = s.z + (dz / dist) * sp * dt;
        if (!blocked(nx, s.z, 0.3)) s.x = nx; if (!blocked(s.x, nz, 0.3)) s.z = nz; moving = true; s.phase += dt * (6 + sp * 1.6);
      }
      let d = Math.atan2(dx, dz) - s.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); s.yaw += d * Math.min(1, dt * 9);
      s.sit += ((moving ? 0 : 1) - s.sit) * Math.min(1, dt * 4);
      const base = groundAt(s.x, s.z, 1), sw = moving ? Math.sin(s.phase) * 0.7 : 0;
      legs[0].rotation.x = sw; legs[3].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw - s.sit * 0.0;
      body.rotation.x = -s.sit * 0.32; body.position.y = -s.sit * 0.12; legs[2].position.y = legs[3].position.y = 0.42 - s.sit * 0.14;
      tail.rotation.y = Math.sin(time * (moving ? 14 : 7)) * 0.5; tail.rotation.x = 0.5 - s.sit * 0.3; head.rotation.z = (1 - (moving ? 1 : 0)) * Math.sin(time * 0.7) * 0.12;
      g.position.set(s.x, base + (moving ? Math.abs(Math.sin(s.phase)) * 0.05 : 0), s.z); g.rotation.y = s.yaw;
      blob.position.set(s.x, base + 0.03, s.z);
    },
  };
}
