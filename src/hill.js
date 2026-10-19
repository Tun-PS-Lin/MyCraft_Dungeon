// The hilltop behind the north-west stalls, and the path up to it. A gap in the north fence
// (between the stalls and the town hall) opens onto a stone path that climbs in shallow steps
// round to a flat top, where the observatory stands. This file is only the shape of it, so the
// collision code, the map and the builders all agree; observatory.js builds what you see.
import { FLOOR } from './config.js';

export const HILL = { cx: -11.4, cz: -21.8, rx: 3.9, rz: 3.3, top: 3.2 };
// the path: from the gate in the fence, up the road a little, then round and up to the top
export const PATH = [[0, -13.9], [0, -16.6], [-4.6, -18.6], [-8.0, -20.6]];
export const PATH_HALF = 1.3;    // half the path's width
export const GATE = { x0: -2.4, x1: 2.4, z: -14.5 }; // the opening in the fence
const RISE_FROM = 2.7, STEP_H = 0.2; // the climb starts this far along; each step rises this much

const SEG = []; let LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) { const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], l = Math.hypot(bx - ax, bz - az); SEG.push({ ax, az, bx, bz, l, s0: LEN }); LEN += l; }
export const PATH_LEN = LEN;

// nearest point on the path: { d: distance from it, s: how far along the path }
export function onPath(x, z) {
  let best = { d: Infinity, s: 0 };
  for (const g of SEG) {
    const dx = g.bx - g.ax, dz = g.bz - g.az, t = Math.max(0, Math.min(1, ((x - g.ax) * dx + (z - g.az) * dz) / (g.l * g.l)));
    const d = Math.hypot(x - g.ax - dx * t, z - g.az - dz * t); if (d < best.d) best = { d, s: g.s0 + t * g.l };
  }
  return best;
}
// the height of the path's step at a distance s along it
export function stepHeight(s) {
  const k = Math.max(0, Math.min(1, (s - RISE_FROM) / (LEN - RISE_FROM)));
  return FLOOR + Math.round((k * (HILL.top - FLOOR)) / STEP_H) * STEP_H;
}
const plateau = (x, z, pad = 0) => ((x - HILL.cx) / (HILL.rx + pad)) ** 2 + ((z - HILL.cz) / (HILL.rz + pad)) ** 2 < 1;

// can you stand here (on the path or the hilltop)?
export function onHill(x, z) { return plateau(x, z, -0.45) || (z < -13.5 && onPath(x, z).d < PATH_HALF - 0.4); }
// the ground height on the path or the hilltop
export function hillFloor(x, z) {
  if (plateau(x, z, -0.2)) return HILL.top;
  return stepHeight(onPath(x, z).s);
}
// the hill's shape, for building it: the height of the grass at a block (0 off the hill)
export function hillHeight(x, z) {
  const ex = (x - HILL.cx) / HILL.rx, ez = (z - HILL.cz) / HILL.rz, e = Math.sqrt(ex * ex + ez * ez); // 1 at the plateau's edge
  const r = Math.max(0, e - 1) * Math.min(HILL.rx, HILL.rz), fall = HILL.top * Math.max(0, 1 - r / 4.2);
  return Math.round(fall * 2) / 2;
}
// somewhere on the hill or its slopes (trees are kept off it)
export const nearHill = (x, z) => plateau(x, z, 5) || (z < -13 && onPath(x, z).d < 2.6);
// the observatory, on the hilltop, a little back from where the path arrives
export const OBS = { x: HILL.cx - 0.9, z: HILL.cz - 0.6, r: 1.75 };
export const OBS_DOOR = { x: OBS.x + 2.1, z: OBS.z + 1.9 }; // where you stand to use the telescope
