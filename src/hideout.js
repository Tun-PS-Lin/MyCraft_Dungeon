// The cave at the bottom of the square, and the Hideout it leads to: a private underground
// room with a music box, a journal on a stand, a small gallery of side projects and a big
// window that shows the sky, sunny by day and starry by night.
// The room is built far to the south of the village; travelling there is a quick fade.
import * as THREE from 'three';
import { CAVE, HIDEOUT, FLOOR } from './config.js';
import { RECORDS, GALLERY } from './hideout-content.js';
import { B, M, cv, speck, fill, toTex, rng, glow, flat, wool, lin, bake } from './textures.js';
import { collide } from './collision.js';
import { addLamp } from './lights.js';
import { drawDisc, drawPainting } from './pixelart.js';

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
export function buildHideout(scene) {
  const { cx, cz } = HIDEOUT, X = (x) => cx + x, Z = (z) => cz + z;
  const g = new THREE.Group(); g.position.set(cx, 0, cz); // local coordinates from here on
  const solid = (x0, x1, z0, z1, h) => collide(X(x0), X(x1), Z(z0), Z(z1), h);
  const W0 = HIDEOUT.x0, W1 = HIDEOUT.x1, D0 = HIDEOUT.z0, D1 = HIDEOUT.z1, H = 6;

  /* floor: grey stone with a terracotta border and a checkered rug of tiles in the middle */
  {
    const w = W1 - W0, d = D1 - D0, r = rng(45);
    const c = cv(w * 16, d * 16, (g2) => {
      for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
        const ring = Math.min(i, j, w - 1 - i, d - 1 - j), mid = i > 5 && i < w - 6 && j > 5 && j < d - 2, red = ring === 1 || (mid && (i + j) % 2 === 0);
        speck(g2, 16, 16, red ? ['#8a4b38', '#80452f', '#93523c', '#7a4230'] : ['#6c6862', '#65615b', '#726e67', '#5e5a55'], r);
        g2.drawImage(g2.canvas, 0, 0, 16, 16, i * 16, j * 16, 16, 16);
        g2.fillStyle = red ? '#5a2e22' : '#4a4743'; g2.fillRect(i * 16, j * 16, 16, 1); g2.fillRect(i * 16, j * 16, 1, 16);
      }
      speck(g2, 16, 16, ['#6c6862'], r);
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ map: toTex(c, false) })); floor.rotation.x = -Math.PI / 2; floor.position.set((W0 + W1) / 2, FLOOR, (D0 + D1) / 2); g.add(floor);
  }
  /* walls. The back wall has the way out (left), the window (middle) and the gallery (right).
     The front wall is only a low stub so nothing stands between the camera and the room. */
  const door = { x: -8.5, w: 2, h: 3.2 }, win = { x: 0, w: 4.4, y0: 1.4, y1: 5.2 }, bz = D0 - 0.5;
  const wall = (x0, x1, y0, y1) => B(g, x1 - x0, y1 - y0, 1, stoneBrick, (x0 + x1) / 2, (y0 + y1) / 2, bz);
  wall(W0 - 1, door.x - door.w / 2, 0, H); wall(door.x - door.w / 2, door.x + door.w / 2, door.h, H); wall(door.x + door.w / 2, win.x - win.w / 2, 0, H);
  wall(win.x - win.w / 2, win.x + win.w / 2, 0, win.y0); wall(win.x - win.w / 2, win.x + win.w / 2, win.y1, H); wall(win.x + win.w / 2, W1 + 1, 0, H);
  for (const s of [-1, 1]) { const x = s < 0 ? W0 - 0.5 : W1 + 0.5; B(g, 1, H, D1 - D0 + 1, stoneBrick, x, H / 2, (D0 + D1) / 2 - 0.5); }
  B(g, W1 - W0 + 2, 0.9, 1, stoneBrick, (W0 + W1) / 2, 0.45, D1 + 0.5);
  // a dark cap along the wall tops
  B(g, W1 - W0 + 2.2, 0.3, 1.2, M.dark, (W0 + W1) / 2, H + 0.15, bz);
  for (const s of [-1, 1]) B(g, 1.2, 0.3, D1 - D0 + 1.2, M.dark, s < 0 ? W0 - 0.5 : W1 + 0.5, H + 0.15, (D0 + D1) / 2 - 0.5);
  // wooden columns along the back wall, each with a torch
  const torches = [];
  [-10.3, -6.7, -2.95, 2.95, 10.3].forEach((x) => {
    B(g, 0.9, H, 0.8, column, x, H / 2, D0 + 0.35); B(g, 1.1, 0.3, 1, M.dark, x, 0.15, D0 + 0.4); B(g, 1.1, 0.3, 1, M.dark, x, H - 0.3, D0 + 0.4);
    solid(x - 0.55, x + 0.55, D0, D0 + 0.85, 6);
    if (Math.abs(x) > 3 && Math.abs(x) < 10) { B(g, 0.14, 0.5, 0.14, M.dark, x, 2.7, D0 + 0.9); const f = B(g, 0.22, 0.26, 0.22, glow('#ffb347'), x, 3.05, D0 + 0.9, true); f.userData.keep = true; torches.push(f); }
  });
  addLamp(g, -6.7, 3.2, D0 + 1.8, 1.4, 1.6, 9, '#ffb35a'); addLamp(g, 6.8, 3.2, D0 + 2, 1.4, 1.6, 10, '#ffb35a');
  addLamp(g, -3, 2.6, 2.5, 0.9, 1.3, 11, '#ffc27a');

  /* the way out: a glowing doorway with steps climbing into it */
  for (let i = 0; i < 5; i++) B(g, door.w, 0.4 * (i + 1), 0.5, caveStep, door.x, 0.2 * (i + 1), bz - 0.35 - i * 0.45);
  B(g, door.w + 0.2, door.h + 0.6, 0.6, stoneBrick, door.x, (door.h + 0.6) / 2, bz - 2.8); for (const s of [-1, 1]) B(g, 0.5, door.h + 0.6, 2.4, stoneBrick, door.x + s * (door.w / 2 + 0.25), (door.h + 0.6) / 2, bz - 1.6); B(g, door.w + 1, 0.5, 2.6, stoneBrick, door.x, door.h + 0.35, bz - 1.6);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(door.w, door.h), additive('#ffd060', 0.5)); portal.position.set(door.x, door.h / 2, bz + 0.52); portal.renderOrder = 4; g.add(portal);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(door.w * 0.6, door.h * 0.8), additive('#fff2c0', 0.3)); core.position.set(door.x, door.h * 0.42, bz + 0.54); core.renderOrder = 5; g.add(core);
  B(g, door.w + 0.6, 0.4, 1.3, M.dark, door.x, door.h + 0.2, bz + 0.1); for (const s of [-1, 1]) B(g, 0.3, door.h, 1.2, M.dark, door.x + s * (door.w / 2 + 0.15), door.h / 2, bz + 0.1);
  addLamp(g, door.x, 1.6, D0 + 1.4, 1.2, 1.5, 7, '#ffcf5a');

  /* the window: stained glass round the edge, the sky in the middle. Two panes cross-fade
     with the theme: a sunny sky by day and a starry one by night. */
  const winTex = (night) => toTex(cv(44, 38, (g2) => {
    const r = rng(night ? 47 : 46);
    for (let y = 0; y < 38; y++) for (let x = 0; x < 44; x++) {
      const edge = x < 4 || x > 39 || y < 4 || y > 33;
      let c;
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
  B(g, paneW + 0.5, 0.3, 1.25, M.dark, win.x, win.y0 - 0.1, bz + 0.15); B(g, paneW + 0.5, 0.3, 1.1, M.dark, win.x, win.y1 + 0.1, bz);
  // the light falling through it: a slanted shaft and a bright patch on the floor
  const shaftGeo = new THREE.BufferGeometry(), top = [[-paneW / 2 + 0.2, win.y1 - 0.2, bz + 0.5], [paneW / 2 - 0.2, win.y1 - 0.2, bz + 0.5], [paneW / 2 - 0.2, win.y0 + 0.2, bz + 0.5], [-paneW / 2 + 0.2, win.y0 + 0.2, bz + 0.5]];
  const foot = [[-1.7, FLOOR + 0.02, -1.4], [2.5, FLOOR + 0.02, -1.4], [2.5, FLOOR + 0.02, -4.6], [-1.7, FLOOR + 0.02, -4.6]], pos = [], alpha = [];
  for (let i = 0; i < 4; i++) { const a = top[i], b = top[(i + 1) % 4], c2 = foot[(i + 1) % 4], d2 = foot[i]; pos.push(...a, ...b, ...c2, ...a, ...c2, ...d2); alpha.push(1, 1, 0.2, 1, 0.2, 0.2); }
  shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); shaftGeo.setAttribute('color', new THREE.Float32BufferAttribute(alpha.flatMap((a) => [a, a, a]), 3));
  const shaftMat = new THREE.MeshBasicMaterial({ color: lin('#ffd98a'), vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat); shaft.renderOrder = 6; g.add(shaft);
  const patchTex = toTex(cv(42, 32, (g2) => { g2.fillStyle = '#fff'; for (let y = 0; y < 32; y += 8) for (let x = 0; x < 42; x += 9) g2.fillRect(x + 1, y + 1, 7, 6); }), false);
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ map: patchTex, color: lin('#ffd98a'), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  patch.rotation.x = -Math.PI / 2; patch.position.set(0.4, FLOOR + 0.03, -3); patch.renderOrder = 6; g.add(patch);

  /* the dais under the window, with the journal stand on it */
  const DH = 0.3;
  B(g, 5.4, DH, 2.6, stoneBrick, 0, DH / 2, D0 + 1.3); B(g, 4.2, 0.15, 0.6, caveStep, 0, 0.075, D0 + 2.9);
  B(g, 1.6, 0.04, 2, M.carpet, 0, DH + 0.02, D0 + 1.5); B(g, 1.6, 0.04, 0.6, M.carpet, 0, 0.17, D0 + 2.9);
  solid(-2.7, 2.7, D0, D0 + 2.6, DH + FLOOR); solid(-2.1, 2.1, D0 + 2.6, D0 + 3.2, 0.15 + FLOOR);
  const lectern = new THREE.Group(); lectern.position.set(0, DH, D0 + 1.6);
  B(lectern, 0.9, 0.12, 0.7, M.planks, 0, 0.06, 0); B(lectern, 0.36, 1.0, 0.36, M.log, 0, 0.6, 0);
  const slope = new THREE.Group(); slope.position.set(0, 1.15, 0); slope.rotation.x = 0.42; lectern.add(slope);
  B(slope, 1.1, 0.12, 0.8, M.planks, 0, 0, 0); B(slope, 1.0, 0.06, 0.62, flat('#5a2f22'), 0, 0.08, 0); B(slope, 0.44, 0.07, 0.56, wool('#f6f3e8'), -0.23, 0.13, 0); B(slope, 0.44, 0.07, 0.56, wool('#f1ead6'), 0.23, 0.13, 0);
  for (let k = 0; k < 4; k++) B(slope, 0.3, 0.02, 0.03, flat('#9a8f7a'), -0.25, 0.17, -0.15 + k * 0.1);
  B(slope, 0.05, 0.02, 0.7, flat('#c23b32'), 0.02, 0.17, 0.05);
  g.add(lectern); lectern.userData.prop = 'journal'; lectern.userData.keep = true;
  solid(-0.5, 0.5, D0 + 1.25, D0 + 1.95, 2);
  for (const s of [-1, 1]) { const x = s * 2.2, z = D0 + 0.75; B(g, 0.3, 0.9, 0.3, M.dark, x, DH + 0.45, z); B(g, 0.14, 0.24, 0.14, flat('#f4f1e6'), x, DH + 1.02, z); B(g, 0.16, 0.18, 0.16, glow('#ffc76a'), x, DH + 1.23, z, true); }

  /* the music box: a jukebox on a round rug, with crates of records beside it */
  const jx = -7, jz = -2.4;
  { const rug = cv(48, 48, (g2) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x - 23.5, y - 23.5); if (d > 23.5) continue; fill(g2, d > 21 ? '#c98a2b' : d > 18 ? '#7a2f8a' : d > 12 ? '#a3342e' : d > 9 ? '#e4b93a' : '#7a2f8a', x, y, 1, 1); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshLambertMaterial({ map: toTex(rug, false), transparent: true })); m.rotation.x = -Math.PI / 2; m.position.set(jx, FLOOR + 0.015, jz + 0.4); g.add(m); }
  const jukebox = new THREE.Group(); jukebox.position.set(jx, 0, jz); g.add(jukebox); jukebox.userData.prop = 'music'; jukebox.userData.keep = true;
  const juke = lam({ map: tex(16, 16, (g2) => { speck(g2, 16, 16, ['#8a5a36', '#7f5232', '#94613a'], rng(48)); fill(g2, '#3a2413', 0, 0, 16, 1); fill(g2, '#3a2413', 0, 15, 16, 1); fill(g2, '#3a2413', 0, 0, 1, 16); fill(g2, '#3a2413', 15, 0, 1, 16); fill(g2, '#5a3a1f', 3, 3, 10, 10); fill(g2, '#e4b93a', 6, 5, 1, 5); fill(g2, '#e4b93a', 6, 5, 4, 1); fill(g2, '#e4b93a', 9, 5, 1, 4); fill(g2, '#e4b93a', 4, 9, 3, 2); fill(g2, '#e4b93a', 7, 8, 3, 2); }) });
  const jukeTop = lam({ map: tex(16, 16, (g2) => { speck(g2, 16, 16, ['#3a2a1f', '#33251b', '#40302a'], rng(49)); fill(g2, '#141418', 2, 7, 12, 2); fill(g2, '#7a5530', 0, 0, 16, 1); fill(g2, '#7a5530', 0, 15, 16, 1); }) });
  B(jukebox, 1.3, 1.3, 1.3, [juke, juke, jukeTop, juke, juke, juke], 0, 0.65 + FLOOR, 0);
  const disc = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), new THREE.MeshLambertMaterial({ map: toTex(cv(16, 16, (g2) => drawDisc(g2, (RECORDS[0] || {}).disc || '#e4b93a')), false), transparent: true }));
  disc.position.set(0, 1.36 + FLOOR, 0); jukebox.add(disc);
  solid(jx - 0.7, jx + 0.7, jz - 0.7, jz + 0.7, 1.5);
  // record crates and a stool
  [[jx + 1.8, jz - 0.6], [jx + 1.8, jz + 0.5]].forEach(([x, z], i) => { B(g, 0.9, 0.6, 0.9, M.planks, x, 0.3 + FLOOR, z); ['#c23b32', '#2f66c4', '#e4b93a', '#57d47c'].forEach((c, k) => B(g, 0.08, 0.5, 0.7, flat(c), x - 0.3 + k * 0.18 + i * 0.05, 0.75 + FLOOR, z)); solid(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 1); });
  B(g, 0.7, 0.5, 0.7, M.planks, jx - 1.9, 0.25 + FLOOR, jz + 0.6); B(g, 0.8, 0.1, 0.8, wool('#7a2f8a'), jx - 1.9, 0.55 + FLOOR, jz + 0.6);
  // little music notes that rise from the jukebox while a record plays
  const noteTex = toTex(cv(8, 8, (g2) => { fill(g2, '#fff', 4, 0, 1, 6); fill(g2, '#fff', 5, 0, 2, 1); fill(g2, '#fff', 6, 1, 1, 1); fill(g2, '#fff', 1, 4, 4, 3); }), false);
  const notes = ['#ffd84a', '#62e4ff', '#ff8ad8', '#57d47c'].map((c, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, color: lin(c), transparent: true, depthWrite: false, fog: false })); m.scale.setScalar(0.45); g.add(m); return { m, s: i / 4 }; });

  /* the gallery: three paintings on the back wall, right of the window, with a bench in front */
  const frames = [];
  GALLERY.slice(0, 3).forEach((p, i) => {
    const x = 4.65 + i * 2.25, y = 2.9, pw = 1.9, ph = 1.45;
    B(g, pw + 0.3, ph + 0.3, 0.16, M.dark, x, y, D0 + 0.08); B(g, pw + 0.12, ph + 0.12, 0.18, flat('#c98a2b'), x, y, D0 + 0.1);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshLambertMaterial({ map: toTex(cv(32, 24, (g2) => drawPainting(g2, p.art)), false) })); pic.position.set(x, y, D0 + 0.2); pic.userData.keep = true; g.add(pic); frames.push(pic);
    B(g, 0.5, 0.06, 0.25, M.dark, x, y - ph / 2 - 0.35, D0 + 0.16); // a small plaque
  });
  B(g, 3.2, 0.16, 0.7, M.planks, 6.9, 0.55 + FLOOR, -3.6); for (const s of [-1, 1]) B(g, 0.18, 0.48, 0.6, M.dark, 6.9 + s * 1.4, 0.24 + FLOOR, -3.6);
  solid(5.2, 8.6, -4, -3.2, 0.7);
  frames.forEach((f) => { f.userData.prop = 'gallery'; });

  /* odds and ends: plants, a chest, barrels, a bookshelf, a reading chair */
  [[W0 + 0.8, D1 - 0.8], [W1 - 0.8, D1 - 0.8], [W1 - 0.8, D0 + 1.4]].forEach(([x, z]) => { B(g, 0.7, 0.6, 0.7, M.dark, x, 0.3, z); B(g, 0.9, 0.9, 0.9, flat('#3f8a3a'), x, 1.05, z); B(g, 0.55, 0.55, 0.55, flat('#4f9a44'), x + 0.1, 1.7, z); solid(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 1.5); });
  B(g, 1.2, 0.8, 0.8, M.planks, W1 - 1, 0.4 + FLOOR, 2.4); B(g, 1.24, 0.12, 0.84, flat('#e4b93a'), W1 - 1, 0.62 + FLOOR, 2.4); solid(W1 - 1.65, W1 - 0.35, 2, 2.8, 1);
  [[W0 + 0.9, 3.4], [W0 + 0.9, 4.6], [W0 + 2, 4.1]].forEach(([x, z]) => { B(g, 0.8, 1.0, 0.8, M.log, x, 0.5 + FLOOR, z); B(g, 0.84, 0.08, 0.84, M.dark, x, 0.75 + FLOOR, z); solid(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 1.2); });
  B(g, 0.6, 3, 2.8, M.dark, W0 + 0.3, 1.5, -1.5); B(g, 0.06, 2.6, 2.5, M.books, W0 + 0.62, 1.48, -1.5); solid(W0, W0 + 0.7, -2.95, -0.05, 3);
  B(g, 1.1, 0.5, 1, wool('#2f66c4'), 3.4, 0.25 + FLOOR, 2.6); B(g, 1.1, 0.8, 0.3, wool('#234a9e'), 3.4, 0.7 + FLOOR, 3.05); solid(2.85, 3.95, 2.1, 3.2, 1);

  bake(g); scene.add(g);

  /* things you can use, in world coordinates. rect is measured from its edge, like the stalls. */
  const R = (x0, x1, z0, z1) => ({ x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1) });
  const props = [
    { id: 'music', key: 'useMusic', label: 'Music Box', color: '#e4b93a', rect: R(jx - 0.7, jx + 0.7, jz - 0.7, jz + 0.7), front: [X(jx), Z(jz + 1.6)], labelAt: [X(jx), 2.9, Z(jz)] },
    { id: 'journal', key: 'useJournal', label: 'Journal', color: '#c98a4b', rect: R(-0.6, 0.6, D0 + 1.2, D0 + 2), front: [X(0), Z(D0 + 3.6)], labelAt: [X(0), 2.9, Z(D0 + 1.6)] },
    { id: 'gallery', key: 'useGallery', label: 'Gallery', color: '#b0409a', rect: R(3.6, 10, D0, D0 + 0.6), front: [X(6.9), Z(-4.9)], labelAt: [X(6.9), 4.4, Z(D0 + 0.4)] },
    { id: 'exit', key: 'goUp', range: 1.4, label: 'Back to the Village', color: '#ffd060', rect: R(door.x - 1, door.x + 1, D0 - 0.6, D0 + 0.1), front: [X(door.x), Z(D0 + 1.4)], labelAt: [X(door.x), 4.3, Z(D0)] },
  ];
  const pickables = [jukebox, lectern, ...frames];
  const v = new THREE.Vector3();
  return {
    props, pickables,
    arrive: [X(door.x), Z(D0 + 2.3)],
    update(time, night, playing) {
      nightPane.material.opacity = night; dayPane.material.color.setScalar(1 - night * 0.6);
      shaftMat.opacity = 0.16 * (1 - night) + 0.05 * night; shaftMat.color.copy(lin('#ffd98a')).lerp(lin('#8fb0ff'), night);
      patch.material.opacity = 0.42 * (1 - night) + 0.12 * night; patch.material.color.copy(shaftMat.color);
      const p = 0.5 + Math.sin(time * 1.7) * 0.5; portal.material.opacity = 0.42 + p * 0.12; core.material.opacity = 0.18 + (1 - p) * 0.14;
      torches.forEach((t, i) => t.scale.set(1, 0.85 + Math.sin(time * 11 + i * 2) * 0.15, 1));
      disc.rotation.y = playing ? time * 2.2 : disc.rotation.y;
      notes.forEach((n) => { const k = (time * 0.32 + n.s) % 1; n.m.visible = playing; v.set(jx + Math.sin(k * 6 + n.s * 9) * 0.5, 1.8 + k * 2.2, jz + 0.2); n.m.position.copy(v); n.m.material.opacity = Math.sin(k * Math.PI); });
    },
    setDisc(color) { const c = disc.material.map.image; drawDisc(c.getContext('2d'), color); disc.material.map.needsUpdate = true; },
  };
}
