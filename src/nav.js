// Walk-to: finds a path across the village so the menu can send the character
// somewhere instead of teleporting. A* over a one-block grid, then the path is
// straightened wherever there is a clear line.
import { BOUNDS, HALL } from './config.js';
import { blocked, floorAt } from './collision.js';

const X0 = Math.floor(BOUNDS.x0) - 1, Z0 = Math.floor(HALL.z0) - 1, W = Math.ceil(BOUNDS.x1) - X0 + 2, H = Math.ceil(BOUNDS.z1) - Z0 + 2;
let free = null;
const cellFree = (x, z) => !blocked(x, z, floorAt(x, z) + 0.01);
function grid() {
  if (free) return free; free = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) free[j * W + i] = cellFree(X0 + i + 0.5, Z0 + j + 0.5) ? 1 : 0;
  return free;
}
function nearestFree(x, z) {
  const g = grid(); let best = -1, bd = 1e9;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (g[j * W + i]) { const d = (X0 + i + 0.5 - x) ** 2 + (Z0 + j + 0.5 - z) ** 2; if (d < bd) { bd = d; best = j * W + i; } }
  return best;
}
function clear(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.3);
  for (let k = 1; k < n; k++) { const t = k / n; if (!cellFree(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}

// Returns a list of [x, z] points from (sx, sz) to as near (tx, tz) as can be reached, or null.
export function findPath(sx, sz, tx, tz) {
  const g = grid(), start = nearestFree(sx, sz), goal = nearestFree(tx, tz); if (start < 0 || goal < 0) return null;
  const cost = new Float32Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1), open = [start]; cost[start] = 0;
  const gx = goal % W, gz = (goal / W) | 0, est = (c) => Math.hypot((c % W) - gx, ((c / W) | 0) - gz), score = new Float32Array(W * H).fill(Infinity); score[start] = est(start);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (score[open[k]] < score[open[bi]]) bi = k;
    const c = open.splice(bi, 1)[0]; if (c === goal) break;
    const ci = c % W, cj = (c / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= W || j >= H) continue;
      const n = j * W + i; if (!g[n]) continue;
      if (di && dj && (!g[cj * W + i] || !g[j * W + ci])) continue; // no cutting corners
      const nc = cost[c] + (di && dj ? 1.414 : 1);
      if (nc < cost[n]) { cost[n] = nc; from[n] = c; score[n] = nc + est(n); if (!open.includes(n)) open.push(n); }
    }
  }
  if (from[goal] < 0 && goal !== start) return null;
  const pts = []; for (let c = goal; c >= 0; c = from[c]) { pts.push([X0 + (c % W) + 0.5, Z0 + ((c / W) | 0) + 0.5]); if (c === start) break; }
  pts.reverse(); if (cellFree(tx, tz)) pts.push([tx, tz]);
  // straighten
  const out = []; let ax = sx, az = sz, i = 0;
  while (i < pts.length) { let j = pts.length - 1; while (j > i && !clear(ax, az, pts[j][0], pts[j][1])) j--; out.push(pts[j]); ax = pts[j][0]; az = pts[j][1]; i = j + 1; }
  return out;
}
