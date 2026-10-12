// The town hall: a stone hall with a steep timber roof. Its doorway glows like a
// portal; when the player walks in, the roof and the near walls fade away to show
// the agents' desks inside.
import * as THREE from 'three';
import { HALL, AGENTS, HALL_LABEL } from './config.js';
import { B, M, T, wool, glow, flat, emblem, lin, bake } from './textures.js';
import { collide } from './collision.js';
import { addLamp } from './lights.js';
import { banner, papers, crate } from './stalls.js';

const { x0, x1, z0, z1, doorX, doorW, floor, wallH } = HALL;
const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;

// Where each desk stands, and the short route an agent takes from the carpet to its seat.
const DESK_AT = { nw: [x0 + 4.3, z0 + 6], ne: [x1 - 4.3, z0 + 6], sw: [x0 + 4.3, z1 - 4.4], se: [x1 - 4.3, z1 - 4.4] };
export const CARPET = { hz: cz, hx: [x0 + 2.6, x1 - 2.8], vx: doorX, vz: [z0 + 5.4, z1 - 1.8] };
export function deskOf(agent) {
  const [x, z] = DESK_AT[agent.desk], side = x < cx ? 1 : -1;
  return { x, z, seat: [x, z - 0.15], side: [x + side * 2.05, z - 0.15], access: [x + side * 2.05, cz] };
}

// A bookcase: a wooden frame with books only on its open face.
function bookcase(g, x, y, z, len, h, face = 'z') {
  if (face === 'z') { B(g, len, h, 0.55, M.dark, x, y + h / 2, z); B(g, len - 0.3, h - 0.4, 0.06, M.books, x, y + h / 2 - 0.02, z + 0.27); B(g, len + 0.16, 0.12, 0.66, M.planks, x, y + h + 0.06, z); }
  else { B(g, 0.55, h, len, M.dark, x, y + h / 2, z); B(g, 0.06, h - 0.4, len - 0.3, M.books, x + 0.27, y + h / 2 - 0.02, z); B(g, 0.66, 0.12, len + 0.16, M.planks, x, y + h + 0.06, z); }
}
const candle = (g, x, y, z) => { B(g, 0.14, 0.26, 0.14, flat('#f4f1e6'), x, y + 0.13, z); B(g, 0.16, 0.18, 0.16, glow('#ffc76a'), x, y + 0.35, z); };

// desk tops are at y = 0.94 and run from x = -1.1 to 1.1, z = 0.3 to 1.0
const DESK_PROPS = {
  bobby(g) { papers(g, -0.75, 0.94, 0.65, 4, 0.5, 0.56); B(g, 0.7, 0.24, 0.5, flat('#2b2b2f'), 0.65, 1.06, 0.65); B(g, 0.55, 0.32, 0.26, flat('#3a3a40'), 0.65, 1.34, 0.56); B(g, 0.62, 0.1, 0.1, wool('#d8d0bc'), 0.65, 1.24, 0.86); },
  friday(g, a) { B(g, 0.8, 0.6, 0.05, flat('#1b2a4a'), 0.45, 1.3, 0.56); B(g, 0.7, 0.5, 0.05, glow('#3aa7ff'), 0.45, 1.3, 0.6); B(g, 0.24, 0.1, 0.24, flat('#26262e'), 0.45, 0.99, 0.6); B(g, 0.42, 0.08, 0.56, flat('#2f66c4'), -0.7, 0.98, 0.65); B(g, 0.38, 0.08, 0.52, flat('#f1efe6'), -0.68, 1.06, 0.65); B(g, 0.18, 0.18, 0.18, glow(a.trim), -0.15, 1.03, 0.8); },
  sally(g) { B(g, 1.2, 0.04, 0.6, M.blueprint, -0.35, 0.96, 0.65); [[0.5, 0.36], [0.76, 0.6], [1.0, 0.3]].forEach(([x, h], i) => B(g, 0.2, h, 0.2, flat(i % 2 ? '#c5ccd8' : '#98a2b3'), x, 0.94 + h / 2, 0.65)); B(g, 0.16, 0.16, 0.6, wool('#f3ead2'), -0.95, 1.03, 0.65); },
  edwin(g, a) { [[-0.85, 0.12], [-0.68, 0.24], [-1.0, 0.18]].forEach(([x, h]) => B(g, 0.16, h, 0.16, flat('#e4b93a'), x, 0.94 + h / 2, 0.72)); B(g, 0.06, 0.42, 0.06, flat('#e4b93a'), 0.05, 1.15, 0.65); B(g, 0.56, 0.05, 0.05, flat('#e4b93a'), 0.05, 1.36, 0.65); B(g, 0.18, 0.04, 0.18, flat('#e4b93a'), -0.2, 1.22, 0.65); B(g, 0.18, 0.04, 0.18, flat('#e4b93a'), 0.3, 1.25, 0.65); B(g, 0.46, 0.08, 0.6, flat('#3a2a50'), 0.8, 0.98, 0.65); [0.24, 0.4, 0.32, 0.56].forEach((h, i) => B(g, 0.14, h, 0.06, glow(i === 3 ? '#57d47c' : a.trim), -0.36 + i * 0.24, 1.75 + h / 2, -0.9)); },
};
const DESK_MARK = { bobby: 'news', friday: 'chip', sally: 'house', edwin: 'scale' };

function buildDesk(parent, a) {
  const { x, z } = deskOf(a), g = new THREE.Group(); g.position.set(x, floor, z);
  // this corner's floor is laid in the agent's colour
  const tint = new THREE.MeshLambertMaterial({ map: T.tile, color: lin(a.color).multiplyScalar(2.3) });
  B(g, 4.4, 0.02, 3.8, flat(a.color), 0, 0.012, -0.05); B(g, 4, 0.03, 3.4, tint, 0, 0.018, -0.05);
  B(g, 2.4, 0.9, 0.7, M.planks, 0, 0.45, 0.65); B(g, 2.56, 0.06, 0.8, wool(a.color), 0, 0.93, 0.65);
  bookcase(g, 0, 0, -1.2, 2.4, 1.5);
  B(g, 0.2, 2.7, 0.2, M.log, -1.32, 1.35, -1.3); B(g, 0.2, 2.7, 0.2, M.log, 1.32, 1.35, -1.3);
  for (let i = 0; i < 3; i++) { const m = wool(i % 2 ? '#f4f1e6' : a.color); B(g, 0.96, 0.16, 1, m, -0.96 + i * 0.96, 2.74, -0.95); B(g, 0.96, i % 2 ? 0.2 : 0.34, 0.07, m, -0.96 + i * 0.96, 2.66 - (i % 2 ? 0.1 : 0.17), -0.44); }
  B(g, 0.45, 0.45, 0.45, M.dark, 0, 0.225, -0.15);
  banner(g, 0, 0.48, 1.03, 0.6, 0.62, a.color, DESK_MARK[a.id]);
  B(g, 0.14, 0.34, 0.14, M.log, 1.02, 1.11, 0.9); B(g, 0.2, 0.2, 0.2, glow('#ffc76a'), 1.02, 1.38, 0.9);
  DESK_PROPS[a.id](g, a);
  if (a.id === 'sally') {
    // a pinned map of the city's rings on an easel beside her desk
    B(g, 0.12, 1.9, 0.12, M.log, 1.75, 0.95, -0.5); B(g, 0.12, 1.9, 0.12, M.log, 2.75, 0.95, -0.5); B(g, 1.5, 1.2, 0.1, wool('#e8d3a0'), 2.25, 1.5, -0.42);
    [['#2fa0a8', 1], ['#57d47c', 0.72], ['#e4d23a', 0.46], ['#d8403a', 0.22]].forEach(([c, s], k) => B(g, s, s * 0.8, 0.03, flat(c), 2.25, 1.5, -0.36 + k * 0.012));
    B(g, 0.1, 0.1, 0.06, flat('#c23b32'), 1.7, 1.95, -0.34); B(g, 0.1, 0.1, 0.06, flat('#2f66c4'), 2.75, 1.1, -0.34); B(g, 0.9, 0.04, 0.03, flat('#c23b32'), 2.3, 1.75, -0.33);
    collide(x + 1.6, x + 2.9, z - 0.7, z - 0.25, 2.2);
  }
  parent.add(g); collide(x - 1.4, x + 1.4, z - 1.5, z + 1.05, 4);
  addLamp(parent, x, floor + 2.2, z + 1.4, 1.2, 1.45, 8, '#ffc27a');
}

export function buildHall(scene) {
  const fadeMats = [], fade = new THREE.Group(), inner = new THREE.Group(), solid = new THREE.Group();
  const fm = (m) => { const c = m.clone(); fadeMats.push(c); return c; };
  const brickF = fm(M.brick), stoneF = fm(M.stone), roofF = fm(M.roof), darkF = fm(M.dark), logF = fm(M.log), plankF = fm(M.planks), paneF = fm(glow('#ffc35a')), clothF = fm(wool('#234a9e')), markF = fm(emblem('tree')), leafF = fm(flat('#4f9a44')), bloomF = fm(flat('#e9627a'));
  const stub = 1.4, up = wallH - stub, upY = stub + up / 2;
  const lw = doorX - doorW / 2 - x0, rw = x1 - (doorX + doorW / 2), lx = x0 + lw / 2, rx = x1 - rw / 2, front = z1 - 0.5;

  /* walls that always stand: the back and left walls, and low stubs of the others */
  B(solid, w, wallH, 1, M.brick, cx, wallH / 2, z0 + 0.5); B(solid, 1, wallH, d - 2, M.brick, x0 + 0.5, wallH / 2, cz);
  B(solid, 1, stub, d - 2, M.brick, x1 - 0.5, stub / 2, cz); B(solid, lw, stub, 1, M.brick, lx, stub / 2, front); B(solid, rw, stub, 1, M.brick, rx, stub / 2, front);
  B(solid, w + 0.5, 0.5, 0.4, M.stone, cx, 0.25, z0 - 0.15); B(solid, 0.4, 0.5, d + 0.4, M.stone, x0 - 0.15, 0.25, cz);

  /* the cut-away: upper front and right walls */
  B(fade, 1, up, d - 2, brickF, x1 - 0.5, upY, cz); B(fade, lw, up, 1, brickF, lx, upY, front); B(fade, rw, up, 1, brickF, rx, upY, front);
  B(fade, doorW, wallH - 4.7, 1, brickF, doorX, 4.7 + (wallH - 4.7) / 2, front);
  B(fade, lw + 0.3, 0.5, 0.4, stoneF, lx - 0.15, 0.25, z1 + 0.15); B(fade, rw + 0.3, 0.5, 0.4, stoneF, rx + 0.15, 0.25, z1 + 0.15); B(fade, 0.4, 0.5, d + 0.4, stoneF, x1 + 0.15, 0.25, cz);
  // buttress pillars at the corners and beside the door, each with a stone cap
  [x0 + 0.3, doorX - doorW / 2 - 0.65, doorX + doorW / 2 + 0.65, x1 - 0.3].forEach((x, i) => {
    const big = i === 0 || i === 3, s = big ? 1.5 : 1.2, h = wallH + (big ? 0.9 : 0.2);
    B(fade, s, h, s, brickF, x, h / 2, z1 + 0.05); B(fade, s + 0.3, 0.3, s + 0.3, stoneF, x, h + 0.15, z1 + 0.05); B(fade, s + 0.3, 0.5, s + 0.3, stoneF, x, 0.25, z1 + 0.05);
    if (big) B(fade, s - 0.5, 0.5, s - 0.5, stoneF, x, h + 0.55, z1 + 0.05);
  });
  // stone arch over the door
  B(fade, doorW + 1.5, 0.6, 1.3, stoneF, doorX, 4.75, z1 - 0.3); B(fade, doorW + 0.5, 0.4, 1.36, brickF, doorX, 5.25, z1 - 0.3); B(fade, 0.9, 0.9, 1.44, stoneF, doorX, 4.95, z1 - 0.3);
  for (const s of [-1, 1]) B(fade, 0.5, 0.5, 1.3, stoneF, doorX + s * (doorW / 2 - 0.25), 4.2, z1 - 0.3);
  // timber band under the eaves
  B(fade, w + 0.6, 0.45, 0.4, darkF, cx, wallH - 0.22, z1 + 0.16);
  // windows with shutters and flower boxes (none behind the right-hand banner)
  [doorX - 6.15, doorX + 6.15].forEach((x) => { // the same distance either side of the door, clear of the buttresses
    B(fade, 1.5, 2, 0.08, paneF, x, 3.3, z1 + 0.03, true); B(fade, 1.7, 0.14, 0.14, darkF, x, 3.3, z1 + 0.08); B(fade, 0.14, 2.1, 0.14, darkF, x, 3.3, z1 + 0.08);
    B(fade, 1.9, 0.22, 0.24, stoneF, x, 4.42, z1 + 0.1); B(fade, 1.9, 0.22, 0.3, stoneF, x, 2.18, z1 + 0.12);
    for (const s of [-1, 1]) B(fade, 0.5, 2, 0.1, plankF, x + s * 1.05, 3.3, z1 + 0.08);
    B(fade, 1.7, 0.3, 0.36, plankF, x, 1.9, z1 + 0.22); B(fade, 1.5, 0.26, 0.3, leafF, x, 2.12, z1 + 0.22); for (const s of [-0.5, 0, 0.5]) B(fade, 0.16, 0.14, 0.16, bloomF, x + s, 2.3, z1 + 0.24);
  });
  // banners either side of the door
  [doorX - doorW / 2 - 1.75, doorX + doorW / 2 + 1.75].forEach((x) => { B(fade, 0.9, 1.6, 0.07, clothF, x, 3.5, z1 + 0.34); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1), markF); p.position.set(x, 3.55, z1 + 0.38); fade.add(p); B(fade, 1.1, 0.12, 0.3, darkF, x, 4.36, z1 + 0.26); });
  // steep roof: stepped timber with a stone-edged gable facing the square
  const N = 12, half = w / 2 + 1.1, rise = 0.62;
  for (let k = 0; k < N; k++) {
    const hw = half * (1 - k / N), y = wallH + rise * (k + 0.5);
    B(fade, hw * 2, rise, d + 1.2, roofF, cx, y, cz);
    B(fade, hw * 2 + 0.5, rise, 1.3, brickF, cx, y, z1 + 0.25); B(fade, hw * 2 + 0.5, rise, 1.3, brickF, cx, y, z0 - 0.25);
    if (k > 0 && k < 8) B(fade, Math.max(0.6, hw * 2 - 3.2), rise, 0.16, k % 3 ? plankF : darkF, cx, y, z1 + 0.94);
  }
  B(fade, 1.5, 0.5, d + 2.4, brickF, cx, wallH + rise * N + 0.25, cz); B(fade, 2.1, 0.3, 1.7, stoneF, cx, wallH + rise * N + 0.6, z1 + 0.25);
  for (const s of [-1, 1]) B(fade, 0.7, 1.1, 0.1, paneF, cx + s * 3.4, wallH + rise * 2.2, z1 + 1.03, true);
  // tie beams under the roof: seen as the roof lifts away
  for (let z = z0 + 3; z < z1 - 1; z += 4) { B(fade, w - 1.6, 0.4, 0.4, darkF, cx, wallH - 0.25, z); B(fade, 0.3, 1.5, 0.3, darkF, cx, wallH + 0.6, z); }
  // a clock on the gable over the door, showing the visitor's own time.
  // (The fixed camera cannot see higher than about ten blocks, so the clock sits on the gable, not on a tower.)
  const cc = document.createElement('canvas'); cc.width = 64; cc.height = 64; const ctex = new THREE.CanvasTexture(cc); ctex.encoding = THREE.sRGBEncoding; ctex.magFilter = THREE.NearestFilter;
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), fm(new THREE.MeshBasicMaterial({ map: ctex }))); clock.position.set(doorX, wallH + 2.75, z1 + 1.12); clock.userData.keep = true; fade.add(clock);
  B(fade, 2.8, 2.8, 0.16, stoneF, doorX, wallH + 2.75, z1 + 1.02); B(fade, 3.2, 0.3, 0.3, stoneF, doorX, wallH + 1.3, z1 + 1.05);
  let clockMin = -1;
  function drawClock() {
    const d = new Date(), min = d.getHours() * 60 + d.getMinutes(); if (min === clockMin) return; clockMin = min;
    const g = cc.getContext('2d'); g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a2a1a';
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillRect(Math.round(32 + Math.sin(a) * 26) - 2, Math.round(32 - Math.cos(a) * 26) - 2, k % 3 ? 3 : 5, k % 3 ? 3 : 5); }
    const hand = (a, len, wd, c) => { g.strokeStyle = c; g.lineWidth = wd; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.sin(a) * len, 32 - Math.cos(a) * len); g.stroke(); };
    hand(((min % 720) / 720) * Math.PI * 2, 14, 5, '#3a2a1a'); hand(((min % 60) / 60) * Math.PI * 2, 22, 3, '#c23b32'); g.fillRect(29, 29, 6, 6); ctex.needsUpdate = true;
  }
  drawClock();
  // a carved sign over the arch
  const sc = document.createElement('canvas'); sc.width = 320; sc.height = 64; const stex = new THREE.CanvasTexture(sc); stex.encoding = THREE.sRGBEncoding; stex.magFilter = THREE.NearestFilter;
  const drawSign = () => {
    const g = sc.getContext('2d'), q = ['#a57f4a', '#b08a52', '#9a7442']; for (let j = 0; j < 16; j++) for (let i = 0; i < 80; i++) { g.fillStyle = q[(i * 7 + j * 13 + ((i * j) % 5)) % 3]; g.fillRect(i * 4, j * 4, 4, 4); }
    g.fillStyle = '#5f4424'; g.fillRect(0, 0, 320, 4); g.fillRect(0, 60, 320, 4); g.fillRect(0, 0, 4, 64); g.fillRect(316, 0, 4, 64);
    g.font = '700 40px "Pixelify Sans","Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#d9b77a'; g.fillText(HALL_LABEL.en.toUpperCase(), 162, 35); g.fillStyle = '#3a2413'; g.fillText(HALL_LABEL.en.toUpperCase(), 160, 33); stex.needsUpdate = true;
  };
  drawSign(); if (document.fonts && document.fonts.load) document.fonts.load('700 40px "Pixelify Sans"').then(drawSign).catch(() => {});
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), fm(new THREE.MeshBasicMaterial({ map: stex }))); sign.position.set(doorX, 6.05, z1 + 0.98); sign.rotation.x = -0.2; sign.userData.keep = true; fade.add(sign);
  B(fade, 5.3, 1.25, 0.16, darkF, doorX, 6.05, z1 + 0.86); for (const s of [-1, 1]) B(fade, 0.16, 0.16, 0.9, darkF, doorX + s * 2.2, 6.5, z1 + 0.5);
  // windows down both side walls
  for (const z of [z0 + 5, z0 + 10, z0 + 15]) {
    B(fade, 0.08, 1.9, 1.5, paneF, x1 + 0.03, 3.3, z, true); B(fade, 0.16, 0.14, 1.7, darkF, x1 + 0.06, 3.3, z); B(fade, 0.16, 2, 0.14, darkF, x1 + 0.06, 3.3, z); B(fade, 0.3, 0.2, 1.9, stoneF, x1 + 0.1, 2.25, z);
    B(solid, 0.08, 1.9, 1.5, glow('#ffc35a'), x0 - 0.03, 3.3, z, true); B(solid, 0.16, 0.14, 1.7, M.dark, x0 - 0.06, 3.3, z); B(solid, 0.16, 2, 0.14, M.dark, x0 - 0.06, 3.3, z); B(solid, 0.3, 0.2, 1.9, M.stone, x0 - 0.1, 2.25, z);
  }
  addLamp(scene, x1 + 2.4, 2.4, cz, 0, 1.3, 10, '#ffc35a'); addLamp(scene, x0 - 2.4, 2.4, cz, 0, 1.3, 10, '#ffc35a');
  // chimney, above the fireplace on the left wall
  B(fade, 1.7, 7.5, 1.7, brickF, x0 + 2.2, wallH + 3.4, cz); B(fade, 2.1, 0.4, 2.1, stoneF, x0 + 2.2, wallH + 7.3, cz); B(fade, 1.1, 0.4, 1.1, darkF, x0 + 2.2, wallH + 7.7, cz);

  /* the portal: a faint yellow glow filling the doorway */
  const portalMat = new THREE.MeshBasicMaterial({ color: lin('#ffdf7e'), transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const coreMat = new THREE.MeshBasicMaterial({ color: lin('#fff3c4'), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(doorW, 4.2), portalMat); portal.position.set(doorX, floor + 2.05, z1 - 0.3); scene.add(portal);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 1.2, 3.4), coreMat); core.position.set(doorX, floor + 1.7, z1 - 0.36); scene.add(core);
  const spill = addLamp(scene, doorX, 2.4, z1 + 1.6, 1.0, 1.9, 9, '#ffd27a');

  /* steps, door lanterns, and a few things outside */
  B(solid, doorW + 1.4, 0.4, 1.7, M.stone, doorX, 0.2, z1 + 0.25); B(solid, doorW + 2.2, 0.2, 0.9, M.stone, doorX, 0.1, z1 + 1.5);
  collide(doorX - doorW / 2 - 0.7, doorX + doorW / 2 + 0.7, z1 - 0.6, z1 + 1.1, 0.4); collide(doorX - doorW / 2 - 1.1, doorX + doorW / 2 + 1.1, z1 + 1.1, z1 + 1.95, 0.2);
  [doorX - doorW / 2 - 1.9, doorX + doorW / 2 + 1.9].forEach((x) => { B(solid, 0.25, 2.3, 0.25, M.log, x, 1.15, z1 + 1.9); B(solid, 0.44, 0.44, 0.44, glow('#ffc76a'), x, 2.5, z1 + 1.9, true); B(solid, 0.58, 0.1, 0.58, M.dark, x, 2.77, z1 + 1.9); collide(x - 0.15, x + 0.15, z1 + 1.75, z1 + 2.05, 3); });
  crate(solid, x0 + 2.2, z1 + 1.1, 1, 0); crate(solid, x0 + 3.1, z1 + 0.9, 0.7, 0); collide(x0 + 1.7, x0 + 3.5, z1 + 0.5, z1 + 1.6, 1);
  B(solid, 0.8, 1, 0.8, M.dark, x1 - 2.4, 0.5, z1 + 1.1); B(solid, 0.86, 0.1, 0.86, flat('#3a2a1a'), x1 - 2.4, 0.3, z1 + 1.1); B(solid, 0.86, 0.1, 0.86, flat('#3a2a1a'), x1 - 2.4, 0.75, z1 + 1.1); collide(x1 - 2.8, x1 - 2, z1 + 0.7, z1 + 1.5, 1);
  // forecourt: two benches and a notice post
  for (const s of [-1, 1]) { const bx = doorX + s * 5.8, bz = z1 + 3.1; B(solid, 2.4, 0.16, 0.6, M.planks, bx, 0.52, bz); B(solid, 2.4, 0.5, 0.12, M.planks, bx, 0.95, bz - 0.3); for (const e of [-1, 1]) B(solid, 0.16, 0.9, 0.6, M.dark, bx + e * 1.05, 0.45, bz); collide(bx - 1.25, bx + 1.25, bz - 0.4, bz + 0.35, 1.1); }
  { const px = doorX - 3.9, pz = z1 + 4.4; for (const e of [-1, 1]) B(solid, 0.18, 2.2, 0.18, M.log, px + e * 0.9, 1.1, pz); B(solid, 2, 1.3, 0.12, M.planks, px, 1.5, pz); B(solid, 2.2, 0.14, 0.3, M.dark, px, 2.25, pz);
    B(solid, 0.6, 0.8, 0.04, M.paper, px - 0.5, 1.55, pz + 0.08); B(solid, 0.5, 0.5, 0.04, wool('#f6f3e8'), px + 0.3, 1.75, pz + 0.08); B(solid, 0.5, 0.36, 0.04, wool('#efe2bd'), px + 0.35, 1.2, pz + 0.08); collide(px - 1.05, px + 1.05, pz - 0.15, pz + 0.15, 2.3); }
  bake(solid); scene.add(solid);
  bake(fade); scene.add(fade);
  // chimney smoke: a few grey puffs that rise, drift and shrink away
  const puffMat = fm(new THREE.MeshLambertMaterial({ color: lin('#d6d6d6') })), puffs = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), puffMat); scene.add(m); puffs.push(m); }

  /* inside. Nothing in here takes the baked sun shadow, so the candles can light it. */
  const iw = w - 2, id = d - 2, wx = x0 + 1, nz = z0 + 1; // inner faces of the left and back walls
  const tile = T.tile.clone(); tile.needsUpdate = true; tile.repeat.set(iw, id);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(iw, id, iw, id), new THREE.MeshLambertMaterial({ map: tile })); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, floor, cz); inner.add(fl);
  const gold = flat('#d9a93a'), F = floor;
  B(inner, iw - 2.2, 0.05, 2.2, M.carpet, cx - 0.1, F + 0.03, cz); B(inner, 2.2, 0.05, id - 1.6, M.carpet, doorX, F + 0.03, cz + 0.2);
  for (const s of [-1, 1]) { B(inner, iw - 2.2, 0.055, 0.14, gold, cx - 0.1, F + 0.033, cz + s * 0.95); B(inner, 0.14, 0.055, id - 1.6, gold, doorX + s * 0.95, F + 0.033, cz + 0.2); }
  B(inner, 2.06, 0.06, 2.06, M.carpet, doorX, F + 0.034, cz); B(inner, 1, 0.065, 1, gold, doorX, F + 0.034, cz); B(inner, 0.72, 0.07, 0.72, M.carpet, doorX, F + 0.034, cz);
  // dark inlaid squares in the floor of each quarter
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = cx + sx * 3.4, z = cz + sz * 3.6; B(inner, 1.4, 0.03, 1.4, flat('#34333a'), x, F + 0.016, z); B(inner, 0.9, 0.035, 0.9, flat('#6a6871'), x, F + 0.018, z); B(inner, 0.3, 0.04, 0.3, gold, x, F + 0.02, z); }
  AGENTS.forEach((a) => buildDesk(inner, a));

  // back wall: the agent board takes its full width (built further down)
  // left wall: a fireplace in the middle with bookcases either side. Every face sits at its
  // own depth, so nothing shares a plane and flickers.
  B(inner, 1, 2.9, 3.6, M.brick, wx + 0.5, F + 1.45, cz); B(inner, 1.3, 0.24, 4, M.stone, wx + 0.62, F + 3.02, cz); B(inner, 1.3, 0.2, 3.8, M.stone, wx + 0.65, F + 0.1, cz);
  B(inner, 0.1, 1.5, 2, flat('#141418'), wx + 1.03, F + 0.95, cz);                                      // the dark opening
  for (const s of [-1, 1]) B(inner, 0.16, 1.7, 0.3, M.stone, wx + 1.06, F + 1.05, cz + s * 1.15);       // stone jambs
  B(inner, 0.16, 0.3, 2.6, M.stone, wx + 1.06, F + 1.85, cz);                                           // lintel
  B(inner, 0.34, 0.2, 1.3, M.log, wx + 1.3, F + 0.31, cz);
  B(inner, 0.1, 0.44, 0.5, glow('#ff8a2a'), wx + 1.24, F + 0.62, cz - 0.28); B(inner, 0.1, 0.66, 0.42, glow('#ffc24a'), wx + 1.3, F + 0.74, cz + 0.2); B(inner, 0.1, 0.3, 0.3, glow('#ffe08a'), wx + 1.36, F + 0.56, cz - 0.02);
  candle(inner, wx + 0.7, F + 3.14, cz - 1.4); candle(inner, wx + 0.7, F + 3.14, cz + 1.4); B(inner, 0.06, 0.8, 1.2, wool('#e8d3a0'), wx + 1.04, F + 2.5, cz);
  collide(wx, wx + 1.5, cz - 1.9, cz + 1.9, 3);
  addLamp(scene, wx + 2.2, F + 1.3, cz, 1.3, 1.6, 8, '#ff9a4a');
  bookcase(inner, wx + 0.3, F, cz - 4.2, 2.6, 3.5, 'x'); bookcase(inner, wx + 0.3, F, cz + 4.2, 2.6, 3.5, 'x');
  // right side: low things only, so nothing hides the room from the camera
  const ex = x1 - 1.75;
  B(inner, 1, 0.9, 1, M.stone, ex, F + 0.45, cz); B(inner, 1.2, 0.14, 1.2, M.stone, ex, F + 0.97, cz); B(inner, 0.6, 0.6, 0.6, glow('#62c8ff'), ex, F + 1.5, cz); B(inner, 0.82, 0.06, 0.82, gold, ex, F + 1.07, cz); collide(ex - 0.6, ex + 0.6, cz - 0.6, cz + 0.6, 2);
  crate(inner, ex, cz + 3.6, 1, F); crate(inner, ex + 0.1, cz + 4.6, 0.7, F); B(inner, 0.8, 1, 0.8, M.dark, ex, F + 0.5, cz - 2.1); B(inner, 0.86, 0.1, 0.86, flat('#3a2a1a'), ex, F + 0.3, cz - 2.1); B(inner, 0.86, 0.1, 0.86, flat('#3a2a1a'), ex, F + 0.75, cz - 2.1);
  collide(ex - 0.55, ex + 0.55, cz + 3.05, cz + 5, 1.1); collide(ex - 0.45, ex + 0.45, cz - 2.55, cz - 1.65, 1.1);
  // benches inside the front wall and plants in the corners
  for (const s of [-1, 1]) { const x = doorX + s * 4.6; B(inner, 2.6, 0.16, 0.6, M.planks, x, F + 0.5, z1 - 1.75); B(inner, 0.18, 0.44, 0.5, M.dark, x - 1.1, F + 0.22, z1 - 1.75); B(inner, 0.18, 0.44, 0.5, M.dark, x + 1.1, F + 0.22, z1 - 1.75); collide(x - 1.3, x + 1.3, z1 - 2.05, z1 - 1.45, 1); }
  [[wx + 0.75, nz + 0.75], [x1 - 1.75, nz + 0.75], [wx + 0.75, z1 - 1.75], [x1 - 1.75, z1 - 1.75]].forEach(([x, z]) => { B(inner, 0.6, 0.5, 0.6, M.dark, x, F + 0.25, z); B(inner, 0.8, 0.8, 0.8, flat('#3f8a3a'), x, F + 0.9, z); B(inner, 0.5, 0.5, 0.5, flat('#4f9a44'), x + 0.1, F + 1.45, z - 0.05); collide(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 1.5); });

  /* the agent board: a big lit screen at the end of the hall, leaning back toward the camera.
     It is drawn on a canvas, so main.js can repaint it whenever an agent's status changes. */
  // the board stands on a raised dais, up one step: a checkered stone floor with a gold border,
  // a runner up the middle, and a coloured inlay in dz of each agent's card
  const DH = 0.3, DW = 14.2, dz = nz + 3.4, edge = flat('#4a4450');
  B(inner, DW, DH, 3.4, flat('#6e6670'), doorX, F + DH / 2, nz + 1.7);
  { const cols = 14, rows = 2, tw = (DW - 0.4) / cols, td = 1.3 / rows;
    for (let i = 0; i < cols; i++) for (let k = 0; k < rows; k++) B(inner, tw - 0.04, 0.02, td - 0.04, flat((i + k) % 2 ? '#8c8279' : '#a99e90'), doorX - (DW - 0.4) / 2 + tw * (i + 0.5), F + DH + 0.01, dz - 0.2 - td * (k + 0.5)); }
  B(inner, DW + 0.1, 0.06, 0.16, edge, doorX, F + DH + 0.01, dz - 0.06); B(inner, DW - 0.3, 0.035, 0.07, gold, doorX, F + DH + 0.02, dz - 0.2);
  for (const sx of [-1, 1]) B(inner, 0.07, 0.035, 1.4, gold, doorX + sx * (DW / 2 - 0.15), F + DH + 0.02, dz - 0.85);
  B(inner, 12.4, 0.15, 0.7, flat('#5f5862'), doorX, F + 0.075, dz + 0.35); B(inner, 12.5, 0.05, 0.1, edge, doorX, F + 0.15, dz + 0.68);
  B(inner, 1.8, 0.04, 1.5, M.carpet, doorX, F + DH + 0.035, dz - 0.75); B(inner, 1.8, 0.04, 0.7, M.carpet, doorX, F + 0.17, dz + 0.35);
  for (const sx of [-1, 1]) { B(inner, 0.09, 0.045, 1.5, gold, doorX + sx * 0.95, F + DH + 0.037, dz - 0.75); B(inner, 0.09, 0.045, 0.7, gold, doorX + sx * 0.95, F + 0.172, dz + 0.35); }
  AGENTS.forEach((a, i) => { const ix = doorX + (i - 1.5) * 3.02; if (Math.abs(ix - doorX) < 1.3) return;
    B(inner, 0.8, 0.03, 0.8, gold, ix, F + DH + 0.025, dz - 0.72); B(inner, 0.62, 0.035, 0.62, flat(a.color), ix, F + DH + 0.028, dz - 0.72); });
  // iron candle stands at the ends of the step
  for (const sx of [-1, 1]) { const x = doorX + sx * 6.55; B(inner, 0.36, 0.1, 0.36, M.dark, x, F + DH + 0.05, dz - 0.4); B(inner, 0.12, 1.1, 0.12, M.dark, x, F + DH + 0.6, dz - 0.4); B(inner, 0.4, 0.08, 0.4, M.dark, x, F + DH + 1.16, dz - 0.4); candle(inner, x, F + DH + 1.2, dz - 0.4); collide(x - 0.25, x + 0.25, dz - 0.65, dz - 0.15, 2); }
  collide(doorX - DW / 2, doorX + DW / 2, nz, dz, F + DH); collide(doorX - 6.2, doorX + 6.2, dz, dz + 0.7, F + 0.15);
  // the meeting table at the crossing of the carpets, where called agents gather
  B(inner, 3.6, 0.14, 1.5, M.planks, doorX, F + 0.9, cz); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(inner, 0.2, 0.84, 0.2, M.dark, doorX + sx * 1.6, F + 0.42, cz + sz * 0.55);
  B(inner, 3.8, 0.04, 0.6, wool('#234a9e'), doorX, F + 0.98, cz); candle(inner, doorX, F + 1.0, cz); papers(inner, doorX - 1.1, F + 0.97, cz + 0.1, 2, 0.5, 0.6); B(inner, 0.5, 0.08, 0.66, flat('#a33b2e'), doorX + 1.1, F + 1.01, cz - 0.05);
  collide(doorX - 1.85, doorX + 1.85, cz - 0.8, cz + 0.8, F + 1);
  // lanterns hanging over each quarter of the hall (their beams lift away with the roof)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const lx2 = cx + sx * 3.6, lz2 = cz + (sz < 0 ? -2.4 : 4.2); /* the back pair hangs a little forward, clear of the board */ B(inner, 0.06, 1.1, 0.06, M.dark, lx2, F + 5, lz2); B(inner, 0.5, 0.1, 0.5, M.dark, lx2, F + 4.48, lz2); B(inner, 0.4, 0.44, 0.4, glow('#ffc76a'), lx2, F + 4.22, lz2); }
  const BW = 12.2, BH = 4.6, CW = 1220, CH = 460, board = new THREE.Group(); board.position.set(doorX, F + DH + 0.75, nz + 1.75); board.rotation.x = -0.24; // far enough out that the leaning top clears the wall
  const bc = document.createElement('canvas'); bc.width = CW; bc.height = CH;
  const btex = new THREE.CanvasTexture(bc); btex.encoding = THREE.sRGBEncoding; btex.anisotropy = 4;
  B(board, BW + 0.5, BH + 0.5, 0.24, M.dark, 0, BH / 2 + 0.1, -0.13, true); B(board, BW + 0.7, 0.2, 0.34, gold, 0, BH + 0.42, -0.1, true);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: btex, color: lin('#d8d2c4') })); screen.position.set(0, BH / 2 + 0.1, 0); screen.userData.board = true; board.add(screen);
  scene.add(board);
  B(inner, BW + 0.9, 0.55, 1.9, M.stone, doorX, F + DH + 0.275, nz + 1.0); for (const s of [-1, 1]) { B(inner, 0.4, 5.6, 0.4, M.log, doorX + s * (BW / 2 + 0.5), F + 2.8, nz + 0.6); B(inner, 0.6, 0.12, 0.6, M.dark, doorX + s * (BW / 2 + 0.5), F + 5.66, nz + 0.6); B(inner, 0.34, 0.34, 0.34, glow('#ffd9a0'), doorX + s * (BW / 2 + 0.5), F + 5.9, nz + 0.6); }
  collide(doorX - BW / 2 - 0.7, doorX + BW / 2 + 0.7, nz, nz + 2, 4);
  addLamp(scene, doorX, F + 2.6, nz + 3.6, 1.1, 1.3, 10, '#ffe2b8');
  // rows: [{ name, role, color, status, live, sprite (20×40 canvas), face (16×16 canvas), about, palette }]; log: the latest activity lines
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = (k) => Math.max(0, Math.min(255, Math.round((n >> k & 255) * f))).toString(16).padStart(2, '0'); return '#' + c(16) + c(8) + c(0); };
  function drawBoard(rows, log) {
    const g = bc.getContext('2d'), px = (n, bold) => { g.font = (bold ? '700 ' : '500 ') + n + 'px "Pixelify Sans","Courier New",monospace'; }, sans = (n, bold) => { g.font = (bold ? '700 ' : '500 ') + n + 'px "Nunito","Segoe UI",sans-serif'; };
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#d8ccb2'; g.fillRect(0, 0, CW, CH);
    g.textBaseline = 'middle'; g.textAlign = 'left'; px(30, true); g.fillStyle = '#2a1c14'; g.fillText('AGENT BOARD', 18, 25);
    g.textAlign = 'right'; px(18); g.fillStyle = '#6b5a44'; g.fillText(rows.filter((r) => r.live).length + ' OF ' + rows.length + ' IN THE HALL', CW - 18, 25);
    const cw = (CW - 32 - 36) / 4, ch = 330, y = 48;
    rows.forEach((r, i) => {
      const x = 16 + i * (cw + 12), ink = shade(r.color, 0.72);
      g.fillStyle = 'rgba(42,28,20,.25)'; g.fillRect(x + 4, y + 4, cw, ch);
      g.fillStyle = '#f4efe3'; g.fillRect(x, y, cw, ch); g.fillStyle = ink; g.fillRect(x, y, cw, 8);
      // status, top left
      px(15, true); g.textAlign = 'left'; g.fillStyle = r.live ? '#2f8f4a' : '#b7791f'; g.fillRect(x + 14, y + 22, 10, 10); g.fillText(r.status.toUpperCase(), x + 30, y + 28);
      // the full figure, standing on a soft shadow
      g.fillStyle = 'rgba(60,45,30,.18)'; g.fillRect(x + cw / 2 - 30, y + 170, 60, 6);
      g.drawImage(r.sprite, Math.round(x + cw / 2 - 36), y + 28, 72, 144);
      // name, role and a framed portrait
      px(30, true); g.fillStyle = '#1b1b22'; g.fillText(r.name, x + 14, y + 198);
      px(16, true); g.fillStyle = ink; g.fillText(r.role, x + 14, y + 224);
      const fx = x + cw - 58, fy = y + 180; g.fillStyle = '#c9a227'; g.fillRect(fx - 3, fy - 3, 46, 46); g.fillStyle = '#e9dfc9'; g.fillRect(fx, fy, 40, 40); if (r.face) g.drawImage(r.face, fx + 2, fy + 2, 36, 36);
      // a short description, wrapped to three lines
      sans(14); g.fillStyle = '#4a4640'; const words = (r.about || '').split(' '), lines = []; let line = '';
      for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > cw - 28 && line) { lines.push(line); line = wd; } else line = tst; } if (line) lines.push(line);
      if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/\s*\S*$/, '') + '…'; }
      lines.forEach((l, k) => g.fillText(l, x + 14, y + 250 + k * 19));
      // colour swatches, like a palette card
      (r.palette || []).forEach((c, k) => { g.fillStyle = shade(c, 0.85); g.fillRect(x + 14 + k * 20, y + ch - 24, 16, 14); g.fillStyle = c; g.fillRect(x + 14 + k * 20, y + ch - 24, 16, 11); });
    });
    // the latest activity, along the bottom
    g.fillStyle = '#c9bb9c'; g.fillRect(16, 392, CW - 32, 58); g.textAlign = 'left';
    (log.length ? log.slice(0, 2) : [{ time: '', name: '', text: 'Waiting for the first report of the day', color: '#6b5a44' }]).forEach((e, k) => {
      const ly = 407 + k * 28; px(17); g.fillStyle = '#6b5a44'; g.fillText(e.time, 30, ly); px(17, true); g.fillStyle = shade(e.color || '#6b5a44', 0.7); g.fillText(e.name.toUpperCase(), 96, ly);
      const nw = e.name ? g.measureText(e.name.toUpperCase() + ' ').width + 4 : 0; sans(16, true); g.fillStyle = '#2a1c14'; g.fillText(e.text.length > 90 ? e.text.slice(0, 88) + '…' : e.text, 96 + nw, ly);
    });
    btex.needsUpdate = true;
  }
  addLamp(scene, cx, F + 3.6, cz, 1.3, 1.5, 12, '#ffc27a');
  /* work in progress: Bobby's stack of filed stories grows, and a ticker runs along Edwin's canopy.
     These change while the page runs, so they are separate meshes rather than part of the baked room. */
  const bd = deskOf(AGENTS.find((a) => a.id === 'bobby')), sheets = [];
  for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.56), k % 2 ? M.paper : wool('#f6f3e8')); m.position.set(bd.x - 0.15 + (k % 2 ? 0.03 : -0.02), F + 0.975 + k * 0.07, bd.z + 0.65); m.visible = k < 1; scene.add(m); sheets.push(m); }
  function setPapers(n) { sheets.forEach((m, k) => { m.visible = k < 1 + (n % sheets.length); }); }
  const tk = document.createElement('canvas'); tk.width = 128; tk.height = 8;
  { const g = tk.getContext('2d'); g.fillStyle = '#0d1420'; g.fillRect(0, 0, 128, 8); for (let i = 0; i < 16; i++) { const up = (i * 7) % 3 !== 0; g.fillStyle = up ? '#57d47c' : '#d8403a'; g.fillRect(i * 8 + 1, up ? 2 : 4, 2, 2); g.fillRect(i * 8 + 3, 3, 3, 2); g.fillStyle = '#a9b3c6'; g.fillRect(i * 8 + 1, 6, 5, 1); } }
  const ticker = new THREE.CanvasTexture(tk); ticker.magFilter = THREE.NearestFilter; ticker.wrapS = THREE.RepeatWrapping; ticker.repeat.set(0.5, 1); ticker.encoding = THREE.sRGBEncoding;
  { const ed = deskOf(AGENTS.find((a) => a.id === 'edwin')), m = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.36), new THREE.MeshBasicMaterial({ map: ticker })); m.position.set(ed.x, F + 2.46, ed.z - 0.36); m.rotation.x = -0.35; scene.add(m);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.5, 0.08), M.dark); back.position.set(ed.x, F + 2.45, ed.z - 0.42); back.rotation.x = -0.35; scene.add(back); }
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  bake(inner); scene.add(inner);

  let open = 0; // 0 = roof on, 1 = fully cut away
  return {
    labelAt: [doorX, wallH + 2.2, z1],
    table: { at: [doorX, cz], spot: (i) => { const p = [[-1.1, -1.5], [1.1, -1.5], [-1.1, 1.5], [1.1, 1.5]][i % 4]; return [doorX + p[0], cz + p[1]]; } },
    setPapers,
    board: { mesh: screen, draw: drawBoard, rect: { x0: doorX - BW / 2, x1: doorX + BW / 2, z0: nz, z1: nz + 2 }, stand: [doorX, nz + 2.9] },
    entrance: [doorX, z1 - 3.4],
    openness: () => open,
    update(dt, inside, time) {
      open += Math.sign((inside ? 1 : 0) - open) * Math.min(Math.abs((inside ? 1 : 0) - open), dt / 0.7);
      const o = 1 - open * open * (3 - 2 * open);
      for (const m of fadeMats) { m.opacity = o; m.transparent = o < 0.995; m.depthWrite = o > 0.5; }
      fade.visible = o > 0.02;
      const pulse = 0.5 + Math.sin(time * 1.7) * 0.5;
      drawClock(); ticker.offset.x = (time * 0.12) % 1;
      puffs.forEach((m, i) => { const k = (time * 0.16 + i / puffs.length) % 1; m.visible = o > 0.5; m.position.set(x0 + 2.2 + k * 2.2 + Math.sin(i * 2.1 + time * 0.5) * 0.3, wallH + 8.1 + k * 4.6, cz + Math.sin(i * 1.3) * 0.3); m.scale.setScalar(0.35 + Math.sin(k * Math.PI) * 0.9); m.rotation.y = i + time * 0.2; });
      portalMat.opacity = (0.68 + pulse * 0.1) * o; coreMat.opacity = (0.16 + (1 - pulse) * 0.16) * o; portal.visible = core.visible = o > 0.02;
    },
  };
}
export const HALL_CENTRE = [cx, cz];
