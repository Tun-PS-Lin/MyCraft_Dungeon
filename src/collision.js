// Collision: the player is a small circle. The walkable area is the village square
// plus the inside of the town hall, joined by the doorway; everything else is solid.
// Inside that area, boxes block if they are taller than a step; lower ones can be
// walked or jumped onto.
import { BOUNDS, HALL, FLOOR } from './config.js';

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

export function blocked(x, z, y) {
  if (!(inSquare(x, z) || insideHall(x, z) || inDoor(x, z))) return true;
  for (const b of boxes) if (over(b, x, z) && b.h - y > STEP) return true;
  return false;
}
// The square is one flat level so walking over cobbles, dirt and grass never bobs.
export function floorAt(x, z) { return inHallRect(x, z) && z < HALL.z1 - 0.5 ? HALL.floor : FLOOR; }
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
