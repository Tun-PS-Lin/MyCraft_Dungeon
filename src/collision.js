// Collision: the player is a small circle. The walkable area is the village square
// plus the inside of the town hall, joined by the doorway; everything else is solid.
// Inside that area, boxes block if they are taller than a step; lower ones can be
// walked or jumped onto.
import { BOUNDS, HALL, FLOOR, CAVE, HIDEOUT, POND } from './config.js';
import { onHill, hillFloor } from './hill.js';

export const boxes = [];
export const RADIUS = 0.4;
export const STEP = 0.36;
const M = 0.45; // keep this far from the outer edges

export function collide(x0, x1, z0, z1, h) {
  boxes.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), h });
}
const over = (b, x, z) => x > b.x0 - RADIUS && x < b.x1 + RADIUS && z > b.z0 - RADIUS && z < b.z1 + RADIUS;

export const inHallRect = (x, z, pad = 0) => x > HALL.x0 - pad && x < HALL.x1 + pad && z > HALL.z0 - pad && z < HALL.z1 + pad;
export const insideHall = (x, z) => x > HALL.x0 + 1 + M && x < HALL.x1 - 1 - M && z > HALL.z0 + 1 + M && z < HALL.z1 - 1 - M;
const inDoor = (x, z) => Math.abs(x - HALL.doorX) < HALL.doorW / 2 - M && z > HALL.z1 - 1.6 && z < HALL.z1 + 0.6;
const inSquare = (x, z) => x > BOUNDS.x0 + M && x < BOUNDS.x1 - M && z > BOUNDS.z0 + M && z < BOUNDS.z1 - M && !inHallRect(x, z, M);

// the cave stairs, and the Hideout room with the way back up in its back wall
export const inCave = (x, z) => Math.abs(x - CAVE.x) < CAVE.w / 2 - M - 0.05 && z > BOUNDS.z1 - 1 && z < CAVE.z0 + 3.2;
const H = HIDEOUT, hx = (x) => x - H.cx, hz = (z) => z - H.cz;
export const inHideout = (x, z) => hx(x) > H.x0 - 1 && hx(x) < H.x1 + 1 && hz(z) > H.z0 - 3 && hz(z) < H.z1 + 1;
const inRoom = (x, z) => hx(x) > H.x0 + M && hx(x) < H.x1 - M && hz(z) > H.z0 + M && hz(z) < H.z1 - M;
export const HIDEOUT_EXIT = { x: H.cx + H.doorX, z0: H.cz + H.z0 - 1.4, z1: H.cz + H.z0 + 0.6 }; // the glowing doorway, back wall left
const inExit = (x, z) => Math.abs(x - HIDEOUT_EXIT.x) < 0.55 && z > HIDEOUT_EXIT.z0 && z < HIDEOUT_EXIT.z1;

// the pond: water is the block cells whose centres fall inside the oval; the bridge and the dock cross it
export const inPondWater = (x, z) => { const cx = Math.floor(x) + 0.5, cz = Math.floor(z) + 0.5; return ((cx - POND.x) / POND.rx) ** 2 + ((cz - POND.z) / POND.rz) ** 2 < 1; };
const BR = { x0: POND.bridgeX - POND.bridgeW / 2 + 0.2, x1: POND.bridgeX + POND.bridgeW / 2 - 0.2, z0: POND.z - POND.rz - 1.6, z1: POND.z + POND.rz + 1.6 };
const onWalkway = (x, z) => (x > BR.x0 && x < BR.x1 && z > BR.z0 && z < BR.z1) || (x > POND.dock.x0 - 1 && x < POND.dock.x1 - 0.2 && Math.abs(z - POND.dock.z) < POND.dock.w / 2 - 0.12);
const nearWater = (x, z) => inPondWater(x + RADIUS, z) || inPondWater(x - RADIUS, z) || inPondWater(x, z + RADIUS) || inPondWater(x, z - RADIUS) || inPondWater(x, z);

export function blocked(x, z, y) {
  if (nearWater(x, z) && !onWalkway(x, z)) return true;
  if (!(inSquare(x, z) || insideHall(x, z) || inDoor(x, z) || inCave(x, z) || inRoom(x, z) || inExit(x, z) || onHill(x, z))) return true;
  for (const b of boxes) if (over(b, x, z) && b.h - y > STEP) return true;
  return false;
}
// The square is one flat level so walking over cobbles, dirt and grass never bobs.
export function floorAt(x, z) {
  if (inCave(x, z) && z > CAVE.z0) return FLOOR - (z - CAVE.z0) * 0.62; // down the cave stairs
  if (z < BOUNDS.z0 + 0.6 && onHill(x, z)) return hillFloor(x, z); // the path up the hill, and its top
  return inHallRect(x, z) && z < HALL.z1 - 0.5 ? HALL.floor : FLOOR;
}
export function groundAt(x, z, y) {
  let g = floorAt(x, z);
  for (const b of boxes) if (b.h > g && over(b, x, z) && b.h - y <= STEP) g = b.h;
  return g;
}
// distance from a point to a rectangle (0 when inside)
export function rectDistance(r, x, z) {
  const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1);
  return Math.hypot(dx, dz);
}
