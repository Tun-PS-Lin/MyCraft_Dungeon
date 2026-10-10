// The town hall: a stone building whose roof and near walls fade away when the
// player walks in, showing the agents' desks inside.
import * as THREE from 'three';
import { HALL, AGENTS } from './config.js';
import { B, M, T, wool, glow, flat, emblem } from './textures.js';
import { collide } from './collision.js';
import { addLamp } from './lights.js';
import { banner, papers, crate } from './stalls.js';

const { x0, x1, z0, z1, doorX, doorW, floor, wallH } = HALL;
const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;

// Where each desk stands, and the short route an agent takes from the carpet to its seat.
const DESK_AT = { nw: [cx - 5.2, z0 + 3.6], ne: [cx + 5.2, z0 + 3.6], sw: [cx - 5.2, z1 - 4], se: [cx + 5.2, z1 - 4] };
export const CARPET = { hz: cz, hx: [x0 + 2.2, x1 - 2.2], vx: doorX, vz: [z0 + 2.2, z1 - 1.8] };
export function deskOf(agent) {
  const [x, z] = DESK_AT[agent.desk], side = x < cx ? 1 : -1;
  return { x, z, seat: [x, z - 0.2], side: [x + side * 2.6, z - 0.2], access: [x + side * 2.6, cz] };
}

const DESK_PROPS = {
  bobby(g) { papers(g, -1.1, 1.08, 0.8, 4, 0.6, 0.7); papers(g, -0.3, 1.08, 0.8, 2, 0.6, 0.7); B(g, 0.9, 0.3, 0.6, flat('#2b2b2f'), 0.9, 1.23, 0.8); B(g, 0.7, 0.4, 0.3, flat('#3a3a40'), 0.9, 1.58, 0.7); B(g, 0.8, 0.12, 0.12, wool('#d8d0bc'), 0.9, 1.45, 1.05); },
  friday(g, a) { B(g, 0.9, 0.7, 0.08, glow('#3aa7ff'), 0.6, 1.5, 0.75); B(g, 1, 0.8, 0.06, flat('#1b2a4a'), 0.6, 1.5, 0.7); B(g, 0.3, 0.14, 0.3, flat('#26262e'), 0.6, 1.12, 0.75); B(g, 0.5, 0.1, 0.7, flat('#2f66c4'), -0.9, 1.13, 0.8); B(g, 0.46, 0.1, 0.66, flat('#f1efe6'), -0.88, 1.23, 0.8); B(g, 0.22, 0.22, 0.22, glow(a.trim), -0.2, 1.2, 0.9); },
  sally(g) { B(g, 1.7, 0.05, 0.8, M.blueprint, -0.5, 1.1, 0.8); [[0.6, 0.5], [0.95, 0.8], [1.3, 0.4]].forEach(([x, h], i) => B(g, 0.26, h, 0.26, flat(i % 2 ? '#c5ccd8' : '#98a2b3'), x, 1.08 + h / 2, 0.8)); B(g, 1.6, 1.1, 0.08, wool('#e8d3a0'), 0, 2.3, -1.2); B(g, 0.5, 0.3, 0.1, flat('#3d7d40'), -0.3, 2.4, -1.15); B(g, 0.4, 0.4, 0.1, flat('#2f66c4'), 0.35, 2.15, -1.15); },
  edwin(g, a) { [[-1.1, 0.14], [-0.9, 0.28], [-1.3, 0.2]].forEach(([x, h]) => B(g, 0.2, h, 0.2, flat('#e4b93a'), x, 1.08 + h / 2, 0.85)); B(g, 0.08, 0.5, 0.08, flat('#e4b93a'), 0.1, 1.33, 0.8); B(g, 0.7, 0.06, 0.06, flat('#e4b93a'), 0.1, 1.58, 0.8); B(g, 0.22, 0.05, 0.22, flat('#e4b93a'), -0.22, 1.4, 0.8); B(g, 0.22, 0.05, 0.22, flat('#e4b93a'), 0.42, 1.44, 0.8); B(g, 0.6, 0.1, 0.8, flat('#3a2a50'), 1.1, 1.13, 0.8); B(g, 1.4, 0.9, 0.08, flat('#1f2333'), 0, 2.3, -1.2); [0.3, 0.5, 0.4, 0.7].forEach((h, i) => B(g, 0.18, h, 0.1, glow(i === 3 ? '#57d47c' : a.trim), -0.45 + i * 0.3, 1.95 + h / 2, -1.14)); },
};
const DESK_MARK = { bobby: 'news', friday: 'chip', sally: 'house', edwin: 'scale' };

function buildDesk(parent, a) {
  const { x, z } = deskOf(a), g = new THREE.Group(); g.position.set(x, floor, z);
  B(g, 4.6, 0.04, 3.6, wool(a.color), 0, 0.03, 0); B(g, 4.2, 0.05, 3.2, wool(a.robe), 0, 0.035, 0);
  B(g, 3.4, 1, 0.9, M.planks, 0, 0.5, 0.8); B(g, 3.6, 0.08, 1, wool(a.color), 0, 1.04, 0.8);
  B(g, 3.4, 1.6, 0.5, M.books, 0, 0.8, -1.4); B(g, 3.6, 0.1, 0.6, M.dark, 0, 1.65, -1.4);
  B(g, 0.26, 3, 0.26, M.log, -1.85, 1.5, -1.5); B(g, 0.26, 3, 0.26, M.log, 1.85, 1.5, -1.5);
  for (let i = 0; i < 4; i++) { const m = wool(i % 2 ? '#f4f1e6' : a.color); B(g, 1, 0.2, 1.3, m, -1.5 + i, 3.05, -1.05); B(g, 1, i % 2 ? 0.22 : 0.4, 0.08, m, -1.5 + i, 2.95 - (i % 2 ? 0.11 : 0.2), -0.4); }
  B(g, 0.5, 0.5, 0.5, M.dark, 0, 0.25, -0.2);
  banner(g, 0, 0.55, 1.3, 0.7, 0.75, a.color, DESK_MARK[a.id]);
  B(g, 0.2, 0.5, 0.2, M.log, 1.55, 1.3, 1.0); B(g, 0.28, 0.28, 0.28, glow('#ffc76a'), 1.55, 1.68, 1.0);
  crate(g, -2.2, -1.2, 0.7, 0);
  DESK_PROPS[a.id](g, a);
  parent.add(g); collide(x - 2, x + 2, z - 1.75, z + 1.3, 4);
  addLamp(parent, x, floor + 2.4, z + 1.7, 1.25, 1.45, 8, '#ffc27a');
}

export function buildHall(scene) {
  const fadeMats = [], fade = new THREE.Group(), inner = new THREE.Group();
  const fm = (m) => { const c = m.clone(); fadeMats.push(c); return c; };
  const brickF = fm(M.brick), slateF = fm(M.slate), darkF = fm(M.dark), logF = fm(M.log), paneF = fm(glow('#ffc35a')), clothF = fm(wool('#234a9e')), markF = fm(emblem('tree'));
  const stub = 1.4, up = wallH - stub, upY = stub + up / 2;

  /* walls that always stand */
  B(scene, w, wallH, 1, M.brick, cx, wallH / 2, z0 + 0.5);
  B(scene, 1, wallH, d - 2, M.brick, x0 + 0.5, wallH / 2, cz);
  const lw = doorX - doorW / 2 - x0, rw = x1 - (doorX + doorW / 2), lx = x0 + lw / 2, rx = x1 - rw / 2;
  B(scene, 1, stub, d - 2, M.brick, x1 - 0.5, stub / 2, cz); B(scene, lw, stub, 1, M.brick, lx, stub / 2, z1 - 0.5); B(scene, rw, stub, 1, M.brick, rx, stub / 2, z1 - 0.5);
  /* the cut-away: upper front and side walls, timber frame, windows, roof */
  B(fade, 1, up, d - 2, brickF, x1 - 0.5, upY, cz); B(fade, lw, up, 1, brickF, lx, upY, z1 - 0.5); B(fade, rw, up, 1, brickF, rx, upY, z1 - 0.5);
  B(fade, doorW, wallH - 4.6, 1, brickF, doorX, 4.6 + (wallH - 4.6) / 2, z1 - 0.5);
  [x0 + 0.4, doorX - doorW / 2 - 0.3, doorX + doorW / 2 + 0.3, x1 - 0.4].forEach((x) => B(fade, 0.6, wallH, 0.35, logF, x, wallH / 2, z1 + 0.12));
  B(fade, w + 0.4, 0.5, 0.45, darkF, cx, wallH - 0.25, z1 + 0.14); B(fade, doorW + 1.3, 0.5, 0.45, darkF, doorX, 4.75, z1 + 0.14);
  [lx, rx - 1.6, rx + 1.6].forEach((x) => { B(fade, 1.5, 2, 0.08, paneF, x, 3.4, z1 + 0.03, true); B(fade, 1.7, 0.16, 0.14, darkF, x, 3.4, z1 + 0.08); B(fade, 0.16, 2.2, 0.14, darkF, x, 3.4, z1 + 0.08); B(fade, 1.9, 0.2, 0.2, darkF, x, 4.5, z1 + 0.1); B(fade, 1.9, 0.2, 0.2, darkF, x, 2.3, z1 + 0.1); });
  [doorX - doorW / 2 - 1.5, doorX + doorW / 2 + 1.5].forEach((x) => { B(fade, 0.9, 1.5, 0.07, clothF, x, 3.6, z1 + 0.34); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1), markF); p.position.set(x, 3.6, z1 + 0.38); fade.add(p); B(fade, 1.1, 0.12, 0.12, darkF, x, 4.4, z1 + 0.34); });
  for (let k = 0; k < 4; k++) B(fade, w + 2 - k * 0.4, 0.5, d + 2 - k * 3.4, slateF, cx, wallH + 0.25 + k * 0.5, cz);
  B(fade, w + 2.4, 0.3, 0.6, darkF, cx, wallH + 2.15, cz);
  scene.add(fade);

  /* steps and door lanterns */
  B(scene, doorW + 1.4, 0.4, 1.7, M.stone, doorX, 0.2, z1 + 0.25); B(scene, doorW + 2.2, 0.2, 0.9, M.stone, doorX, 0.1, z1 + 1.5);
  collide(doorX - doorW / 2 - 0.7, doorX + doorW / 2 + 0.7, z1 - 0.6, z1 + 1.1, 0.4); collide(doorX - doorW / 2 - 1.1, doorX + doorW / 2 + 1.1, z1 + 1.1, z1 + 1.95, 0.2);
  [doorX - doorW / 2 - 1.6, doorX + doorW / 2 + 1.6].forEach((x) => { B(scene, 0.25, 2.3, 0.25, M.log, x, 1.15, z1 + 1.4); B(scene, 0.44, 0.44, 0.44, glow('#ffc76a'), x, 2.5, z1 + 1.4, true); B(scene, 0.58, 0.1, 0.58, M.dark, x, 2.77, z1 + 1.4); collide(x - 0.15, x + 0.15, z1 + 1.25, z1 + 1.55, 3); });
  addLamp(scene, doorX, 2.6, z1 + 1.8, 0.5, 1.7, 9);

  /* inside. Nothing in here takes the baked sun shadow, so the candles can light it. */
  const tile = T.tile.clone(); tile.needsUpdate = true; tile.repeat.set(w - 2, d - 2);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, d - 2, w - 2, d - 2), new THREE.MeshLambertMaterial({ map: tile })); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, floor, cz); inner.add(fl);
  const gold = flat('#d9a93a');
  B(inner, w - 4, 0.05, 2.2, M.carpet, cx, floor + 0.03, cz); B(inner, 2.2, 0.05, d - 2.4, M.carpet, doorX, floor + 0.03, cz - 0.2);
  for (const s of [-1, 1]) { B(inner, w - 4, 0.055, 0.14, gold, cx, floor + 0.033, cz + s * 0.95); B(inner, 0.14, 0.055, d - 2.4, gold, doorX + s * 0.95, floor + 0.033, cz - 0.2); }
  B(inner, 2.06, 0.06, 2.06, M.carpet, doorX, floor + 0.034, cz);
  AGENTS.forEach((a) => buildDesk(inner, a));
  // bookshelves, banners and candles along the far walls
  for (let x = x0 + 2.8; x < x1 - 2; x += 4.6) { if (Math.abs(x + 1.5 - doorX) < 1.6) continue; B(inner, 3, 3.4, 0.6, M.books, x + 1.5, floor + 1.7, z0 + 1.3); B(inner, 3.2, 0.14, 0.7, M.dark, x + 1.5, floor + 3.45, z0 + 1.3); }
  for (let x = x0 + 5.75; x < x1 - 3; x += 4.6) banner(inner, x + 0.85, floor + 3.6, z0 + 1.06, 0.9, 1.5, '#8a2026', 'tree');
  banner(inner, doorX, floor + 3.9, z0 + 1.06, 1.3, 2, '#234a9e', 'tree');
  for (let z = z0 + 3.5; z < z1 - 3; z += 4.4) { B(inner, 0.6, 3.4, 3, M.books, x0 + 1.3, floor + 1.7, z + 0.5); B(inner, 0.7, 0.14, 3.2, M.dark, x0 + 1.3, floor + 3.45, z + 0.5); }
  [[x0 + 1.6, z1 - 1.6], [x1 - 1.6, z1 - 1.6], [x1 - 1.6, z0 + 1.7], [doorX - 2.6, z0 + 1.7], [doorX + 2.6, z0 + 1.7], [x1 - 1.6, cz]].forEach(([x, z]) => { B(inner, 0.6, 0.7, 0.6, M.stone, x, floor + 0.35, z); B(inner, 0.16, 0.3, 0.16, flat('#f4f1e6'), x, floor + 0.85, z); B(inner, 0.2, 0.22, 0.2, glow('#ffc76a'), x, floor + 1.1, z); collide(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 1.2); });
  [[x0 + 1.7, cz + 2.6], [x0 + 1.7, cz - 2.6], [x1 - 1.7, cz + 3]].forEach(([x, z]) => { B(inner, 0.6, 0.5, 0.6, M.dark, x, floor + 0.25, z); B(inner, 0.8, 0.8, 0.8, flat('#3f8a3a'), x, floor + 0.9, z); B(inner, 0.5, 0.5, 0.5, flat('#4f9a44'), x + 0.1, floor + 1.45, z); collide(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 1.5); });
  addLamp(scene, cx, floor + 3.6, cz, 1.3, 1.5, 11, '#ffc27a');
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  scene.add(inner);

  let open = 0; // 0 = roof on, 1 = fully cut away
  return {
    labelAt: [doorX, wallH + 1.2, z1],
    entrance: [doorX, z1 - 3],
    openness: () => open,
    update(dt, inside) {
      open += Math.sign((inside ? 1 : 0) - open) * Math.min(Math.abs((inside ? 1 : 0) - open), dt / 0.7);
      const o = 1 - open * open * (3 - 2 * open);
      for (const m of fadeMats) { m.opacity = o; m.transparent = o < 0.995; m.depthWrite = o > 0.5; }
      fade.visible = o > 0.02;
    },
  };
}
export const HALL_CENTRE = [cx, cz];
