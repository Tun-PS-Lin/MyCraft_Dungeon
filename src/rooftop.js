// The rooftop route: a ladder up the east end of the Alacrity Research stall, plank walkways along
// the back of its roof and the Mingalar News roof, a little bridge stepping up between the two, and
// a lookout past Mingalar's west end with a flag, a spyglass and a chest (a secret). Rails keep you
// on the boards, so the only way up or down is the ladder (main.js does the climbing).
// The walkways run behind the Alacrity beacon and the Mingalar weathervane, so neither pokes through.
import * as THREE from 'three';
import { B, M, flat, wool, glow, bake } from './textures.js';
import { collide } from './collision.js';
import { FLOOR } from './config.js';

const ZC = -10.75, HW = 0.8; // the walkways run along x, centred on this z, this half-wide
const A = { x0: -10.45, x1: -4.5, h: 4.05 }, MN = { x0: -18.4, x1: -13.9, h: 4.65 };
const BR = { x0: MN.x1, x1: A.x0, n: 6 };
export const LOOKOUT = { x0: -20.7, x1: -18.4, z0: -12.1, z1: -9.4, h: MN.h };
// the ladder: its rails stand at x; you start from foot, step off onto land at the top
export const LADDER = { x: -4.36, z: ZC, foot: [-3.65, ZC], front: -3.95, land: [-5.15, ZC], base: FLOOR, top: A.h };
// the whole route, for "is the player up on the roofs?"
const AREA = { x0: LOOKOUT.x0, x1: A.x1, z0: LOOKOUT.z0, z1: LOOKOUT.z1 };

export function buildRooftop(scene) {
  const g = new THREE.Group(); scene.add(g);
  const plank = M.planks, log = M.log, rope = flat('#cdb88a');
  const deck = (x0, x1, z0, z1, h) => { B(g, x1 - x0, 0.12, z1 - z0, plank, (x0 + x1) / 2, h - 0.06, (z0 + z1) / 2); collide(x0, x1, z0, z1, h); };
  // board seams across a walkway, so it reads as planks from above
  const seams = (x0, x1, z0, z1, h) => { for (let x = x0 + 0.5; x < x1 - 0.2; x += 0.5) B(g, 0.03, 0.02, z1 - z0 - 0.04, M.dark, x, h + 0.005, (z0 + z1) / 2, true); };
  // a rail along x (at z), rising from h0 to h1: posts and a top bar; blocks you up to the top
  const railX = (x0, x1, z, h0, h1, mat = log, solid = true) => {
    const n = Math.max(1, Math.round((x1 - x0) / 1.1)), hy = (i) => h0 + ((h1 - h0) * i) / n, xx = (i) => x0 + ((x1 - x0) * i) / n;
    for (let i = 0; i <= n; i++) B(g, 0.1, 0.9, 0.1, log, xx(i), hy(i) + 0.45, z, true);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, h1 - h0) + 0.04, 0.08, 0.08), mat);
    bar.position.set((x0 + x1) / 2, (h0 + h1) / 2 + 0.88, z); bar.rotation.z = Math.atan2(h1 - h0, x1 - x0); g.add(bar);
    if (solid) collide(x0, x1, z - 0.05, z + 0.05, Math.max(h0, h1) + 1);
  };
  const railZ = (z0, z1, x, h) => {
    const n = Math.max(1, Math.round((z1 - z0) / 1.1));
    for (let i = 0; i <= n; i++) B(g, 0.1, 0.9, 0.1, log, x, h + 0.45, z0 + ((z1 - z0) * i) / n, true);
    B(g, 0.08, 0.08, z1 - z0, log, x, h + 0.88, (z0 + z1) / 2, true);
    collide(x - 0.05, x + 0.05, z0, z1, h + 1);
  };
  // short legs from the boards down onto the roof, front and back
  const legs = (x0, x1, h, back, front) => { for (let x = x0 + 0.35; x < x1; x += 1.3) { B(g, 0.12, back, 0.12, log, x, h - 0.12 - back / 2, ZC - HW + 0.15, true); if (front > 0.02) B(g, 0.12, front, 0.12, log, x, h - 0.12 - front / 2, ZC + HW - 0.15, true); } };
  const zA = ZC - HW, zB = ZC + HW;

  // the Alacrity walkway: rails along both sides and across the east end (with a gap for the ladder)
  deck(A.x0, A.x1, zA, zB, A.h); seams(A.x0, A.x1, zA, zB, A.h); legs(A.x0, A.x1, A.h, 0.4, 0.08);
  railX(A.x0, A.x1, zA - 0.05, A.h, A.h); railX(A.x0, A.x1, zB + 0.05, A.h, A.h);
  for (const [z0, z1] of [[zA - 0.05, ZC - 0.42], [ZC + 0.42, zB + 0.05]]) { B(g, 0.1, 0.9, 0.1, log, A.x1, A.h + 0.45, (z0 + z1) / 2 + (z0 < ZC ? -0.2 : 0.2), true); B(g, 0.08, 0.08, z1 - z0, log, A.x1, A.h + 0.88, (z0 + z1) / 2, true); }
  collide(A.x1 - 0.05, A.x1 + 0.05, zA, zB, A.h + 1); // (the gap is only for climbing)
  // the bridge: boards stepping up to the Mingalar walkway, on rope rails, with a prop in the middle
  for (let i = 0; i < BR.n; i++) {
    const x0 = BR.x1 - ((BR.x1 - BR.x0) * (i + 1)) / BR.n, x1 = BR.x1 - ((BR.x1 - BR.x0) * i) / BR.n, h = A.h + ((MN.h - A.h) * (i + 1)) / BR.n;
    deck(x0 - 0.02, x1 + 0.02, zA + 0.12, zB - 0.12, h);
  }
  for (const z of [zA + 0.08, zB - 0.08]) railX(BR.x0, BR.x1, z, MN.h, A.h, rope);
  { const xm = (BR.x0 + BR.x1) / 2, hm = (A.h + MN.h) / 2 - 0.12; for (const dz of [-0.55, 0.55]) B(g, 0.16, hm - FLOOR, 0.16, log, xm, FLOOR + (hm - FLOOR) / 2, ZC + dz); collide(xm - 0.1, xm + 0.1, ZC - 0.65, ZC + 0.65, hm); }
  // the Mingalar walkway, and the lookout at its west end
  deck(MN.x0, MN.x1, zA, zB, MN.h); seams(MN.x0, MN.x1, zA, zB, MN.h); legs(MN.x0, MN.x1, MN.h, 1.1, 0.2);
  railX(MN.x0, MN.x1, zA - 0.05, MN.h, MN.h); railX(MN.x0, MN.x1, zB + 0.05, MN.h, MN.h);
  const L = LOOKOUT;
  deck(L.x0, L.x1, L.z0, L.z1, L.h); for (let x = L.x0 + 0.4; x < L.x1; x += 0.5) B(g, 0.03, 0.02, L.z1 - L.z0 - 0.04, M.dark, x, L.h + 0.005, (L.z0 + L.z1) / 2, true);
  B(g, L.x1 - L.x0 + 0.1, 0.16, L.z1 - L.z0 + 0.1, M.dark, (L.x0 + L.x1) / 2, L.h - 0.2, (L.z0 + L.z1) / 2); // a frame under the boards
  for (const [x, z] of [[L.x0 + 0.15, L.z0 + 0.15], [L.x0 + 0.15, L.z1 - 0.15]]) B(g, 0.2, L.h - FLOOR, 0.2, log, x, FLOOR + (L.h - FLOOR) / 2, z); // stilts at the open corners
  collide(L.x0, L.x0 + 0.3, L.z0, L.z0 + 0.3, L.h); collide(L.x0, L.x0 + 0.3, L.z1 - 0.3, L.z1, L.h);
  railZ(L.z0, L.z1, L.x0 + 0.05, L.h); railX(L.x0, L.x1, L.z0 + 0.05, L.h, L.h); railX(L.x0, L.x1, L.z1 - 0.05, L.h, L.h);
  railZ(L.z0, zA - 0.05, L.x1, L.h); railZ(zB + 0.05, L.z1, L.x1, L.h);
  // a flag on a pole, a chest, a spyglass on a stand and a lantern
  B(g, 0.1, 2.6, 0.1, log, L.x0 + 0.35, L.h + 1.3, L.z0 + 0.35, true); B(g, 0.18, 0.18, 0.18, flat('#e4b93a'), L.x0 + 0.35, L.h + 2.66, L.z0 + 0.35, true);
  const flag = new THREE.Group(); flag.position.set(L.x0 + 0.35, L.h + 2.25, L.z0 + 0.35); flag.userData.keep = true; g.add(flag);
  B(flag, 0.04, 0.62, 1.0, wool('#e4b93a'), 0, 0, 0.52, true); B(flag, 0.05, 0.22, 0.34, wool('#d8403a'), 0, 0.02, 0.5, true);
  const chest = { x: L.x0 + 0.75, z: L.z1 - 0.6 };
  B(g, 0.8, 0.45, 0.55, flat('#8a5a2f'), chest.x, L.h + 0.22, chest.z); B(g, 0.84, 0.18, 0.6, flat('#a86f3a'), chest.x, L.h + 0.52, chest.z); B(g, 0.12, 0.16, 0.06, flat('#e4b93a'), chest.x, L.h + 0.4, chest.z + 0.3, true);
  collide(chest.x - 0.42, chest.x + 0.42, chest.z - 0.3, chest.z + 0.3, L.h + 0.7);
  B(g, 0.08, 0.95, 0.08, M.dark, L.x0 + 0.6, L.h + 0.47, (L.z0 + L.z1) / 2 - 0.2, true);
  { const glass = B(g, 0.6, 0.1, 0.1, flat('#c99a36'), L.x0 + 0.48, L.h + 1.0, (L.z0 + L.z1) / 2 - 0.2, true); glass.rotation.z = 0.25; B(g, 0.06, 0.12, 0.12, glow('#bfe4ff'), L.x0 + 0.17, L.h + 0.93, (L.z0 + L.z1) / 2 - 0.2, true); }
  B(g, 0.06, 0.3, 0.06, M.dark, L.x1 - 0.1, L.h + 1.05, L.z1 - 0.1, true); B(g, 0.22, 0.24, 0.22, glow('#ffc76a'), L.x1 - 0.1, L.h + 0.8, L.z1 - 0.1, true);
  // the ladder, against the east end of the Alacrity walkway
  const top = A.h + 0.95;
  for (const s of [-1, 1]) B(g, 0.1, top - FLOOR, 0.1, log, LADDER.x, FLOOR + (top - FLOOR) / 2, ZC + s * 0.34);
  for (let y = FLOOR + 0.32; y < top - 0.15; y += 0.34) B(g, 0.08, 0.07, 0.62, plank, LADDER.x, y, ZC, true);
  bake(g);
  return {
    flag, chest,
    // anywhere up on the route (above the stall tops)
    on: (x, z, y) => y > A.h - 0.4 && x > AREA.x0 && x < AREA.x1 + 0.2 && z > AREA.z0 && z < AREA.z1,
    onLookout: (x, z, y) => x > L.x0 && x < L.x1 && z > L.z0 && z < L.z1 && y > L.h - 0.2,
    // where the player is at a point along the climb: k 0 at the foot, 1 stepped off at the top
    climbAt(k, out) {
      const lift = 0.1, up = A.h + lift;
      if (k < 0.1) { const t = k / 0.1; out.x = LADDER.foot[0] + (LADDER.front - LADDER.foot[0]) * t; out.y = LADDER.base; }
      else if (k < 0.82) { const t = (k - 0.1) / 0.72; out.x = LADDER.front; out.y = LADDER.base + (up - LADDER.base) * t; }
      else { const t = (k - 0.82) / 0.18; out.x = LADDER.front + (LADDER.land[0] - LADDER.front) * t; out.y = up + (A.h - up) * t + Math.sin(t * Math.PI) * 0.2; }
      out.z = ZC; out.rung = k >= 0.1 && k < 0.82; return out;
    },
    update(time) { flag.rotation.y = Math.sin(time * 1.6) * 0.18; flag.children[0].rotation.y = Math.sin(time * 4) * 0.1; flag.children[1].rotation.y = Math.sin(time * 4 + 1) * 0.1; },
  };
}
