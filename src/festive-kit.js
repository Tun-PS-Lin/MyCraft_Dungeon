// Shared pieces for the festival decorations (festive.js, festive-mm.js): strings of lights,
// bunting, pixel shapes, and lights that twinkle by changing a few shared materials.
import * as THREE from 'three';
import { B, M, flat, lin } from './textures.js';

export const TURN = { south: 0, east: Math.PI / 2, west: -Math.PI / 2 };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ── twinkling lights: shared materials, three phases per colour, brightness swept in turn ── */
export function twinkle(colors) {
  const mats = colors.map((c) => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: lin(c) })));
  const base = colors.map((c) => lin(c));
  let i = 0;
  return {
    next: () => { const m = mats[i % colors.length][Math.floor(i / colors.length) % 3]; i++; return m; },
    update(time, night) {
      mats.forEach((row, ci) => row.forEach((m, p) => { const k = 0.5 + 0.5 * Math.sin(time * 2.2 + p * 2.09); m.color.copy(base[ci]).multiplyScalar((0.35 + 0.65 * k) * (0.75 + night * 0.4)); }));
    },
  };
}
// a sagging line between two points: n points along it
export function sag(a, b, n, drop) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n; out.push(a.clone().lerp(b, t).add(V(0, -Math.sin(Math.PI * t) * drop, 0))); } return out; }
export function wire(g, pts, mat) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b), m = B(g, len, 0.03, 0.03, mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, true);
    const d = b.clone().sub(a); m.rotation.y = -Math.atan2(d.z, d.x); m.rotation.z = Math.atan2(d.y, Math.hypot(d.x, d.z));
  }
}
export function stringLights(g, a, b, n, drop, tw) { const pts = sag(a, b, n, drop); wire(g, pts, M.dark); pts.forEach((p, i) => { if (i > 0 && i < n) B(g, 0.1, 0.12, 0.1, tw.next(), p.x, p.y - 0.08, p.z, true); }); }
// little flags (or hearts) hanging from a line
export const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
export function pixels(g, rows, s, mat, cx, cy, z, depth = 0.06, outline = false) {
  const h = rows.length, w = rows[0].length;
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== 'X') return;
    if (outline) { const n = (ii, jj) => rows[jj] && rows[jj][ii] === 'X'; if (n(i - 1, j) && n(i + 1, j) && n(i, j - 1) && n(i, j + 1)) return; }
    B(g, s, s, depth, typeof mat === 'function' ? mat(i, j) : mat, cx + (i - (w - 1) / 2) * s, cy + ((h - 1) / 2 - j) * s, z, true);
  }));
}
export function bunting(g, a, b, n, drop, mats, kind = 'flag') {
  const pts = sag(a, b, n, drop); wire(g, pts, flat('#f4efe4'));
  pts.forEach((p, i) => {
    if (i === 0 || i === n) return; const m = mats[i % mats.length];
    if (kind === 'heart') pixels(g, HEART, 0.045, m, p.x, p.y - 0.17, p.z, 0.04);
    else { B(g, 0.26, 0.1, 0.03, m, p.x, p.y - 0.07, p.z, true); B(g, 0.17, 0.1, 0.03, m, p.x, p.y - 0.16, p.z, true); B(g, 0.08, 0.08, 0.03, m, p.x, p.y - 0.25, p.z, true); }
  });
}
