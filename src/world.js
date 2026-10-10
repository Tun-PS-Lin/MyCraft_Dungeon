// The map: ground, raised paving stones, grass, fences, bushes, forest and the guide slab.
import * as THREE from 'three';
import { PLAZA, PROJECTS, TUNING } from './config.js';
import { rng, hash, noise, cv, fill, speck, toTex, tiles, M, B, Batch, boxGeo, glow, PAVER_TINTS, DIRT, GRASS } from './textures.js';
import { collide, setHeightFn } from './collision.js';

const HALF = 48, SIZE = HALF * 2;
const GRASS_T = 0, COBBLE = 1, DIRT_T = 2;
const types = new Uint8Array(SIZE * SIZE), heights = new Float32Array(SIZE * SIZE);
const idx = (x, z) => (Math.floor(z) + HALF) * SIZE + (Math.floor(x) + HALF);
export const COBBLE_H = 0.15, GRASS_H = 0.16;

export function heightAt(x, z) {
  if (x < -HALF || x >= HALF || z < -HALF || z >= HALF) return 0;
  return heights[idx(x, z)];
}

// Decide what each ground cell is. Roads form a cross with a wide oval middle,
// roughened by noise so the edges break up into dirt and grass.
function classify(x, z) {
  const ax = Math.abs(x), az = Math.abs(z), inside = ax < PLAZA.x && az < PLAZA.z;
  const n = (noise(x * 0.33 + 9, z * 0.33 + 3) - 0.5) * 3.4, k = hash(x * 7 + 1, z * 13 + 5);
  let s;
  if (inside) {
    s = Math.min(ax - 3.4, az - 3.0, (Math.hypot(x / 10.5, z / 7.5) - 1) * 6);
    for (const p of PROJECTS) s = Math.min(s, Math.hypot(x - p.pos[0], z - (p.pos[1] + 2.2)) - 3.6);
  } else if (ax < 8) s = ax - 3.2 + (az - PLAZA.z) * 0.22; // the road runs off the top and bottom of the map
  else s = 99;
  s += n;
  if (s < 0) return noise(x * 0.55 + 50, z * 0.55 + 20) > 0.76 ? DIRT_T : COBBLE;
  if (s < 1.9) return k < 0.68 ? DIRT_T : k < 0.84 ? COBBLE : GRASS_T;
  if (!inside && noise(x * 0.3 + 40, z * 0.3 + 7) > 0.74) return DIRT_T;
  return GRASS_T;
}

export function buildWorld(scene, renderer) {
  const r = rng(5), col = new THREE.Color();
  const inSlabZone = (x, z) => Math.abs(x) < PLAZA.x + 2 && Math.abs(z) < PLAZA.z + 2;

  for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++) {
    const x = i - HALF + 0.5, z = j - HALF + 0.5, t = classify(x, z);
    types[j * SIZE + i] = t;
    heights[j * SIZE + i] = t === COBBLE ? COBBLE_H : t === GRASS_T && inSlabZone(x, z) ? GRASS_H : 0;
  }
  setHeightFn(heightAt);

  /* flat ground: one plane with every cell painted into a single texture */
  {
    const v = { g: [], f: [], d: [], m: [] };
    for (let i = 0; i < 4; i++) { v.g.push(tiles.grass(60 + i)); v.f.push(tiles.grass(70 + i, true)); v.d.push(tiles.dirt(50 + i)); v.m.push(tiles.mortar(80 + i)); }
    const c = cv(SIZE * 16, SIZE * 16, (g) => {
      for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++) {
        const t = types[j * SIZE + i], set = t === COBBLE ? v.m : t === DIRT_T ? v.d : r() < 0.08 ? v.f : v.g;
        g.drawImage(set[(r() * 4) | 0], i * 16, j * 16);
      }
    });
    const tex = toTex(c, false); tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const m = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshLambertMaterial({ map: tex }));
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m);
  }

  /* raised detail */
  const big = new Batch(M.paver, boxGeo(0.94, 1, 0.94)), half = new Batch(M.paver, boxGeo(0.94, 1, 0.44)), small = new Batch(M.paver, boxGeo(0.44, 1, 0.44));
  const sideTex = toTex(cv(16, 16, (g) => { const q = rng(18); speck(g, 16, 16, DIRT, q); for (let x = 0; x < 16; x++) { const d = 3 + ((q() * 3) | 0); for (let y = 0; y < d; y++) fill(g, GRASS[(q() * GRASS.length) | 0], x, y, 1, 1); } }));
  const topM = new THREE.MeshLambertMaterial({ map: toTex(tiles.grass(60)) }), sideM = new THREE.MeshLambertMaterial({ map: sideTex }), dirtM = new THREE.MeshLambertMaterial({ map: toTex(tiles.dirt(50)) });
  const grassBlock = [sideM, sideM, topM, dirtM, sideM, sideM];
  const turf = new Batch(grassBlock), mounds = new Batch(grassBlock);
  const bits = new Batch(M.tint, null, false);   // grass tufts, flowers, pebbles: tinted, no shadows
  const wood = new Batch(M.tint), rocks = new Batch(M.tint), logs = new Batch(M.log), leaves = new Batch(M.leaves);
  const tint = () => col.set(PAVER_TINTS[(r() * PAVER_TINTS.length) | 0]).multiplyScalar(0.9 + r() * 0.2).clone();
  const stoneH = () => 0.09 + r() * 0.12;
  const moundAt = (x, z) => (!inSlabZone(x, z) && Math.abs(x) > 5 && noise(x * 0.18 + 3, z * 0.18 + 8) > 0.63 ? 1 : 0);
  const flowerCols = ['#f4e04d', '#f6f6f6', '#e9627a', '#c58cf0', '#ff9a3d'];

  for (let z = -38.5; z < 32; z++) for (let x = -38.5; x < 39; x++) {
    const t = types[idx(x, z)];
    if (t === COBBLE) {
      if (Math.abs(x) < 3.2 && Math.abs(z) < 2.1) continue; // hidden under the guide slab
      const k = r();
      if (k < 0.2) { const h = stoneH(); big.add(x, h / 2, z, 1, h, 1, tint()); }
      else if (k < 0.5) {
        const turn = r() < 0.5;
        for (const o of [-0.25, 0.25]) { const h = stoneH(); half.add(x + (turn ? o : 0), h / 2, z + (turn ? 0 : o), 1, h, 1, tint(), turn ? Math.PI / 2 : 0); }
      } else for (const ox of [-0.25, 0.25]) for (const oz of [-0.25, 0.25]) { if (r() < 0.05) continue; const h = stoneH() + (r() < 0.08 ? 0.08 : 0); small.add(x + ox, h / 2, z + oz, 1, h, 1, tint()); }
    } else if (t === DIRT_T) {
      if (r() < 0.22) { const n = 1 + ((r() * 2) | 0); for (let i = 0; i < n; i++) { const h = 0.05 + r() * 0.06; small.add(x + (r() - 0.5) * 0.5, h / 2, z + (r() - 0.5) * 0.5, 0.7 + r() * 0.3, h, 0.7 + r() * 0.3, tint()); } }
      if (r() < 0.12) bits.add(x + (r() - 0.5) * 0.7, 0.12, z + (r() - 0.5) * 0.7, 0.1, 0.24, 0.1, col.setHSL(0.24, 0.5, 0.36).clone());
    } else {
      const m = moundAt(x, z), base = m || heights[idx(x, z)];
      if (m) mounds.add(x, 0.5, z);
      else if (inSlabZone(x, z)) turf.add(x, GRASS_H / 2, z, 1, GRASS_H, 1);
      if (r() < 0.5) { const n = 1 + ((r() * 3) | 0); for (let i = 0; i < n; i++) { const h = 0.22 + r() * 0.3; bits.add(x + (r() - 0.5) * 0.8, base + h / 2, z + (r() - 0.5) * 0.8, 0.1, h, 0.1, col.setHSL(0.22 + r() * 0.07, 0.6, 0.27 + r() * 0.12).clone()); } }
      if (r() < 0.09) { const fx = x + (r() - 0.5) * 0.7, fz = z + (r() - 0.5) * 0.7; bits.add(fx, base + 0.16, fz, 0.06, 0.32, 0.06, '#3f7a2a'); bits.add(fx, base + 0.38, fz, 0.2, 0.16, 0.2, flowerCols[(r() * flowerCols.length) | 0]); }
    }
  }

  /* plaza edge: runs of fence broken by bushes */
  const leafTint = () => col.setHSL(0.2 + r() * 0.07, 0.5 + r() * 0.12, 0.36 + r() * 0.1).clone();
  const fence = (x, z, alongX) => {
    const c1 = '#5f4024', c2 = '#6f4c2b';
    wood.add(alongX ? x - 0.5 : x, 0.6, alongX ? z : z - 0.5, 0.22, 1.2, 0.22, c1);
    for (const y of [0.5, 0.9]) wood.add(x, y, z, alongX ? 1 : 0.1, 0.14, alongX ? 0.1 : 1, c2);
  };
  const bush = (x, z) => { leaves.add(x, 0.6, z, 1, 1, 1, leafTint()); if (r() < 0.4) leaves.add(x + (r() - 0.5) * 0.3, 1.4, z + (r() - 0.5) * 0.3, 0.75, 0.75, 0.75, leafTint()); };
  const edge = (x, z, alongX) => {
    const gate = alongX && Math.abs(x) < 3.5;
    if (gate || noise(x * 0.22 + 70, z * 0.22 + 31) > 0.47) fence(x, z, alongX); else bush(x, z);
  };
  for (let x = -PLAZA.x - 0.5; x <= PLAZA.x + 0.5; x++) { edge(x, -PLAZA.z - 0.5, true); edge(x, PLAZA.z + 0.5, true); }
  for (let z = -PLAZA.z + 0.5; z < PLAZA.z; z++) { edge(-PLAZA.x - 0.5, z, false); edge(PLAZA.x + 0.5, z, false); }

  /* loose stones and lantern posts inside the plaza */
  [[-15.6, -2.6], [15.4, -3.2], [-15.2, 3.4], [15.6, 3.8], [5.4, -12.6], [-5.6, 12.4], [-15.4, -12.6], [15.5, 12.5]].forEach(([x, z]) => {
    const n = 2 + ((r() * 2) | 0);
    for (let i = 0; i < n; i++) { const s = 0.45 + r() * 0.4, ox = (r() - 0.5) * 0.9, oz = (r() - 0.5) * 0.9; rocks.add(x + ox, s / 2 + 0.1, z + oz, s, s, s, col.setHSL(0.08, 0.06, 0.36 + r() * 0.12).clone(), r()); }
    collide(x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0.9);
  });
  const lampGlow = glow('#ffc76a');
  [[-4.7, -13.1, 1], [4.7, -13.1, 1], [-16.1, -0.5, 0], [16.1, 0.5, 0], [-4.7, 13.1, 0], [4.7, 13.1, 0]].forEach(([x, z, lit]) => {
    B(scene, 0.25, 2.3, 0.25, M.log, x, 1.15, z); B(scene, 0.44, 0.44, 0.44, lampGlow, x, 2.5, z, true); B(scene, 0.58, 0.1, 0.58, M.dark, x, 2.77, z);
    collide(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 3);
    if (lit) { const p = new THREE.PointLight('#ffb35a', 0.8, 9, 1.6); p.position.set(x, 2.5, z + 0.4); scene.add(p); }
  });

  /* forest. Trees are left out wherever they would stand between the camera and the player. */
  const dir = [Math.sin(TUNING.cameraYaw), Math.cos(TUNING.cameraYaw)];
  const hides = (x, z) => { for (let s = 1.5; s <= 10; s += 0.5) { if (Math.abs(x - dir[0] * s) < PLAZA.x && Math.abs(z - dir[1] * s) < PLAZA.z) return true; } return false; };
  const tree = (x, z, base) => {
    const h = 4 + ((r() * 3) | 0), tc = col.setHSL(0.185 + r() * 0.075, 0.5 + r() * 0.14, 0.37 + r() * 0.1).clone();
    const lc = () => tc.clone().offsetHSL(0, 0, (r() - 0.5) * 0.12);
    for (let y = 0; y < h; y++) logs.add(x, base + y + 0.5, z);
    const put = (dx, dy, dz) => leaves.add(x + dx, base + h + dy + 0.5, z + dz, 1, 1, 1, lc());
    for (let dy = -2; dy <= -1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { if (!dx && !dz) continue; if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && r() < 0.6) continue; put(dx, dy, dz); }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { if (dx && dz && r() < 0.4) continue; put(dx, 0, dz); }
    put(0, 1, 0); put(1, 1, 0); put(-1, 1, 0); put(0, 1, 1); put(0, 1, -1);
  };
  for (let gx = -37; gx < 37; gx += 3.5) for (let gz = -36; gz < 28; gz += 3.5) {
    const x = Math.floor(gx + r() * 2.2) + 0.5, z = Math.floor(gz + r() * 2.2) + 0.5;
    if (Math.abs(x) < PLAZA.x + 1.4 && Math.abs(z) < PLAZA.z + 1.4) continue;
    if (Math.abs(x) < 4.6 || types[idx(x, z)] !== GRASS_T || hides(x, z) || r() < 0.1) continue;
    tree(x, z, moundAt(x, z));
  }
  // low bushes fill the near side where trees are not allowed
  for (let i = 0; i < 90; i++) { const x = Math.floor(r() * 70 - 35) + 0.5, z = Math.floor(PLAZA.z + 2 + r() * 12) + 0.5; if (Math.abs(x) < 4.5 || types[idx(x, z)] !== GRASS_T) continue; leaves.add(x, moundAt(x, z) + 0.5, z, 1, 1, 1, leafTint()); }

  [big, half, small, turf, mounds, bits, wood, rocks, logs, leaves].forEach((b) => b.build(scene));

  /* movement guide slab */
  const SLAB = { w: 6.4, d: 4.2, y: 0.05, h: 0.3 };
  {
    B(scene, SLAB.w, SLAB.h, SLAB.d, M.stone, 0, SLAB.y + SLAB.h / 2, 0);
    const c = document.createElement('canvas'); c.width = 624; c.height = 408;
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    const draw = () => {
      const x = c.getContext('2d'), q = rng(3);
      for (let j = 0; j < 51; j++) for (let i = 0; i < 78; i++) { x.fillStyle = ['#b3aca3', '#aaa39a', '#bcb5ac', '#a19a92'][(q() * 4) | 0]; x.fillRect(i * 8, j * 8, 8, 8); }
      x.strokeStyle = '#7b746b'; x.lineWidth = 6; x.strokeRect(19, 19, 586, 370); x.strokeStyle = '#d3ccc2'; x.lineWidth = 2; x.strokeRect(25, 25, 586, 370);
      const ink = '#46413b', hi = '#d6cfc5'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const text = (s, px, cx, cy) => { x.font = '700 ' + px + 'px "Pixelify Sans","Courier New",monospace'; x.fillStyle = hi; x.fillText(s, cx + 2, cy + 2); x.fillStyle = ink; x.fillText(s, cx, cy); };
      const key = (cx, cy, l, arrow) => {
        x.fillStyle = hi; x.fillRect(cx - 23, cy - 23, 50, 50); x.fillStyle = ink; x.fillRect(cx - 25, cy - 25, 50, 50); x.fillStyle = '#b8b1a7'; x.fillRect(cx - 21, cy - 21, 42, 42);
        if (l) text(l, 30, cx, cy + 1);
        else { x.save(); x.translate(cx, cy); x.rotate(arrow); x.fillStyle = ink; x.fillRect(-3, -4, 6, 16); x.beginPath(); x.moveTo(-12, -2); x.lineTo(0, -14); x.lineTo(12, -2); x.fill(); x.restore(); }
      };
      text('MOVEMENT GUIDE', 52, 312, 76);
      key(182, 146, 'W'); key(126, 204, 'A'); key(182, 204, 'S'); key(238, 204, 'D'); text('OR', 26, 312, 206);
      key(442, 146, null, 0); key(386, 204, null, -Math.PI / 2); key(442, 204, null, Math.PI); key(498, 204, null, Math.PI / 2);
      text('WASD OR ARROWS TO MOVE', 32, 312, 286); text('SPACE JUMP   SHIFT RUN   E OPEN', 25, 312, 340);
      tex.needsUpdate = true;
    };
    draw();
    if (document.fonts && document.fonts.load) document.fonts.load('700 40px "Pixelify Sans"').then(draw).catch(() => {});
    const top = new THREE.Mesh(new THREE.PlaneGeometry(SLAB.w, SLAB.d), new THREE.MeshLambertMaterial({ map: tex }));
    top.rotation.x = -Math.PI / 2; top.position.y = SLAB.y + SLAB.h + 0.004; top.receiveShadow = true; scene.add(top);
    collide(-SLAB.w / 2, SLAB.w / 2, -SLAB.d / 2, SLAB.d / 2, SLAB.y + SLAB.h);
  }
}
