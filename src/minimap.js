// The mini-map in the top-left corner. Small, it follows you round a close-up of the village;
// tap it (or press M) and it glides out to a big map of the whole place, with every stall,
// the town hall, the cave and the pond. Tap a place on the big map to walk there.
// It is turned to match the camera, so "up" on the map is "up" on the screen.
import { TUNING, HALL, POND, CAVE, HIDEOUT, BOUNDS } from './config.js';
import { blocked, floorAt, inPondWater, inCave } from './collision.js';
import { sound } from './audio.js';

const sinY = Math.sin(TUNING.cameraYaw), cosY = Math.cos(TUNING.cameraYaw);
// world (x, z) to map units: right along the screen, and down the screen
const toMap = (x, z) => [x * cosY - z * sinY, x * sinY + z * cosY];
const fromMap = (u, v) => [u * cosY + v * sinY, -u * sinY + v * cosY];
const S = 12; // pixels per block on the painted map

const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); return 'rgb(' + [16, 8, 0].map((s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)))).join(',') + ')'; };

// paint one area (the village or the Hideout) onto its own canvas, once
function paintArea(x0, x1, z0, z1, cellColor, extra) {
  const cs = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => toMap(x, z));
  const u0 = Math.min(...cs.map((c) => c[0])), u1 = Math.max(...cs.map((c) => c[0])), v0 = Math.min(...cs.map((c) => c[1])), v1 = Math.max(...cs.map((c) => c[1]));
  const c = document.createElement('canvas'); c.width = Math.ceil((u1 - u0) * S); c.height = Math.ceil((v1 - v0) * S);
  const g = c.getContext('2d');
  // world coordinates straight onto the canvas, turned by the camera angle
  g.setTransform(S * cosY, S * sinY, -S * sinY, S * cosY, -u0 * S, -v0 * S);
  for (let z = Math.floor(z0); z < z1; z++) for (let x = Math.floor(x0); x < x1; x++) { const col = cellColor(x + 0.5, z + 0.5); if (!col) continue; g.fillStyle = col; g.fillRect(x - 0.02, z - 0.02, 1.04, 1.04); }
  if (extra) extra(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: c, u0, v0, w: u1 - u0, h: v1 - v0 };
}

// handlers: { places() -> [{ id, x, z, color, label, found, area }], player() -> { x, z, yaw, under },
//             others() -> [{ x, z, color }], go(id), walk(x, z), focusGame() }
export function createMinimap(handlers) {
  /* the village: paving where you can walk, grass and trees where you can't, the pond, the hall */
  const village = paintArea(BOUNDS.x0 - 3, BOUNDS.x1 + 2, HALL.z0 - 1.5, CAVE.z1 + 1, (x, z) => {
    if (inPondWater(x, z)) return hash(x, z) > 0.8 ? '#4fa6e0' : '#3b8fd0';
    if (inCave(x, z)) return '#2b2420';
    const inHall = x > HALL.x0 && x < HALL.x1 && z > HALL.z0 && z < HALL.z1;
    const y = floorAt(x, z), open = !blocked(x, z, y + 0.02);
    if (inHall) return open ? (hash(x, z) > 0.5 ? '#b58a55' : '#a97f4c') : '#5b4430';
    if (open) { const r = hash(x, z); return r > 0.85 ? '#b9ab90' : r > 0.4 ? '#cbbd9f' : '#c4b597'; }
    const r = hash(x, z); return r > 0.7 ? '#3f7a3a' : r > 0.25 ? '#4a8a41' : '#56994a';
  }, (g) => {
    // the hall's walls and the bridge
    g.strokeStyle = '#3a2a1c'; g.lineWidth = 0.35; g.strokeRect(HALL.x0 + 0.2, HALL.z0 + 0.2, HALL.x1 - HALL.x0 - 0.4, HALL.z1 - HALL.z0 - 0.4);
    g.fillStyle = '#a8763e'; g.fillRect(POND.bridgeX - POND.bridgeW / 2, POND.z - POND.rz - 0.6, POND.bridgeW, POND.rz * 2 + 1.2);
    g.fillStyle = '#9a6a36'; g.fillRect(POND.dock.x0, POND.dock.z - POND.dock.w / 2, POND.dock.x1 - POND.dock.x0, POND.dock.w);
  });
  /* the Hideout: one room */
  const H = HIDEOUT;
  const hideout = paintArea(H.cx + H.x0 - 1, H.cx + H.x1 + 1, H.cz + H.z0 - 1, H.cz + H.z1 + 1, (x, z) => {
    const inside = x > H.cx + H.x0 && x < H.cx + H.x1 && z > H.cz + H.z0 && z < H.cz + H.z1;
    if (!inside) return '#1c1410';
    return blocked(x, z, floorAt(x, z) + 0.02) ? '#5a3f2a' : (hash(x, z) > 0.5 ? '#8a5f3c' : '#7f5636');
  });

  /* the frame, the canvas and the buttons */
  const wrap = document.createElement('div'); wrap.className = 'mm'; wrap.id = 'minimap';
  wrap.innerHTML = '<canvas aria-hidden="true"></canvas><div class="mm-where"></div><button class="mm-size" aria-label="Open the big map"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1h4v1H2v3H1zM7 1h4v4h-1V2H7zM1 7h1v3h3v1H1zM10 7h1v4H7v-1h3z"/></svg></button><button class="xbtn mm-x" aria-label="Close the map">×</button><div class="mm-hint">Tap a place to walk there</div>';
  const scrim = document.createElement('div'); scrim.className = 'mm-scrim';
  const cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), where = wrap.querySelector('.mm-where');
  let big = false, k = 0, kTarget = 0, hover = null, lastArea = null, w = 0, h = 0, dpr = 1;
  const view = { u: 0, v: 0, s: 1 };

  function setBig(on) {
    if (on === big) return; big = on; kTarget = on ? 1 : 0; wrap.classList.toggle('big', on); scrim.classList.toggle('show', on);
    wrap.querySelector('.mm-size').setAttribute('aria-label', on ? 'Close the big map' : 'Open the big map'); sound.play('menu');
    if (!on) { hover = null; handlers.focusGame(); }
  }
  wrap.querySelector('.mm-size').onclick = (e) => { e.stopPropagation(); setBig(!big); };
  wrap.querySelector('.mm-x').onclick = (e) => { e.stopPropagation(); setBig(false); };
  scrim.addEventListener('pointerdown', () => setBig(false));

  // where a point on the canvas is in the world, and which place (if any) is under it
  const toWorld = (px, py) => fromMap(view.u + (px - w / 2) / view.s, view.v + (py - h / 2) / view.s);
  const toScreen = (x, z) => { const [u, v] = toMap(x, z); return [w / 2 + (u - view.u) * view.s, h / 2 + (v - view.v) * view.s]; };
  function placeAt(px, py) {
    const pl = handlers.player(); let best = null, bd = big ? 22 : 0;
    for (const p of handlers.places()) { if (p.area !== (pl.under ? 'hideout' : 'village')) continue; const [sx, sy] = toScreen(p.x, p.z), d = Math.hypot(sx - px, sy - py); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  const local = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (w / r.width), (e.clientY - r.top) * (h / r.height)]; };
  cv.addEventListener('click', (e) => {
    if (!big) { setBig(true); return; }
    const [px, py] = local(e), p = placeAt(px, py);
    if (p) { setBig(false); handlers.go(p.id); return; }
    const [x, z] = toWorld(px, py); setBig(false); handlers.walk(x, z);
  });
  cv.addEventListener('pointermove', (e) => { if (!big) return; const [px, py] = local(e), p = placeAt(px, py); hover = p ? p.id : null; cv.style.cursor = 'pointer'; });
  cv.addEventListener('pointerleave', () => { hover = null; });

  const ease = (t) => t * t * (3 - 2 * t);
  function draw(time, dt) {
    if (wrap.classList.contains('off') && !big) return;
    // follow the frame's size as it grows and shrinks
    const cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    w = cv.width; h = cv.height;
    k += (kTarget - k) * Math.min(1, dt * 7); if (Math.abs(kTarget - k) < 0.001) k = kTarget;
    const pl = handlers.player(), area = pl.under ? hideout : village;
    if (area !== lastArea) { lastArea = area; where.textContent = pl.under ? 'The Hideout' : 'The Village'; }
    // small: a close-up that follows you; big: the whole area, centred
    const [pu, pv] = toMap(pl.x, pl.z), fit = Math.min(w / (area.w + 2), h / (area.h + 2)), close = (pl.under ? 9 : 7.5) * dpr * (w / dpr < 140 ? 0.8 : 1), e = ease(k);
    view.s = close + (fit - close) * e; view.u = pu + (area.u0 + area.w / 2 - pu) * e; view.v = pv + (area.v0 + area.h / 2 - pv) * e;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = pl.under ? '#1c1410' : '#3f7a3a'; g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = view.s / S < 1;
    const sc = view.s / S; g.setTransform(sc, 0, 0, sc, w / 2 - (view.u - area.u0) * view.s, h / 2 - (view.v - area.v0) * view.s);
    g.drawImage(area.canvas, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
    const u = dpr * (big ? 1 : 0.8); // one interface pixel
    // other walkers (the agents out and about, the wolf)
    for (const o of handlers.others()) { if (!!o.under !== !!pl.under) continue; const [sx, sy] = toScreen(o.x, o.z); g.fillStyle = '#10131a'; g.fillRect(sx - 3 * u, sy - 3 * u, 6 * u, 6 * u); g.fillStyle = o.color; g.fillRect(sx - 2 * u, sy - 2 * u, 4 * u, 4 * u); }
    // places: a coloured block each; ones you haven't found yet pulse
    g.font = '700 ' + Math.round(11 * dpr) + 'px "Pixelify Sans","Courier New",monospace'; g.textBaseline = 'middle';
    const labels = [];
    for (const p of handlers.places()) {
      if (p.area !== (pl.under ? 'hideout' : 'village')) continue;
      const [sx, sy] = toScreen(p.x, p.z), r = (big ? 6 : 4.5) * u * (p.id === hover ? 1.35 : 1);
      if (!p.found) { const ph = (((time * 0.9 + p.x * 0.07) % 1) + 1) % 1; g.strokeStyle = 'rgba(255,214,90,' + (1 - ph) * 0.9 + ')'; g.lineWidth = 2 * u; g.beginPath(); g.arc(sx, sy, r + ph * 9 * u, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#0b0f18'; g.fillRect(sx - r - u, sy - r - u, 2 * r + 2 * u, 2 * r + 2 * u); g.fillStyle = p.color; g.fillRect(sx - r, sy - r, 2 * r, 2 * r);
      if (p.found) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(sx - r * 0.35, sy - r * 0.35, r * 0.7, r * 0.7); }
      if (k > 0.6) labels.push({ p, sx, sy, r });
    }
    // names on the big map: to the right of each place, or wherever they don't overlap another name
    if (labels.length) {
      const lh = 16 * dpr, boxes = labels.map(({ sx, sy, r }) => [sx - r - u, sy - r - u, 2 * r + 2 * u, 2 * r + 2 * u]); g.globalAlpha = Math.min(1, (k - 0.6) / 0.3);
      for (const { p, sx, sy, r } of labels) {
        const tw = g.measureText(p.label).width + 6 * u, R = sx + r + 4 * u, L = sx - r - 4 * u - tw, C = sx - tw / 2, m = sy - lh / 2;
        const tries = [[R, m], [L, m], [C, sy - r - 4 * u - lh], [C, sy + r + 4 * u], [R, m - lh * 0.9], [R, m + lh * 0.9], [L, m - lh * 0.9], [L, m + lh * 0.9], [C, sy - r - 6 * u - lh * 2], [C, sy + r + 6 * u + lh]];
        let at = tries[0]; for (const t of tries) { if (t[0] < 2 || t[0] + tw > w - 2) continue; if (!boxes.some((b) => t[0] < b[0] + b[2] && t[0] + tw > b[0] && t[1] < b[1] + (b[3] || lh) && t[1] + lh > b[1])) { at = t; break; } }
        boxes.push([at[0], at[1], tw, lh]);
        g.fillStyle = p.id === hover ? 'rgba(255,201,60,.96)' : 'rgba(11,15,24,.82)'; g.fillRect(at[0], at[1], tw, lh);
        g.fillStyle = p.id === hover ? '#141b29' : '#f3f1ea'; g.fillText(p.label, at[0] + 3 * u, at[1] + lh / 2 + 0.5 * dpr);
      }
      g.globalAlpha = 1;
    }
    // you: an arrow pointing the way you face
    { const [sx, sy] = toScreen(pl.x, pl.z), fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw), [du, dv] = toMap(fx, fz), a = Math.atan2(dv, du), R = (big ? 9 : 7.5) * u;
      g.save(); g.translate(sx, sy); g.rotate(a);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(0, 0, R * (1.5 + Math.sin(time * 4) * 0.15), 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0b0f18'; g.beginPath(); g.moveTo(R + 2 * u, 0); g.lineTo(-R * 0.8 - u, R * 0.85 + u); g.lineTo(-R * 0.35, 0); g.lineTo(-R * 0.8 - u, -R * 0.85 - u); g.closePath(); g.fill();
      g.fillStyle = '#ffc93c'; g.beginPath(); g.moveTo(R, 0); g.lineTo(-R * 0.7, R * 0.7); g.lineTo(-R * 0.3, 0); g.lineTo(-R * 0.7, -R * 0.7); g.closePath(); g.fill();
      g.restore(); }
  }
  return { el: wrap, scrim, draw, isBig: () => big, open: () => setBig(true), close: () => setBig(false), toggle: () => setBig(!big) };
}
