// The playable character: a blocky figure with rigid limbs that swing from the
// shoulder and hip, plus a soft blob shadow under the feet.
import * as THREE from 'three';
import { cv, fill, toTex } from './textures.js';
import { TUNING } from './config.js';

const PXU = 0.06; // one skin pixel in world units; the figure is 32 pixels tall
const SK = '#d6a070', SK2 = '#c48d5f', HAIR = '#6b3f22', HAIR2 = '#5a331b', SHIRT = '#2f6fb5', SHIRT2 = '#275e9b', STRAP = '#5b3a1e', PANT = '#33415c', BOOT = '#4a2f1a';
const skin = (w, h, fn) => new THREE.MeshLambertMaterial({ map: toTex(cv(w, h, fn), false) });

export function createPlayer(scene) {
  const head = {
    top: skin(8, 8, (g) => { fill(g, HAIR, 0, 0, 8, 8); fill(g, HAIR2, 2, 2, 2, 1); fill(g, HAIR2, 5, 5, 2, 1); }),
    face: skin(8, 8, (g) => { fill(g, SK, 0, 0, 8, 8); fill(g, HAIR, 0, 0, 8, 2); fill(g, HAIR, 0, 2, 1, 1); fill(g, HAIR, 7, 2, 1, 1); fill(g, '#fff', 1, 4, 2, 1); fill(g, '#fff', 5, 4, 2, 1); fill(g, '#2b3a67', 2, 4, 1, 1); fill(g, '#2b3a67', 5, 4, 1, 1); fill(g, SK2, 3, 5, 2, 1); fill(g, '#8a4f3a', 3, 6, 2, 1); }),
    side: skin(8, 8, (g) => { fill(g, SK, 0, 0, 8, 8); fill(g, HAIR, 0, 0, 8, 3); fill(g, HAIR, 0, 3, 3, 2); }),
    back: skin(8, 8, (g) => { fill(g, HAIR, 0, 0, 8, 6); fill(g, SK, 0, 6, 8, 2); }),
    bot: skin(8, 8, (g) => fill(g, SK, 0, 0, 8, 8)),
  };
  const bodyF = skin(8, 12, (g) => { fill(g, SHIRT, 0, 0, 8, 12); for (let i = 0; i < 8; i++) { fill(g, STRAP, i, 1 + i, 1, 2); fill(g, STRAP, 7 - i, 1 + i, 1, 2); } fill(g, STRAP, 0, 10, 8, 1); fill(g, '#e4b93a', 3, 10, 2, 1); });
  const bodyS = skin(4, 12, (g) => { fill(g, SHIRT2, 0, 0, 4, 12); fill(g, STRAP, 0, 10, 4, 1); });
  const bodyB = skin(8, 12, (g) => { fill(g, SHIRT2, 0, 0, 8, 12); for (let i = 0; i < 8; i++) { fill(g, STRAP, i, 1 + i, 1, 2); fill(g, STRAP, 7 - i, 1 + i, 1, 2); } fill(g, STRAP, 0, 10, 8, 1); });
  const armM = skin(4, 12, (g) => { fill(g, SHIRT, 0, 0, 4, 12); fill(g, SHIRT2, 0, 5, 4, 1); fill(g, SK, 0, 6, 4, 6); fill(g, SK2, 0, 11, 4, 1); });
  const legM = skin(4, 12, (g) => { fill(g, PANT, 0, 0, 4, 12); fill(g, BOOT, 0, 8, 4, 4); fill(g, '#3a2413', 0, 11, 4, 1); });

  const group = new THREE.Group(), rig = new THREE.Group(); group.add(rig);
  const part = (w, h, d, mat, py, px, off) => {
    const pivot = new THREE.Group(); pivot.position.set(px * PXU, py * PXU, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * PXU, h * PXU, d * PXU), mat); m.position.y = off * PXU; m.receiveShadow = true; pivot.add(m); rig.add(pivot); return pivot;
  };
  const parts = {
    head: part(8, 8, 8, [head.side, head.side, head.top, head.bot, head.face, head.back], 24, 0, 4),
    body: part(8, 12, 4, [bodyS, bodyS, bodyS, bodyS, bodyF, bodyB], 18, 0, 0),
    armL: part(4, 12, 4, armM, 23, 6, -5), armR: part(4, 12, 4, armM, 23, -6, -5),
    legL: part(4, 12, 4, legM, 12, 2, -6), legR: part(4, 12, 4, legM, 12, -2, -6),
  };
  group.scale.setScalar(TUNING.playerScale);
  scene.add(group);

  const shadow = makeBlob(scene, 1.25 * TUNING.playerScale);
  const state = { x: 0, y: 0, z: 4.6, vy: 0, yaw: Math.PI, grounded: true, phase: 0, blend: 0, squash: 0, visY: 0 };

  // dt seconds, time seconds, flags from the movement step, ground height under the feet
  function animate(dt, time, moving, running, groundY) {
    const P = state;
    P.blend += ((moving && P.grounded ? 1 : 0) - P.blend) * Math.min(1, dt * 10);
    const amp = (running ? 1.15 : 0.75) * P.blend, sw = Math.sin(P.phase) * amp, air = P.grounded ? 0 : 1;
    parts.legL.rotation.x = sw + air * 0.5; parts.legR.rotation.x = -sw - air * 0.5;
    parts.armL.rotation.x = -sw - air * 1.2; parts.armR.rotation.x = sw - air * 1.2;
    const idle = Math.sin(time * 1.6) * 0.03 + 0.05;
    parts.armL.rotation.z = idle + air * 0.25; parts.armR.rotation.z = -idle - air * 0.25;
    parts.head.rotation.x = Math.sin(time * 0.9) * 0.03 * (1 - P.blend);
    P.squash = Math.max(0, P.squash - dt * 6);
    rig.scale.set(1 + P.squash * 0.08, 1 - P.squash * 0.16, 1 + P.squash * 0.08);
    if (P.grounded) P.visY += (P.y - P.visY) * Math.min(1, dt * 18); else P.visY = P.y;
    group.position.set(P.x, P.visY + Math.abs(Math.sin(P.phase)) * 0.05 * P.blend, P.z);
    group.rotation.y = P.yaw; rig.rotation.x = running && P.grounded ? 0.12 * P.blend : 0;
    const lift = Math.max(0, P.visY - groundY), k = Math.max(0.45, 1 - lift * 0.35);
    shadow.position.set(P.x, groundY + 0.03, P.z); shadow.scale.setScalar(k); shadow.material.opacity = 0.55 * k;
  }
  return { state, group, animate };
}

// Round soft shadow, the same trick the original blocky games use for moving things.
export function makeBlob(scene, size) {
  const tex = new THREE.CanvasTexture(cv(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); return m;
}
