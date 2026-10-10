// Pixel textures, materials and box helpers. Everything is generated in code at
// 16 pixels per block; replace a canvas here with a loaded image to reskin it.
import * as THREE from 'three';

/* ── random helpers ── */
export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(x, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/* ── canvas helpers ── */
export function cv(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c;
}
export function speck(g, w, h, pal, r) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = pal[(r() * pal.length) | 0]; g.fillRect(x, y, 1, 1); }
}
export const fill = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
export function toTex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.encoding = THREE.sRGBEncoding;
  if (repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ── palettes ── */
export const DIRT = ['#8a5a36', '#7b4e2e', '#96633b', '#6f4528', '#845431'];
export const GRASS = ['#5f8f33', '#53812c', '#6b9b39', '#4a7427', '#5f8f33'];
export const MORTAR = ['#4a3a2a', '#40321f', '#54422f'];
export const PAVER_TINTS = ['#a39382', '#998a78', '#a89886', '#948573', '#9f8e7a', '#97897c', '#a5927d'];

export const tiles = {
  dirt: (seed) => cv(16, 16, (g) => {
    const r = rng(seed); speck(g, 16, 16, DIRT, r);
    for (let i = 0; i < 5; i++) fill(g, r() < 0.5 ? '#5f3a1e' : '#a87a4e', (r() * 16) | 0, (r() * 16) | 0, 1, 1);
  }),
  grass: (seed, flowers) => cv(16, 16, (g) => {
    const r = rng(seed); speck(g, 16, 16, GRASS, r);
    for (let i = 0; i < 6; i++) fill(g, '#79a843', (r() * 16) | 0, (r() * 16) | 0, 1, 1);
    if (flowers) { const fc = ['#f4e04d', '#f6f6f6', '#e9627a', '#c58cf0']; for (let i = 0; i < 3; i++) { const x = 1 + ((r() * 13) | 0), y = 1 + ((r() * 13) | 0); fill(g, fc[(r() * fc.length) | 0], x, y, 1, 1); } }
  }),
  mortar: (seed) => cv(16, 16, (g) => speck(g, 16, 16, MORTAR, rng(seed))),
};

const C = {
  planks: cv(16, 16, (g) => {
    const r = rng(11); speck(g, 16, 16, ['#b08a52', '#a57f4a', '#b9935a'], r);
    g.fillStyle = '#7c5c33'; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillRect(5, 0, 1, 3); g.fillRect(12, 4, 1, 3); g.fillRect(3, 8, 1, 3); g.fillRect(10, 12, 1, 3);
  }),
  dark: cv(16, 16, (g) => {
    const r = rng(12); speck(g, 16, 16, ['#6e4d2c', '#64452a', '#785533'], r);
    g.fillStyle = '#46301b'; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillRect(7, 0, 1, 3); g.fillRect(2, 8, 1, 3); g.fillRect(12, 12, 1, 3);
  }),
  log: cv(16, 16, (g) => {
    const r = rng(13);
    for (let x = 0; x < 16; x++) { const c = ['#5a4127', '#4d3620', '#66492c', '#44301c'][(r() * 4) | 0]; for (let y = 0; y < 16; y++) fill(g, r() < 0.15 ? '#3c2a18' : c, x, y, 1, 1); }
  }),
  leaves: cv(16, 16, (g) => {
    const r = rng(14); speck(g, 16, 16, ['#ffffff', '#e6e6e6', '#d2d2d2', '#f4f4f4', '#bdbdbd'], r);
    g.fillStyle = '#5c5c5c'; for (let i = 0; i < 40; i++) g.fillRect((r() * 16) | 0, (r() * 16) | 0, 1, 1);
  }),
  stone: cv(16, 16, (g) => speck(g, 16, 16, ['#b3aca3', '#aaa39a', '#bcb5ac', '#a19a92'], rng(15))),
  paver: cv(16, 16, (g) => {
    const r = rng(19); speck(g, 16, 16, ['#ffffff', '#f3f3f3', '#e8e8e8', '#fafafa', '#dedede'], r);
    g.fillStyle = '#c4c4c4'; for (let i = 0; i < 10; i++) g.fillRect((r() * 16) | 0, (r() * 16) | 0, 1 + ((r() * 2) | 0), 1);
  }),
  wool: cv(16, 16, (g) => speck(g, 16, 16, ['#ffffff', '#f1f1f1', '#e6e6e6', '#f8f8f8'], rng(16))),
  // patterned cloth: pale diamonds on a slightly darker ground, tinted per use
  pattern: cv(16, 16, (g) => {
    speck(g, 16, 16, ['#c9c9c9', '#c2c2c2', '#d0d0d0'], rng(21));
    g.fillStyle = '#ffffff';
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.abs((x % 8) - 3.5) + Math.abs((y % 8) - 3.5); if (d === 3 || d === 0) g.fillRect(x, y, 1, 1); }
  }),
  crate: cv(16, 16, (g) => {
    const r = rng(17); speck(g, 16, 16, ['#a57f4a', '#b08a52', '#9a7442'], r);
    g.fillStyle = '#5f4424'; g.fillRect(0, 0, 16, 2); g.fillRect(0, 14, 16, 2); g.fillRect(0, 0, 2, 16); g.fillRect(14, 0, 2, 16);
    for (let i = 2; i < 14; i++) { g.fillRect(i, i, 1, 1); g.fillRect(i, 15 - i, 1, 1); }
  }),
  blueprint: cv(16, 16, (g) => {
    fill(g, '#2456a6', 0, 0, 16, 16); g.fillStyle = '#5f97de';
    for (let i = 0; i < 16; i += 4) { g.fillRect(i, 0, 1, 16); g.fillRect(0, i, 16, 1); }
    g.fillStyle = '#e8f2ff'; g.fillRect(5, 5, 7, 1); g.fillRect(5, 5, 1, 6); g.fillRect(5, 10, 7, 1); g.fillRect(11, 5, 1, 6); g.fillRect(8, 5, 1, 3);
  }),
  paper: cv(16, 16, (g) => {
    fill(g, '#f6f3e8', 0, 0, 16, 16); fill(g, '#3a3a3a', 2, 2, 12, 2);
    g.fillStyle = '#8a8a86'; for (let y = 6; y < 15; y += 2) { g.fillRect(2, y, 5, 1); g.fillRect(9, y, 5, 1); }
  }),
  books: cv(16, 16, (g) => {
    const cols = ['#a33b2e', '#2f66c4', '#3d7d40', '#c98a2b', '#6a3f8f', '#8a5a2b']; const r = rng(23);
    fill(g, '#3c2a18', 0, 0, 16, 16);
    for (let row = 0; row < 2; row++) for (let x = 0; x < 16; x += 2) { const c = cols[(r() * cols.length) | 0], h = 5 + ((r() * 2) | 0); fill(g, c, x, row * 8 + (7 - h), 2, h); fill(g, '#e9d9a8', x, row * 8 + (7 - h) + 1, 2, 1); }
  }),
};
export const T = {}; for (const k in C) T[k] = toTex(C[k]);

/* ── materials ── */
const lam = (o) => new THREE.MeshLambertMaterial(o);
export const M = {
  planks: lam({ map: T.planks }), dark: lam({ map: T.dark }), log: lam({ map: T.log }), stone: lam({ map: T.stone }),
  crate: lam({ map: T.crate }), blueprint: lam({ map: T.blueprint }), paper: lam({ map: T.paper }), books: lam({ map: T.books }),
  paver: lam({ map: T.paver }), leaves: lam({ map: T.leaves }), tint: lam({ map: T.wool }),
};
// This three.js version reads colours as linear light, so hex colours are converted from sRGB first.
export const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
const cache = { wool: {}, pat: {}, glow: {}, flat: {} };
export const wool = (c) => cache.wool[c] || (cache.wool[c] = lam({ map: T.wool, color: lin(c) }));
export const patterned = (c) => cache.pat[c] || (cache.pat[c] = lam({ map: T.pattern, color: lin(c) }));
export const glow = (c) => cache.glow[c] || (cache.glow[c] = new THREE.MeshBasicMaterial({ color: lin(c) }));
export const flat = (c) => cache.flat[c] || (cache.flat[c] = lam({ color: lin(c) }));
export const glass = new THREE.MeshLambertMaterial({ color: '#d8f2ff', transparent: true, opacity: 0.2, depthWrite: false });

/* ── boxes ── */
const geoCache = {};
// Box geometry whose texture stays at 16 pixels per block whatever its size.
export function boxGeo(w, h, d) {
  const k = w + '|' + h + '|' + d; if (geoCache[k]) return geoCache[k];
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const f = (i / 4) | 0; const su = f < 2 ? d : w, sv = f === 2 || f === 3 ? d : h; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); }
  return (geoCache[k] = g);
}
export function B(parent, w, h, d, mat, x, y, z, noShadow) {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat); m.position.set(x, y, z);
  if (!noShadow) { m.castShadow = true; m.receiveShadow = true; }
  parent.add(m); return m;
}

/* ── instanced batches: thousands of small blocks in one draw call ── */
export class Batch {
  constructor(material, geometry, shadow = true) { this.material = material; this.geometry = geometry || new THREE.BoxGeometry(1, 1, 1); this.items = []; this.shadow = shadow; }
  add(x, y, z, sx = 1, sy = 1, sz = 1, color = null, ry = 0) { this.items.push([x, y, z, sx, sy, sz, color, ry]); }
  build(scene) {
    if (!this.items.length) return null;
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.items.length), o = new THREE.Object3D(), col = new THREE.Color();
    this.items.forEach((it, i) => {
      o.position.set(it[0], it[1], it[2]); o.scale.set(it[3], it[4], it[5]); o.rotation.set(0, it[7], 0); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      if (it[6] !== null) mesh.setColorAt(i, col.set(it[6]).convertSRGBToLinear());
    });
    mesh.castShadow = this.shadow; mesh.receiveShadow = true;
    mesh.frustumCulled = false; // instances are spread over the whole map
    scene.add(mesh); return mesh;
  }
}

/* ── banner emblems (12×16 pixel art on a transparent ground) ── */
const EMBLEMS = {
  crest(g) { const w = '#f4f1e6'; fill(g, w, 2, 2, 8, 1); fill(g, w, 2, 2, 1, 7); fill(g, w, 9, 2, 1, 7); fill(g, w, 3, 9, 1, 2); fill(g, w, 8, 9, 1, 2); fill(g, w, 4, 11, 1, 1); fill(g, w, 7, 11, 1, 1); fill(g, w, 5, 12, 2, 1);
    fill(g, '#62e4ff', 5, 4, 2, 5); fill(g, '#62e4ff', 4, 5, 4, 1); fill(g, '#62e4ff', 4, 4, 1, 1); fill(g, '#62e4ff', 7, 4, 1, 1); },
  news(g) { const w = '#f4f1e6'; fill(g, w, 2, 2, 8, 2); for (let y = 6; y < 14; y += 2) fill(g, w, 2, y, y === 12 ? 5 : 8, 1); },
  grid(g) { const d = '#3a3550'; fill(g, d, 2, 2, 8, 12); fill(g, '#e9d9a8', 3, 3, 2, 2); fill(g, '#e9d9a8', 7, 3, 2, 2); fill(g, '#e9d9a8', 3, 7, 2, 2); fill(g, '#e9d9a8', 7, 7, 2, 2); fill(g, '#e9d9a8', 5, 11, 2, 3); },
  house(g) { const w = '#efe6c8'; fill(g, w, 5, 2, 2, 1); fill(g, w, 4, 3, 4, 1); fill(g, w, 3, 4, 6, 1); fill(g, w, 2, 5, 8, 1); fill(g, w, 3, 6, 1, 4); fill(g, w, 8, 6, 1, 4); fill(g, w, 3, 9, 6, 1); fill(g, w, 5, 7, 2, 2); fill(g, w, 3, 12, 2, 2); fill(g, w, 7, 12, 2, 2); },
  mail(g) { const w = '#f6f0ff'; fill(g, w, 1, 4, 10, 1); fill(g, w, 1, 11, 10, 1); fill(g, w, 1, 4, 1, 8); fill(g, w, 10, 4, 1, 8); for (let i = 0; i < 4; i++) { fill(g, w, 2 + i, 5 + i, 1, 1); fill(g, w, 9 - i, 5 + i, 1, 1); } },
};
const emblemCache = {};
export function emblem(name) {
  if (!emblemCache[name]) { const t = toTex(cv(12, 16, EMBLEMS[name]), false); emblemCache[name] = new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.5 }); }
  return emblemCache[name];
}

/* ── town hall materials ── */
const HALL_C = {
  brick: cv(16, 16, (g) => {
    const r = rng(31); speck(g, 16, 16, ['#8b8a86', '#7f7e7a', '#959490', '#74736f'], r);
    g.fillStyle = '#55544f'; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    for (let row = 0; row < 4; row++) for (let x = row % 2 ? 4 : 0; x < 16; x += 8) g.fillRect(x, row * 4, 1, 3);
  }),
  slate: cv(16, 16, (g) => {
    const r = rng(32); speck(g, 16, 16, ['#3f4757', '#394150', '#47505f'], r);
    g.fillStyle = '#2a303c'; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    for (let row = 0; row < 4; row++) for (let x = row % 2 ? 3 : 7; x < 16; x += 8) g.fillRect(x, row * 4, 1, 3);
  }),
  tile: cv(16, 16, (g) => {
    const r = rng(33); speck(g, 16, 16, ['#5a5961', '#53525a', '#615f68'], r);
    g.fillStyle = '#3a3940'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(8, 8, 8, 1); g.fillRect(8, 0, 1, 8);
  }),
  carpet: cv(16, 16, (g) => speck(g, 16, 16, ['#a3232a', '#98202a', '#ad2a30', '#a3232a'], rng(34))),
};
for (const k in HALL_C) { T[k] = toTex(HALL_C[k]); M[k] = lam({ map: T[k] }); }

Object.assign(EMBLEMS, {
  hanger(g) { const w = '#fff3fa'; fill(g, w, 5, 2, 2, 1); fill(g, w, 6, 3, 1, 2); fill(g, w, 5, 5, 2, 1); fill(g, w, 4, 6, 4, 1); fill(g, w, 3, 7, 6, 1); fill(g, w, 2, 8, 8, 1); fill(g, w, 1, 9, 10, 1); fill(g, '#00000000', 3, 8, 6, 1); fill(g, w, 1, 10, 10, 1); },
  tree(g) { const w = '#f4f1e6'; fill(g, w, 5, 2, 2, 12); fill(g, w, 3, 3, 1, 2); fill(g, w, 8, 3, 1, 2); fill(g, w, 4, 5, 1, 1); fill(g, w, 7, 5, 1, 1); fill(g, w, 2, 6, 1, 2); fill(g, w, 9, 6, 1, 2); fill(g, w, 3, 8, 2, 1); fill(g, w, 7, 8, 2, 1); fill(g, w, 3, 13, 6, 1); },
  scale(g) { const w = '#f6e7b0'; fill(g, w, 5, 2, 2, 11); fill(g, w, 2, 4, 8, 1); fill(g, w, 2, 5, 1, 3); fill(g, w, 9, 5, 1, 3); fill(g, w, 1, 8, 3, 1); fill(g, w, 8, 8, 3, 1); fill(g, w, 3, 13, 6, 1); },
  chip(g) { const w = '#d7ecff'; fill(g, w, 3, 4, 6, 8); fill(g, '#2f66c4', 4, 5, 4, 6); fill(g, w, 5, 7, 2, 2); for (const y of [5, 8, 10]) { fill(g, w, 1, y, 2, 1); fill(g, w, 9, y, 2, 1); } },
});

/* ── town hall roof ── */
T.roof = toTex(cv(16, 16, (g) => {
  const r = rng(35); speck(g, 16, 16, ['#a8552c', '#9c4e28', '#b35d31', '#a8552c'], r);
  g.fillStyle = '#6f3519'; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
  for (let row = 0; row < 4; row++) for (let x = row % 2 ? 5 : 11; x < 16; x += 9) g.fillRect(x, row * 4, 1, 3);
}));
M.roof = lam({ map: T.roof });

// Merge every plain mesh under a group into one mesh per material. A stall goes from
// about eighty draw calls to about fifteen, which matters most on phones. Anything
// under a child marked userData.keep (the mannequins) is left alone.
export function bake(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), buckets = new Map(), gone = [];
  const visit = (o) => {
    if (o.userData.keep) return;
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && o.geometry.index) {
      const key = o.material.uuid + (o.castShadow ? 'c' : '-') + (o.receiveShadow ? 'r' : '-');
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(o); gone.push(o); return;
    }
    for (const c of o.children.slice()) visit(c);
  };
  for (const c of group.children.slice()) visit(c);
  const m4 = new THREE.Matrix4(), n3 = new THREE.Matrix3(), v = new THREE.Vector3();
  buckets.forEach((list) => {
    let vc = 0, ic = 0; for (const o of list) { vc += o.geometry.attributes.position.count; ic += o.geometry.index.count; }
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), idx = new (vc > 65535 ? Uint32Array : Uint16Array)(ic);
    let vo = 0, io = 0;
    for (const o of list) {
      m4.multiplyMatrices(inv, o.matrixWorld); n3.getNormalMatrix(m4);
      const g = o.geometry, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, ix = g.index;
      for (let i = 0; i < p.count; i++) {
        const k = (vo + i) * 3;
        v.fromBufferAttribute(p, i).applyMatrix4(m4); pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z;
        v.fromBufferAttribute(n, i).applyMatrix3(n3).normalize(); nor[k] = v.x; nor[k + 1] = v.y; nor[k + 2] = v.z;
        uv[(vo + i) * 2] = u.getX(i); uv[(vo + i) * 2 + 1] = u.getY(i);
      }
      for (let i = 0; i < ix.count; i++) idx[io + i] = ix.getX(i) + vo;
      vo += p.count; io += ix.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const mesh = new THREE.Mesh(geo, list[0].material); mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow; group.add(mesh);
  });
  for (const o of gone) o.parent.remove(o);
}
