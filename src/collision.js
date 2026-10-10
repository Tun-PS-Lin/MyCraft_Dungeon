// Collision: the player is a small circle tested against axis-aligned boxes.
// A box only blocks if it is taller than a step; lower ones can be walked or jumped onto.
import { PLAZA } from './config.js';

export const boxes = [];
export const RADIUS = 0.4;
export const STEP = 0.36;
export const LIMIT = { x: PLAZA.x - 0.45, z: PLAZA.z - 0.45 };

let heightFn = () => 0;
export function setHeightFn(fn) { heightFn = fn; }

export function collide(x0, x1, z0, z1, h) {
  boxes.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), h });
}
const over = (b, x, z) => x > b.x0 - RADIUS && x < b.x1 + RADIUS && z > b.z0 - RADIUS && z < b.z1 + RADIUS;

export function blocked(x, z, y) {
  if (Math.abs(x) > LIMIT.x || Math.abs(z) > LIMIT.z) return true;
  for (const b of boxes) if (over(b, x, z) && b.h - y > STEP) return true;
  return false;
}
export function groundAt(x, z, y) {
  let g = heightFn(x, z);
  for (const b of boxes) if (b.h > g && over(b, x, z) && b.h - y <= STEP) g = b.h;
  return g;
}
// distance from a point to a rectangle (0 when inside)
export function rectDistance(r, x, z) {
  const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1);
  return Math.hypot(dx, dz);
}
