// The cave at the bottom of the square, and the Hideout it leads to: a private underground
// room with a CD player, a journal on a stand, a small gallery of side projects, a library and a big
// window that shows the sky, sunny by day and starry by night.
// The room is built far to the south of the village; travelling there is a quick fade.
import * as THREE from 'three';
import { CAVE, HIDEOUT, FLOOR } from './config.js';
import { RECORDS, GALLERY } from './hideout-content.js';
import { B, M, cv, speck, fill, toTex, rng, glow, flat, wool, lin, bake } from './textures.js';
import { collide } from './collision.js';
import { addLamp } from './lights.js';
import { drawPainting } from './pixelart.js';
import { BASE } from './base.js';

const lam = (o) => new THREE.MeshLambertMaterial(o);
const tex = (w, h, draw, repeat) => toTex(cv(w, h, draw), repeat);
const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color: lin(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });

/* materials of the underground: warm brown stone bricks, wooden columns, terracotta and grey tiles */
const stoneBrick = lam({ map: tex(16, 16, (g) => {
  speck(g, 16, 16, ['#6e5c4b', '#665545', '#75624f', '#5f4f40'], rng(41)); g.fillStyle = '#3d3229';
  for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1); for (let row = 0; row < 4; row++) for (let x = row % 2 ? 4 : 0; x < 16; x += 8) g.fillRect(x, row * 4, 1, 3);
}) });
const column = lam({ map: tex(16, 16, (g) => { speck(g, 16, 16, ['#b98a52', '#ad7f4a', '#c4955c'], rng(42)); g.fillStyle = '#7a5530'; for (let x = 1; x < 16; x += 3) g.fillRect(x, 0, 1, 16); }) });
const caveRock = lam({ map: tex(16, 16, (g) => { speck(g, 16, 16, ['#77736c', '#6b6761', '#827d75', '#5f5b55'], rng(43)); fill(g, '#4f6b34', 0, 0, 16, 2); fill(g, '#5c7a3c', 3, 2, 4, 1); fill(g, '#5c7a3c', 10, 2, 3, 1); }) });
const caveStep = lam({ map: tex(16, 16, (g) => { speck(g, 16, 16, ['#6f6a62', '#67625b', '#77716a'], rng(44)); fill(g, '#4a4640', 0, 15, 16, 1); }) });

export function buildCave(scene) {
  const g = new THREE.Group(), cx = CAVE.x, w = CAVE.w, z0 = CAVE.z0, z1 = CAVE.z1;
  // stairs down, each tread a little lower, ending at a lit landing
  const n = 8, run = (z1 - z0 - 0.4) / n;
  for (let i = 0; i < n; i++) { const top = FLOOR - run * 0.62 * (i + 1), z = z0 + run * (i + 0.5); B(g, w, 4, run + 0.02, caveStep, cx, top - 2, z); }
  // the walls of the hole, with a mossy rim standing a little proud of the ground
  for (const s of [-1, 1]) { B(g, 0.7, 4.2, z1 - z0 + 0.6, caveRock, cx + s * (w / 2 + 0.35), -1.95, (z0 + z1) / 2); B(g, 0.9, 0.3, z1 - z0 + 0.8, caveRock, cx + s * (w / 2 + 0.45), 0.15, (z0 + z1) / 2); }
  B(g, w + 1.4, 4.2, 0.7, caveRock, cx, -1.95, z1 + 0.35); B(g, w + 1.8, 0.3, 0.9, caveRock, cx, 0.15, z1 + 0.45);
  // big mossy boulders framing the mouth
  [[-3.1, 16.6, 1.6, 2.6, 1.6], [3.1, 16.6, 1.6, 2.4, 1.6], [-3.6, 18.2, 1.4, 1.7, 1.6], [3.7, 18.3, 1.4, 1.8, 1.5], [-2.6, 19.9, 1.2, 1.3, 1.6], [2.6, 20.1, 1.2, 1.2, 1.4]].forEach(([x, z, sx, h, sz]) => { B(g, sx, h, sz, caveRock, cx + x, h / 2, z); });
  // lanterns on short posts either side of the top step
  for (const s of [-1, 1]) { const x = cx + s * 2.6; B(g, 0.2, 1.5, 0.2, M.log, x, 0.75, z0 - 0.5); B(g, 0.36, 0.36, 0.36, glow('#ffc76a'), x, 1.65, z0 - 0.5, true); B(g, 0.48, 0.08, 0.48, M.dark, x, 1.87, z0 - 0.5); }
  bake(g); scene.add(g);
  // the glow from below: a light down in the hole, a warm haze over it and sparks drifting up
  addLamp(scene, cx, -1.2, z0 + 3, 2.4, 3.2, 10, '#ffbf4a'); addLamp(scene, cx, 1.2, z0 + 0.6, 0.6, 1.4, 6, '#ffd27a');
  const glowFloor = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.4), new THREE.MeshBasicMaterial({ color: lin('#ffcf5a') })); glowFloor.rotation.x = -Math.PI / 2; glowFloor.position.set(cx, FLOOR - (z1 - z0) * 0.62 + 0.02, z1 - 1.3); scene.add(glowFloor);
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(w, z1 - z0), additive('#ffa21a', 0.16)); haze.rotation.x = -Math.PI / 2; haze.position.set(cx, 0.22, (z0 + z1) / 2); haze.renderOrder = 4; scene.add(haze);
  const beams = []; for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9 + i * 0.4, 3.2), additive('#ffd86a', 0.12)); m.position.set(cx + (i - 1) * 1.1, 1.3, z0 + 1.6 + i * 0.9); m.renderOrder = 4; scene.add(m); beams.push(m); }
  const sparks = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), glow('#ffe08a')); scene.add(m); sparks.push({ m, s: Math.random() * 10, x: (Math.random() - 0.5) * (w - 0.6), z: z0 + 0.5 + Math.random() * 3 }); }
  return {
    labelAt: [cx, 2.9, z0 + 1.2],
    top: [cx, z0 - 0.7],
    update(time) {
      const p = 0.5 + Math.sin(time * 1.8) * 0.5;
      haze.material.opacity = 0.1 + p * 0.1; beams.forEach((b, i) => { b.material.opacity = 0.05 + Math.sin(time * 1.3 + i * 1.7) * 0.03; });
      for (const s of sparks) { const k = (time * 0.25 + s.s) % 1; s.m.position.set(cx + s.x + Math.sin(time + s.s) * 0.2, -0.8 + k * 3.4, s.z); s.m.scale.setScalar(Math.sin(k * Math.PI)); }
    },
  };
}

/* ── the Hideout ── */
const oak = lam({ map: tex(16, 16, (g) => { speck(g, 16, 16, ['#5a3a22', '#53351f', '#603f26'], rng(51)); fill(g, '#3a2413', 0, 0, 16, 1); fill(g, '#3a2413', 0, 15, 16, 1); fill(g, '#3a2413', 0, 0, 1, 16); fill(g, '#704a2c', 1, 1, 14, 1); fill(g, '#3a2413', 7, 2, 1, 12); }) });
const shelf = lam({ map: tex(16, 16, (g) => { speck(g, 16, 16, ['#9a6a3e', '#8f6238'], rng(52)); fill(g, '#5a3a1f', 0, 0, 16, 2); fill(g, '#5a3a1f', 0, 7, 16, 2); fill(g, '#5a3a1f', 0, 14, 16, 2);
  const r = rng(53); for (const y0 of [2, 9]) { let x = 1; while (x < 15) { const w = 1 + (r() * 2 | 0); fill(g, ['#a3342e', '#2f66c4', '#3d7d40', '#c98a2b', '#7a3fb4', '#e9e2cf'][r() * 6 | 0], x, y0, w, 5); fill(g, 'rgba(0,0,0,.25)', x + w - 1, y0, 1, 5); x += w; } } }) });
const planksTop = lam({ map: tex(16, 16, (g) => { speck(g, 16, 16, ['#b98a52', '#ad7f4a'], rng(54)); fill(g, '#7a5530', 0, 4, 16, 1); fill(g, '#7a5530', 0, 9, 16, 1); fill(g, '#7a5530', 0, 14, 16, 1); }) });
const bookshelf = [shelf, shelf, planksTop, planksTop, shelf, shelf];
const cream = lam({ map: tex(16, 16, (g) => speck(g, 16, 16, ['#e6dfcc', '#e1dac6', '#ebe5d4'], rng(55))) });
const loader = new THREE.TextureLoader();

export function buildHideout(scene) {
  const { cx, cz } = HIDEOUT, X = (x) => cx + x, Z = (z) => cz + z;
  const g = new THREE.Group(); g.position.set(cx, 0, cz); // local coordinates from here on
  const solid = (x0, x1, z0, z1, h) => collide(X(x0), X(x1), Z(z0), Z(z1), h);
  const W0 = HIDEOUT.x0, W1 = HIDEOUT.x1, D0 = HIDEOUT.z0, D1 = HIDEOUT.z1, H = 6.4, F = FLOOR;
  const door = { x: HIDEOUT.doorX, w: 2, h: 3.2 }, win = { x: -4, w: 4.4, y0: 1.4, y1: 5.2 }, bz = D0 - 0.5;
  const music = { x: 1.5 }, galleryX = [5.15, 7.48, 9.81];
  const columnsAt = [W0 + 0.65, -7.4, -0.6, 3.6, W1 - 0.65];

  /* floor: grey stone with a terracotta border and checkered bands */
  {
    const w = W1 - W0, d = D1 - D0, r = rng(45);
    const c = cv(w * 16, d * 16, (g2) => {
      const tile = (i, j, red) => { const pal = red ? ['#8a4b38', '#80452f', '#93523c', '#7a4230'] : ['#6c6862', '#65615b', '#726e67', '#5e5a55']; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g2.fillStyle = pal[(r() * pal.length) | 0]; g2.fillRect(i * 16 + x, j * 16 + y, 1, 1); } g2.fillStyle = red ? '#5a2e22' : '#4a4743'; g2.fillRect(i * 16, j * 16, 16, 1); g2.fillRect(i * 16, j * 16, 1, 16); };
      for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { const ring = Math.min(i, j, w - 1 - i, d - 1 - j); tile(i, j, ring === 1 || (ring > 2 && j % 4 === 1 && i % 2 === 0)); }
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ map: toTex(c, false) })); floor.rotation.x = -Math.PI / 2; floor.position.set((W0 + W1) / 2, F, (D0 + D1) / 2); g.add(floor);
  }

  /* walls: brick above a dark oak wainscot, a carved stone band, and a dark cornice.
     The back wall has the way out (left), the window (middle), the music corner and the gallery (right).
     The front wall is only a low stub so nothing stands between the camera and the room. */
  const wall = (x0, x1, y0, y1) => B(g, x1 - x0, y1 - y0, 1, stoneBrick, (x0 + x1) / 2, (y0 + y1) / 2, bz);
  wall(W0 - 1, door.x - door.w / 2, 0, H); wall(door.x - door.w / 2, door.x + door.w / 2, door.h, H); wall(door.x + door.w / 2, win.x - win.w / 2, 0, H);
  wall(win.x - win.w / 2, win.x + win.w / 2, 0, win.y0); wall(win.x - win.w / 2, win.x + win.w / 2, win.y1, H); wall(win.x + win.w / 2, W1 + 1, 0, H);
  for (const s of [-1, 1]) B(g, 1, H, D1 - D0 + 1, stoneBrick, s < 0 ? W0 - 0.5 : W1 + 0.5, H / 2, (D0 + D1) / 2 - 0.5);
  B(g, W1 - W0 + 2, 0.9, 1, stoneBrick, (W0 + W1) / 2, 0.45, D1 + 0.5);
  const band = flat('#8a7a66'), rail = flat('#8a5a36');
  // back wall: wainscot panels in each bay, a rail on top, and the stone band higher up
  const bays = [[W0, door.x - door.w / 2], [door.x + door.w / 2, win.x - win.w / 2 - 0.4], [win.x + win.w / 2 + 0.4, W1]];
  for (const [a, b] of bays) { B(g, b - a, 1.3, 0.12, oak, (a + b) / 2, 0.65, D0 + 0.06); B(g, b - a, 0.14, 0.2, rail, (a + b) / 2, 1.36, D0 + 0.1); }
  B(g, W1 - W0, 0.3, 0.14, band, 0, 4.75, D0 + 0.07); B(g, W1 - W0, 0.08, 0.2, rail, 0, 4.58, D0 + 0.1);
  B(g, W1 - W0 + 2.2, 0.36, 1.2, M.dark, 0, H + 0.18, bz);
  // side walls: the same wainscot, rail and band on their inner faces
  for (const s of [-1, 1]) {
    const x = s < 0 ? W0 : W1;
    B(g, 0.12, 1.3, D1 - D0, oak, x - s * 0.06, 0.65, 0); B(g, 0.2, 0.14, D1 - D0, rail, x - s * 0.1, 1.36, 0);
    B(g, 0.14, 0.3, D1 - D0, band, x - s * 0.07, 4.75, 0); B(g, 1.2, 0.36, D1 - D0 + 1.2, M.dark, x + s * 0.5, H + 0.18, -0.5);
  }
  // wooden columns with stone bases and capitals; torches on the inner ones
  const torches = [];
  columnsAt.forEach((x) => {
    B(g, 0.9, H, 0.8, column, x, H / 2, D0 + 0.35); B(g, 1.15, 0.45, 1.05, band, x, 0.22, D0 + 0.45); B(g, 1.15, 0.35, 1.05, band, x, H - 0.4, D0 + 0.45); B(g, 1.05, 0.12, 0.95, rail, x, 4.75, D0 + 0.42);
    solid(x - 0.6, x + 0.6, D0, D0 + 1, 6);
    if (Math.abs(x) < 8) { B(g, 0.14, 0.5, 0.14, M.dark, x, 2.75, D0 + 0.9); B(g, 0.3, 0.08, 0.3, M.dark, x, 3.0, D0 + 0.9); const f = B(g, 0.22, 0.26, 0.22, glow('#ffb347'), x, 3.18, D0 + 0.9, true); f.userData.keep = true; torches.push(f); }
  });
  addLamp(g, -7.4, 3.2, D0 + 1.8, 1.2, 1.5, 9, '#ffb35a'); addLamp(g, 1.5, 3, D0 + 2.2, 1.2, 1.5, 9, '#ffb35a'); addLamp(g, 7.5, 3.4, D0 + 2.2, 1.0, 1.3, 9, '#ffcf8a');
  addLamp(g, 0, 2.6, 2.4, 0.8, 1.2, 12, '#ffc27a');

  /* the way out: a glowing doorway with steps climbing into a short tunnel */
  for (let i = 0; i < 5; i++) B(g, door.w, 0.4 * (i + 1), 0.5, caveStep, door.x, 0.2 * (i + 1), bz - 0.35 - i * 0.45);
  B(g, door.w + 0.2, door.h + 0.6, 0.6, stoneBrick, door.x, (door.h + 0.6) / 2, bz - 2.8); for (const s of [-1, 1]) B(g, 0.5, door.h + 0.6, 2.4, stoneBrick, door.x + s * (door.w / 2 + 0.25), (door.h + 0.6) / 2, bz - 1.6); B(g, door.w + 1, 0.5, 2.6, stoneBrick, door.x, door.h + 0.35, bz - 1.6);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(door.w, door.h), additive('#ffd060', 0.5)); portal.position.set(door.x, door.h / 2, bz + 0.52); portal.renderOrder = 4; g.add(portal);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(door.w * 0.6, door.h * 0.8), additive('#fff2c0', 0.3)); core.position.set(door.x, door.h * 0.42, bz + 0.54); core.renderOrder = 5; g.add(core);
  B(g, door.w + 0.6, 0.4, 1.3, M.dark, door.x, door.h + 0.2, bz + 0.1); for (const s of [-1, 1]) B(g, 0.3, door.h, 1.2, M.dark, door.x + s * (door.w / 2 + 0.15), door.h / 2, bz + 0.1);
  addLamp(g, door.x, 1.6, D0 + 1.4, 1.2, 1.5, 7, '#ffcf5a');
  // a stained-glass panel over the doorway, lit from behind
  { const sg = toTex(cv(16, 8, (g2) => { const pal = ['#ffd84a', '#62a8ff', '#d8403a', '#57d47c', '#b68cff']; for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) fill(g2, (x + y) % 4 === 0 || (x - y + 16) % 4 === 0 ? '#2a1c14' : pal[((x >> 1) + (y >> 1)) % pal.length], x, y, 1, 1); fill(g2, '#fff2b0', 7, 2, 2, 4); }), false);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshBasicMaterial({ map: sg, fog: false })); m.position.set(door.x, door.h + 1.0, D0 + 0.03); g.add(m);
    B(g, 1.95, 0.14, 0.12, M.dark, door.x, door.h + 1.48, D0 + 0.06); B(g, 1.95, 0.14, 0.12, M.dark, door.x, door.h + 0.52, D0 + 0.06); for (const sx of [-1, 1]) B(g, 0.14, 1.1, 0.12, M.dark, door.x + sx * 0.92, door.h + 1.0, D0 + 0.06); }

  /* the window: stained glass round the edge, the sky in the middle. Two panes cross-fade
     with the theme: a sunny sky by day and a starry one by night. */
  const winTex = (night) => toTex(cv(44, 38, (g2) => {
    const r = rng(night ? 47 : 46);
    for (let y = 0; y < 38; y++) for (let x = 0; x < 44; x++) {
      const edge = x < 4 || x > 39 || y < 4 || y > 33; let c;
      if (edge) { const k = ((x / 4) | 0) + ((y / 4) | 0); c = night ? ['#1d2a5a', '#2b3a7a', '#3a2a50', '#24346a'][k % 4] : ['#ffd84a', '#62a8ff', '#ffc27a', '#2f66c4', '#fff2b0'][k % 5]; }
      else if (night) { c = y < 20 ? '#0d1430' : '#141d42'; if (r() < 0.035) c = r() < 0.3 ? '#ffe08a' : '#cfe6ff'; }
      else { c = y < 12 ? '#7fc4ff' : y < 24 ? '#a8daff' : '#cfeeff'; }
      fill(g2, c, x, y, 1, 1);
    }
    if (night) { fill(g2, '#f1efe6', 28, 8, 6, 6); fill(g2, '#0d1430', 30, 7, 5, 5); }
    else { fill(g2, '#fff2b0', 27, 7, 7, 7); fill(g2, '#ffffff', 29, 9, 3, 3); fill(g2, '#ffffff', 9, 12, 9, 3); fill(g2, '#ffffff', 11, 10, 5, 2); fill(g2, '#eef8ff', 16, 22, 10, 2); }
    g2.fillStyle = 'rgba(20,16,12,.85)'; for (let x = 4; x < 41; x += 9) g2.fillRect(x, 0, 1, 38); for (let y = 4; y < 35; y += 10) g2.fillRect(0, y, 44, 1);
  }), false);
  const paneW = win.w, paneH = win.y1 - win.y0;
  const dayPane = new THREE.Mesh(new THREE.PlaneGeometry(paneW, paneH), new THREE.MeshBasicMaterial({ map: winTex(false), fog: false }));
  const nightPane = new THREE.Mesh(new THREE.PlaneGeometry(paneW, paneH), new THREE.MeshBasicMaterial({ map: winTex(true), transparent: true, opacity: 0, fog: false }));
  for (const [m, z] of [[dayPane, 0], [nightPane, 0.01]]) { m.position.set(win.x, (win.y0 + win.y1) / 2, bz + z); g.add(m); }
  B(g, paneW + 0.6, 0.3, 1.3, M.dark, win.x, win.y0 - 0.1, bz + 0.15); B(g, paneW + 0.5, 0.3, 1.1, M.dark, win.x, win.y1 + 0.1, bz);
  for (const s of [-1, 1]) B(g, 0.3, paneH + 0.5, 1.15, M.dark, win.x + s * (paneW / 2 + 0.15), (win.y0 + win.y1) / 2, bz + 0.05);
  // a planter box of flowers on the sill
  B(g, paneW - 0.3, 0.34, 0.42, M.planks, win.x, win.y0 + 0.22, D0 + 0.12); B(g, paneW - 0.4, 0.05, 0.34, flat('#4a2f1a'), win.x, win.y0 + 0.4, D0 + 0.12);
  ['#e9627a', '#ffd84a', '#f1efe6', '#b68cff', '#ff9a3d', '#e9627a', '#62c8ff', '#ffd84a'].forEach((c, i) => { const fx = win.x - (paneW - 0.8) / 2 + i * ((paneW - 0.8) / 7), fh = 0.22 + ((i * 7) % 3) * 0.07; B(g, 0.05, fh, 0.05, flat('#3d7d40'), fx, win.y0 + 0.42 + fh / 2, D0 + 0.12 + ((i % 2) - 0.5) * 0.12, true); B(g, 0.15, 0.13, 0.15, flat(c), fx, win.y0 + 0.47 + fh, D0 + 0.12 + ((i % 2) - 0.5) * 0.12, true); B(g, 0.14, 0.05, 0.08, flat('#57a84a'), fx + 0.07, win.y0 + 0.5, D0 + 0.12, true); });
  // the light falling through it: a slanted shaft and a bright patch on the floor
  const shaftGeo = new THREE.BufferGeometry(), top = [[-paneW / 2 + 0.2, win.y1 - 0.2, bz + 0.5], [paneW / 2 - 0.2, win.y1 - 0.2, bz + 0.5], [paneW / 2 - 0.2, win.y0 + 0.2, bz + 0.5], [-paneW / 2 + 0.2, win.y0 + 0.2, bz + 0.5]];
  const foot0 = [[-1.7, F + 0.02, -1.4], [2.5, F + 0.02, -1.4], [2.5, F + 0.02, -4.6], [-1.7, F + 0.02, -4.6]], alpha = [];
  // the light's foot on the floor slides with the visitor's time of day (morning to the right, evening to the left)
  const shaftPos = (dx) => { const pos = [], foot = foot0.map(([x, y, z]) => [x + dx, y, z]); for (let i = 0; i < 4; i++) { const a = top[i], b = top[(i + 1) % 4], c2 = foot[(i + 1) % 4], d2 = foot[i]; pos.push(...a, ...b, ...c2, ...a, ...c2, ...d2); } return pos; };
  for (let i = 0; i < 4; i++) alpha.push(1, 1, 0.2, 1, 0.2, 0.2);
  shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute(shaftPos(0), 3)); shaftGeo.setAttribute('color', new THREE.Float32BufferAttribute(alpha.flatMap((a) => [a, a, a]), 3));
  const shaftMat = new THREE.MeshBasicMaterial({ color: lin('#ffd98a'), vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat); shaft.position.x = win.x; shaft.renderOrder = 6; g.add(shaft);
  const patchTex = toTex(cv(42, 32, (g2) => { g2.fillStyle = '#fff'; for (let y = 0; y < 32; y += 8) for (let x = 0; x < 42; x += 9) g2.fillRect(x + 1, y + 1, 7, 6); }), false);
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ map: patchTex, color: lin('#ffd98a'), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  patch.rotation.x = -Math.PI / 2; patch.position.set(win.x + 0.4, F + 0.03, -3); patch.renderOrder = 6; g.add(patch);

  /* the dais under the window, with the journal stand on it */
  const DH = 0.3, dx = win.x;
  B(g, 5.4, DH, 2.6, band, dx, DH / 2, D0 + 1.3); B(g, 5.5, 0.06, 2.7, rail, dx, DH, D0 + 1.3); B(g, 4.2, 0.15, 0.6, caveStep, dx, 0.075, D0 + 2.9);
  B(g, 1.6, 0.04, 2, M.carpet, dx, DH + 0.04, D0 + 1.5); B(g, 1.6, 0.04, 0.6, M.carpet, dx, 0.17, D0 + 2.9);
  solid(dx - 2.7, dx + 2.7, D0, D0 + 2.6, DH + F); solid(dx - 2.1, dx + 2.1, D0 + 2.6, D0 + 3.2, 0.15 + F);
  const lectern = new THREE.Group(); lectern.position.set(dx, DH, D0 + 1.6);
  B(lectern, 0.9, 0.12, 0.7, M.planks, 0, 0.06, 0); B(lectern, 0.36, 1.0, 0.36, M.log, 0, 0.6, 0);
  const slope = new THREE.Group(); slope.position.set(0, 1.15, 0); slope.rotation.x = 0.42; lectern.add(slope);
  B(slope, 1.1, 0.12, 0.8, M.planks, 0, 0, 0); B(slope, 1.0, 0.06, 0.62, flat('#5a2f22'), 0, 0.08, 0); B(slope, 0.44, 0.07, 0.56, wool('#f6f3e8'), -0.23, 0.13, 0); B(slope, 0.44, 0.07, 0.56, wool('#f1ead6'), 0.23, 0.13, 0);
  for (let k = 0; k < 4; k++) B(slope, 0.3, 0.02, 0.03, flat('#9a8f7a'), -0.25, 0.17, -0.15 + k * 0.1);
  B(slope, 0.05, 0.02, 0.7, flat('#c23b32'), 0.02, 0.17, 0.05);
  g.add(lectern); lectern.userData.prop = 'journal'; lectern.userData.keep = true;
  solid(dx - 0.5, dx + 0.5, D0 + 1.25, D0 + 1.95, 2);
  for (const s of [-1, 1]) { const x = dx + s * 2.2, z = D0 + 0.75; B(g, 0.3, 0.9, 0.3, M.dark, x, DH + 0.45, z); B(g, 0.14, 0.24, 0.14, flat('#f4f1e6'), x, DH + 1.02, z); B(g, 0.16, 0.18, 0.16, glow('#ffc76a'), x, DH + 1.23, z, true); }

  /* the music corner, against the back wall left of the gallery: a cabinet with the CD player
     and two little speakers on it, and a wall rack showing every CD, faces turned to the room */
  const mz = D0 + 0.5, mx = music.x, coverTex = {};
  const coverMat = (r) => { if (!coverTex[r.id]) { const t = loader.load(BASE + 'assets/images/cds/' + r.cover); t.encoding = THREE.sRGBEncoding; coverTex[r.id] = new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.35 }); } return coverTex[r.id]; };
  B(g, 2.7, 1.0, 0.9, oak, mx, 0.5 + F, mz); B(g, 2.85, 0.1, 1.0, rail, mx, 1.05 + F, mz);
  for (const s of [-1, 1]) { B(g, 1.1, 0.7, 0.04, flat('#4a2f1a'), mx + s * 0.62, 0.5 + F, mz + 0.47); B(g, 0.2, 0.06, 0.05, flat('#e4b93a'), mx + s * 0.62, 0.62 + F, mz + 0.5); }
  const deck = new THREE.Group(); deck.position.set(mx, 1.1 + F, mz + 0.05); g.add(deck); deck.userData.prop = 'music'; deck.userData.keep = true;
  B(deck, 1.3, 0.34, 0.85, cream, 0, 0.17, 0); B(deck, 0.24, 0.06, 0.12, flat('#2f2f36'), -0.45, 0.36, -0.3); B(deck, 0.24, 0.06, 0.12, flat('#2f2f36'), 0.15, 0.36, -0.3);
  for (let k = 0; k < 4; k++) B(deck, 0.14, 0.06, 0.1, flat(k === 3 ? '#f08a2a' : '#2f2f36'), 0.5, 0.35, -0.3 + k * 0.17);
  B(deck, 0.42, 0.02, 0.14, glow('#62e4ff'), 0.32, 0.345, 0.32, true);
  const deckDisc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), coverMat(RECORDS[0])); deckDisc.rotation.x = -Math.PI / 2; deckDisc.position.set(-0.12, 0.36, 0.02); deck.add(deckDisc);
  for (const s of [-1, 1]) { const sp = B(g, 0.42, 0.62, 0.42, flat('#2b2b30'), mx + s * 1.08, 1.41 + F, mz); for (const y of [1.25, 1.55]) B(g, 0.26, 0.2, 0.02, flat('#4a4a54'), mx + s * 1.08, y + F, mz + 0.22); }
  // the wall rack: two shelves, the CDs standing on them facing the room
  for (const y of [2.15, 3.3]) { B(g, 3.0, 0.1, 0.36, oak, mx, y, D0 + 0.18); for (const s of [-1, 1]) B(g, 0.08, 0.22, 0.32, M.dark, mx + s * 1.2, y - 0.14, D0 + 0.16); }
  const rack = [], slots = [[mx - 0.95, 2.62], [mx, 2.62], [mx + 0.95, 2.62], [mx - 0.48, 3.77], [mx + 0.48, 3.77]];
  RECORDS.slice(0, 5).forEach((r, i) => {
    const [x, y] = slots[i], halo = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), additive(r.color, 0)); halo.position.set(x, y, D0 + 0.2); halo.renderOrder = 3; g.add(halo);
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), coverMat(r)); m.position.set(x, y, D0 + 0.26); m.rotation.x = -0.1; m.userData.prop = 'music'; g.add(m); rack.push({ id: r.id, m, halo });
  });
  solid(mx - 1.4, mx + 1.4, D0, D0 + 1, 2);
  // little music notes that rise from the player while a CD spins
  const noteTex = toTex(cv(8, 8, (g2) => { fill(g2, '#fff', 4, 0, 1, 6); fill(g2, '#fff', 5, 0, 2, 1); fill(g2, '#fff', 6, 1, 1, 1); fill(g2, '#fff', 1, 4, 4, 3); }), false);
  const notes = ['#ffd84a', '#62e4ff', '#ff8ad8', '#57d47c'].map((c, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, color: lin(c), transparent: true, depthWrite: false, fog: false })); m.scale.setScalar(0.4); g.add(m); return { m, s: i / 4 }; });

  /* the gallery: a fabric panel framed in gold, three paintings on it, each with a picture light and a plaque */
  const gx0 = 4.05, gx1 = 10.9;
  B(g, gx1 - gx0, 2.9, 0.06, wool('#4a1d2c'), (gx0 + gx1) / 2, 3.0, D0 + 0.03); B(g, gx1 - gx0 + 0.16, 0.1, 0.1, flat('#c98a2b'), (gx0 + gx1) / 2, 4.5, D0 + 0.05); B(g, gx1 - gx0 + 0.16, 0.1, 0.1, flat('#c98a2b'), (gx0 + gx1) / 2, 1.5, D0 + 0.05);
  const frames = [];
  GALLERY.slice(0, 3).forEach((p, i) => {
    const x = galleryX[i], y = 3.0, pw = 1.8, ph = 1.35;
    B(g, pw + 0.24, ph + 0.24, 0.1, M.dark, x, y, D0 + 0.11); B(g, pw + 0.1, ph + 0.1, 0.12, flat('#e4b93a'), x, y, D0 + 0.12);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshLambertMaterial({ map: toTex(cv(32, 24, (g2) => drawPainting(g2, p.art)), false) })); pic.position.set(x, y, D0 + 0.185); pic.userData.keep = true; pic.userData.prop = 'gallery'; g.add(pic); frames.push(pic);
    B(g, 0.06, 0.06, 0.34, flat('#a8761e'), x, y + ph / 2 + 0.28, D0 + 0.25); B(g, 0.5, 0.1, 0.14, flat('#a8761e'), x, y + ph / 2 + 0.24, D0 + 0.42); B(g, 0.44, 0.04, 0.1, glow('#fff2c0'), x, y + ph / 2 + 0.18, D0 + 0.42, true);
    B(g, 0.6, 0.18, 0.05, flat('#c99a36'), x, y - ph / 2 - 0.3, D0 + 0.08);
  });
  B(g, 3.2, 0.16, 0.7, M.planks, 7.48, 0.55 + F, -4.3); for (const s of [-1, 1]) B(g, 0.18, 0.48, 0.6, M.dark, 7.48 + s * 1.4, 0.24 + F, -4.3);
  solid(5.8, 9.2, -4.7, -3.9, 0.7);

  /* the library corner, front left: bookshelves round an enchanting table, with a floating book */
  const lib = { x: -9, z: 4.8 };
  { const rug = cv(32, 32, (g2) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const e = Math.min(x, y, 31 - x, 31 - y); fill(g2, e < 2 ? '#3a2050' : e < 4 ? '#c98a2b' : (x + y) % 6 < 3 ? '#5a2f86' : '#4a2470', x, y, 1, 1); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.2), lam({ map: toTex(rug, false) })); m.rotation.x = -Math.PI / 2; m.position.set(lib.x + 0.2, F + 0.012, lib.z + 0.2); g.add(m); }
  const shelfAt = [];
  for (let z = 2.5; z <= 6.5; z++) shelfAt.push([-11.5, z, 2]);
  for (let x = -10.5; x <= -7.5; x++) shelfAt.push([x, 2.5, 2]);
  shelfAt.push([-6.5, 2.5, 1], [-6.5, 3.5, 1]);
  for (const [x, z, h] of shelfAt) { for (let k = 0; k < h; k++) B(g, 1, 1, 1, bookshelf, x, 0.5 + k + F, z); solid(x - 0.5, x + 0.5, z - 0.5, z + 0.5, h + F); }
  [[-11.5, 6.5, 2], [-7.5, 2.5, 2], [-6.5, 3.5, 1]].forEach(([x, z, h]) => { B(g, 0.16, 0.24, 0.16, flat('#f4f1e6'), x, h + 0.12 + F, z); B(g, 0.18, 0.18, 0.18, glow('#ffc76a'), x, h + 0.33 + F, z, true); });
  const ench = lam({ map: tex(16, 16, (g2) => { speck(g2, 16, 16, ['#1d1530', '#241a3a', '#18122a'], rng(56)); fill(g2, '#a3342e', 0, 0, 16, 3); fill(g2, '#62e4ff', 2, 6, 2, 2); fill(g2, '#62e4ff', 12, 6, 2, 2); fill(g2, '#3a2a50', 6, 9, 4, 4); }) });
  const enchTop = lam({ map: tex(16, 16, (g2) => { speck(g2, 16, 16, ['#a3342e', '#98202a', '#ad2a30'], rng(57)); for (const [x, y] of [[0, 0], [14, 0], [0, 14], [14, 14]]) fill(g2, '#62e4ff', x, y, 2, 2); fill(g2, '#1d1530', 5, 5, 6, 6); }) });
  B(g, 1, 0.75, 1, [ench, ench, enchTop, ench, ench, ench], lib.x, 0.375 + F, lib.z); solid(lib.x - 0.5, lib.x + 0.5, lib.z - 0.5, lib.z + 0.5, 0.75 + F);
  const book = new THREE.Group(); book.position.set(lib.x, 1.35 + F, lib.z); g.add(book); book.userData.keep = true;
  const pageL = new THREE.Group(), pageR = new THREE.Group(); book.add(pageL, pageR);
  B(pageL, 0.32, 0.03, 0.42, flat('#7a3f22'), -0.16, 0, 0); B(pageL, 0.28, 0.035, 0.38, wool('#f6f3e8'), -0.15, 0.02, 0);
  B(pageR, 0.32, 0.03, 0.42, flat('#7a3f22'), 0.16, 0, 0); B(pageR, 0.28, 0.035, 0.38, wool('#f6f3e8'), 0.15, 0.02, 0);
  addLamp(g, lib.x, 1.8, lib.z + 0.8, 0.9, 1.2, 6, '#b68cff');
  const glyphTex = toTex(cv(8, 8, (g2) => { fill(g2, '#fff', 1, 1, 1, 5); fill(g2, '#fff', 1, 1, 5, 1); fill(g2, '#fff', 4, 3, 1, 4); fill(g2, '#fff', 3, 6, 3, 1); }), false);
  const glyphs = []; for (let i = 0; i < 10; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTex, color: lin(i % 2 ? '#d6c6ff' : '#b68cff'), transparent: true, depthWrite: false, fog: false })); m.scale.setScalar(0.18); g.add(m); const [sx, sz, sh] = shelfAt[(i * 3) % shelfAt.length]; glyphs.push({ m, s: i / 10, sx, sz, sy: sh * 0.6 + 0.4 }); }

  /* furniture */
  // a reading nook on the left wall: the blue armchair, a side table with a candle, a floor lamp and a wall shelf
  { const ax = W0 + 0.85, az = -1.1;
    B(g, 1.1, 0.5, 1.1, wool('#2f66c4'), ax, 0.25 + F, az); B(g, 0.32, 0.95, 1.1, wool('#234a9e'), ax - 0.42, 0.72 + F, az); for (const s of [-1, 1]) B(g, 1.1, 0.7, 0.22, wool('#234a9e'), ax, 0.45 + F, az + s * 0.55);
    B(g, 0.8, 0.12, 0.6, wool('#e9e2cf'), ax + 0.05, 0.56 + F, az); solid(ax - 0.6, ax + 0.6, az - 0.7, az + 0.7, 1);
    B(g, 0.6, 0.06, 0.6, M.planks, ax, 0.7 + F, az + 1.2); B(g, 0.12, 0.66, 0.12, M.dark, ax, 0.35 + F, az + 1.2); B(g, 0.14, 0.22, 0.14, flat('#f4f1e6'), ax, 0.84 + F, az + 1.2); B(g, 0.16, 0.16, 0.16, glow('#ffc76a'), ax, 1.02 + F, az + 1.2, true); solid(ax - 0.35, ax + 0.35, az + 0.9, az + 1.5, 0.8);
    B(g, 0.12, 2.0, 0.12, M.dark, ax, 1.0 + F, az - 1.25); B(g, 0.5, 0.4, 0.5, wool('#e8d3a0'), ax, 2.1 + F, az - 1.25); B(g, 0.3, 0.06, 0.3, M.dark, ax, 0.03 + F, az - 1.25); solid(ax - 0.3, ax + 0.3, az - 1.5, az - 1, 2);
    B(g, 0.36, 0.08, 2.6, oak, W0 + 0.2, 2.6, az); [[-0.9, '#a3342e'], [-0.6, '#2f66c4'], [-0.35, '#3d7d40'], [0.2, '#c98a2b'], [0.5, '#7a3fb4']].forEach(([o, c]) => B(g, 0.24, 0.42, 0.14, flat(c), W0 + 0.22, 2.85, az + o)); B(g, 0.22, 0.26, 0.22, flat('#62c8ff'), W0 + 0.22, 2.77, az + 0.95);
    addLamp(g, ax + 0.6, 2.1, az - 0.6, 0.6, 1.0, 6, '#ffd9a0'); }
  // a cosy middle on a raised wooden floor: a big rug, a sofa facing the window and a low table
  { const L = 0.16, Y = F + L;
    const deckTop = lam({ map: tex(16, 16, (g2) => { speck(g2, 16, 16, ['#9a6a3e', '#8f6238', '#a3713f'], rng(61)); for (const y of [3, 7, 11, 15]) fill(g2, '#5a3a1f', 0, y, 16, 1); fill(g2, '#5a3a1f', 5, 0, 1, 3); fill(g2, '#5a3a1f', 11, 4, 1, 3); fill(g2, '#5a3a1f', 3, 8, 1, 3); fill(g2, '#5a3a1f', 9, 12, 1, 3); }) });
    deckTop.map.wrapS = deckTop.map.wrapT = THREE.RepeatWrapping;
    const plat = new THREE.Mesh(new THREE.BoxGeometry(7.2, L, 5.0), [M.planks, M.planks, deckTop, M.planks, M.planks, M.planks]); plat.position.set(1.4, F + L / 2 - 0.001, 1.75); g.add(plat);
    deckTop.map.repeat.set(7.2, 5.0);
    B(g, 7.3, 0.06, 0.12, rail, 1.4, Y + 0.01, -0.73); for (const sx of [-1, 1]) B(g, 0.12, 0.06, 5.0, rail, 1.4 + sx * 3.6, Y + 0.01, 1.75);
    solid(-2.2, 5.0, -0.75, 4.25, Y);
    const rug = cv(48, 32, (g2) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) { const e = Math.min(x, y, 47 - x, 31 - y); const k = (Math.abs(x - 23.5) + Math.abs(y - 15.5)) | 0; fill(g2, e < 2 ? '#5a2f22' : e < 3 ? '#e4b93a' : k % 8 < 2 ? '#c98a2b' : k % 8 < 4 ? '#a3342e' : '#7d2622', x, y, 1, 1); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.8), lam({ map: toTex(rug, false) })); m.rotation.x = -Math.PI / 2; m.position.set(1.4, Y + 0.012, 1.55); g.add(m);
    B(g, 3.2, 0.45, 0.95, wool('#6b3f22'), 1.4, 0.3 + Y, 3.4); B(g, 3.2, 0.7, 0.3, wool('#5a3a1f'), 1.4, 0.75 + Y, 3.75); for (const s2 of [-1, 1]) B(g, 0.3, 0.65, 0.95, wool('#5a3a1f'), 1.4 + s2 * 1.6, 0.45 + Y, 3.4);
    for (const s2 of [-1, 1]) B(g, 0.5, 0.45, 0.2, wool(s2 < 0 ? '#e4b93a' : '#2b9a88'), 1.4 + s2 * 0.9, 0.7 + Y, 3.55);
    solid(-0.35, 3.15, 2.9, 3.95, 1 + Y);
    B(g, 1.6, 0.1, 0.8, M.planks, 1.4, 0.45 + Y, 1.7); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, 0.1, 0.4, 0.1, M.dark, 1.4 + sx * 0.7, 0.2 + Y, 1.7 + sz * 0.32);
    B(g, 0.3, 0.06, 0.4, flat('#2f66c4'), 1.1, 0.53 + Y, 1.7); B(g, 0.2, 0.2, 0.2, flat('#f1efe6'), 1.8, 0.6 + Y, 1.6); solid(0.55, 2.25, 1.25, 2.15, 0.6 + Y);
    // a floor lamp at each back corner of the lounge
    for (const sx of [-1, 1]) { const lx = 1.4 + sx * 3.2; B(g, 0.1, 1.9, 0.1, M.dark, lx, Y + 0.95, 3.85); B(g, 0.46, 0.36, 0.46, wool('#e8d3a0'), lx, Y + 2.0, 3.85); B(g, 0.3, 0.06, 0.3, M.dark, lx, Y + 0.03, 3.85); solid(lx - 0.25, lx + 0.25, 3.6, 4.1, 2.2); }
    addLamp(g, 1.4, Y + 2.2, 3.2, 0.5, 1.0, 7, '#ffd9a0'); }
  // wall art: a world map with pins on the left wall, an Urban Expansion map over the desk on the right wall
  const framed = (canvas, w, h, x, y, z, facing) => {
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam({ map: toTex(canvas, false) })); pic.position.set(x + facing * 0.12, y, z); pic.rotation.y = facing * Math.PI / 2; pic.userData.keep = true; g.add(pic);
    B(g, 0.08, h + 0.26, w + 0.26, M.dark, x + facing * 0.05, y, z); B(g, 0.1, h + 0.12, w + 0.12, flat('#c98a2b'), x + facing * 0.06, y, z);
  };
  framed(cv(48, 28, (g2) => {
    fill(g2, '#2b5f8a', 0, 0, 48, 28); const r = rng(71); for (let i = 0; i < 40; i++) fill(g2, '#2f6a98', (r() * 48) | 0, (r() * 28) | 0, 2, 1);
    const land = '#c9b27a', dk = '#a8915a', blobs = [[4, 4, 9, 6], [7, 10, 5, 4], [10, 15, 4, 8], [20, 3, 5, 4], [21, 8, 6, 10], [27, 3, 15, 8], [33, 11, 6, 4], [38, 14, 4, 3], [40, 20, 6, 4], [13, 2, 3, 2]];
    for (const [x, y, w, h] of blobs) { fill(g2, land, x, y, w, h); fill(g2, dk, x, y + h - 1, w, 1); }
    for (const [x, y] of [[35, 12], [36, 13]]) { fill(g2, '#d8403a', x, y - 2, 1, 2); fill(g2, '#ff6a5a', x - 0.5 | 0, y - 3, 2, 1); }
    fill(g2, '#1d3f5e', 0, 27, 48, 1);
  }), 2.6, 1.5, W0 + 0.02, 2.9, -5.0, 1);
  framed(cv(40, 28, (g2) => {
    fill(g2, '#e8dcb6', 0, 0, 40, 28);
    for (const [r, c] of [[12, '#f3c9a0'], [9, '#e8a070'], [6, '#d8703f'], [3, '#a83a2a']]) for (let y = 0; y < 28; y++) for (let x = 0; x < 40; x++) if (Math.hypot((x - 19.5) * 0.8, y - 13.5) < r + Math.sin(x * 0.7 + y * 0.4) * 0.8) fill(g2, c, x, y, 1, 1);
    for (let i = 0; i < 28; i++) fill(g2, '#5a9ad0', 25 + Math.sin(i * 0.3) * 2 | 0, i, 2, 1);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) for (let k = -20; k < 20; k++) { const x = 19 + dx * k, y = 13 + dy * k; if (x >= 0 && x < 40 && y >= 0 && y < 28) fill(g2, '#5a3a1f', x, y, 1, 1); }
    fill(g2, '#3a2a1f', 0, 0, 40, 1); fill(g2, '#3a2a1f', 0, 27, 40, 1);
  }), 2.4, 1.6, W1 - 0.02, 3.0, -2.4, -1);
  B(g, 0.05, 0.16, 0.7, flat('#c99a36'), W1 - 0.06, 2.0, -2.4); B(g, 0.05, 0.16, 0.7, flat('#c99a36'), W0 + 0.06, 1.95, -5.0);
  // the fireplace in the right wall: a brick chimney breast, a stone mantel, a hearth and a fire
  const fx = W1, fz = 1.6, fire = [];
  { B(g, 1.1, H, 2.8, M.brick, fx - 0.55, H / 2, fz); B(g, 1.4, 0.24, 3.2, band, fx - 0.7, 2.3, fz); B(g, 1.2, 0.3, 3.0, M.dark, fx - 0.6, 0.15, fz);
    B(g, 0.06, 1.2, 1.6, flat('#141418'), fx - 1.12, 0.85, fz);
    for (const sz of [-1, 1]) B(g, 0.2, 1.5, 0.3, band, fx - 1.15, 0.9, fz + sz * 0.95); B(g, 0.2, 0.3, 2.2, band, fx - 1.15, 1.6, fz);
    B(g, 1.3, 0.12, 3.4, M.stone, fx - 1.2, F + 0.06, fz);
    B(g, 0.5, 0.2, 1.0, M.log, fx - 0.75, 0.38, fz); B(g, 0.4, 0.18, 0.9, M.log, fx - 0.8, 0.52, fz + 0.1);
    [['#ff8a2a', 0.5, 0.44, -0.3], ['#ffc24a', 0.42, 0.66, 0.15], ['#ffe08a', 0.3, 0.32, -0.02], ['#ff6a2a', 0.36, 0.5, 0.4]].forEach(([c, w, h, oz]) => { const f2 = B(g, 0.1, h, w, glow(c), fx - 0.95, 0.5 + h / 2, fz + oz, true); f2.userData.keep = true; fire.push({ m: f2, h }); });
    // things on the mantel
    B(g, 0.3, 0.4, 0.3, flat('#e4b93a'), fx - 0.75, 2.62, fz - 1.1); B(g, 0.3, 0.3, 0.6, flat('#2f66c4'), fx - 0.75, 2.57, fz + 0.9); B(g, 0.14, 0.26, 0.14, flat('#f4f1e6'), fx - 0.7, 2.55, fz + 0.2); B(g, 0.16, 0.16, 0.16, glow('#ffc76a'), fx - 0.7, 2.76, fz + 0.2, true);
    solid(fx - 1.25, fx, fz - 1.6, fz + 1.6, 6);
    addLamp(g, fx - 1.6, 1.0, fz, 1.2, 1.9, 9, '#ff8a3a'); }
  // a hearth rug and a cat asleep on it
  { const hr = cv(24, 16, (g2) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) { const e = Math.min(x, y, 23 - x, 15 - y); fill(g2, e < 1 ? '#5a2f22' : (x + y) % 4 < 2 ? '#2b6f9a' : '#234a7a', x, y, 1, 1); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), lam({ map: toTex(hr, false) })); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.position.set(fx - 2.3, F + 0.012, fz); g.add(m); }
  // the cat: an orange tabby curled up asleep, head on its paws and tail wrapped round.
  // It breathes, twitches an ear now and then and flicks its tail; pet it and it wakes up and meows.
  const cat = new THREE.Group(); cat.position.set(fx - 2.25, F + 0.012, fz + 0.1); cat.rotation.y = 0.6; cat.userData.keep = true; g.add(cat);
  const fur = flat('#e08a3a'), fur2 = flat('#b85f22'), pale = flat('#f6dcb8'), pink = flat('#f08a9a'), ink = flat('#2a1c14');
  const catBody = new THREE.Group(); cat.add(catBody);
  B(catBody, 0.62, 0.25, 0.4, fur, -0.02, 0.125, 0, true); B(catBody, 0.3, 0.3, 0.42, fur, -0.2, 0.15, 0, true);   // torso and haunch
  B(catBody, 0.2, 0.16, 0.36, pale, 0.2, 0.08, 0.02, true);                                                         // white chest
  for (const x of [-0.3, -0.16, -0.02, 0.12]) { B(catBody, 0.05, 0.02, 0.42, fur2, x, 0.256, 0, true); B(catBody, 0.05, 0.12, 0.02, fur2, x, 0.17, 0.205, true); B(catBody, 0.05, 0.12, 0.02, fur2, x, 0.17, -0.205, true); }
  for (const sz of [-1, 1]) B(catBody, 0.18, 0.08, 0.09, pale, 0.42, 0.04, sz * 0.09, true);                       // front paws
  B(catBody, 0.12, 0.08, 0.1, pale, -0.3, 0.04, 0.2, true);                                                         // a back paw peeking out
  const head = new THREE.Group(); head.position.set(0.3, 0.12, 0.02); catBody.add(head);
  B(head, 0.3, 0.24, 0.32, fur, 0.13, 0.08, 0, true); B(head, 0.08, 0.09, 0.17, pale, 0.29, 0.03, 0, true); B(head, 0.03, 0.03, 0.05, pink, 0.335, 0.075, 0, true);
  for (const sz of [-1, 1]) B(head, 0.06, 0.02, 0.02, flat('#f6f1e3'), 0.33, 0.03, sz * 0.1, true);                // whiskers
  B(head, 0.18, 0.02, 0.04, fur2, 0.12, 0.205, 0, true); B(head, 0.14, 0.02, 0.04, fur2, 0.12, 0.205, 0.08, true); B(head, 0.14, 0.02, 0.04, fur2, 0.12, 0.205, -0.08, true);
  const shut = new THREE.Group(), awake = new THREE.Group(); head.add(shut, awake); awake.visible = false;
  for (const sz of [-1, 1]) { B(shut, 0.02, 0.02, 0.08, ink, 0.285, 0.12, sz * 0.08, true); B(awake, 0.02, 0.07, 0.07, flat('#7ccf4a'), 0.285, 0.12, sz * 0.08, true); B(awake, 0.025, 0.06, 0.025, ink, 0.29, 0.12, sz * 0.08, true); }
  const ears = [-1, 1].map((sz) => { const e = new THREE.Group(); e.position.set(0.1, 0.2, sz * 0.1); head.add(e); B(e, 0.09, 0.11, 0.09, fur, 0, 0.055, 0, true); B(e, 0.02, 0.07, 0.05, pink, 0.046, 0.045, 0, true); return e; });
  // the tail: a chain of joints that curls round the front of the body
  const tail = []; { let parent = catBody, px = -0.33, pz = 0.05;
    for (let i = 0; i < 5; i++) { const j = new THREE.Group(); j.position.set(i ? 0.14 : px, i ? 0 : 0.06, i ? 0 : pz); j.rotation.y = i ? 0.48 : -2.6; parent.add(j); const w = 0.09 - i * 0.008; B(j, 0.15, w, w, i === 4 ? fur2 : i % 2 ? fur2 : fur, 0.07, 0, 0, true); tail.push(j); parent = j; } }
  const heartTex = toTex(cv(7, 6, (g2) => { fill(g2, '#ff5a7a', 1, 0, 2, 1); fill(g2, '#ff5a7a', 4, 0, 2, 1); fill(g2, '#ff5a7a', 0, 1, 7, 2); fill(g2, '#ff5a7a', 1, 3, 5, 1); fill(g2, '#ff5a7a', 2, 4, 3, 1); fill(g2, '#ff5a7a', 3, 5, 1, 1); fill(g2, '#ffc0cc', 1, 1, 1, 1); }), false);
  const hearts = [0, 1, 2].map((i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false, fog: false })); m.scale.setScalar(0.22); m.visible = false; g.add(m); return { m, s: i * 0.28 }; });
  const catHit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })); catHit.position.set(fx - 2.25, 0.3, fz + 0.1); catHit.userData.prop = 'cat'; g.add(catHit);
  let petT = -1, twitch = 0, twitchAt = 3, catT = 0;
  solid(fx - 2.65, fx - 1.85, fz - 0.3, fz + 0.5, 0.3);
  // the right wall: a writing desk with a chair, the chest, and the barrels and crates in the front corner
  { const ex = W1 - 0.55;
    B(g, 0.8, 0.1, 2.0, oak, ex, 0.95 + F, -2.4); for (const sz of [-1, 1]) B(g, 0.7, 0.9, 0.1, oak, ex, 0.45 + F, -2.4 + sz * 0.92);
    B(g, 0.5, 0.04, 0.6, wool('#f6f3e8'), ex, 1.02 + F, -2.6); B(g, 0.16, 0.2, 0.16, flat('#141418'), ex + 0.1, 1.1 + F, -2.0); B(g, 0.03, 0.3, 0.03, flat('#f1efe6'), ex + 0.12, 1.3 + F, -2.0);
    B(g, 0.14, 0.24, 0.14, flat('#f4f1e6'), ex, 1.12 + F, -3.2); B(g, 0.16, 0.16, 0.16, glow('#ffc76a'), ex, 1.32 + F, -3.2, true);
    B(g, 0.6, 0.08, 0.6, M.planks, ex - 1.0, 0.55 + F, -2.4); B(g, 0.08, 0.7, 0.6, M.planks, ex - 1.3, 0.9 + F, -2.4); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, 0.08, 0.5, 0.08, M.dark, ex - 1 + sx * 0.24, 0.25 + F, -2.4 + sz * 0.24);
    solid(ex - 0.45, W1, -3.45, -1.35, 1.1); solid(ex - 1.35, ex - 0.65, -2.75, -2.05, 1);
    B(g, 1.2, 0.8, 0.8, M.planks, 8.2, 0.4 + F, 6.6); B(g, 1.24, 0.12, 0.84, flat('#e4b93a'), 8.2, 0.62 + F, 6.6); solid(7.55, 8.85, 6.15, 7.05, 1);
    [[W1 - 0.9, 5.4], [W1 - 0.9, 6.5], [W1 - 2, 6.4]].forEach(([x, z]) => { B(g, 0.8, 1.0, 0.8, M.log, x, 0.5 + F, z); B(g, 0.84, 0.08, 0.84, M.dark, x, 0.75 + F, z); solid(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 1.2); });
    B(g, 0.9, 0.9, 0.9, M.planks, W1 - 2.1, 0.45 + F, 4.6); B(g, 0.6, 0.6, 0.6, M.planks, W1 - 2.0, 1.2 + F, 4.6); solid(W1 - 2.6, W1 - 1.6, 4.1, 5.1, 1.5); }

  bake(g); scene.add(g);

  // string lights along the top of the back wall: they sag between the columns and light up at night
  const bulbMat = [new THREE.MeshBasicMaterial({ color: lin('#ffd27a'), transparent: true, opacity: 0, fog: false }), new THREE.MeshBasicMaterial({ color: lin('#ffb0d0'), transparent: true, opacity: 0, fog: false }), new THREE.MeshBasicMaterial({ color: lin('#a8e6ff'), transparent: true, opacity: 0, fog: false })];
  { const pts = [W0 + 0.65, ...columnsAt.slice(1)], wire = flat('#2a1c14'); let k = 0;
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i] + 0.5, b = pts[i + 1] - 0.5, n = Math.max(3, Math.round((b - a) / 0.45));
      for (let j = 0; j <= n; j++) { const t = j / n, x = a + (b - a) * t, y = 5.55 - Math.sin(t * Math.PI) * 0.5; B(g, 0.46, 0.03, 0.03, wire, x, y + 0.05, D0 + 0.22, true); if (j && j < n) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.11), bulbMat[k++ % 3]); m.position.set(x, y - 0.04, D0 + 0.24); g.add(m); } } } }
  const bulbLight = addLamp(g, 0, 5.2, D0 + 1.4, 0, 0.6, 14, '#ffd9a0');

  // the library shelves are one thing you can click
  const libHit = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })); libHit.position.set(-9, 1.1, 4.5); libHit.userData.prop = 'library'; g.add(libHit);

  /* things you can use, in world coordinates. rect is measured from its edge, like the stalls. */
  const R = (x0, x1, z0, z1) => ({ x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1) });
  const props = [
    { id: 'music', key: 'useMusic', label: 'CD Player', color: '#e4b93a', rect: R(mx - 1.4, mx + 1.4, D0, D0 + 1), front: [X(mx), Z(D0 + 2.4)], labelAt: [X(mx), 4.7, Z(D0 + 0.6)] },
    { id: 'journal', key: 'useJournal', label: 'Journal', color: '#c98a4b', rect: R(dx - 0.6, dx + 0.6, D0 + 1.2, D0 + 2), front: [X(dx), Z(D0 + 3.6)], labelAt: [X(dx), 2.9, Z(D0 + 1.6)] },
    { id: 'gallery', key: 'useGallery', label: 'Gallery', color: '#b0409a', rect: R(gx0, gx1, D0, D0 + 0.6), front: [X(7.48), Z(-5.3)], labelAt: [X(7.48), 4.9, Z(D0 + 0.4)] },
    { id: 'library', key: 'useLibrary', label: 'Library', color: '#b68cff', rect: R(-12, -6.0, 2.0, 7.0), front: [X(-7.4), Z(5.3)], labelAt: [X(-9.2), 3.5, Z(2.6)] },
    { id: 'cat', key: 'petCat', range: 1.6, label: 'Cat', color: '#e08a3a', rect: R(fx - 2.65, fx - 1.85, fz - 0.3, fz + 0.5), front: [X(fx - 3.3), Z(fz + 0.1)], labelAt: [X(fx - 2.25), 1.3, Z(fz + 0.1)] },
    { id: 'exit', key: 'goUp', range: 1.4, label: 'Back to the Village', color: '#ffd060', rect: R(door.x - 1, door.x + 1, D0 - 0.6, D0 + 0.1), front: [X(door.x), Z(D0 + 1.4)], labelAt: [X(door.x), 4.3, Z(D0)] },
  ];
  const pickables = [deck, lectern, libHit, catHit, ...frames, ...rack.map((r) => r.m)];
  const v = new THREE.Vector3();
  let current = null, lastSun = -1;
  return {
    props, pickables,
    arrive: [X(door.x), Z(D0 + 2.3)],
    deckAt: [X(mx), 1.3 + F, Z(mz)],
    fireAt: [X(fx - 1.2), Z(fz)],
    musicRect: R(mx - 1.4, mx + 1.4, D0, D0 + 1),
    update(time, night, playing) {
      nightPane.material.opacity = night; dayPane.material.color.setScalar(1 - night * 0.6);
      shaftMat.opacity = 0.16 * (1 - night) + 0.05 * night; shaftMat.color.copy(lin('#ffd98a')).lerp(lin('#8fb0ff'), night);
      patch.material.opacity = 0.42 * (1 - night) + 0.12 * night; patch.material.color.copy(shaftMat.color);
      const p = 0.5 + Math.sin(time * 1.7) * 0.5; portal.material.opacity = 0.42 + p * 0.12; core.material.opacity = 0.18 + (1 - p) * 0.14;
      torches.forEach((t, i) => t.scale.set(1, 0.85 + Math.sin(time * 11 + i * 2) * 0.15, 1));
      if (playing) deckDisc.rotation.z = -time * 0.9;
      bulbMat.forEach((m, i) => { m.opacity = night * (0.75 + Math.sin(time * 2 + i * 2.1) * 0.25); }); 
      fire.forEach((f2, i) => { f2.m.scale.y = 0.75 + Math.sin(time * (9 + i * 2.3) + i) * 0.18 + Math.sin(time * 23 + i * 5) * 0.07; });
      // the cat: breathing, an ear twitch every few seconds and a lazy tail; petting wakes it for a few seconds
      { const cdt = Math.min(0.1, Math.max(0, time - catT)); catT = time;
        const pet = petT >= 0 ? Math.min(1, petT / 0.35) * Math.min(1, (3.2 - petT) / 0.6) : 0;
        if (petT >= 0) { petT += cdt; if (petT > 3.2) petT = -1; }
        catBody.scale.y = 1 + Math.sin(time * 1.3) * 0.035 * (1 - pet) + pet * 0.06 + (pet > 0 ? Math.sin(time * 40) * 0.006 : 0);
        head.rotation.z = pet * 0.45 + Math.sin(time * 0.6) * 0.03; head.rotation.y = pet * Math.sin(time * 2) * 0.15;
        shut.visible = pet < 0.4; awake.visible = pet >= 0.4;
        if (time > twitchAt) { twitch = 1; twitchAt = time + 3 + Math.random() * 5; }
        twitch = Math.max(0, twitch - cdt * 3); ears.forEach((e, i) => { e.rotation.x = (i ? -1 : 1) * (Math.sin(twitch * Math.PI * 3) * 0.25 * twitch) ; e.rotation.z = pet * 0.2; });
        tail.forEach((j, i) => { if (i) j.rotation.y = 0.48 + Math.sin(time * (1.1 + pet * 4) - i * 0.7) * (0.06 + i * 0.03) * (1 + pet * 2.5); });
        hearts.forEach((h) => { const k = petT >= 0 ? (petT - h.s) / 1.6 : -1; h.m.visible = k > 0 && k < 1; if (h.m.visible) { h.m.position.set(cat.position.x + 0.2 + Math.sin(k * 6 + h.s * 9) * 0.15, F + 0.7 + k * 1.1, cat.position.z + (h.s - 0.28) * 0.6); h.m.material.opacity = Math.sin(k * Math.PI); } }); }
      if (time - lastSun > 20 || lastSun < 0) { lastSun = time; const d = new Date(), h = d.getHours() + d.getMinutes() / 60, dx = Math.max(-1.6, Math.min(1.6, (12.5 - h) * 0.32)); shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute(shaftPos(dx), 3)); patch.position.x = win.x + 0.4 + dx; }
      rack.forEach((r) => { r.halo.material.opacity = r.id === current ? (playing ? 0.35 + p * 0.15 : 0.18) : 0; });
      notes.forEach((n) => { const k = (time * 0.32 + n.s) % 1; n.m.visible = playing; v.set(mx - 0.1 + Math.sin(k * 6 + n.s * 9) * 0.45, 1.7 + k * 2.0 + F, mz + 0.5); n.m.position.copy(v); n.m.material.opacity = Math.sin(k * Math.PI); });
      // the enchanting table's book bobs and turns, its pages breathing open and shut; glyphs drift in from the shelves
      book.position.y = 1.35 + F + Math.sin(time * 1.6) * 0.07; book.rotation.y = Math.sin(time * 0.5) * 0.9; const o = 0.35 + Math.sin(time * 1.2) * 0.3; pageL.rotation.z = o; pageR.rotation.z = -o;
      glyphs.forEach((gl) => { const k = (time * 0.22 + gl.s) % 1; gl.m.position.set(gl.sx + (lib.x - gl.sx) * k, gl.sy + F + Math.sin(k * Math.PI) * 0.6 + (1.2 - gl.sy) * k, gl.sz + (lib.z - gl.sz) * k); gl.m.material.opacity = Math.sin(k * Math.PI) * 0.9; });
    },
    pet() { petT = 0; },
    setDisc(id) { const r = RECORDS.find((q) => q.id === id) || RECORDS[0]; current = r.id; deckDisc.material = coverMat(r); },
  };
}
