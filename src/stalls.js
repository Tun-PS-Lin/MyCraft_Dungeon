// The four market stalls. Each is built from boxes in its own local space
// (front faces +z, toward the camera) and then placed from config.js.
// To swap in a real model later, load a .glb in place of the builder for that id.
import * as THREE from 'three';
import { PROJECTS } from './config.js';
import { B, M, wool, patterned, glow, flat, glass, emblem } from './textures.js';
import { collide } from './collision.js';

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
    for (let k = 0; k < 3; k++) B(g, sw, 0.22, seg + 0.03, m, x, y + st * (2 - k), -d / 2 + seg * (k + 0.5));
    const fh = i % 2 ? 0.26 : 0.46; B(g, sw, fh, 0.1, o.trim || m, x, y - 0.11 - fh / 2, d / 2 + 0.03);
    if (o.sides && (i === 0 || i === n - 1)) for (let k = 0; k < 3; k++) B(g, 0.1, 0.3, seg, o.trim || m, i ? w / 2 : -w / 2, y + st * (2 - k) - 0.24, -d / 2 + seg * (k + 0.5));
  }
}
function crate(g, x, z, s = 1, y = 0.2) { B(g, s, s, s, M.crate, x, y + s / 2, z); }
function barrel(g, x, z) { B(g, 0.8, 1, 0.8, M.dark, x, 0.7, z); B(g, 0.86, 0.1, 0.86, flat('#3a2a1a'), x, 0.45, z); B(g, 0.86, 0.1, 0.86, flat('#3a2a1a'), x, 0.95, z); B(g, 0.7, 0.04, 0.7, M.planks, x, 1.22, z); }
function chest(g, x, z, body, lid) { B(g, 0.95, 0.5, 0.65, flat(body), x, 0.45, z); B(g, 1, 0.24, 0.7, flat(lid), x, 0.82, z); B(g, 0.14, 0.2, 0.06, flat('#e4b93a'), x, 0.68, z + 0.36); }
function lantern(g, x, z, h = 2.4) {
  B(g, 0.25, h, 0.25, M.log, x, h / 2, z); B(g, 0.44, 0.44, 0.44, glow('#ffc76a'), x, h + 0.2, z, true); B(g, 0.58, 0.1, 0.58, M.dark, x, h + 0.47, z);
  const p = new THREE.PointLight('#ffb35a', 0.9, 9, 1.6); p.position.set(x, h + 0.2, z + 0.45); g.add(p); return p;
}
function banner(g, x, y, z, w, h, color, mark) {
  B(g, w + 0.16, 0.1, 0.1, M.dark, x, y + h / 2 + 0.05, z);
  B(g, w, h, 0.06, wool(color), x, y, z);
  B(g, w / 3, 0.18, 0.06, wool(color), x - w / 3, y - h / 2 - 0.09, z); B(g, w / 3, 0.18, 0.06, wool(color), x + w / 3, y - h / 2 - 0.09, z);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, w * 0.86 * (16 / 12)), emblem(mark)); p.position.set(x, y, z + 0.035); g.add(p);
}
function fenceRun(g, x0, x1, z) { for (let x = x0; x <= x1 + 0.01; x += 1) { B(g, 0.2, 1.1, 0.2, M.dark, x, 0.75, z); if (x < x1) { B(g, 1, 0.13, 0.1, M.planks, x + 0.5, 0.65, z); B(g, 1, 0.13, 0.1, M.planks, x + 0.5, 1.05, z); } } }
function showcase(g, x, y, z, color, s = 0.34) { B(g, s + 0.2, 0.12, s + 0.2, M.dark, x, y + 0.06, z); B(g, s, s, s, glow(color), x, y + 0.14 + s / 2, z, true); B(g, s + 0.24, s + 0.3, s + 0.24, glass, x, y + 0.12 + (s + 0.3) / 2, z, true); }
function papers(g, x, y, z, n, w = 0.7, d = 0.9) { for (let k = 0; k < n; k++) B(g, w, 0.1, d, k === n - 1 ? M.paper : wool(k % 2 ? '#e4e0d2' : '#f6f3e8'), x + (k % 2 ? 0.03 : -0.02), y + 0.05 + k * 0.1, z); }
function counter(g, mat, cloth) { B(g, 4.7, 1, 1, mat, 0, 0.7, 1.2); if (cloth) B(g, 4.9, 0.1, 1.14, wool(cloth), 0, 1.25, 1.2); }

/* ── one builder per stall ── */
const BUILD = {
  // Blue patterned awning, glass cases with glowing cubes, a humming machine.
  alacrity(g, s, col) {
    const blue = patterned('#4f8df0'), deep = '#234a9e';
    platform(g); posts(g, 3.05, 3.6);
    awning(g, [blue, blue, wool(WHITE), blue, wool(WHITE), blue], { trim: wool(WHITE), sides: true });
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
    platform(g); posts(g, 2.95, 3.25);
    awning(g, [wool('#2f6b35'), wool('#3d8244')], { y: 3.05, step: 0.14, trim: wool('#24552a'), sides: true });
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
    platform(g); posts(g, 3, 3.6);
    awning(g, [wool('#c04bd6'), wool('#7a3fb4')], { trim: wool('#5a2f86'), sides: true });
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
};

export function buildStalls(scene) {
  return PROJECTS.map((p) => {
    const s = Object.assign({}, p), g = new THREE.Group();
    g.position.set(p.pos[0], 0.1, p.pos[1]); g.userData.id = p.id;
    const col = (x0, x1, z0, z1, h) => collide(p.pos[0] + x0, p.pos[0] + x1, p.pos[1] + z0, p.pos[1] + z1, h + 0.1);
    BUILD[p.id](g, s, col);
    // main footprint: blocks walking through, and is what "near the stall" is measured from
    s.rect = { x0: p.pos[0] - 2.85, x1: p.pos[0] + 2.85, z0: p.pos[1] - 2.05, z1: p.pos[1] + 2.2 };
    collide(s.rect.x0, s.rect.x1, s.rect.z0, s.rect.z1, 6);
    if (p.id === 'alacrity' || p.id === 'contact') collide(p.pos[0] - 4.1, p.pos[0] + 4.1, p.pos[1] - 2.4, p.pos[1] - 2.2, 1.4);
    scene.add(g); s.group = g; return s;
  });
}
