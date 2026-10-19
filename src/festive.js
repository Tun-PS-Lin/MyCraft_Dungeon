// Festival decorations (see festival.js): Christmas, Valentine's and Easter here; Thingyan and
// Thadingyut in festive-mm.js.
// Everything here is built once, when the page loads, and merged ("baked") into a few meshes per
// material, so a decorated village draws about as fast as a plain one. Twinkling lights are a
// handful of shared materials whose brightness changes; only a few small things (balloons,
// ducks, bunnies, candles, the star) move on their own.
import * as THREE from 'three';
import { B, M, flat, wool, glow, bake, cv, lin } from './textures.js';
import { collide } from './collision.js';
import { addLamp } from './lights.js';
import { HALL, HIDEOUT, POND, STALLS, FLOOR } from './config.js';

import { TURN, V, twinkle, sag, wire, stringLights, HEART, pixels, bunting } from './festive-kit.js';
import { mmCenterpiece, mmVillage, mmHideout } from './festive-mm.js';

function wreath(g, x, y, z, s = 1, rotY = 0) {
  const w = new THREE.Group(); w.position.set(x, y, z); w.rotation.y = rotY; g.add(w);
  const leaf = flat('#2f6b34'), leaf2 = flat('#3f8a3f');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; B(w, 0.2 * s, 0.2 * s, 0.12, i % 2 ? leaf : leaf2, Math.cos(a) * 0.36 * s, Math.sin(a) * 0.36 * s, 0, true); }
  for (const a of [0.4, 1.9, 3.3, 4.6]) B(w, 0.08 * s, 0.08 * s, 0.14, flat('#d22b2b'), Math.cos(a) * 0.36 * s, Math.sin(a) * 0.36 * s, 0.03, true);
  B(w, 0.26 * s, 0.14 * s, 0.14, flat('#d22b2b'), 0, -0.4 * s, 0.05, true); B(w, 0.08 * s, 0.22 * s, 0.14, flat('#b01e24'), -0.06 * s, -0.55 * s, 0.05, true); B(w, 0.08 * s, 0.22 * s, 0.14, flat('#b01e24'), 0.06 * s, -0.55 * s, 0.05, true);
}
function present(g, x, z, s, color, ribbon, y = 0) {
  const c = flat(color), r = flat(ribbon);
  B(g, s, s * 0.8, s, c, x, y + s * 0.4, z); B(g, s + 0.02, s * 0.82, 0.08, r, x, y + s * 0.4, z, true); B(g, 0.08, s * 0.82, s + 0.02, r, x, y + s * 0.4, z, true);
  B(g, 0.22, 0.12, 0.08, r, x - 0.08, y + s * 0.86, z, true); B(g, 0.22, 0.12, 0.08, r, x + 0.08, y + s * 0.86, z, true);
}
function stocking(g, x, y, z, color, facing = 1) {
  const c = flat(color), w = flat('#f4f1ea');
  B(g, 0.06, 0.12, 0.34, w, x, y, z, true); B(g, 0.06, 0.4, 0.26, c, x, y - 0.26, z, true); B(g, 0.06, 0.16, 0.36, c, x, y - 0.5, z + facing * 0.07, true);
}
// a Christmas tree: stepped tiers of needles, lights spiralling round, a star on top
function xmasTree(g, x, z, h, tw, { y = 0, star = true } = {}) {
  const t = new THREE.Group(); t.position.set(x, y, z); g.add(t);
  const n1 = flat('#2c6a35'), n2 = flat('#367d3e'), n3 = flat('#255a2e'), trunk = flat('#6b4422');
  B(t, 0.3 * h / 3, 0.5 * h / 3, 0.3 * h / 3, trunk, 0, 0.25 * h / 3, 0);
  const tiers = 5, base = 0.42 * h / 3, top = h * 0.92;
  const widths = [];
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers, w = (1 - k * 0.78) * h * 0.46, y0 = base + (top - base) * k, th = (top - base) / tiers + 0.05;
    B(t, w, th, w, i % 2 ? n2 : n1, 0, y0 + th / 2, 0); const r = B(t, w * 0.82, th * 0.9, w * 0.82, n3, 0, y0 + th / 2 + 0.02, 0); r.rotation.y = Math.PI / 4;
    widths.push([y0, y0 + th, w / 2]);
  }
  // lights on the faces of the tiers, in a spiral
  const count = Math.round(h * 13);
  for (let i = 0; i < count; i++) {
    const k = (i + 0.5) / count, yy = base + (top - base) * k * 0.97, tier = widths.find(([a, b]) => yy >= a && yy <= b) || widths[widths.length - 1];
    const a = k * Math.PI * 2 * 4.5, c = Math.cos(a), sn = Math.sin(a), r = tier[2] / Math.max(Math.abs(c), Math.abs(sn)) + 0.04;
    B(t, 0.1, 0.1, 0.1, tw.next(), c * r, yy, sn * r, true);
  }
  let starG = null;
  if (star) { starG = new THREE.Group(); starG.position.set(0, top + 0.28, 0); starG.userData.keep = true; t.add(starG); const sm = glow('#ffd84a');
    B(starG, 0.5, 0.16, 0.12, sm, 0, 0, 0, true); B(starG, 0.16, 0.5, 0.12, sm, 0, 0, 0, true); const d = B(starG, 0.3, 0.3, 0.1, sm, 0, 0, 0, true); d.rotation.z = Math.PI / 4; }
  return { group: t, star: starG, widths };
}
function snowman(g, x, z, rot = 0) {
  const s = new THREE.Group(); s.position.set(x, 0.1, z); s.rotation.y = rot; g.add(s);
  const snow = flat('#f4f8ff'), coal = flat('#1b1b20');
  B(s, 0.9, 0.8, 0.9, snow, 0, 0.4, 0); B(s, 0.7, 0.6, 0.7, snow, 0, 1.1, 0); B(s, 0.52, 0.5, 0.52, snow, 0, 1.65, 0);
  B(s, 0.08, 0.08, 0.04, coal, -0.11, 1.72, 0.26, true); B(s, 0.08, 0.08, 0.04, coal, 0.11, 1.72, 0.26, true); B(s, 0.08, 0.08, 0.3, flat('#ff8a2a'), 0, 1.62, 0.38, true);
  for (const yy of [1.2, 1.0, 0.6]) B(s, 0.08, 0.08, 0.04, coal, 0, yy, yy > 0.8 ? 0.36 : 0.46, true);
  B(s, 0.74, 0.14, 0.74, flat('#c62f2f'), 0, 1.4, 0); B(s, 0.16, 0.42, 0.08, flat('#c62f2f'), 0.2, 1.2, 0.36, true);
  B(s, 0.6, 0.06, 0.6, coal, 0, 1.92, 0); B(s, 0.4, 0.36, 0.4, coal, 0, 2.12, 0);
  for (const sx of [-1, 1]) { const arm = B(s, 0.06, 0.06, 0.7, flat('#6b4422'), sx * 0.55, 1.2, 0, true); arm.rotation.y = Math.PI / 2; arm.rotation.x = sx * 0.5; }
  collide(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 2.2);
}
// Valentine's
function roseBush(g, x, z, s = 1) {
  B(g, 0.8 * s, 0.6 * s, 0.8 * s, flat('#2f6b34'), x, 0.3 * s + 0.1, z);
  const r = flat('#d6213f'), p = flat('#ff6f8a');
  [[-0.25, 0.62, 0.2], [0.2, 0.66, -0.15], [0.05, 0.7, 0.25], [-0.15, 0.6, -0.25], [0.3, 0.58, 0.22]].forEach(([dx, dy, dz], i) => B(g, 0.16 * s, 0.16 * s, 0.16 * s, i % 2 ? p : r, x + dx * s, 0.1 + dy * s, z + dz * s, true));
}
function heartCandle(g) { // floating: a small heart-shaped float with a flame
  const c = new THREE.Group(); g.add(c); c.userData.keep = true;
  pixels(c, HEART, 0.06, flat('#ff8fab'), 0, 0, 0, 0.06); c.children.forEach((m) => { m.position.z = m.position.y; m.position.y = 0; }); // lay it flat
  B(c, 0.08, 0.12, 0.08, flat('#f4f1ea'), 0, 0.08, 0.02, true); B(c, 0.06, 0.08, 0.06, glow('#ffc76a'), 0, 0.18, 0.02, true);
  bake(c); return c; // (one mesh per colour, so a moving decoration is only a draw call or two)
}
function balloon(g, color) {
  const b = new THREE.Group(); g.add(b); b.userData.keep = true;
  pixels(b, HEART, 0.09, flat(color), 0, 0, 0, 0.12);
  B(b, 0.02, 1.1, 0.02, flat('#f4f1ea'), 0, -0.85, 0, true);
  bake(b); return b;
}
// Easter
function egg(g, x, y, z, s, a, b2) {
  const e = new THREE.Group(); e.position.set(x, y, z); g.add(e);
  B(e, 0.18 * s, 0.28 * s, 0.18 * s, flat(a), 0, 0.14 * s, 0, true); B(e, 0.22 * s, 0.14 * s, 0.22 * s, flat(a), 0, 0.12 * s, 0, true); B(e, 0.23 * s, 0.05 * s, 0.23 * s, flat(b2), 0, 0.16 * s, 0, true);
  return e;
}
function tulips(g, x, z, n, colors) {
  for (let i = 0; i < n; i++) { const tx = x + (i - (n - 1) / 2) * 0.3, tz = z + (i % 2) * 0.18; B(g, 0.05, 0.4, 0.05, flat('#3f8a3a'), tx, 0.3, tz, true); B(g, 0.12, 0.16, 0.12, flat(colors[i % colors.length]), tx, 0.56, tz, true); B(g, 0.14, 0.05, 0.14, flat('#4f9a44'), tx, 0.14, tz + 0.04, true); }
}
function bunny(g, x, z, rot = 0, s = 1, still = true) {
  const b = new THREE.Group(); b.position.set(x, 0.1, z); b.rotation.y = rot; g.add(b);
  const fur = flat('#f4f1ea'), pink = flat('#f6b0c8');
  B(b, 0.5 * s, 0.45 * s, 0.7 * s, fur, 0, 0.3 * s, 0); B(b, 0.42 * s, 0.38 * s, 0.38 * s, fur, 0, 0.66 * s, 0.32 * s);
  for (const sx of [-1, 1]) { B(b, 0.1 * s, 0.42 * s, 0.08 * s, fur, sx * 0.1 * s, 1.0 * s, 0.28 * s, true); B(b, 0.05 * s, 0.32 * s, 0.02 * s, pink, sx * 0.1 * s, 1.0 * s, 0.33 * s, true); B(b, 0.06 * s, 0.06 * s, 0.02 * s, flat('#1b1b20'), sx * 0.11 * s, 0.72 * s, 0.52 * s, true); }
  B(b, 0.08 * s, 0.06 * s, 0.03 * s, pink, 0, 0.62 * s, 0.52 * s, true); B(b, 0.2 * s, 0.2 * s, 0.14 * s, fur, 0, 0.36 * s, -0.4 * s, true);
  if (!still) { b.userData.keep = true; bake(b); }
  return b;
}
const PASTEL = ['#ffb3c7', '#b8e6c9', '#fff1a6', '#c8b6ff', '#a9dcff'];

/* ── the About Me centrepiece for each festival, in the signpost's own place ──
   g is the signpost's group (drawn 1.2x); makeBoard(w, h) returns the About Me board as a mesh */
export function centerpiece(g, kind, makeBoard) {
  if (kind === 'thingyan' || kind === 'thadingyut') return mmCenterpiece(g, kind, makeBoard);
  const ret = { rect: [-1.8, 1.8, -0.5, 0.6], labelY: 4.4, update: () => {} };
  if (kind === 'christmas') {
    const tw = twinkle(['#ff4a4a', '#ffd84a', '#5ab0ff', '#7dff8a', '#ffffff']);
    const tree = xmasTree(g, 0, 0, 6.2, tw);
    // the About Me board hangs on the front of the tree, from the tier above
    const z = tree.widths[0][2] + 0.18, board = makeBoard(2.2, 1.1); board.position.set(0, 1.95, z + 0.07); g.add(board);
    B(g, 2.4, 1.3, 0.1, M.dark, 0, 1.95, z, true);
    for (const sx of [-0.8, 0.8]) B(g, 0.04, 0.9, 0.04, flat('#e8d3a0'), sx, 2.95, z - 0.02, true);
    [[-1.4, 1.2, '#c62f2f', '#ffd84a'], [1.45, 1.1, '#2f66c4', '#f4f1ea'], [-0.9, 1.75, '#3f8a3f', '#d22b2b'], [1.0, 1.8, '#ffd84a', '#c62f2f'], [0.1, 1.95, '#b68cff', '#ffd84a']].forEach(([x, zz, c, r], i) => present(g, x, zz, 0.42 + (i % 2) * 0.14, c, r));
    addLamp(g, 0, 3.0, 1.6, 0.4, 1.8, 9, '#ffd9a0');
    ret.rect = [-1.9, 1.9, -1.9, 2.1]; ret.labelY = 8.4;
    ret.update = (time, night) => { tw.update(time, night); if (tree.star) { tree.star.rotation.y = time * 0.8; tree.star.scale.setScalar(1 + Math.sin(time * 3) * 0.06); } };
  } else if (kind === 'valentine') {
    const tw = twinkle(['#ff5c8a', '#ffd1dc', '#ff2d55']);
    // a big pixel heart, standing on its point, outlined in lights
    const BIG = ['..XXX...XXX..', '.XXXXX.XXXXX.', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', '.XXXXXXXXXXX.', '..XXXXXXXXX..', '...XXXXXXX...', '....XXXXX....', '.....XXX.....', '......X......'];
    const s = 0.4, red = flat('#d6213f'), pink = flat('#ff6f8a');
    pixels(g, BIG, s, (i, j) => ((i + j) % 2 ? red : pink), 0, 0.35 + (BIG.length - 1) / 2 * s, 0, 0.36, true);
    // lights on every other block of the outline, just in front of it
    const on = (i, j) => BIG[j] && BIG[j][i] === 'X';
    BIG.forEach((row, j) => [...row].forEach((ch, i) => { const edge = on(i, j) && !(on(i - 1, j) && on(i + 1, j) && on(i, j - 1) && on(i, j + 1)); if (edge && (i + j) % 2 === 0) B(g, 0.1, 0.1, 0.1, tw.next(), (i - 6) * s, 0.35 + (BIG.length - 1 - j) * s, 0.24, true); }));
    const board = makeBoard(2.0, 1.0); board.position.set(0, 2.3, 0.3); g.add(board); B(g, 2.2, 1.2, 0.1, M.dark, 0, 2.3, 0.23, true);
    B(g, 4.2, 0.2, 1.2, M.stone, 0, 0.1, 0);
    roseBush(g, -2.4, 0.5, 0.9); roseBush(g, 2.4, 0.5, 0.9);
    const balloons = [['#ff2d55', -2.6, 3.2], ['#ff8fab', 2.7, 3.0], ['#ffd1dc', -2.1, 3.9]].map(([c, x, y], i) => { const b = balloon(g, c); b.position.set(x, y, 0.6); return { b, x, y, p: i * 1.9 }; });
    addLamp(g, 0, 2.2, 1.4, 0.3, 1.6, 8, '#ff9ab8');
    ret.rect = [-2.9, 2.9, -0.7, 1.0]; ret.labelY = 6.2;
    ret.update = (time, night) => { tw.update(time, night); balloons.forEach((q) => { q.b.position.y = q.y + Math.sin(time * 1.3 + q.p) * 0.12; q.b.rotation.z = Math.sin(time * 0.9 + q.p) * 0.12; }); };
  } else if (kind === 'easter') {
    // a giant painted egg on a straw nest, the board on a ribbon in front, and a bunny beside it
    const eggG = new THREE.Group(); g.add(eggG); const vs = 0.26, RX = 1.3, RY = 1.85, RZ = 1.1, cy = 2.1;
    const bands = PASTEL.map((c) => flat(c)), dot = flat('#ffffff');
    for (let y = -RY; y <= RY; y += vs) for (let x = -RX; x <= RX; x += vs) for (let z = -RZ; z <= RZ; z += vs) {
      const k = (x / RX) ** 2 + (y / (y > 0 ? RY : RY * 0.8)) ** 2 + (z / RZ) ** 2; if (k > 1) continue;
      const kin = (x / (RX - vs * 1.3)) ** 2 + (y / ((y > 0 ? RY : RY * 0.8) - vs * 1.3)) ** 2 + (z / (RZ - vs * 1.3)) ** 2; if (kin < 1) continue; // only the shell
      const zig = Math.abs(((x + z) * 1.6) % 2 - 1) * 0.35, band = Math.floor((y + RY + zig) / 0.62);
      const m = (band % 3 === 1 && Math.round((x + z) / vs) % 3 === 0) ? dot : bands[band % bands.length];
      B(eggG, vs, vs, vs, m, x, cy + y, z);
    }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; B(g, 0.5, 0.3, 0.3, flat(i % 2 ? '#c99a3a' : '#e0b85a'), Math.cos(a) * 1.25, 0.25, Math.sin(a) * 1.0, false).rotation.y = -a; }
    B(g, 2.7, 0.18, 0.08, flat('#ff8fb0'), 0, 2.85, 1.04, true); // the ribbon
    const board = makeBoard(1.9, 0.95); board.position.set(0, 1.85, 1.32); g.add(board); B(g, 2.1, 1.12, 0.1, M.dark, 0, 1.85, 1.26, true);
    for (const sx of [-0.7, 0.7]) B(g, 0.05, 0.62, 0.05, flat('#ff8fb0'), sx, 2.55, 1.18, true);
    bunny(g, 2.35, 0.6, -0.5, 1.5); tulips(g, -1.9, 1.5, 5, ['#ff6f9a', '#fff1a6', '#c8b6ff']); tulips(g, 1.4, 1.65, 3, ['#ffb3c7', '#ff9a3d']);
    [[-2.3, 0.4, '#a9dcff', '#ffffff'], [2.0, 1.7, '#fff1a6', '#ff8fb0'], [-1.2, 1.3, '#b8e6c9', '#c8b6ff']].forEach(([x, z, a, b2]) => egg(g, x, 0.1, z, 1.4, a, b2));
    addLamp(g, 0, 3.0, 1.8, 0.3, 1.5, 8, '#fff0d0');
    ret.rect = [-2.0, 3.1, -1.3, 1.5]; ret.labelY = 5.4;
  }
  return ret;
}

/* ── the rest of the village: stall fronts, the hall, the pond, the square ──
   ctx: { stalls (from buildStalls), blocked(x,z,y), groundAt(x,z,y), groundType(x,z) } */
export function decorateVillage(scene, kind, ctx) {
  if (kind === 'thingyan' || kind === 'thadingyut') return mmVillage(scene, kind, ctx);
  const g = new THREE.Group(), live = new THREE.Group(); scene.add(g); scene.add(live);
  const updates = [], r = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const tw = kind === 'christmas' ? twinkle(['#ff4a4a', '#ffd84a', '#5ab0ff', '#7dff8a']) : kind === 'valentine' ? twinkle(['#ff5c8a', '#ffd1dc', '#ff2d55']) : twinkle(['#fff1a6', '#ffb3c7', '#b8e6c9', '#a9dcff']);
  updates.push((t, n) => tw.update(t, n));
  const heartMats = ['#ff2d55', '#ff8fab', '#f4f1ea', '#d6213f'].map((c) => flat(c)), pastelMats = PASTEL.map((c) => flat(c));

  // stall fronts: a line of lights (Christmas), hearts (Valentine's) or pastel flags (Easter)
  for (const s of ctx.stalls) {
    if (s.about) continue;
    const sg = new THREE.Group(); sg.position.set(s.pos[0], 0.1, s.pos[1]); sg.rotation.y = TURN[s.face || 'south']; sg.scale.setScalar(s.scale || 1); g.add(sg);
    const hw = s.id === 'outfits' ? 2.85 : 2.4, y = s.id === 'cinema' ? 2.95 : 2.62, z = 2.02;
    if (kind === 'christmas') { stringLights(sg, V(-hw, y, z), V(hw, y, z), 14, 0.22, tw); wreath(sg, -2.55, 1.55, 1.82, 0.7); }
    else if (kind === 'valentine') { bunting(sg, V(-hw, y, z), V(hw, y, z), 9, 0.25, heartMats, 'heart'); const b = balloon(live, ['#ff2d55', '#ff8fab'][s.id.length % 2]); const [bx, bz] = s.world(2.75, 2.2); b.position.set(bx, 3.2, bz); updates.push((t) => { b.position.y = 3.2 + Math.sin(t * 1.2 + bx) * 0.1; b.rotation.z = Math.sin(t * 0.8 + bz) * 0.1; }); }
    else { bunting(sg, V(-hw, y, z), V(hw, y, z), 9, 0.25, pastelMats, 'flag'); tulips(sg, -1.2, 2.6, 4, ['#ff6f9a', '#fff1a6', '#c8b6ff', '#ffb3c7']); }
  }

  // the town hall's front: a garland round the door and over the windows (hidden while you are
  // inside, when the front wall fades away). It is merged on its own, so it can be hidden.
  const hall = new THREE.Group(); hall.userData.keep = true; g.add(hall);
  { const dx = HALL.doorX, zf = HALL.z1 + 0.42, half = HALL.doorW / 2 + 0.05;
    if (kind === 'christmas') {
      const leaf = flat('#2f6b34'), leaf2 = flat('#3f8a3f');
      const arch = [...sag(V(dx - half, 0.6, zf), V(dx - half, 3.95, zf), 8, 0), ...sag(V(dx - half, 4.1, zf), V(dx + half, 4.1, zf), 10, -0.2), ...sag(V(dx + half, 3.95, zf), V(dx + half, 0.6, zf), 8, 0)];
      arch.forEach((p, i) => { B(hall, 0.3, 0.3, 0.2, i % 2 ? leaf : leaf2, p.x, p.y, p.z, true); if (i % 2 === 0) B(hall, 0.1, 0.1, 0.1, tw.next(), p.x + 0.08, p.y + 0.12, p.z + 0.12, true); });
      wreath(hall, dx - 6.15, 3.3, HALL.z1 + 0.2, 1); wreath(hall, dx + 6.15, 3.3, HALL.z1 + 0.2, 1);
    } else if (kind === 'valentine') {
      bunting(hall, V(dx - half - 1.5, 4.4, zf), V(dx + half + 1.5, 4.4, zf), 11, 0.45, heartMats, 'heart');
      pixels(hall, HEART, 0.12, flat('#ff2d55'), dx - 6.15, 3.3, HALL.z1 + 0.16, 0.08); pixels(hall, HEART, 0.12, flat('#ff2d55'), dx + 6.15, 3.3, HALL.z1 + 0.16, 0.08);
    } else {
      bunting(hall, V(dx - half - 1.5, 4.4, zf), V(dx + half + 1.5, 4.4, zf), 11, 0.45, pastelMats, 'flag');
      tulips(hall, dx - 3.4, HALL.z1 + 1.2, 5, ['#ff6f9a', '#fff1a6', '#c8b6ff']); tulips(hall, dx + 3.4, HALL.z1 + 1.2, 5, ['#ffb3c7', '#a9dcff', '#fff1a6']);
    }
  }

  // inside the town hall
  { const F = HALL.floor, wx = HALL.x0 + 1, cz = (HALL.z0 + HALL.z1) / 2, nz = HALL.z0 + 1, x1 = HALL.x1 - 1, inner = new THREE.Group(); g.add(inner);
    const corner = [wx + 0.75, nz + 2.8], corner2 = [x1 - 0.75, nz + 2.8];
    if (kind === 'christmas') {
      xmasTree(inner, corner[0], corner[1], 3.0, tw, { y: F }); collide(corner[0] - 0.75, corner[0] + 0.75, corner[1] - 0.75, corner[1] + 0.75, 3);
      [[0.4, '#c62f2f', '#ffd84a'], [-0.5, '#2f66c4', '#f4f1ea']].forEach(([o, c, rb]) => present(inner, corner[0] + 0.8, corner[1] + o, 0.38, c, rb, F));
      ['#c62f2f', '#2f8a4a', '#c62f2f'].forEach((c, i) => stocking(inner, wx + 1.32, F + 2.8, cz - 1.5 + i * 1.5, c));
      stringLights(inner, V(wx + 1.3, F + 3.15, cz - 1.9), V(wx + 1.3, F + 3.15, cz + 1.9), 10, 0.05, tw);
      for (const zz of [cz - 4, cz + 4]) stringLights(inner, V(wx + 0.5, F + 4.7, zz), V(x1, F + 4.7, zz), 26, 0.4, tw);
    } else if (kind === 'valentine') {
      for (const zz of [cz - 4, cz + 4]) bunting(inner, V(wx + 0.5, F + 4.7, zz), V(x1, F + 4.7, zz), 20, 0.4, heartMats, 'heart');
      roseBush(inner, corner[0], corner[1], 1); roseBush(inner, corner2[0], corner2[1], 1);
      for (let i = 0; i < 3; i++) B(inner, 0.12, 0.2, 0.12, glow('#ffc76a'), wx + 1.3, F + 3.25, cz - 1.2 + i * 1.2, true);
    } else {
      for (const zz of [cz - 4, cz + 4]) bunting(inner, V(wx + 0.5, F + 4.7, zz), V(x1, F + 4.7, zz), 20, 0.4, pastelMats, 'flag');
      B(inner, 0.9, 0.35, 0.7, flat('#c99a3a'), corner[0], F + 0.18, corner[1]); for (let i = 0; i < 5; i++) egg(inner, corner[0] - 0.3 + (i % 3) * 0.3, F + 0.3, corner[1] - 0.15 + Math.floor(i / 3) * 0.3, 1.2, PASTEL[i], '#ffffff');
      tulips(inner, corner2[0], corner2[1], 3, ['#ff6f9a', '#fff1a6', '#c8b6ff']);
    }
    bake(hall); updates.push((t, n, indoors) => { hall.visible = indoors < 0.4; });
  }

  // out on the square
  if (kind === 'christmas') {
    snowman(g, -10.2, -5.2, 0.4); snowman(g, 13.6, 5.0, -0.5);
    // a few lamp posts round the pond get a ribbon and a bow
  } else if (kind === 'valentine') {
    // rose petals scattered over the paving round the middle of the square
    const pet = [flat('#ff6f8a'), flat('#e8344e'), flat('#ffb3c7')];
    for (let i = 0; i < 240; i++) {
      const a = r() * 6.28, d = 2.5 + Math.sqrt(r()) * 10, x = Math.cos(a) * d * 1.3, z = 3 + Math.sin(a) * d * 0.8;
      if (ctx.blocked(x, z, 0.2)) continue;
      const m = B(g, 0.14, 0.02, 0.1, pet[i % 3], x, ctx.groundAt(x, z, 1) + 0.012, z, true); m.rotation.y = r() * 3;
    }
    // heart candles floating on the pond
    for (let i = 0; i < 6; i++) {
      const c = heartCandle(live), a = (i / 6) * 6.28 + 0.3, x0 = POND.x - 0.6 + Math.cos(a) * POND.rx * 0.5, z0 = POND.z + Math.sin(a) * POND.rz * 0.45;
      c.position.set(x0, -0.13, z0); updates.push((t) => { c.position.x = x0 + Math.sin(t * 0.2 + i) * 0.25; c.position.z = z0 + Math.cos(t * 0.17 + i * 2) * 0.18; c.position.y = -0.13 + Math.sin(t * 1.4 + i) * 0.015; c.rotation.y = t * 0.1 + i; });
      if (i % 2 === 0) addLamp(live, x0, 0.4, z0, 0, 0.5, 4, '#ff9ab8');
    }
  } else if (kind === 'easter') {
    // painted eggs hidden in the grass round the edges
    let n = 0; for (let tries = 0; tries < 700 && n < 18; tries++) {
      const x = -19 + r() * 42, z = -12 + r() * 27; if (ctx.groundType(x, z) !== 'grass' || ctx.blocked(x, z, 0.2)) continue;
      egg(g, x, ctx.groundAt(x, z, 1), z, 1, PASTEL[n % 5], PASTEL[(n + 2) % 5]); n++;
    }
    // a duck and her ducklings paddling round the pond
    const ducks = [0, 1, 2, 3].map((i) => { const d = new THREE.Group(); live.add(d); const s = i ? 0.55 : 1, body = flat(i ? '#ffe066' : '#f4f1ea');
      B(d, 0.36 * s, 0.24 * s, 0.5 * s, body, 0, 0.1 * s, 0, true); B(d, 0.24 * s, 0.24 * s, 0.24 * s, i ? body : flat('#2f6b34'), 0, 0.34 * s, 0.2 * s, true); B(d, 0.12 * s, 0.06 * s, 0.14 * s, flat('#ff9a3d'), 0, 0.3 * s, 0.38 * s, true);
      bake(d); return d; });
    updates.push((t) => ducks.forEach((d, i) => {
      const a = t * 0.18 - i * 0.32, x = POND.x - 0.4 + Math.cos(a) * POND.rx * 0.48, z = POND.z + Math.sin(a) * POND.rz * 0.42;
      d.position.set(x, -0.2 + Math.sin(t * 2 + i) * 0.01, z); d.rotation.y = Math.atan2(-Math.sin(a) * POND.rx, Math.cos(a) * POND.rz);
    }));
    // two bunnies hopping about the square
    for (let i = 0; i < 2; i++) {
      const b = bunny(live, 0, 0, 0, 0.55, false); let x = i ? 6 : -6, z = i ? -2 : 6, tx = x, tz = z, wait = 1 + i, hop = 0, yaw = 0;
      updates.push((t, n2, ind, dt) => {
        const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz);
        if (wait > 0) { wait -= dt; hop = Math.max(0, hop - dt * 4); if (wait <= 0) { for (let k = 0; k < 8; k++) { const nx = x + (r() - 0.5) * 6, nz = z + (r() - 0.5) * 6; if (Math.abs(nx) < 13 && nz > -6 && nz < 14 && !ctx.blocked(nx, nz, 0.2)) { tx = nx; tz = nz; break; } } } }
        else if (d < 0.1) wait = 1.5 + r() * 3;
        else { const sp = Math.min(d, dt * 1.6); const nx = x + (dx / d) * sp, nz = z + (dz / d) * sp; if (ctx.blocked(nx, nz, 0.2)) { tx = x; tz = z; } else { x = nx; z = nz; } hop += dt * 7; yaw += (Math.atan2(dx, dz) - yaw) * Math.min(1, dt * 8); }
        b.position.set(x, ctx.groundAt(x, z, 1) + Math.abs(Math.sin(hop)) * 0.22, z); b.rotation.y = yaw;
      });
    }
  }
  bake(g);
  return { update: (time, night, indoors, dt) => updates.forEach((f) => f(time, night, indoors, dt)) };
}

/* ── the Hideout (local coordinates of the room; group is the Hideout's root) ── */
export function decorateHideout(root, kind) {
  if (kind === 'thingyan' || kind === 'thadingyut') return mmHideout(root, kind);
  const g = new THREE.Group(); g.position.set(HIDEOUT.cx, 0, HIDEOUT.cz); root.add(g);
  const F = FLOOR, X = (x) => HIDEOUT.cx + x, Z = (z) => HIDEOUT.cz + z, fx = HIDEOUT.x1, fz = 1.6, back = HIDEOUT.z0 + 0.12;
  const tw = kind === 'christmas' ? twinkle(['#ff4a4a', '#ffd84a', '#5ab0ff', '#7dff8a']) : kind === 'valentine' ? twinkle(['#ff5c8a', '#ffd1dc']) : twinkle(['#fff1a6', '#ffb3c7', '#b8e6c9']);
  const corner = [-11.1, -5.3];
  if (kind === 'christmas') {
    xmasTree(g, corner[0], corner[1], 2.8, tw, { y: F }); collide(X(corner[0] - 0.7), X(corner[0] + 0.7), Z(corner[1] - 0.7), Z(corner[1] + 0.7), 3);
    present(g, corner[0] + 0.85, corner[1] + 0.5, 0.36, '#c62f2f', '#ffd84a', F); present(g, corner[0] + 0.2, corner[1] + 0.95, 0.3, '#2f66c4', '#f4f1ea', F);
    ['#c62f2f', '#f4f1ea', '#2f8a4a'].forEach((c, i) => stocking(g, fx - 1.42, 2.15, fz - 0.85 + i * 0.85, c, -1));
    stringLights(g, V(fx - 1.45, 2.47, fz - 1.6), V(fx - 1.45, 2.47, fz + 1.6), 9, 0.05, tw);
    stringLights(g, V(-11.8, 5.6, back), V(-6.2, 5.6, back), 12, 0.35, tw); stringLights(g, V(2.2, 5.6, back), V(11.8, 5.6, back), 18, 0.35, tw);
  } else if (kind === 'valentine') {
    const heartMats = ['#ff2d55', '#ff8fab', '#f4f1ea'].map((c) => flat(c));
    bunting(g, V(-11.8, 5.5, back), V(-6.2, 5.5, back), 8, 0.35, heartMats, 'heart'); bunting(g, V(2.2, 5.5, back), V(11.8, 5.5, back), 12, 0.35, heartMats, 'heart');
    roseBush(g, corner[0], corner[1], 1);
    for (let i = 0; i < 4; i++) B(g, 0.12, 0.22, 0.12, glow('#ffc76a'), fx - 0.75, 2.55, fz - 1.3 + i * 0.85, true);
    for (let i = 0; i < 26; i++) { const m = B(g, 0.14, 0.02, 0.1, flat(i % 2 ? '#ff6f8a' : '#e8344e'), fx - 2.3 + (((i * 37) % 13) / 13 - 0.5) * 1.3, F + 0.02, fz + (((i * 23) % 11) / 11 - 0.5) * 2.1, true); m.rotation.y = i; }
  } else {
    const pastel = PASTEL.map((c) => flat(c));
    bunting(g, V(-11.8, 5.5, back), V(-6.2, 5.5, back), 8, 0.35, pastel, 'flag'); bunting(g, V(2.2, 5.5, back), V(11.8, 5.5, back), 12, 0.35, pastel, 'flag');
    bunny(g, corner[0], corner[1], 0.6, 1.2); tulips(g, corner[0] + 0.9, corner[1] + 0.6, 3, ['#ff6f9a', '#fff1a6', '#c8b6ff']);
    B(g, 0.8, 0.3, 0.6, flat('#c99a3a'), fx - 3.3, F + 0.15, fz + 1.6); for (let i = 0; i < 4; i++) egg(g, fx - 3.55 + (i % 2) * 0.4, F + 0.3, fz + 1.45 + Math.floor(i / 2) * 0.3, 1.1, PASTEL[i], '#ffffff');
  }
  // the lounge (seen from the usual camera): something on the coffee table and along the sofa back
  const Y = F + 0.16, tx = 1.4, tz = 1.7, top = 0.5 + Y;
  if (kind === 'christmas') {
    for (const dx of [-0.45, 0.45]) { B(g, 0.12, 0.3, 0.12, flat('#c62f2f'), tx + dx, top + 0.15, tz, true); B(g, 0.06, 0.1, 0.06, glow('#ffc76a'), tx + dx, top + 0.35, tz, true); }
    for (let i = 0; i < 7; i++) B(g, 0.24, 0.1, 0.24, flat(i % 2 ? '#2f6b34' : '#3f8a3f'), tx - 0.3 + i * 0.1, top + 0.05, tz + (i % 2 ? 0.08 : -0.08), true);
    stringLights(g, V(-0.2, 0.85 + Y, 3.62), V(3.0, 0.85 + Y, 3.62), 10, 0.08, tw);
    present(g, -1.4, 3.3, 0.4, '#c62f2f', '#ffd84a', Y); present(g, -1.0, 3.75, 0.3, '#3f8a3f', '#f4f1ea', Y);
  } else if (kind === 'valentine') {
    B(g, 0.2, 0.3, 0.2, flat('#e8f2ff'), tx, top + 0.15, tz, true); [[-0.08, 0.42, 0], [0.08, 0.46, 0.05], [0, 0.5, -0.06]].forEach(([dx, dy, dz]) => B(g, 0.12, 0.12, 0.12, flat('#d6213f'), tx + dx, top + dy, tz + dz, true));
    pixels(g, HEART, 0.07, flat('#ff6f8a'), tx + 0.62, top + 0.22, tz, 0.05);
    bunting(g, V(-0.2, 1.1 + Y, 3.85), V(3.0, 1.1 + Y, 3.85), 8, 0.15, ['#ff2d55', '#ff8fab', '#f4f1ea'].map((c) => flat(c)), 'heart');
    const big = new THREE.Group(); big.position.set(-1.3, Y, 3.4); g.add(big); pixels(big, HEART, 0.12, flat('#ff2d55'), 0, 0.42, 0, 0.12);
  } else {
    B(g, 0.6, 0.18, 0.4, flat('#c99a3a'), tx, top + 0.09, tz, true); for (let i = 0; i < 4; i++) egg(g, tx - 0.18 + (i % 2) * 0.32, top + 0.12, tz - 0.08 + Math.floor(i / 2) * 0.16, 0.9, PASTEL[i], '#ffffff');
    bunting(g, V(-0.2, 1.1 + Y, 3.85), V(3.0, 1.1 + Y, 3.85), 8, 0.15, PASTEL.map((c) => flat(c)), 'flag');
    bunny(g, -1.3, 3.4, 0.4, 0.9); tulips(g, 3.9, 3.6, 3, ['#ff6f9a', '#fff1a6', '#c8b6ff']);
  }
  bake(g);
  return { update: (time) => tw.update(time, 1) };
}
