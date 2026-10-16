// A little life about the village: washing lines whose laundry sways in the breeze, and a
// flock of pigeons on the square that bursts up and away when you run at them, circles
// overhead and settles again somewhere nearby.
import * as THREE from 'three';
import { B, flat, wool, M } from './textures.js';
import { collide, groundAt } from './collision.js';
import { FLOOR } from './config.js';

/* ── washing lines ── */
// [x0, x1, z]: a line between two posts, along x, at the back of the square
const LINES = [[-20.4, -15.2, -14.45], [-10.8, -5.6, -14.45]];
const CLOTHES = ['#e8e2d4', '#c94f4f', '#4f7fc9', '#e3c25a', '#f1f1f1', '#6aa86b', '#d08bb4', '#8a6a4f'];
function washingLine(parent, [x0, x1, z], seed) {
  const H = 2.55, items = [];
  for (const x of [x0, x1]) { B(parent, 0.22, H + 0.2, 0.22, M.log, x, (H + 0.2) / 2, z); B(parent, 0.5, 0.12, 0.12, M.log, x, H, z); collide(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 3); }
  // the rope sags a little in the middle: a few short pieces
  const N = 8, sag = (u) => H - 0.02 - Math.sin(Math.PI * u) * 0.16;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, xa = x0 + (x1 - x0) * u0, xb = x0 + (x1 - x0) * u1, ya = sag(u0), yb = sag(u1);
    const len = Math.hypot(xb - xa, yb - ya), m = B(parent, len, 0.035, 0.035, flat('#d9cfb8'), (xa + xb) / 2, (ya + yb) / 2, z, true);
    m.rotation.z = Math.atan2(yb - ya, xb - xa);
  }
  // laundry: shirts, towels and socks, each hanging from the rope by its top edge
  let x = x0 + 0.55, k = seed;
  while (x < x1 - 0.6) {
    const kind = k % 3, w = kind === 0 ? 0.8 : kind === 1 ? 0.62 : 0.24, h = kind === 0 ? 0.78 : kind === 1 ? 0.95 : 0.38;
    const u = (x + w / 2 - x0) / (x1 - x0), top = sag(u), col = CLOTHES[(k * 5 + 3) % CLOTHES.length];
    const g = new THREE.Group(); g.position.set(x + w / 2, top, z); g.userData.moving = true; parent.add(g);
    const mat = wool(col);
    if (kind === 0) { // a shirt: body and two short sleeves
      B(g, w * 0.62, h, 0.05, mat, 0, -h / 2, 0, true); B(g, w, h * 0.3, 0.05, mat, 0, -h * 0.15, 0, true);
      B(g, w * 0.22, h * 0.1, 0.06, flat('#f4efe4'), 0, -0.04, 0.005, true);
    } else B(g, w, h, 0.05, mat, 0, -h / 2, 0, true);
    B(g, 0.06, 0.08, 0.08, flat('#a5794a'), -w * 0.3, 0.01, 0, true); B(g, 0.06, 0.08, 0.08, flat('#a5794a'), w * 0.3, 0.01, 0, true); // pegs
    items.push({ g, phase: k * 1.7 + x * 0.6, swing: kind === 2 ? 1.4 : kind === 1 ? 0.8 : 1 });
    x += w + 0.22 + (k % 2) * 0.15; k++;
  }
  // keep walkers from brushing through the laundry
  collide(x0, x1, z - 0.18, z + 0.18, 2.4);
  return items;
}

/* ── pigeons ── */
const GREY = flat('#8e95a3'), DARK = flat('#5e6574'), NECK = flat('#5f9c86'), PINK = flat('#d07a86'), BEAK = flat('#3a3530'), WHITE = flat('#d9dde4');
function pigeonModel() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.userData.moving = true; body.scale.setScalar(1.25);
  B(body, 0.2, 0.18, 0.34, GREY, 0, 0.17, 0, true);
  B(body, 0.16, 0.06, 0.2, WHITE, 0, 0.1, 0.02, true);
  const head = new THREE.Group(); head.position.set(0, 0.28, 0.14); body.add(head);
  B(head, 0.13, 0.13, 0.13, DARK, 0, 0.03, 0.02, true); B(head, 0.14, 0.06, 0.1, NECK, 0, -0.04, -0.01, true);
  B(head, 0.05, 0.04, 0.07, BEAK, 0, 0.02, 0.11, true);
  B(head, 0.135, 0.03, 0.03, flat('#e8a33a'), 0, 0.055, 0.06, true); // eyes (a thin orange band)
  B(body, 0.14, 0.04, 0.16, DARK, 0, 0.17, -0.22, true); // tail
  // each wing hinges at the shoulder: folded down along the side at rest, spread to fly
  const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.1, 0.25, 0.02); w.userData.s = s; body.add(w); B(w, 0.24, 0.03, 0.26, GREY, s * 0.12, 0, -0.02, true); B(w, 0.1, 0.031, 0.1, DARK, s * 0.19, 0, -0.11, true); return w; });
  const legs = new THREE.Group(); body.add(legs); B(legs, 0.03, 0.08, 0.03, PINK, 0.05, 0.04, 0, true); B(legs, 0.03, 0.08, 0.03, PINK, -0.05, 0.04, 0, true);
  return { root, body, head, wings, legs };
}

// critically damped spring per axis (see stage3d.js), so landings ease in without a bump
function chase(b, aim, w, dt) {
  const e = Math.exp(-w * dt);
  for (const k of ['x', 'y', 'z']) { const x = b.p[k] - aim[k], q = (b.v[k] + w * x) * dt; b.p[k] = aim[k] + (x + q) * e; b.v[k] = (b.v[k] - w * q) * e; }
}

export function createLife(scene, blocked) {
  const group = new THREE.Group(); scene.add(group);
  const laundry = []; LINES.forEach((l, i) => laundry.push(...washingLine(group, l, i * 3 + 1)));

  // where the flock likes to be: open paving round the square
  const HOMES = [[4.5, -3.2], [-6.5, 3.5], [3.5, 6.5], [-8, -4.5]];
  const home = { x: HOMES[0][0], z: HOMES[0][1] };
  const birds = [];
  for (let i = 0; i < 7; i++) {
    const m = pigeonModel(); group.add(m.root);
    const a = (i / 7) * 6.28, r = 0.6 + (i % 3) * 0.45;
    const b = { ...m, p: new THREE.Vector3(home.x + Math.cos(a) * r, FLOOR, home.z + Math.sin(a) * r), v: new THREE.Vector3(), aim: new THREE.Vector3(),
      state: 'ground', t: Math.random() * 5, yaw: Math.random() * 6.28, peck: 0, walk: 0, wait: Math.random() * 2, tx: 0, tz: 0, flap: 0, flapAmt: 0, orbit: 0, spot: new THREE.Vector2(), delay: 0 };
    b.tx = b.p.x; b.tz = b.p.z; birds.push(b);
  }
  let scared = 0, airborne = 0;
  const free = (x, z) => !blocked(x, z, FLOOR + 0.05);
  function pickSpot(b, cx, cz, r) {
    for (let n = 0; n < 12; n++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (free(x, z)) { b.spot.set(x, z); return; } }
    b.spot.set(cx, cz);
  }
  // the whole flock takes off together (each a split second apart), away from the player
  function scatter(P) {
    const H = HOMES.filter((h) => Math.hypot(h[0] - P.x, h[1] - P.z) > 6);
    const next = H[(Math.random() * H.length) | 0] || HOMES[0]; home.x = next[0]; home.z = next[1];
    for (const b of birds) {
      if (b.state !== 'ground') continue;
      const a = Math.atan2(b.p.z - P.z, b.p.x - P.x) + (Math.random() - 0.5) * 1.2;
      b.state = 'up'; b.t = 0; b.delay = Math.random() * 0.25; b.v.set(Math.cos(a) * 3, 4.5 + Math.random() * 1.5, Math.sin(a) * 3);
      b.orbit = Math.random() * 6.28; pickSpot(b, home.x, home.z, 1.6);
    }
    airborne = 7 + Math.random() * 3; scared = 2.5;
  }

  const tmp = new THREE.Vector3();
  function update(dt, time, P, speed, rolling, night, onScatter) {
    // laundry sways in a breeze that comes and goes
    const gust = 0.6 + 0.4 * Math.sin(time * 0.31) * Math.sin(time * 0.17 + 1);
    for (const it of laundry) it.g.rotation.x = (Math.sin(time * 1.7 + it.phase) * 0.12 + Math.sin(time * 2.9 + it.phase * 1.3) * 0.05 + 0.08) * gust * it.swing;

    if (scared > 0) scared -= dt; if (airborne > 0) airborne -= dt;
    // running, rolling or walking right up to them sends them off
    if (scared <= 0 && !night) for (const b of birds) { if (b.state === 'ground' && Math.hypot(b.p.x - P.x, b.p.z - P.z) < (rolling || speed > 4.2 ? 2.8 : speed > 1 ? 1.1 : 0.7)) { scatter(P); if (onScatter) onScatter(); break; } }

    for (const b of birds) {
      b.t += dt; let flapTo = 0;
      if (b.state === 'ground') {
        // wander in little steps, bobbing, and peck at the stones
        const dx = b.tx - b.p.x, dz = b.tz - b.p.z, d = Math.hypot(dx, dz);
        if (b.wait > 0) { b.wait -= dt; b.peck = Math.max(0, Math.sin(b.t * 7)) * (night ? 0 : 1); }
        else if (d < 0.05) { b.wait = 0.6 + Math.random() * 2.4; let n = 0; do { const a = Math.random() * 6.28, r = Math.random() * 1.5; b.tx = home.x + Math.cos(a) * r; b.tz = home.z + Math.sin(a) * r; } while (!free(b.tx, b.tz) && ++n < 6); }
        else if (!night) { const s = Math.min(d, dt * 0.7); b.p.x += (dx / d) * s; b.p.z += (dz / d) * s; b.walk += dt * 9; b.peck = 0; b.yaw += Math.atan2(Math.sin(Math.atan2(dx, dz) - b.yaw), Math.cos(Math.atan2(dx, dz) - b.yaw)) * Math.min(1, dt * 10); }
        b.p.y = groundAt(b.p.x, b.p.z, 1); b.v.set(0, 0, 0);
      } else if (b.state === 'up') {
        // a steep burst up and out
        if (b.t < b.delay) { b.p.y = groundAt(b.p.x, b.p.z, 1); continue; }
        b.v.y -= dt * 1.2; b.p.addScaledVector(b.v, dt); flapTo = 1;
        if (b.t > b.delay + 0.9) { b.state = 'circle'; b.t = 0; }
      } else if (b.state === 'circle') {
        // a loose wheel over the square, drifting toward where they'll land
        b.orbit += dt * 0.9; const R = 5.5;
        b.aim.set(home.x + Math.cos(b.orbit) * R, 6.5 + Math.sin(b.orbit * 2 + b.delay * 9) * 0.6, home.z + Math.sin(b.orbit) * R * 0.75);
        chase(b, b.aim, 1.6, dt); flapTo = 0.75 + 0.25 * Math.sin(time * 0.7 + b.delay * 20);
        if (airborne <= 0) { b.state = 'land'; b.t = 0; }
      } else { // land: glide down onto its spot, wings out, then a few last flaps
        b.aim.set(b.spot.x, groundAt(b.spot.x, b.spot.y, 1) + Math.max(0, 1.2 - b.t) * 1.6, b.spot.y);
        chase(b, b.aim, Math.min(4.5, 1.6 + b.t * 2.5), dt); flapTo = b.t < 1.6 ? 0.35 : 0.9;
        tmp.set(b.spot.x - b.p.x, 0, b.spot.y - b.p.z);
        if (b.t > 1.2 && tmp.length() < 0.04 && Math.abs(b.p.y - b.aim.y) < 0.03) { b.state = 'ground'; b.tx = b.p.x; b.tz = b.p.z; b.wait = 0.5 + Math.random(); b.p.y = b.aim.y; }
      }
      if (b.state !== 'ground') { const sp = Math.hypot(b.v.x, b.v.z); if (sp > 0.3) { const a = Math.atan2(b.v.x, b.v.z); b.yaw += Math.atan2(Math.sin(a - b.yaw), Math.cos(a - b.yaw)) * Math.min(1, dt * 6); } }
      b.flapAmt += (flapTo - b.flapAmt) * Math.min(1, dt * 8);
      b.flap += dt * (8 + b.flapAmt * 22);
      // folded (about 80 degrees down) when still; opened out and beating when flying
      for (const w of b.wings) { const sd = w.userData.s; w.rotation.z = sd * (-1.4 * (1 - b.flapAmt) + b.flapAmt * (0.15 + 0.7 * Math.sin(b.flap))); }
      b.legs.visible = b.flapAmt < 0.5;
      b.root.position.copy(b.p); b.root.position.y += b.state === 'ground' ? Math.abs(Math.sin(b.walk)) * 0.02 : 0;
      b.root.rotation.y = b.yaw;
      b.body.rotation.x = b.state === 'ground' ? b.peck * 0.5 : Math.max(-0.5, Math.min(0.4, -b.v.y * 0.06));
      b.head.position.z = 0.14 + (b.state === 'ground' ? Math.sin(b.walk) * 0.025 : 0);
      b.head.rotation.x = night && b.state === 'ground' ? 0.5 : 0; // asleep at night, heads tucked down
    }
  }
  return { update, flying: () => birds.some((b) => b.state !== 'ground') };
}
