// The market stalls. Each is built from boxes in its own local space
// (front faces +z, toward the camera) and then placed from config.js.
// To swap in a real model later, load a .glb in place of the builder for that id.
import * as THREE from 'three';
import { STALLS } from './config.js';
import { createFigure, OUTFITS } from './figures.js';
import { B, M, wool, patterned, glow, flat, glass, emblem, bake } from './textures.js';
import { collide } from './collision.js';
import { addLamp } from './lights.js';
import { drawShow, SHOW_W, SHOW_H } from './show.js';

const WHITE = '#f4f1e6';

/* ── shared parts ── */
function platform(g, w = 5.8, d = 4.2, z = 0.1) { B(g, w, 0.2, d, M.dark, 0, 0.1, z); }
function posts(g, front, back, x = 2.55, z = 1.6) {
  B(g, 0.34, front, 0.34, M.log, -x, front / 2, z); B(g, 0.34, front, 0.34, M.log, x, front / 2, z);
  B(g, 0.34, back, 0.34, M.log, -x, back / 2, -z); B(g, 0.34, back, 0.34, M.log, x, back / 2, -z);
}
// Stepped cloth roof in stripes, with a ragged hanging trim along the front.
function awning(g, mats, o = {}) {
  const n = o.n || 6, w = o.width || 5.7, sw = w / n, y = o.y || 3.15, st = o.step === undefined ? 0.26 : o.step, d = o.depth || 3.9, seg = d / 3;
  for (let i = 0; i < n; i++) {
    const m = mats[i % mats.length], x = -w / 2 + sw * (i + 0.5);
    const zo = o.zoff || 0; // slide the whole roof back or forward
    for (let k = 0; k < 3; k++) B(g, sw, 0.22, seg + 0.03, m, x, y + st * (2 - k), zo - d / 2 + seg * (k + 0.5));
    const fh = i % 2 ? 0.26 : 0.46; B(g, sw, fh, 0.1, o.trim || m, x, y - 0.11 - fh / 2, zo + d / 2 + 0.03);
    if (o.sides && (i === 0 || i === n - 1)) for (let k = 0; k < 3; k++) B(g, 0.1, 0.3, seg, o.trim || m, i ? w / 2 : -w / 2, y + st * (2 - k) - 0.24, zo - d / 2 + seg * (k + 0.5));
  }
}
// Posts of one height at the four corners, for the roofs below.
function evenPosts(g, h, x = 2.55, z = 1.6) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, 0.34, h, 0.34, M.log, sx * x, h / 2, sz * z); }
// A ragged cloth edge hanging under a roof, on the listed sides ('f', 'b', 'l', 'r').
function valance(g, mat, y, w, d, sides = 'f', n = 6) {
  for (const side of sides) {
    const along = side === 'f' || side === 'b', len = along ? w : d, m = along ? n : Math.max(3, Math.round(n * d / w)), sw = len / m;
    for (let i = 0; i < m; i++) {
      const h = i % 2 ? 0.24 : 0.44, t = -len / 2 + sw * (i + 0.5);
      if (along) B(g, sw, h, 0.1, mat, t, y - h / 2, (side === 'f' ? 1 : -1) * (d / 2 + 0.03)); else B(g, 0.1, h, sw, mat, (side === 'r' ? 1 : -1) * (w / 2 + 0.03), y - h / 2, t);
    }
  }
}
// Alacrity: a striped barrel vault with a glowing beacon on the crown.
function archRoof(g, mats, trim, glowColor, y = 3.1) {
  const w = 5.9, n = 6, sw = w / n, rise = [0, 0.32, 0.46, 0.32, 0], seg = 0.82;
  for (let i = 0; i < n; i++) for (let k = 0; k < 5; k++) B(g, sw, 0.22, seg + 0.03, mats[i % mats.length], -w / 2 + sw * (i + 0.5), y + 0.11 + rise[k], (k - 2) * seg);
  for (const sx of [-1, 1]) { B(g, 0.12, 0.34, 2.5, trim, sx * (w / 2 - 0.02), y + 0.17, 0); B(g, 0.12, 0.16, 0.9, trim, sx * (w / 2 - 0.02), y + 0.42, 0); B(g, 0.2, 0.5, 0.2, trim, sx * (w / 2 - 0.1), y + 0.9, 0); }
  B(g, w + 0.1, 0.1, 0.16, trim, 0, y + 0.72, 0);
  valance(g, trim, y, w, seg * 5, 'fb', 8);
  B(g, 0.6, 0.14, 0.6, M.dark, 0, y + 0.82, 0); B(g, 0.36, 0.36, 0.36, glow(glowColor), 0, y + 1.08, 0, true); B(g, 0.56, 0.6, 0.56, glass, 0, y + 1.16, 0, true);
}
// Mingalar: a pitched shingle roof with a ridge beam, a weathervane and a hanging sign.
function gableRoof(g, mats, y = 3.0) {
  const w = 6.1, rows = 4, dz = 0.52;
  for (let k = 0; k < rows; k++) for (const s of [-1, 1]) B(g, w, 0.22, dz + 0.1, mats[k % mats.length], 0, y + 0.11 + k * 0.3, s * (1.92 - k * dz));
  B(g, w + 0.3, 0.26, 0.42, M.dark, 0, y + rows * 0.3 + 0.04, 0);
  for (const s of [-1, 1]) B(g, w + 0.2, 0.12, 0.14, M.dark, 0, y - 0.02, s * 2.2);
  for (const sx of [-1, 1]) for (let k = 0; k < rows; k++) B(g, 0.12, 0.3, Math.max(0.5, (1.92 - k * dz) * 2 - 0.5), M.planks, sx * (w / 2 - 0.2), y + 0.15 + k * 0.3 - 0.22, 0);
  // weathervane
  B(g, 0.08, 0.8, 0.08, M.dark, 1.9, y + rows * 0.3 + 0.55, 0); B(g, 0.7, 0.1, 0.06, flat('#e4b93a'), 1.9, y + rows * 0.3 + 0.9, 0); B(g, 0.16, 0.26, 0.06, flat('#e4b93a'), 2.2, y + rows * 0.3 + 0.9, 0);
  // hanging sign under the front eave
  for (const sx of [-0.6, 0.6]) B(g, 0.06, 0.34, 0.06, M.dark, sx, y - 0.24, 2.22);
  B(g, 1.7, 0.62, 0.1, M.planks, 0, y - 0.7, 2.22); B(g, 1.36, 0.4, 0.04, M.paper, 0, y - 0.7, 2.28);
}
// Urban Simulation: a flat slab roof with a parapet, hazard stripes and a model skyline on top.
function flatRoof(g, heat, y = 3.1) {
  const w = 6, d = 4.3, slate = flat('#3a4250'), orange = wool('#d2542f');
  B(g, w, 0.28, d, slate, 0, y + 0.14, 0);
  for (const s of [-1, 1]) { B(g, w, 0.3, 0.2, orange, 0, y + 0.43, s * (d / 2 - 0.1)); B(g, 0.2, 0.3, d - 0.4, orange, s * (w / 2 - 0.1), y + 0.43, 0); }
  for (let i = 0; i < 8; i++) { B(g, w / 8, 0.3, 0.08, i % 2 ? slate : wool('#e4b93a'), -w / 2 + (w / 8) * (i + 0.5), y - 0.15, d / 2 + 0.02); B(g, 0.08, 0.3, d / 6, i % 2 ? slate : wool('#e4b93a'), -w / 2 - 0.02, y - 0.15, -d / 2 + (d / 6) * (i % 6 + 0.5)); }
  [[-1.9, -0.9, 0.5, 1], [-1.2, -0.2, 0.9, 3], [-0.4, -0.7, 1.5, 5], [0.4, 0.1, 1.1, 4], [1.1, -0.9, 0.7, 2], [1.8, 0.3, 0.45, 1], [-0.6, 0.9, 0.6, 2], [0.5, 1.0, 0.35, 0]].forEach(([x, z, h, k]) => { B(g, 0.5, h, 0.5, flat(heat[k]), x, y + 0.28 + h / 2, z); B(g, 0.3, 0.08, 0.3, glow(heat[k]), x, y + 0.32 + h, z, true); });
  B(g, 0.08, 1.5, 0.08, M.dark, 2.2, y + 1.03, -1.3); B(g, 0.16, 0.16, 0.16, glow('#ff5a4a'), 2.2, y + 1.85, -1.3, true); B(g, 0.5, 0.06, 0.06, M.dark, 2.2, y + 1.4, -1.3);
}
// Contact Me: a pointed tent in rings of two colours, with a pennant on the tip.
function tentRoof(g, mats, trim, y = 3.0) {
  for (let k = 0; k < 5; k++) B(g, 6.3 - k * 1.3, 0.36, 4.5 - k * 0.92, mats[k % 2], 0, y + 0.18 + k * 0.36, 0);
  valance(g, trim, y, 6.3, 4.5, 'fblr', 6);
  B(g, 0.12, 1.1, 0.12, M.dark, 0, y + 2.3, 0); B(g, 0.26, 0.26, 0.26, flat('#e4b93a'), 0, y + 2.95, 0); B(g, 0.8, 0.36, 0.05, mats[0], 0.46, y + 2.55, 0); B(g, 0.3, 0.2, 0.05, mats[0], 1.0, y + 2.55, 0);
}
export function crate(g, x, z, s = 1, y = 0.2) { B(g, s, s, s, M.crate, x, y + s / 2, z); }
function barrel(g, x, z) { B(g, 0.8, 1, 0.8, M.dark, x, 0.7, z); B(g, 0.86, 0.1, 0.86, flat('#3a2a1a'), x, 0.45, z); B(g, 0.86, 0.1, 0.86, flat('#3a2a1a'), x, 0.95, z); B(g, 0.7, 0.04, 0.7, M.planks, x, 1.22, z); }
function chest(g, x, z, body, lid) { B(g, 0.95, 0.5, 0.65, flat(body), x, 0.45, z); B(g, 1, 0.24, 0.7, flat(lid), x, 0.82, z); B(g, 0.14, 0.2, 0.06, flat('#e4b93a'), x, 0.68, z + 0.36); }
function lantern(g, x, z, h = 2.4) {
  B(g, 0.25, h, 0.25, M.log, x, h / 2, z); B(g, 0.44, 0.44, 0.44, glow('#ffc76a'), x, h + 0.2, z, true); B(g, 0.58, 0.1, 0.58, M.dark, x, h + 0.47, z);
  return addLamp(g, x, h + 0.2, z + 0.45, 0.6, 1.5, 8);
}
export function banner(g, x, y, z, w, h, color, mark) {
  B(g, w + 0.16, 0.1, 0.1, M.dark, x, y + h / 2 + 0.05, z);
  B(g, w, h, 0.06, wool(color), x, y, z);
  B(g, w / 3, 0.18, 0.06, wool(color), x - w / 3, y - h / 2 - 0.09, z); B(g, w / 3, 0.18, 0.06, wool(color), x + w / 3, y - h / 2 - 0.09, z);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, w * 0.86 * (16 / 12)), emblem(mark)); p.position.set(x, y, z + 0.035); g.add(p);
}
function fenceRun(g, x0, x1, z) { for (let x = x0; x <= x1 + 0.01; x += 1) { B(g, 0.2, 1.1, 0.2, M.dark, x, 0.75, z); if (x < x1) { B(g, 1, 0.13, 0.1, M.planks, x + 0.5, 0.65, z); B(g, 1, 0.13, 0.1, M.planks, x + 0.5, 1.05, z); } } }
export function showcase(g, x, y, z, color, s = 0.34) { B(g, s + 0.2, 0.12, s + 0.2, M.dark, x, y + 0.06, z); B(g, s, s, s, glow(color), x, y + 0.14 + s / 2, z, true); B(g, s + 0.24, s + 0.3, s + 0.24, glass, x, y + 0.12 + (s + 0.3) / 2, z, true); }
export function papers(g, x, y, z, n, w = 0.7, d = 0.9) { for (let k = 0; k < n; k++) B(g, w, 0.1, d, k === n - 1 ? M.paper : wool(k % 2 ? '#e4e0d2' : '#f6f3e8'), x + (k % 2 ? 0.03 : -0.02), y + 0.05 + k * 0.1, z); }
function counter(g, mat, cloth) { B(g, 4.7, 1, 1, mat, 0, 0.7, 1.2); if (cloth) B(g, 4.9, 0.1, 1.14, wool(cloth), 0, 1.25, 1.2); }

/* ── one builder per stall ── */
const BUILD = {
  // Blue patterned awning, glass cases with glowing cubes, a humming machine.
  alacrity(g, s, col) {
    const blue = patterned('#4f8df0'), deep = '#234a9e';
    platform(g); evenPosts(g, 3.1);
    archRoof(g, [blue, wool(WHITE)], wool(WHITE), s.glow);
    counter(g, M.planks, WHITE); B(g, 4.9, 0.42, 0.06, wool(s.color), 0, 1.0, 1.78);
    banner(g, 0, 0.72, 1.84, 0.8, 0.9, deep, 'crest');
    B(g, 4.9, 2.7, 0.12, wool(deep), 0, 1.75, -1.72); B(g, 1.3, 1.7, 0.06, glow('#3aa7ff'), -1.3, 1.9, -1.64, true);
    B(g, 0.1, 2.3, 1.5, blue, -2.55, 1.9, -0.9);
    B(g, 4.5, 1.3, 0.7, M.dark, 0, 0.85, -1.25);
    showcase(g, 0.5, 1.5, -1.25, s.glow, 0.6); showcase(g, 1.7, 1.5, -1.25, '#b68cff', 0.36);
    [[-1.75, s.glow], [-0.6, '#ff9a5c'], [0.6, s.glow], [1.75, '#b68cff']].forEach(([x, c]) => showcase(g, x, 1.3, 1.2, c));
    B(g, 1, 1, 1, flat('#26262e'), 3.45, 0.7, 0.95); B(g, 0.62, 0.46, 0.04, glow('#49e06a'), 3.45, 0.8, 1.47, true); B(g, 0.14, 0.14, 0.04, glow('#ff5a4a'), 3.75, 0.42, 1.47, true);
    showcase(g, 3.45, 1.2, 0.95, '#b68cff', 0.3);
    chest(g, -3.4, 1.1, '#cfcfcf', '#e6e6e6'); crate(g, -3.45, -0.3);
    fenceRun(g, -4, 4, -2.3);
    s.lamp = lantern(g, -3.5, 2.3);
    col(2.9, 4, 0.4, 1.5, 1.2); col(-3.95, -2.9, -0.85, 1.5, 1.2); col(-3.7, -3.3, 2.1, 2.5, 3.2);
  },
  // Dark green canopy, stacked newspapers, a printing press and a notice board.
  mingalar(g, s, col) {
    platform(g); evenPosts(g, 3.0);
    gableRoof(g, [wool('#2f6b35'), wool('#3d8244')]);
    counter(g, M.planks); B(g, 4.9, 0.08, 1.14, M.dark, 0, 1.24, 1.2);
    papers(g, -1.7, 1.28, 1.2, 4); papers(g, -0.75, 1.28, 1.2, 2);
    B(g, 1.3, 0.3, 0.85, flat('#2b2b2f'), 0.7, 1.43, 1.2); B(g, 1, 0.5, 0.45, flat('#3a3a40'), 0.7, 1.83, 1.02); B(g, 1.1, 0.16, 0.16, wool('#d8d0bc'), 0.7, 1.68, 1.48); B(g, 0.08, 0.5, 0.08, flat('#8a8a8a'), 1.25, 2.1, 1.02); B(g, 0.2, 0.12, 0.12, flat('#c23b32'), 1.25, 2.38, 1.02);
    B(g, 0.55, 0.6, 0.5, flat('#b89a7a'), 1.85, 1.58, 1.15);
    B(g, 4.5, 1.6, 0.7, M.dark, 0, 1, -1.3); papers(g, -1.4, 1.8, -1.3, 3); papers(g, 0, 1.8, -1.3, 5); papers(g, 1.4, 1.8, -1.3, 2);
    crate(g, -3.45, 1.1); papers(g, -3.45, 1.2, 1.1, 3, 0.7, 0.8); crate(g, 3.4, 0.2); crate(g, 3.3, 0.25, 0.7, 1.2);
    // notice board
    B(g, 0.18, 2, 0.18, M.log, 3.2, 1.2, 2.2); B(g, 0.18, 2, 0.18, M.log, 4.8, 1.2, 2.2); B(g, 1.9, 1.3, 0.12, M.planks, 4, 1.55, 2.2);
    B(g, 0.6, 0.8, 0.04, M.paper, 3.55, 1.6, 2.28); B(g, 0.5, 0.5, 0.04, wool('#f6f3e8'), 4.3, 1.8, 2.28); B(g, 0.5, 0.35, 0.04, wool('#efe2bd'), 4.35, 1.25, 2.28);
    banner(g, -1.9, 2.25, 2.02, 0.8, 1.1, '#2f6b35', 'news');
    s.lamp = lantern(g, -3.5, 2.3);
    col(-3.95, -2.95, 0.6, 1.6, 1.2); col(2.9, 3.9, -0.3, 0.7, 1.2); col(3.1, 4.9, 2.05, 2.35, 2.3); col(-3.7, -3.3, 2.1, 2.5, 3.2);
  },
  // Open timber frame, a drafting table with blueprints, benches and hanging banners.
  urban(g, s, col) {
    platform(g, 6, 4.4); posts(g, 3.4, 3.4);
    B(g, 5.9, 0.26, 0.26, M.dark, 0, 3.5, 1.6); B(g, 5.9, 0.26, 0.26, M.dark, 0, 3.5, -1.6);
    for (let x = -2.4; x <= 2.41; x += 1.2) B(g, 0.18, 0.2, 4, M.dark, x, 3.72, 0);
    B(g, 4.2, 0.2, 1.8, M.planks, 0, 1.2, 0.2); [[-1.9, -0.5], [1.9, -0.5], [-1.9, 0.9], [1.9, 0.9]].forEach(([x, z]) => B(g, 0.24, 0.9, 0.24, M.dark, x, 0.65, z));
    B(g, 2.4, 0.05, 1.4, M.blueprint, -0.6, 1.33, 0.2);
    [[-1.2, 0.5, 0.3], [-0.8, 0.8, 0.5], [-0.3, 0.45, -0.1], [-0.6, 0.3, 0.6]].forEach(([x, h, z], i) => B(g, 0.26, h, 0.26, flat(i % 2 ? '#c5ccd8' : '#98a2b3'), x, 1.36 + h / 2, z));
    for (let i = 0; i < 3; i++) B(g, 0.2, 0.2, 1.2, wool('#f3ead2'), 1.05 + i * 0.26, 1.4, 0.3);
    B(g, 0.5, 0.12, 0.7, flat('#a33b2e'), 1.75, 1.36, -0.35); B(g, 0.46, 0.1, 0.66, flat('#2f66c4'), 1.77, 1.47, -0.35);
    B(g, 0.14, 0.14, 0.14, glow(s.glow), 0.4, 1.4, 0.75, true);
    B(g, 3.4, 0.18, 0.6, M.planks, 0, 0.72, 1.85); B(g, 0.2, 0.5, 0.5, M.dark, -1.4, 0.45, 1.85); B(g, 0.2, 0.5, 0.5, M.dark, 1.4, 0.45, 1.85);
    B(g, 3.2, 1.7, 0.55, M.books, 0, 1.05, -1.75); B(g, 3.4, 0.12, 0.7, M.dark, 0, 1.95, -1.75);
    for (let i = 0; i < 3; i++) B(g, 0.2, 0.2, 0.9, wool('#f3ead2'), -1 + i * 0.3, 2.1, -1.75);
    chest(g, -3.5, 1.4, '#a8322a', '#c2473a'); barrel(g, 3.5, -0.5); crate(g, 3.45, 0.75, 0.8);
    banner(g, -2.0, 2.55, 1.78, 0.9, 1.3, '#d9bf86', 'grid'); banner(g, 2.0, 2.55, 1.78, 0.9, 1.3, '#27536b', 'house');
    s.lamp = lantern(g, 3.55, 2.3, 2.2);
    col(-4, -3, 1.05, 1.75, 1.1); col(3.05, 3.95, -0.95, 1.2, 1.3); col(3.35, 3.75, 2.1, 2.5, 3);
  },
  // Magenta striped tent, a writing desk with letters, and a mailbox.
  contact(g, s, col) {
    platform(g); evenPosts(g, 3.0);
    tentRoof(g, [wool('#c04bd6'), wool('#7a3fb4')], wool('#5a2f86'));
    B(g, 4.9, 0.05, 3.2, wool('#5a2f86'), 0, 0.23, 0);
    B(g, 4.6, 0.2, 1.3, M.planks, 0, 1.2, 1.0); [[-2.1, 0.5], [2.1, 0.5], [-2.1, 1.5], [2.1, 1.5]].forEach(([x, z]) => B(g, 0.24, 0.9, 0.24, M.dark, x, 0.65, z));
    [[-1.6, 0.9, 0.2], [-0.8, 1.2, -0.15], [0.9, 1.1, 0.1]].forEach(([x, z, ry]) => { const l = B(g, 0.7, 0.06, 0.48, wool('#fbfaf4'), x, 1.33, z); l.rotation.y = ry; const w = B(g, 0.12, 0.08, 0.12, flat('#c23b32'), x, 1.36, z); w.rotation.y = ry; });
    B(g, 0.2, 0.2, 1, wool('#f3ead2'), 0.1, 1.4, 1.0); B(g, 0.22, 0.26, 0.22, wool('#fbfaf4'), 1.7, 1.43, 1.3); B(g, 0.2, 0.18, 0.2, flat('#2b2b33'), 1.3, 1.39, 0.75); B(g, 0.05, 0.4, 0.05, wool('#fbfaf4'), 1.3, 1.6, 0.75);
    B(g, 4.5, 1.2, 0.6, M.dark, 0, 0.8, -1.4); B(g, 0.34, 0.34, 0.34, glow(s.glow), -1.2, 1.57, -1.4, true); papers(g, 0.8, 1.4, -1.4, 3, 0.6, 0.45);
    // mailbox cabinet
    crate(g, -3.5, 1.0); B(g, 0.95, 0.9, 0.75, M.dark, -3.5, 1.65, 1.0); B(g, 0.7, 0.55, 0.05, wool('#efe2bd'), -3.5, 1.7, 1.4); B(g, 0.4, 0.07, 0.06, flat('#2b2b33'), -3.5, 1.82, 1.43); B(g, 0.1, 0.5, 0.1, flat('#d33b32'), -2.96, 2.2, 0.8);
    crate(g, -3.4, -0.2, 0.75);
    banner(g, 1.95, 2.2, 2.02, 0.85, 1.2, '#6a2f9c', 'mail');
    fenceRun(g, -4, 4, -2.3); for (let z = -1.3; z < 1; z += 1) { B(g, 0.2, 1.1, 0.2, M.dark, 4, 0.75, z); B(g, 0.1, 0.13, 1, M.planks, 4, 0.65, z - 0.5); B(g, 0.1, 0.13, 1, M.planks, 4, 1.05, z - 0.5); }
    s.lamp = lantern(g, 3.5, 2.3);
    col(-4, -3, -0.6, 1.5, 1.4); col(3.9, 4.1, -2.3, 0.8, 1.3); col(3.3, 3.7, 2.1, 2.5, 3.2);
  },
  // Orange and slate tent with a glowing heat-map board and a small model city.
  urbansim(g, s, col) {
    platform(g); evenPosts(g, 3.1);
    flatRoof(g, ['#2b6fd0', '#2fa0a8', '#57d47c', '#e4d23a', '#f08a2a', '#d8403a']);
    counter(g, M.dark, '#3a4250');
    B(g, 4.6, 2.7, 0.16, flat('#1b2030'), 0, 1.95, -1.68); B(g, 4.8, 0.14, 0.24, M.planks, 0, 3.32, -1.66); B(g, 4.8, 0.14, 0.24, M.planks, 0, 0.62, -1.66);
    const heat = ['#2b6fd0', '#2fa0a8', '#57d47c', '#e4d23a', '#f08a2a', '#d8403a'];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) {
      const d = Math.hypot(i - 4.6, j - 1.8), k = Math.max(0, Math.min(5, Math.round(5 - d * 1.2 + (((i * 7 + j * 3) % 3) - 1) * 0.6)));
      B(g, 0.46, 0.42, 0.06, glow(heat[k]), -1.75 + i * 0.5, 0.98 + j * 0.47, -1.57, true);
    }
    // a second, smaller board on the side that faces the camera when the stall points east
    B(g, 0.14, 2.3, 2.9, flat('#1b2030'), -2.62, 1.75, 0);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const d = Math.hypot(i - 2.6, j - 1.4), k = Math.max(0, Math.min(5, Math.round(5 - d * 1.5 + (((i * 5 + j * 3) % 3) - 1) * 0.6))); B(g, 0.06, 0.44, 0.46, glow(heat[k]), -2.71, 0.95 + j * 0.5, -1.05 + i * 0.52, true); }
    // model city on the counter, coloured by the same scale
    [[-1.7, 0.3, 1], [-1.35, 0.55, 3], [-1.0, 0.85, 5], [-0.65, 0.6, 4], [-1.35, 0.35, 2], [-1.0, 0.4, 2]].forEach(([x, h, k], i) => B(g, 0.28, h, 0.28, flat(heat[k]), x, 1.3 + h / 2, i > 3 ? 1.45 : 1.05));
    B(g, 1.3, 0.05, 0.9, M.blueprint, 0.6, 1.33, 1.2); B(g, 0.2, 0.2, 0.9, wool('#f3ead2'), 1.6, 1.4, 1.2);
    [0.14, 0.26, 0.2].forEach((h, i) => B(g, 0.2, h, 0.2, flat('#e4b93a'), 0.3 + i * 0.26, 1.36 + h / 2, 1.42));
    chest(g, -3.5, 1.1, '#3a4250', '#566074'); crate(g, 3.45, 0.8); crate(g, 3.4, -0.3, 0.75);
    banner(g, -1.95, 2.2, 2.02, 0.8, 1.1, '#d2542f', 'grid');
    s.lamp = lantern(g, 3.5, 2.3);
    col(-4, -3, 0.75, 1.45, 1.1); col(2.9, 4, -0.7, 1.35, 1.2); col(3.3, 3.7, 2.1, 2.5, 3.2);
  },
  // Pink tent with a clothes rail, a mirror and four mannequins wearing outfits you can pick.
  outfits(g, s, col) {
    // the roof only covers the clothes rail at the back, so the mannequins stand in the open
    platform(g, 6.4, 4.4);
    [[-2.85, 0.35, 3.05], [2.85, 0.35, 3.05], [-2.85, -1.85, 3.6], [2.85, -1.85, 3.6]].forEach(([x, z, h]) => B(g, 0.34, h, 0.34, M.log, x, h / 2, z));
    awning(g, [wool('#c2317a'), wool('#8f2468')], { trim: wool('#e4b93a'), sides: true, width: 6.3, depth: 2.5, zoff: -0.85 });
    B(g, 5.6, 0.05, 2.4, M.carpet, 0, 0.23, 0.9); B(g, 5.8, 0.04, 0.12, flat('#d9a93a'), 0, 0.24, 2.12);
    B(g, 5.5, 2.5, 0.2, M.dark, 0, 1.45, -1.75); B(g, 5.2, 0.08, 0.08, flat('#d9a93a'), 0, 2.45, -1.45);
    ['#2f66c4', '#e9e2cf', '#3d7d40', '#a3342e', '#7a4fc2', '#c98a2b', '#2a2a33'].forEach((c, i) => B(g, 0.5, 1.15, 0.12, wool(c), -2.1 + i * 0.7, 1.82, -1.45));
    ['knight', 'farmer', 'performer', 'mage'].forEach((id, i) => {
      const x = -1.95 + i * 1.3; B(g, 0.8, 0.3, 0.8, M.planks, x, 0.35, 1.05);
      const f = createFigure(OUTFITS.find((o) => o.id === id)); f.group.scale.setScalar(0.82); f.group.position.set(x, 0.5, 1.05); f.pose(0, 0, i);
      f.group.traverse((o) => { if (o.isMesh) o.castShadow = true; }); f.group.userData.keep = true; g.add(f.group);
    });
    // standing mirror
    B(g, 1, 2.1, 0.14, M.planks, -3.55, 1.25, 1.1); B(g, 0.76, 1.8, 0.05, flat('#bfe6f5'), -3.55, 1.27, 1.19); B(g, 0.2, 0.3, 0.5, M.dark, -3.55, 0.3, 1.0);
    chest(g, 3.5, 1.1, '#8f2468', '#c2317a'); crate(g, 3.5, -0.2, 0.8);
    banner(g, -2.2, 2.2, 0.56, 0.8, 1.1, '#8f2468', 'hanger'); banner(g, 2.2, 2.2, 0.56, 0.8, 1.1, '#8f2468', 'hanger');
    s.lamp = lantern(g, 3.7, 2.3);
    col(-4.1, -3, 0.7, 1.4, 2.2); col(3, 4, -0.6, 1.5, 1.2); col(3.5, 3.9, 2.1, 2.5, 3.2);
  },
  // A little open-air cinema: a marquee of running bulbs, red velvet curtains round a glowing
  // screen, rows of red seats, a projector throwing its beam, and a popcorn cart.
  cinema(g, s, col) {
    const red = wool('#9a1f2a'), redDark = wool('#6e121c'), gold = flat('#d9a93a'), black = flat('#1a1416');
    platform(g, 6.2, 4.4); B(g, 5.8, 0.05, 4.0, M.carpet, 0, 0.23, 0.1);
    evenPosts(g, 3.2, 2.85, 1.7);
    // a short stepped roof over the screen only, so you can see in from above; the marquee stands at the front
    B(g, 6.3, 0.24, 1.5, red, 0, 3.42, -1.45); B(g, 6.1, 0.24, 1.0, redDark, 0, 3.66, -1.65); B(g, 6.4, 0.1, 1.6, gold, 0, 3.28, -1.4);
    B(g, 6.4, 0.12, 0.12, gold, 0, 3.55, -0.68);
    // the screen at the back, framed in black, playing the showing (see show.js)
    B(g, 5.2, 2.9, 0.2, black, 0, 1.75, -1.9);
    const sc = document.createElement('canvas'); sc.width = SHOW_W; sc.height = SHOW_H; const x = sc.getContext('2d');
    drawShow(x, 1.6);
    const tex = new THREE.CanvasTexture(sc); tex.encoding = THREE.sRGBEncoding; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: tex })); screen.position.set(0, 1.85, -1.78); screen.userData.keep = true; g.add(screen);
    // velvet curtains, gathered at each side of the screen, and a swag along the top
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) B(g, 0.2, 2.9, 0.22, k % 2 ? redDark : red, sx * (2.5 - k * 0.18), 1.7, -1.62 + k * 0.03);
    for (let i = 0; i < 12; i++) B(g, 0.44, 0.34 + (i % 2) * 0.12, 0.22, i % 2 ? redDark : red, -2.42 + i * 0.44, 3.0 - (i % 2) * 0.06, -1.58);
    for (const sx of [-1, 1]) B(g, 0.12, 0.12, 0.3, gold, sx * 2.3, 1.2, -1.45);
    // two rows of red seats facing the screen
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const sx = -1.65 + i * 1.1, sz = -0.35 + r * 1.0; B(g, 0.8, 0.22, 0.6, red, sx, 0.55, sz); B(g, 0.8, 0.7, 0.16, red, sx, 0.85, sz + 0.28); B(g, 0.1, 0.5, 0.6, black, sx - 0.43, 0.5, sz); B(g, 0.1, 0.5, 0.6, black, sx + 0.43, 0.5, sz); }
    // the projector on a stand at the front, and its beam
    B(g, 0.2, 1.1, 0.2, black, 0, 0.75, 1.55); B(g, 0.7, 0.46, 0.8, flat('#2b2b33'), 0, 1.5, 1.55); B(g, 0.3, 0.3, 0.3, flat('#3a3a44'), 0, 1.52, 1.05);
    for (const dz of [-0.2, 0.25]) { B(g, 0.08, 0.56, 0.56, black, 0, 2.0, 1.55 + dz); B(g, 0.1, 0.18, 0.18, gold, 0, 2.0, 1.55 + dz); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.12, 3.0, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.rotation.x = Math.PI / 2; beam.rotation.y = Math.PI / 4; beam.position.set(0, 1.7, -0.4); beam.userData.keep = true; g.add(beam);
    // the marquee over the front, with its name in lights and a frame of running bulbs
    B(g, 4.6, 1.0, 0.3, red, 0, 3.75, 1.95); B(g, 4.8, 0.1, 0.36, gold, 0, 4.28, 1.95); B(g, 4.8, 0.1, 0.36, gold, 0, 3.22, 1.95);
    const mc = document.createElement('canvas'); mc.width = 512; mc.height = 96; const mx = mc.getContext('2d');
    const paint = () => { mx.fillStyle = '#7a141e'; mx.fillRect(0, 0, 512, 96); mx.font = '700 60px "Pixelify Sans","Courier New",monospace'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillStyle = '#3a0a10'; mx.fillText('AI CINEMA', 260, 54); mx.fillStyle = '#ffe6a0'; mx.fillText('AI CINEMA', 256, 50); mt.needsUpdate = true; };
    const mt = new THREE.CanvasTexture(mc); mt.encoding = THREE.sRGBEncoding; paint();
    if (document.fonts && document.fonts.load) document.fonts.load('700 40px "Pixelify Sans"').then(paint).catch(() => {});
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 0.73), new THREE.MeshBasicMaterial({ map: mt })); sign.position.set(0, 3.75, 2.11); sign.userData.keep = true; g.add(sign);
    // two sets of bulbs that take turns, so the lights seem to run round the sign
    const bulbA = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').convertSRGBToLinear() }), bulbB = bulbA.clone();
    let k = 0; const bulb = (bx, by) => { const m = B(g, 0.11, 0.11, 0.06, k++ % 2 ? bulbB : bulbA, bx, by, 2.12, true); m.userData.keep = true; };
    for (let i = 0; i <= 14; i++) { bulb(-2.2 + i * (4.4 / 14), 4.15); bulb(-2.2 + i * (4.4 / 14), 3.35); }
    for (const bx of [-2.2, 2.2]) bulb(bx, 3.75);
    // film reels either side of the marquee
    for (const sx of [-1, 1]) { const reel = new THREE.Group(); reel.position.set(sx * 2.75, 3.85, 1.95); g.add(reel);
      for (let a = 0; a < 3; a++) { const r = B(reel, 0.62, 0.62, 0.1, black, 0, 0, 0); r.rotation.z = a * Math.PI / 6; }
      for (let h = 0; h < 4; h++) { const a = h * Math.PI / 2; B(reel, 0.13, 0.13, 0.12, flat('#5a5a66'), Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.01); }
      B(reel, 0.1, 0.1, 0.14, gold, 0, 0, 0.01); }
    // a popcorn cart
    B(g, 0.9, 0.8, 0.7, wool('#f4f1e6'), 3.55, 0.6, 1.2); for (let i = 0; i < 3; i++) B(g, 0.18, 0.8, 0.72, red, 3.25 + i * 0.3, 0.6, 1.2);
    B(g, 0.8, 0.6, 0.6, glass, 3.55, 1.32, 1.2, true); B(g, 0.66, 0.3, 0.46, flat('#ffe08a'), 3.55, 1.17, 1.2); B(g, 1, 0.12, 0.8, red, 3.55, 1.68, 1.2);
    for (const [px, pz] of [[3.2, 0.9], [3.9, 1.5]]) B(g, 0.14, 0.14, 0.14, black, px, 0.25, pz);
    chest(g, -3.5, 1.2, '#6e121c', '#9a1f2a'); crate(g, -3.45, -0.2, 0.8);
    banner(g, -2.6, 2.3, 2.05, 0.7, 1.0, '#9a1f2a', 'crest');
    s.lamp = lantern(g, 3.6, 2.6);
    col(3.05, 4.05, 0.8, 1.6, 1.8); col(-4, -3, -0.6, 1.6, 1.3); col(3.4, 3.8, 2.4, 2.8, 3.2);
    // the running lights
    const BULB = bulbA.color.clone(); let was = -1;
    // the screen plays only while the cinema is near the middle of the view, at up to 30 frames a second
    let shown = -1;
    s.update = (time, focus) => {
      const near = !focus || Math.hypot(focus.x - s.pos[0], focus.z - s.pos[1]) < 24;
      if (near && time - shown > 1 / 30) { shown = time; drawShow(x, time); tex.needsUpdate = true; }
      const on = Math.floor(time * 3.5) % 2; if (on === was) return; was = on; bulbA.color.copy(BULB).multiplyScalar(on ? 1 : 0.3); bulbB.color.copy(BULB).multiplyScalar(on ? 0.3 : 1);
    };
  },
};

// The About Me signpost: two posts, a carved board, a little roof and a lantern.
function signText(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height, q = (n) => { let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const r = q(7);
  for (let j = 0; j < H; j += 8) for (let i = 0; i < W; i += 8) { x.fillStyle = ['#b98552', '#b3804e', '#be8a57', '#ad7a49'][r() * 4 | 0]; x.fillRect(i, j, 8, 8); }
  for (let j = 0; j < H; j += 40) { x.fillStyle = '#8f5f33'; x.fillRect(0, j, W, 3); }
  x.strokeStyle = '#5b3a1e'; x.lineWidth = 8; x.strokeRect(12, 12, W - 24, H - 24);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const text = (s, px, y, col, sh) => { x.font = '700 ' + px + 'px "Pixelify Sans","Courier New",monospace'; x.fillStyle = sh; x.fillText(s, W / 2 + 3, y + 3); x.fillStyle = col; x.fillText(s, W / 2, y); };
  text('ABOUT ME', 78, H * 0.4, '#3a2413', '#d9a56a');
  text('TUN PYAY SONE LIN', 34, H * 0.75, '#5b3a1e', '#d9a56a');
}
BUILD.about = (g, s, col) => {
  B(g, 3.1, 0.18, 0.9, M.stone, 0, 0.09, 0);
  for (const sx of [-1, 1]) { B(g, 0.26, 3.0, 0.26, M.log, sx * 1.25, 1.5, 0); B(g, 0.4, 0.22, 0.4, M.dark, sx * 1.25, 0.28, 0); }
  B(g, 2.9, 1.56, 0.2, M.dark, 0, 2.0, 0.02);
  const c = document.createElement('canvas'); c.width = 520; c.height = 260;
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
  const paint = () => { signText(c); tex.needsUpdate = true; }; paint();
  if (document.fonts && document.fonts.load) document.fonts.load('700 40px "Pixelify Sans"').then(paint).catch(() => {});
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.66, 1.33), new THREE.MeshLambertMaterial({ map: tex }));
  face.position.set(0, 2.0, 0.13); face.receiveShadow = true; face.userData.keep = true; g.add(face);
  // a small stepped roof over the board
  B(g, 3.3, 0.14, 0.62, M.planks, 0, 2.9, 0.04); B(g, 2.7, 0.14, 0.44, M.planks, 0, 3.04, 0.04); B(g, 3.4, 0.08, 0.08, flat('#d9a93a'), 0, 2.84, 0.36);
  // lantern on an arm to the right
  B(g, 0.9, 0.1, 0.1, M.dark, 1.75, 2.6, 0.1); B(g, 0.05, 0.22, 0.05, M.dark, 2.1, 2.44, 0.1, true);
  B(g, 0.26, 0.3, 0.26, glow('#ffc76a'), 2.1, 2.2, 0.1, true); B(g, 0.34, 0.07, 0.34, M.dark, 2.1, 2.38, 0.1, true);
  addLamp(g, 2.1, 2.1, 0.5, 0, 1.4, 7, '#ffc27a'); addLamp(g, 0, 1.8, 1.6, 0, 1.0, 6, '#ffc27a');
  // planters with flowers either side
  for (const sx of [-1, 1]) {
    B(g, 0.7, 0.4, 0.5, M.planks, sx * 1.95, 0.2, 0.25); B(g, 0.6, 0.06, 0.4, flat('#5a3a1f'), sx * 1.95, 0.41, 0.25);
    ['#e9627a', '#ffd84a', '#f1efe6'].forEach((fc, i) => { const fx = sx * 1.95 + (i - 1) * 0.18; B(g, 0.05, 0.2, 0.05, flat('#3d7d40'), fx, 0.52, 0.25, true); B(g, 0.14, 0.12, 0.14, flat(fc), fx, 0.66, 0.25, true); });
  }
  col(-2.8, 2.8, -0.55, 0.6, 0.5); // (the signpost is drawn 1.2x, see buildStalls)
};

const TURN = { south: 0, east: Math.PI / 2, west: -Math.PI / 2 };

export function buildStalls(scene) {
  return STALLS.map((p) => {
    const s = Object.assign({}, p), g = new THREE.Group(), th = TURN[p.face || 'south'], sn = Math.sin(th), cs = Math.cos(th);
    // stall-local (x, z) to map coordinates, for whichever way the stall faces
    const sc = p.scale || 1, world = (lx, lz) => [p.pos[0] + (lx * cs + lz * sn) * sc, p.pos[1] + (-lx * sn + lz * cs) * sc];
    const box = (x0, x1, z0, z1) => { const a = world(x0, z0), b = world(x1, z1); return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]) }; };
    const col = (x0, x1, z0, z1, h) => { const r = box(x0, x1, z0, z1); collide(r.x0, r.x1, r.z0, r.z1, h * sc + 0.1); };
    g.position.set(p.pos[0], 0.1, p.pos[1]); g.rotation.y = th; g.scale.setScalar(sc); g.userData.id = p.id;
    BUILD[p.id](g, s, col);
    if (p.about) { g.scale.setScalar(1.2); s.rect = box(-1.8, 1.8, -0.5, 0.6); collide(s.rect.x0, s.rect.x1, s.rect.z0, s.rect.z1, 3.2); s.front = world(0, 2.3); bake(g); scene.add(g); s.group = g; return s; }
    // night lighting: a lantern hung on each front post, a pool of light in front, and a glow over and behind the stall
    for (const sx of [-1, 1]) { B(g, 0.06, 0.3, 0.06, M.dark, sx * 2.55, 2.5, 1.95, true); B(g, 0.26, 0.3, 0.26, glow('#ffc76a'), sx * 2.55, 2.22, 1.95, true); B(g, 0.34, 0.07, 0.34, M.dark, sx * 2.55, 2.4, 1.95, true); }
    addLamp(g, 0, 2.3, 1.7, 0, 2.0, 9, '#ffc27a'); addLamp(g, 0, 1.7, 4.6, 0, 1.3, 9, '#ffc27a'); addLamp(g, 0, 5.2, -0.6, 0, 1.2, 11, '#ffd9a0');
    addLamp(g, -4.6, 1.8, 0, 0, 0.9, 8, '#ffc27a'); addLamp(g, 4.6, 1.8, 0, 0, 0.9, 8, '#ffc27a');
    // main footprint: blocks walking through, and is what "near the stall" is measured from
    const hw = p.id === 'outfits' ? 3.15 : 2.85;
    s.rect = box(-hw, hw, -2.05, 2.2);
    collide(s.rect.x0, s.rect.x1, s.rect.z0, s.rect.z1, 6);
    if (p.id === 'alacrity' || p.id === 'contact') col(-4.1, 4.1, -2.4, -2.2, 1.3);
    s.front = world(0, 3.3); // where the walk-to feature stands the player
    bake(g);
    scene.add(g); s.group = g; return s;
  });
}
