// The town hall: a stone hall with a steep timber roof. Its doorway glows like a
// portal; when the player walks in, the roof and the near walls fade away to show
// the agents' desks inside.
import * as THREE from 'three';
import { HALL, AGENTS } from './config.js';
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
  bobby(g) { papers(g, -0.75, 0.94, 0.65, 4, 0.5, 0.56); papers(g, -0.15, 0.94, 0.65, 2, 0.5, 0.56); B(g, 0.7, 0.24, 0.5, flat('#2b2b2f'), 0.65, 1.06, 0.65); B(g, 0.55, 0.32, 0.26, flat('#3a3a40'), 0.65, 1.34, 0.56); B(g, 0.62, 0.1, 0.1, wool('#d8d0bc'), 0.65, 1.24, 0.86); },
  friday(g, a) { B(g, 0.8, 0.6, 0.05, flat('#1b2a4a'), 0.45, 1.3, 0.56); B(g, 0.7, 0.5, 0.05, glow('#3aa7ff'), 0.45, 1.3, 0.6); B(g, 0.24, 0.1, 0.24, flat('#26262e'), 0.45, 0.99, 0.6); B(g, 0.42, 0.08, 0.56, flat('#2f66c4'), -0.7, 0.98, 0.65); B(g, 0.38, 0.08, 0.52, flat('#f1efe6'), -0.68, 1.06, 0.65); B(g, 0.18, 0.18, 0.18, glow(a.trim), -0.15, 1.03, 0.8); },
  sally(g) { B(g, 1.2, 0.04, 0.6, M.blueprint, -0.35, 0.96, 0.65); [[0.5, 0.36], [0.76, 0.6], [1.0, 0.3]].forEach(([x, h], i) => B(g, 0.2, h, 0.2, flat(i % 2 ? '#c5ccd8' : '#98a2b3'), x, 0.94 + h / 2, 0.65)); B(g, 0.16, 0.16, 0.6, wool('#f3ead2'), -0.95, 1.03, 0.65); },
  edwin(g, a) { [[-0.85, 0.12], [-0.68, 0.24], [-1.0, 0.18]].forEach(([x, h]) => B(g, 0.16, h, 0.16, flat('#e4b93a'), x, 0.94 + h / 2, 0.72)); B(g, 0.06, 0.42, 0.06, flat('#e4b93a'), 0.05, 1.15, 0.65); B(g, 0.56, 0.05, 0.05, flat('#e4b93a'), 0.05, 1.36, 0.65); B(g, 0.18, 0.04, 0.18, flat('#e4b93a'), -0.2, 1.22, 0.65); B(g, 0.18, 0.04, 0.18, flat('#e4b93a'), 0.3, 1.25, 0.65); B(g, 0.46, 0.08, 0.6, flat('#3a2a50'), 0.8, 0.98, 0.65); [0.24, 0.4, 0.32, 0.56].forEach((h, i) => B(g, 0.14, h, 0.06, glow(i === 3 ? '#57d47c' : a.trim), -0.36 + i * 0.24, 1.75 + h / 2, -0.9)); },
};
const DESK_MARK = { bobby: 'news', friday: 'chip', sally: 'house', edwin: 'scale' };

function buildDesk(parent, a) {
  const { x, z } = deskOf(a), g = new THREE.Group(); g.position.set(x, floor, z);
  B(g, 3.5, 0.04, 2.9, wool(a.color), 0, 0.03, -0.05); B(g, 3.1, 0.05, 2.5, wool(a.robe), 0, 0.035, -0.05);
  B(g, 2.4, 0.9, 0.7, M.planks, 0, 0.45, 0.65); B(g, 2.56, 0.06, 0.8, wool(a.color), 0, 0.93, 0.65);
  bookcase(g, 0, 0, -1.2, 2.4, 1.5);
  B(g, 0.2, 2.7, 0.2, M.log, -1.32, 1.35, -1.3); B(g, 0.2, 2.7, 0.2, M.log, 1.32, 1.35, -1.3);
  for (let i = 0; i < 3; i++) { const m = wool(i % 2 ? '#f4f1e6' : a.color); B(g, 0.96, 0.16, 1, m, -0.96 + i * 0.96, 2.74, -0.95); B(g, 0.96, i % 2 ? 0.2 : 0.34, 0.07, m, -0.96 + i * 0.96, 2.66 - (i % 2 ? 0.1 : 0.17), -0.44); }
  B(g, 0.45, 0.45, 0.45, M.dark, 0, 0.225, -0.15);
  banner(g, 0, 0.48, 1.03, 0.6, 0.62, a.color, DESK_MARK[a.id]);
  B(g, 0.14, 0.34, 0.14, M.log, 1.02, 1.11, 0.9); B(g, 0.2, 0.2, 0.2, glow('#ffc76a'), 1.02, 1.38, 0.9);
  DESK_PROPS[a.id](g, a);
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
  for (const s of [-1, 1]) B(fade, 0.7, 1.1, 0.1, paneF, cx + s * 1.5, wallH + rise * 3.4, z1 + 1.03, true);
  B(fade, 0.3, rise * 6, 0.2, darkF, cx, wallH + rise * 4, z1 + 1.0);
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
  bake(solid); scene.add(solid);
  bake(fade); scene.add(fade);

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

  // back wall: a bookcase in each corner, with the agent board between them (built further down)
  [x0 + 3.2, x1 - 3.2].forEach((x) => bookcase(inner, x, F, nz + 0.3, 3, 3.5));
  for (const s of [-1, 1]) banner(inner, doorX + s * 6.3, F + 4.5, nz + 0.06, 0.9, 1.4, '#8a2026', 'tree');
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
  crate(inner, ex, cz + 3.6, 1, F); crate(inner, ex + 0.1, cz + 4.6, 0.7, F); B(inner, 0.8, 1, 0.8, M.dark, ex, F + 0.5, cz - 3.6); B(inner, 0.86, 0.1, 0.86, flat('#3a2a1a'), ex, F + 0.3, cz - 3.6); B(inner, 0.86, 0.1, 0.86, flat('#3a2a1a'), ex, F + 0.75, cz - 3.6);
  collide(ex - 0.55, ex + 0.55, cz + 3.05, cz + 5, 1.1); collide(ex - 0.45, ex + 0.45, cz - 4.05, cz - 3.15, 1.1);
  // benches inside the front wall and plants in the corners
  for (const s of [-1, 1]) { const x = doorX + s * 4.6; B(inner, 2.6, 0.16, 0.6, M.planks, x, F + 0.5, z1 - 1.75); B(inner, 0.18, 0.44, 0.5, M.dark, x - 1.1, F + 0.22, z1 - 1.75); B(inner, 0.18, 0.44, 0.5, M.dark, x + 1.1, F + 0.22, z1 - 1.75); collide(x - 1.3, x + 1.3, z1 - 2.05, z1 - 1.45, 1); }
  [[wx + 0.75, nz + 0.75], [x1 - 1.75, nz + 0.75], [wx + 0.75, z1 - 1.75], [x1 - 1.75, z1 - 1.75]].forEach(([x, z]) => { B(inner, 0.6, 0.5, 0.6, M.dark, x, F + 0.25, z); B(inner, 0.8, 0.8, 0.8, flat('#3f8a3a'), x, F + 0.9, z); B(inner, 0.5, 0.5, 0.5, flat('#4f9a44'), x + 0.1, F + 1.45, z - 0.05); collide(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 1.5); });

  /* the agent board: a big lit screen at the end of the hall, leaning back toward the camera.
     It is drawn on a canvas, so main.js can repaint it whenever an agent's status changes. */
  const BW = 9.1, BH = 3.9, board = new THREE.Group(); board.position.set(doorX, F + 0.55, nz + 1.75); board.rotation.x = -0.24; // far enough out that the leaning top clears the wall
  const bc = document.createElement('canvas'); bc.width = 840; bc.height = 360;
  const btex = new THREE.CanvasTexture(bc); btex.encoding = THREE.sRGBEncoding; btex.magFilter = THREE.NearestFilter;
  B(board, BW + 0.5, BH + 0.5, 0.24, M.dark, 0, BH / 2 + 0.1, -0.13, true); B(board, BW + 0.7, 0.2, 0.34, gold, 0, BH + 0.42, -0.1, true);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: btex })); screen.position.set(0, BH / 2 + 0.1, 0); screen.userData.board = true; board.add(screen);
  scene.add(board);
  B(inner, BW + 0.9, 0.55, 1.9, M.stone, doorX, F + 0.275, nz + 1.0); for (const s of [-1, 1]) { B(inner, 0.4, 4.6, 0.4, M.log, doorX + s * (BW / 2 + 0.5), F + 2.3, nz + 0.6); B(inner, 0.3, 0.3, 0.3, glow('#bfe0ff'), doorX + s * (BW / 2 + 0.5), F + 4.75, nz + 0.6); }
  collide(doorX - BW / 2 - 0.7, doorX + BW / 2 + 0.7, nz, nz + 2, 4);
  addLamp(scene, doorX, F + 2.6, nz + 3.6, 1.1, 1.3, 9, '#bfe0ff');
  // rows: [{ name, role, color, status, live, face (a 16×16 canvas) }]
  function drawBoard(rows) {
    const g = bc.getContext('2d'), font = (px, bold) => { g.font = (bold ? '700 ' : '500 ') + px + 'px "Pixelify Sans","Courier New",monospace'; };
    g.imageSmoothingEnabled = false; g.fillStyle = '#0d1420'; g.fillRect(0, 0, 840, 360); g.fillStyle = '#17233a'; g.fillRect(0, 0, 840, 62);
    g.textBaseline = 'middle'; g.textAlign = 'left'; font(34, true); g.fillStyle = '#ffc93c'; g.fillText('AGENT BOARD', 24, 33);
    g.textAlign = 'right'; font(20); g.fillStyle = '#a9b3c6'; g.fillText(rows.filter((r) => r.live).length + ' OF ' + rows.length + ' IN THE HALL', 816, 34); g.textAlign = 'left';
    rows.forEach((r, i) => {
      const x = 20 + (i % 2) * 406, y = 78 + ((i / 2) | 0) * 138;
      g.fillStyle = '#1d2638'; g.fillRect(x, y, 394, 126); g.fillStyle = r.color; g.fillRect(x, y, 8, 126);
      g.fillStyle = r.color; g.fillRect(x + 22, y + 15, 96, 96); g.drawImage(r.face, x + 22, y + 15, 96, 96);
      font(32, true); g.fillStyle = '#f3f1ea'; g.fillText(r.name.toUpperCase(), x + 134, y + 32);
      font(19); g.fillStyle = '#a9b3c6'; g.fillText(r.role.toUpperCase(), x + 134, y + 62);
      g.fillStyle = r.live ? '#57d47c' : '#ffc93c'; g.fillRect(x + 134, y + 86, 14, 14); font(21, true); g.fillText(r.status.toUpperCase(), x + 158, y + 94);
    });
    btex.needsUpdate = true;
  }
  addLamp(scene, cx, F + 3.6, cz, 1.3, 1.5, 12, '#ffc27a');
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  bake(inner); scene.add(inner);

  let open = 0; // 0 = roof on, 1 = fully cut away
  return {
    labelAt: [doorX, wallH + 2.2, z1],
    board: { mesh: screen, draw: drawBoard, rect: { x0: doorX - BW / 2, x1: doorX + BW / 2, z0: nz, z1: nz + 2 }, stand: [doorX, nz + 3.1],
      // where a called agent comes to stand, by its place in the list
      callSpot: (i, n) => [doorX + (i - (n - 1) / 2) * 1.6, nz + 4.9] },
    entrance: [doorX, z1 - 3.4],
    openness: () => open,
    update(dt, inside, time) {
      open += Math.sign((inside ? 1 : 0) - open) * Math.min(Math.abs((inside ? 1 : 0) - open), dt / 0.7);
      const o = 1 - open * open * (3 - 2 * open);
      for (const m of fadeMats) { m.opacity = o; m.transparent = o < 0.995; m.depthWrite = o > 0.5; }
      fade.visible = o > 0.02;
      const pulse = 0.5 + Math.sin(time * 1.7) * 0.5;
      portalMat.opacity = (0.68 + pulse * 0.1) * o; coreMat.opacity = (0.16 + (1 - pulse) * 0.16) * o; portal.visible = core.visible = o > 0.02;
    },
  };
}
export const HALL_CENTRE = [cx, cz];
