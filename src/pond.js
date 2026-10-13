// The fishing pond to the right of the cave: animated water in a mossy stone rim, an arched
// bridge over its east end, a dock to fish from, benches on the far shore and lanterns that
// light up at night. Fishing from the end of the dock "catches" a fact about me (pond-ui.js).
import * as THREE from 'three';
import { POND, FLOOR } from './config.js';
import { B, M, cv, speck, fill, toTex, rng, glow, flat, wool, lin, bake } from './textures.js';
import { collide, inPondWater } from './collision.js';
import { addLamp } from './lights.js';

const lam = (o) => new THREE.MeshLambertMaterial(o);
const WATER_Y = -0.2;

export function buildPond(scene) {
  const g = new THREE.Group(), r = rng(81);
  const { x: px, z: pz, rx, rz, bridgeX: bx, bridgeW: bw, dock } = POND;

  /* water: one quad per block cell inside the oval, with a pixel water texture whose UVs follow
     world position, so two layers can drift across it in different directions */
  const cells = [];
  for (let z = Math.floor(pz - rz) - 1; z <= pz + rz + 1; z++) for (let x = Math.floor(px - rx) - 1; x <= px + rx + 1; x++) if (inPondWater(x + 0.5, z + 0.5)) cells.push([x, z]);
  const water = cv(16, 16, (c) => { speck(c, 16, 16, ['#2f7fb5', '#2b78ad', '#3388bf', '#2a74a8'], rng(82)); fill(c, '#4fa3d6', 2, 3, 4, 1); fill(c, '#4fa3d6', 9, 9, 5, 1); fill(c, '#4fa3d6', 5, 13, 3, 1); fill(c, '#5cb3e2', 12, 2, 2, 1); });
  const ripple = cv(16, 16, (c) => { c.clearRect(0, 0, 16, 16); fill(c, 'rgba(220,245,255,.55)', 1, 5, 3, 1); fill(c, 'rgba(220,245,255,.45)', 10, 1, 4, 1); fill(c, 'rgba(220,245,255,.5)', 6, 11, 4, 1); fill(c, 'rgba(220,245,255,.35)', 13, 14, 2, 1); });
  const wTex = toTex(water), rTex = toTex(ripple);
  const quads = (y, scale) => {
    const pos = [], uv = [], idx = [];
    cells.forEach(([x, z], i) => { pos.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1); uv.push(x / scale, -z / scale, (x + 1) / scale, -z / scale, (x + 1) / scale, -(z + 1) / scale, x / scale, -(z + 1) / scale); const o = i * 4; idx.push(o, o + 2, o + 1, o, o + 3, o + 2); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  };
  const waterMat = lam({ map: wTex, color: lin('#ffffff') }), rippleMat = new THREE.MeshBasicMaterial({ map: rTex, transparent: true, depthWrite: false, opacity: 0.8 });
  const wMesh = new THREE.Mesh(quads(WATER_Y, 1), waterMat); wMesh.receiveShadow = true; scene.add(wMesh);
  const rMesh = new THREE.Mesh(quads(WATER_Y + 0.01, 1.6), rippleMat); rMesh.renderOrder = 2; scene.add(rMesh);
  // the pond bed under the edges, so no gap shows between the water and the rim
  for (const [x, z] of cells) B(g, 1, 0.5, 1, flat('#3a3226'), x + 0.5, WATER_Y - 0.26, z + 0.5, true);

  /* the rim: a ring of mossy stone blocks round the water, with reeds, cattails and flowers */
  const stone = lam({ map: toTex(cv(16, 16, (c) => { speck(c, 16, 16, ['#8a857c', '#7e7970', '#958f85', '#77726a'], rng(83)); fill(c, '#5c7a3c', 0, 0, 16, 2); fill(c, '#6a8a44', 4, 2, 3, 1); fill(c, '#6a8a44', 11, 2, 2, 1); })) });
  for (let z = Math.floor(pz - rz) - 2; z <= pz + rz + 2; z++) for (let x = Math.floor(px - rx) - 2; x <= px + rx + 2; x++) {
    const cx = x + 0.5, cz = z + 0.5; if (inPondWater(cx, cz)) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dz]) => inPondWater(cx + dx, cz + dz)); if (!near) continue;
    if (Math.abs(cx - bx) < bw / 2 + 0.2 || (cx > dock.x0 && cx < dock.x1 && Math.abs(cz - dock.z) < 0.9)) { B(g, 1, 0.66, 1, stone, cx, -0.25, cz); continue; } // under the bridge and dock ends
    const h = 0.12 + r() * 0.1; B(g, 1, 0.6 + h, 1, stone, cx, -0.3 + h / 2, cz);
    if (r() < 0.35) { const n = 2 + (r() * 3 | 0); for (let i = 0; i < n; i++) { const rh = 0.4 + r() * 0.5; B(g, 0.06, rh, 0.06, flat('#4f8a3a'), cx + (r() - 0.5) * 0.7, h + rh / 2, cz + (r() - 0.5) * 0.7, true); } }
    if (r() < 0.12) { const x2 = cx + (r() - 0.5) * 0.5, z2 = cz + (r() - 0.5) * 0.5; B(g, 0.06, 0.8, 0.06, flat('#5a7a34'), x2, h + 0.4, z2, true); B(g, 0.12, 0.26, 0.12, flat('#6b3f22'), x2, h + 0.86, z2, true); }
    if (r() < 0.1) { const x2 = cx + (r() - 0.5) * 0.6, z2 = cz + (r() - 0.5) * 0.6; B(g, 0.05, 0.22, 0.05, flat('#3f7a2a'), x2, h + 0.11, z2, true); B(g, 0.16, 0.12, 0.16, flat(['#f6f6f6', '#ffd84a', '#c58cf0'][r() * 3 | 0]), x2, h + 0.27, z2, true); }
  }

  /* the bridge: a gentle wooden arch running north-south across the east end */
  const bz0 = pz - rz - 1.5, bz1 = pz + rz + 1.5, len = bz1 - bz0, deck = (t) => 0.12 + Math.sin(Math.PI * t) * 0.42;
  const planks = lam({ map: toTex(cv(16, 16, (c) => { speck(c, 16, 16, ['#a3713f', '#9a6a3e', '#ad7a47'], rng(84)); fill(c, '#6b4422', 0, 7, 16, 1); fill(c, '#6b4422', 0, 15, 16, 1); fill(c, '#6b4422', 5, 0, 1, 7); fill(c, '#6b4422', 11, 8, 1, 7); })) });
  const N = 14;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N, z = bz0 + len * t, y = deck(t), seg = len / N;
    B(g, bw, 0.14, seg + 0.04, planks, bx, FLOOR + y - 0.07, z);
    B(g, bw - 0.3, 0.12, 0.1, M.dark, bx, FLOOR + y - 0.18, z - seg / 2 + 0.05, true);
    collide(bx - bw / 2, bx + bw / 2, z - seg / 2, z + seg / 2, FLOOR + y);
  }
  // railings: posts along each side and a top rail that follows the arch
  for (const sx of [-1, 1]) {
    const x = bx + sx * (bw / 2 - 0.06);
    for (let i = 0; i <= 6; i++) { const t = i / 6, z = bz0 + 0.3 + (len - 0.6) * t, y = deck(t); B(g, 0.12, 0.62, 0.12, M.log, x, FLOOR + y + 0.31, z); }
    for (let i = 0; i < N; i++) { const t = (i + 0.5) / N, z = bz0 + len * t, y = deck(t); B(g, 0.1, 0.08, len / N + 0.04, planks, x, FLOOR + y + 0.6, z, true); }
  }
  // posts under the bridge, standing in the water
  for (const z of [pz - 0.9, pz + 0.9]) for (const sx of [-1, 1]) B(g, 0.18, 0.9, 0.18, M.log, bx + sx * 0.5, WATER_Y + 0.2, z);

  /* the dock from the west shore, with a fishing rod, a bucket and a lantern at the end */
  const dlen = dock.x1 - dock.x0, dy = 0.14;
  B(g, dlen, 0.12, dock.w, planks, (dock.x0 + dock.x1) / 2, FLOOR + dy - 0.06, dock.z);
  for (let x = dock.x0 + 0.4; x < dock.x1; x += 1.1) for (const sz of [-1, 1]) B(g, 0.16, 0.7, 0.16, M.log, x, WATER_Y + 0.12, dock.z + sz * (dock.w / 2 - 0.08));
  collide(dock.x0 - 0.4, dock.x1, dock.z - dock.w / 2, dock.z + dock.w / 2, FLOOR + dy);
  const endX = dock.x1 - 0.25;
  B(g, 0.14, 1.5, 0.14, M.log, endX, FLOOR + dy + 0.75, dock.z - dock.w / 2 + 0.07); B(g, 0.6, 0.08, 0.08, M.dark, endX + 0.2, FLOOR + dy + 1.46, dock.z - dock.w / 2 + 0.07);
  B(g, 0.05, 0.25, 0.05, M.dark, endX + 0.45, FLOOR + dy + 1.32, dock.z - dock.w / 2 + 0.07, true);
  const dockLamp = B(g, 0.24, 0.28, 0.24, glow('#ffc76a'), endX + 0.45, FLOOR + dy + 1.08, dock.z - dock.w / 2 + 0.07, true); dockLamp.userData.keep = true;
  B(g, 0.3, 0.06, 0.3, M.dark, endX + 0.45, FLOOR + dy + 1.24, dock.z - dock.w / 2 + 0.07, true);
  B(g, 0.36, 0.34, 0.36, flat('#7a8a96'), dock.x0 + 0.6, FLOOR + dy + 0.17, dock.z + 0.25); B(g, 0.3, 0.04, 0.3, flat('#2f7fb5'), dock.x0 + 0.6, FLOOR + dy + 0.33, dock.z + 0.25);
  // the rod resting on a stand, until you pick it up
  const rodStand = new THREE.Group(); rodStand.position.set(dock.x0 + 1.3, FLOOR + dy, dock.z - 0.3); g.add(rodStand); rodStand.userData.keep = true;
  B(rodStand, 0.08, 0.5, 0.08, M.dark, 0, 0.25, 0, true); const rodRest = B(rodStand, 0.05, 0.05, 1.6, flat('#6b3f22'), 0, 0.5, 0.55, true); rodRest.rotation.x = -0.35;

  /* benches on the far (north) shore, facing the water, and lantern posts round the pond */
  for (const x of [px - 1.6, px + 1.0]) {
    const z = pz - rz - 1.8;
    B(g, 2.0, 0.14, 0.6, planks, x, FLOOR + 0.5, z); B(g, 2.0, 0.5, 0.12, planks, x, FLOOR + 0.82, z - 0.26);
    for (const sx of [-1, 1]) { B(g, 0.14, 0.5, 0.5, M.dark, x + sx * 0.85, FLOOR + 0.25, z); B(g, 0.14, 0.9, 0.12, M.dark, x + sx * 0.85, FLOOR + 0.55, z - 0.26); }
    collide(x - 1, x + 1, z - 0.35, z + 0.3, 1.1);
  }
  const lanterns = [];
  [[px - rx - 1.3, pz - rz - 1.2], [bx + bw / 2 + 0.8, pz - rz - 1.3], [bx + bw / 2 + 0.8, pz + rz + 1.3], [px - rx - 1.3, pz + rz + 0.9]].forEach(([x, z]) => {
    B(g, 0.2, 1.9, 0.2, M.log, x, 0.95, z); B(g, 0.46, 0.08, 0.46, M.dark, x, 2.2, z);
    const m = B(g, 0.32, 0.36, 0.32, glow('#ffc76a'), x, 2.0, z, true); m.userData.keep = true; lanterns.push(m);
    B(g, 0.4, 0.06, 0.4, M.dark, x, 1.8, z, true); collide(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 3);
    addLamp(g, x, 1.9, z, 0, 1.5, 7, '#ffc27a');
  });
  addLamp(g, endX + 0.45, FLOOR + 1.1, dock.z + 0.3, 0, 1.2, 6, '#ffc27a');

  /* lily pads with flowers, gently turning, and a fish that jumps now and then */
  const lilies = [];
  [[px - 1.6, pz - 1.1], [px + 0.6, pz + 1.4], [px - 0.4, pz - 1.6], [px + 1.6, pz - 0.6]].forEach(([x, z], i) => {
    const l = new THREE.Group(); l.position.set(x, WATER_Y + 0.02, z); g.add(l); l.userData.keep = true;
    B(l, 0.6, 0.03, 0.6, flat('#4f9a44'), 0, 0, 0, true); B(l, 0.2, 0.031, 0.2, flat('#2f7fb5'), 0.2, 0, 0.2, true);
    if (i % 2 === 0) { B(l, 0.16, 0.12, 0.16, flat('#f6b0c8'), -0.08, 0.08, -0.06, true); B(l, 0.08, 0.06, 0.08, flat('#ffd84a'), -0.08, 0.15, -0.06, true); }
    lilies.push({ l, s: i * 1.7 });
  });
  const fish = new THREE.Group(); fish.visible = false; g.add(fish); fish.userData.keep = true;
  B(fish, 0.36, 0.14, 0.12, flat('#ff8a3a'), 0, 0, 0, true); B(fish, 0.12, 0.16, 0.04, flat('#e06a2a'), -0.22, 0, 0, true); B(fish, 0.04, 0.04, 0.13, flat('#141418'), 0.12, 0.03, 0, true);
  let fishT = -1, fishAt = 4, fishFrom = [0, 0], fishDir = 1;
  // splash: a few white blocks that pop up and fall back
  const splashMat = new THREE.MeshBasicMaterial({ color: lin('#e8f6ff'), transparent: true, opacity: 0.9 });
  const drops = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), splashMat); m.visible = false; m.userData.keep = true; g.add(m); drops.push({ m, vx: 0, vy: 0, vz: 0 }); }
  let splashT = -1, splashAt = [0, 0];
  const splash = (x, z) => { splashT = 0; splashAt = [x, z]; drops.forEach((d) => { const a = Math.random() * 6.28, s = 0.6 + Math.random() * 0.9; d.vx = Math.cos(a) * s; d.vz = Math.sin(a) * s; d.vy = 2.2 + Math.random() * 1.6; d.m.position.set(x, WATER_Y + 0.05, z); d.m.visible = true; }); };
  // ripple rings
  const ringTex = toTex(cv(16, 16, (c) => { c.clearRect(0, 0, 16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 6 && d < 7.6) fill(c, '#e8f6ff', x, y, 1, 1); } }), false);
  const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; m.userData.keep = true; g.add(m); return { m, t: -1 }; });
  const ring = (x, z) => { const k = rings.find((q) => q.t < 0) || rings[0]; k.t = 0; k.m.position.set(x, WATER_Y + 0.03, z); };

  /* fishing: the line runs from the rod tip to a bobber in the water */
  const lineMat = new THREE.LineBasicMaterial({ color: lin('#f1efe6') });
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(lineGeo, lineMat); line.visible = false; line.frustumCulled = false; g.add(line);
  const rod = new THREE.Group(); rod.visible = false; rod.userData.keep = true; g.add(rod); B(rod, 1.7, 0.05, 0.05, flat('#6b3f22'), 0.85, 0, 0, true); B(rod, 0.12, 0.12, 0.12, M.dark, 0.25, -0.04, 0, true);
  const bobber = new THREE.Group(); bobber.visible = false; bobber.userData.keep = true; g.add(bobber); B(bobber, 0.14, 0.08, 0.14, flat('#f1efe6'), 0, 0, 0, true); B(bobber, 0.14, 0.08, 0.14, flat('#d8403a'), 0, 0.08, 0, true);
  // the fish that comes up on the line, hanging nose-down
  const caught = new THREE.Group(); caught.visible = false; caught.userData.keep = true; g.add(caught);
  { const f = new THREE.Group(); f.rotation.z = -Math.PI / 2; caught.add(f); B(f, 0.38, 0.15, 0.13, flat('#ff8a3a'), -0.2, 0, 0, true); B(f, 0.12, 0.18, 0.04, flat('#e06a2a'), -0.42, 0, 0, true); B(f, 0.04, 0.04, 0.14, flat('#141418'), -0.06, 0.03, 0, true); }
  /* a cast runs through these steps, each with its own easing so nothing snaps:
     lift (take the rod and turn to the water) → wind (pull back) → throw (the bobber arcs out) →
     wait (it bobs; something bites) → reel (the rod comes up, a fish leaps out on the line) →
     hold (while the card is open) → out (the rod is put away) */
  const STEP = { lift: 0.55, wind: 0.34, throw: 0.62, reel: 0.85, out: 0.8 };
  // the rod's angle is pulled toward a target for each step by a critically damped spring, so it
  // never stops dead between steps: [target angle, stiffness]. 1.3 is raised high, -1.2 hangs down.
  const ROD = { lift: [0.55, 7], wind: [1.32, 10], throw: [0.28, 16], wait: [0.42, 4], reel: [1.35, 8], hold: [1.26, 3.5], out: [-1.25, 5.5] };
  const spring = (o, target, w, dt) => { const x = o.v - target, e = Math.exp(-w * dt), q = (o.vel + w * x) * dt; o.v = target + (x + q) * e; o.vel = (o.vel - w * q) * e; return o.v; };
  const holdS = { v: 0, vel: 0 }, camS = { v: 0, vel: 0 };
  let hand = null; // fills a vector with the player's right hand, in world space
  const eo = (k) => 1 - Math.pow(1 - k, 3), eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2), cl = (k) => Math.max(0, Math.min(1, k));
  const lerp = (a, b, k) => a + (b - a) * k;
  const tip = new THREE.Vector3();
  let cast = null; // { step, t, P, at:[x,z], bite, done, z0, rz, sc }

  bake(g); scene.add(g);

  const spot = { x: endX - 0.35, z: dock.z };
  return {
    // where E works, where the walk-to stops, and where the name tag floats
    rect: { x0: dock.x1 - 1.4, x1: dock.x1, z0: dock.z - 0.6, z1: dock.z + 0.6 },
    front: [spot.x, spot.z], labelAt: [endX, 2.5, dock.z], spot,
    // true while the line is out (the player stands still); false once the rod is being put away
    fishing: () => !!cast && cast.step !== 'out',
    holding: () => !!cast && cast.step === 'hold',
    // cast the line. If the rod is still in hand from the last catch, go straight to the throw.
    fish(P, done) {
      if (cast && cast.step !== 'hold' && cast.step !== 'out') return;
      const again = !!cast;
      rodRest.visible = false; rod.visible = line.visible = true; bobber.visible = again; caught.visible = again && caught.visible;
      cast = { step: again ? 'wind' : 'lift', t: 0, P, at: [spot.x + 2.0 + Math.random() * 0.6, dock.z + (Math.random() - 0.5) * 1.2], bite: 1.3 + Math.random() * 1.0, done,
        rzS: again ? cast.rzS : { v: -1.2, vel: 0 }, scS: again ? cast.scS : { v: 0.55, vel: 0 } };
    },
    // the card has closed: put the rod away
    release() { if (cast && cast.step === 'hold') { cast.step = 'out'; cast.t = 0; } },
    // true from the first move until the rod is back on its stand (the world draws every frame then)
    active: () => !!cast,
    // how far the player's arms are raised to hold the rod, and the rod's angle
    hold: () => ({ k: holdS.v, rz: cast ? cast.rzS.v : -1.2 }),
    // 0..1, how much the camera leans toward the line, and where it looks
    lean: () => camS.v, lookAt: () => (cast ? cast.at : [spot.x + 2.2, dock.z]),
    setHand(fn) { hand = fn; },
    update(time, dt, night) {
      wTex.offset.set((time * 0.03) % 1, (time * 0.018) % 1); rTex.offset.set((-time * 0.05) % 1, (time * 0.04) % 1);
      rippleMat.opacity = 0.55 + Math.sin(time * 0.8) * 0.15;
      waterMat.color.setScalar(1 - night * 0.35); waterMat.emissive.setRGB(0.02 * night, 0.05 * night, 0.1 * night);
      lanterns.forEach((m, i) => m.scale.setScalar(1 + Math.sin(time * 7 + i) * 0.04 * night)); dockLamp.material.color.setScalar(0.6 + night * 0.4);
      lilies.forEach((q) => { q.l.rotation.y = Math.sin(time * 0.3 + q.s) * 0.4; q.l.position.y = WATER_Y + 0.02 + Math.sin(time * 1.1 + q.s) * 0.012; });
      // a fish jumps every few seconds
      if (fishT < 0 && time > fishAt) { fishT = 0; const a = Math.random() * 6.28; fishFrom = [px + Math.cos(a) * rx * 0.5, pz + Math.sin(a) * rz * 0.45]; fishDir = Math.random() < 0.5 ? 1 : -1; fish.visible = true; ring(fishFrom[0], fishFrom[1]); }
      if (fishT >= 0) { fishT += dt; const k = fishT / 0.8; fish.position.set(fishFrom[0] + fishDir * k * 0.9, WATER_Y + Math.sin(Math.PI * Math.min(1, k)) * 0.7, fishFrom[1]); fish.rotation.z = fishDir * (0.9 - k * 1.8); fish.rotation.y = fishDir < 0 ? Math.PI : 0; if (k >= 1) { fish.visible = false; fishT = -1; fishAt = time + 5 + Math.random() * 7; splash(fishFrom[0] + fishDir * 0.9, fishFrom[1]); ring(fishFrom[0] + fishDir * 0.9, fishFrom[1]); } }
      if (splashT >= 0) { splashT += dt; drops.forEach((d) => { d.vy -= 9 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; if (d.m.position.y < WATER_Y) d.m.visible = false; }); splashMat.opacity = Math.max(0, 0.9 - splashT); if (splashT > 1) { splashT = -1; drops.forEach((d) => { d.m.visible = false; }); } }
      rings.forEach((k) => { if (k.t < 0) { k.m.visible = false; return; } k.t += dt; const e = k.t / 1.4; k.m.visible = true; k.m.scale.setScalar(0.4 + e * 2.2); k.m.material.opacity = Math.max(0, 0.8 * (1 - e)); if (e >= 1) k.t = -1; });
      // arms up while the rod is out; the camera leans in while the line is in the water
      spring(holdS, cast && !(cast.step === 'out' && cast.t > 0.45) ? 1 : 0, 6, dt);
      spring(camS, cast && cast.step !== 'out' ? 1 : 0, cast ? 2.4 : 2, dt);
      // the cast
      if (cast) {
        const c = cast, P = c.P, [tx, tz] = c.at; c.t += dt;
        const go = (step) => { c.step = step; c.t = 0; };
        // turn to face the water, easing round rather than snapping
        if (c.step !== 'out') { let d = Math.PI / 2 - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * Math.min(1, dt * 6); }
        const k = c.step === 'wait' || c.step === 'hold' ? 0 : cl(c.t / STEP[c.step]);
        if (c.step === 'lift' && k >= 1) go('wind');
        else if (c.step === 'wind' && k >= 1) { bobber.visible = caught.visible = false; bobber.scale.setScalar(1); caught.scale.setScalar(1); go('throw'); }
        // the rod: a spring toward this step's angle, with a little life added while waiting or holding
        const [aim, stiff] = ROD[c.step], bite = c.step === 'wait' && c.t > c.bite;
        const wob = c.step === 'wait' ? Math.sin(c.t * 1.6) * 0.03 + (bite ? Math.sin(c.t * 26) * 0.05 : 0) : c.step === 'hold' ? Math.sin(time * 1.4) * 0.03 : 0;
        spring(c.rzS, aim + wob, stiff, dt);
        spring(c.scS, c.step === 'out' && c.t > 0.38 ? 0 : 1, c.step === 'out' ? 7 : 9, dt);
        const rz = c.rzS.v, sc = Math.max(0.001, c.scS.v);
        rod.scale.setScalar(sc);
        // the rod sits in the right hand
        const yaw = P.yaw;
        if (hand) { hand(rod.position); rod.position.y -= 0.04; } else rod.position.set(P.x + Math.sin(yaw) * 0.35 - Math.cos(yaw) * 0.3, P.visY + 1.15, P.z + Math.cos(yaw) * 0.35 + Math.sin(yaw) * 0.3);
        rod.rotation.set(0, yaw - Math.PI / 2, rz);
        tip.set(1.7 * sc, 0, 0).applyEuler(rod.rotation).add(rod.position);
        // the bobber
        if (c.step === 'wind') {
          // casting again: the last catch slips off the hook and the bobber comes back to the tip
          const s2 = Math.max(0.01, 1 - eo(k)); caught.scale.setScalar(s2); bobber.scale.setScalar(s2); bobber.position.lerp(tip, Math.min(1, dt * 9)); caught.position.set(bobber.position.x, bobber.position.y - 0.08, bobber.position.z);
        } else if (c.step === 'throw') {
          const f = eo(cl((c.t - 0.08) / (STEP.throw - 0.08))); bobber.visible = c.t > 0.06;
          bobber.position.set(lerp(tip.x, tx, f), lerp(tip.y, WATER_Y + 0.06, f) + Math.sin(Math.PI * f) * 1.3, lerp(tip.z, tz, f));
          if (k >= 1) { ring(tx, tz); go('wait'); }
        } else if (c.step === 'wait') {
          const bite = c.t > c.bite, shake = bite ? Math.sin(c.t * 34) * 0.05 : 0;
          bobber.position.set(tx + shake * 0.4, WATER_Y + 0.06 + (bite ? -0.1 + shake : Math.sin(c.t * 3) * 0.03), tz);
          if (bite && !c.bit) { c.bit = true; ring(tx, tz); }
          if (c.t > c.bite + 0.55) { splash(tx, tz); ring(tx, tz); go('reel'); }
        } else if (c.step === 'reel' || c.step === 'hold') {
          // the fish leaps out and swings in under the rod tip
          const f = c.step === 'hold' ? 1 : eo(cl(k * 1.15)), hang = new THREE.Vector3(tip.x, tip.y - 0.75, tip.z);
          const sway = c.step === 'hold' ? Math.sin(time * 2.2) * 0.08 : 0;
          bobber.position.set(lerp(tx, hang.x, f) + sway, lerp(WATER_Y + 0.06, hang.y, f) + Math.sin(Math.PI * f) * 0.9, lerp(tz, hang.z, f));
          caught.visible = f > 0.08; caught.position.set(bobber.position.x, bobber.position.y - 0.08, bobber.position.z); caught.rotation.y = Math.sin(time * 9) * (c.step === 'hold' ? 0.35 : 0.8); caught.rotation.x = Math.sin(time * 5) * 0.15;
          if (c.step === 'reel' && k > 0.5 && !c.told) { c.told = true; c.done(); }
          if (c.step === 'reel' && k >= 1) go('hold');
        } else if (c.step === 'out') {
          const f = eio(cl(c.t / 0.5)); bobber.position.lerp(tip, Math.min(1, dt * 10)); caught.position.set(bobber.position.x, bobber.position.y - 0.08, bobber.position.z);
          caught.scale.setScalar(Math.max(0.01, 1 - f * 1.4)); bobber.scale.setScalar(Math.max(0.01, 1 - f * 1.2));
          if (c.t > STEP.out && c.scS.v < 0.02) { cast = null; rod.visible = line.visible = bobber.visible = caught.visible = false; caught.scale.setScalar(1); bobber.scale.setScalar(1); rod.scale.setScalar(1); rodRest.visible = true; }
        }
        if (cast) { line.visible = bobber.visible; const a = lineGeo.attributes.position.array; a[0] = tip.x; a[1] = tip.y; a[2] = tip.z; a[3] = bobber.position.x; a[4] = bobber.position.y + 0.1; a[5] = bobber.position.z; lineGeo.attributes.position.needsUpdate = true; }
      }
    },
  };
}
