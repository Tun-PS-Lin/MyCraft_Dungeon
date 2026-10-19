// The hilltop and its observatory (see hill.js for the shape). The hill is built from grass
// blocks in half-block layers, the path from stone steps, and on top stands a small round
// observatory: a stone drum, a white dome with its slit open, and a brass telescope pointing
// out over the village. Walk up to its door and press E to look through the telescope: the
// camera rises into the dome and you can look all round (drag, or the arrow keys) and zoom,
// while the character waits at the door.
import * as THREE from 'three';
import { B, M, Batch, flat, glow, bake, cv, toTex, tiles, speck, fill, rng, DIRT, GRASS, wool } from './textures.js';
import { collide } from './collision.js';
import { addLamp } from './lights.js';
import { BOUNDS } from './config.js';
import { HILL, PATH_HALF, onPath, stepHeight, hillHeight, OBS, OBS_DOOR } from './hill.js';

export function buildHill(scene) {
  /* the mound: half-block layers of grass and earth, and the stone steps of the path */
  const r = rng(91), sideTex = toTex(cv(16, 8, (g) => { const q = rng(19); speck(g, 16, 8, DIRT, q); for (let x = 0; x < 16; x++) { const d = 2 + ((q() * 2) | 0); for (let y = 0; y < d; y++) fill(g, GRASS[(q() * GRASS.length) | 0], x, y, 1, 1); } }));
  const top = new THREE.MeshLambertMaterial({ map: toTex(tiles.grass(61)) }), side = new THREE.MeshLambertMaterial({ map: sideTex }), dirt = new THREE.MeshLambertMaterial({ map: toTex(tiles.dirt(51)) });
  const turf = new Batch([side, side, top, dirt, side, side]), earth = new Batch(dirt), steps = new Batch(M.paver), tufts = new Batch(M.tint, null, false);
  const col = new THREE.Color();
  for (let z = Math.floor(HILL.cz - HILL.rz - 6); z < BOUNDS.z0 - 0.6; z++) for (let x = Math.floor(HILL.cx - HILL.rx - 6); x < Math.ceil(HILL.cx + HILL.rx + 8); x++) {
    const cx = x + 0.5, cz = z + 0.5, p = onPath(cx, cz);
    if (p.d < PATH_HALF + 0.05) continue; // the path is built below, in finer steps
    const h = hillHeight(cx, cz); if (h <= 0) continue;
    turf.add(cx, h - 0.25, cz, 1, 0.5, 1);
    if (h > 0.5) earth.add(cx, (h - 0.5) / 2, cz, 1, h - 0.5, 1);
    if (r() < 0.45) { const n = 1 + ((r() * 2) | 0); for (let i = 0; i < n; i++) { const th = 0.2 + r() * 0.25; tufts.add(cx + (r() - 0.5) * 0.8, h + th / 2, cz + (r() - 0.5) * 0.8, 0.1, th, 0.1, col.setHSL(0.22 + r() * 0.07, 0.6, 0.27 + r() * 0.12).clone()); } }
    if (r() < 0.06) { const fx = cx + (r() - 0.5) * 0.6, fz = cz + (r() - 0.5) * 0.6; tufts.add(fx, h + 0.16, fz, 0.06, 0.32, 0.06, '#3f7a2a'); tufts.add(fx, h + 0.36, fz, 0.18, 0.14, 0.18, ['#f4e04d', '#f6f6f6', '#e9627a', '#c58cf0'][(r() * 4) | 0]); }
  }
  // the path: half-block stone steps, each the height of its step, with the grass bank beside it
  for (let z = -27; z < BOUNDS.z0 - 0.2; z += 0.5) for (let x = -14; x < 3; x += 0.5) {
    const cx = x + 0.25, cz = z + 0.25, p = onPath(cx, cz); if (p.d > PATH_HALF + 0.05) continue;
    const h = Math.max(0.09, stepHeight(p.s)), edge = p.d > PATH_HALF - 0.3;
    steps.add(cx, h / 2, cz, 0.5, h, 0.5, col.set(edge ? '#8f887c' : ['#b3aca3', '#aaa39a', '#bcb5ac', '#a19a92'][(r() * 4) | 0]).clone());
  }
  [turf, earth, steps, tufts].forEach((b) => b.build(scene));

  /* the observatory */
  const g = new THREE.Group(), Y = HILL.top; g.position.set(OBS.x, 0, OBS.z); scene.add(g);
  const stone = M.stone, white = flat('#eef0f2'), shade = flat('#d4d8de'), brass = flat('#c99a36'), dark = flat('#1b1f2a');
  // a stone floor round it
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, m = B(g, 0.9, 0.1, 0.55, M.paver, Math.cos(a) * 2.25, Y + 0.05, Math.sin(a) * 2.25); m.rotation.y = -a + Math.PI / 2; }
  // the drum: an eight-sided stone tower, with a band of gold where the dome sits
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.75, 2.5, 8), stone); drum.position.y = Y + 1.25; drum.rotation.y = Math.PI / 8; drum.castShadow = drum.receiveShadow = true; g.add(drum);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.18, 8), brass); band.position.y = Y + 2.55; band.rotation.y = Math.PI / 8; g.add(band);
  // the dome: a low-poly white half-sphere, its open slit facing the village (south-east)
  const facing = Math.atan2(3 - OBS.x, 2 - OBS.z); // toward the middle of the square
  const domeG = new THREE.Group(); domeG.position.y = Y + 2.62; domeG.rotation.y = facing; g.add(domeG);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#eef0f2', flatShading: true })); dome.castShadow = true; domeG.add(dome);
  B(domeG, 0.55, 1.3, 0.12, dark, 0, 0.75, 1.43, true); const lip = B(domeG, 0.62, 0.9, 0.1, dark, 0, 1.25, 0.98, true); lip.rotation.x = -0.75;
  B(domeG, 0.08, 1.7, 0.08, shade, -0.33, 0.85, 1.4, true); B(domeG, 0.08, 1.7, 0.08, shade, 0.33, 0.85, 1.4, true);
  // the telescope: a brass tube poking out of the slit, tilted up a little
  const tube = new THREE.Group(); tube.position.set(0, 0.55, 0.4); tube.rotation.x = -0.45; domeG.add(tube);
  const tm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.1, 8), new THREE.MeshLambertMaterial({ color: '#c99a36' })); tm.rotation.x = Math.PI / 2; tm.position.z = 0.9; tube.add(tm);
  B(tube, 0.42, 0.42, 0.14, dark, 0, 0, 1.95, true);
  // the door, toward where the path arrives, with a little lantern and a sign
  const doorA = Math.atan2(OBS_DOOR.x - OBS.x, OBS_DOOR.z - OBS.z), dg = new THREE.Group(); dg.rotation.y = doorA; g.add(dg);
  B(dg, 0.95, 1.7, 0.2, flat('#5a3a1f'), 0, Y + 0.85, 1.62); B(dg, 1.15, 0.16, 0.26, stone, 0, Y + 1.78, 1.62); B(dg, 0.08, 0.08, 0.06, brass, 0.3, Y + 0.85, 1.74, true);
  B(dg, 0.08, 0.5, 0.08, M.dark, 0.85, Y + 1.85, 1.75, true); B(dg, 0.24, 0.28, 0.24, glow('#ffc76a'), 0.85, Y + 1.5, 1.75, true);
  addLamp(g, 0.8 * Math.sin(doorA) + 1.9 * Math.sin(doorA), Y + 1.6, 1.9 * Math.cos(doorA), 0.4, 1.6, 8, '#ffd27a');
  const sc = cv(128, 32, (c) => { c.fillStyle = '#5a3a1f'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#f3e3b0'; c.font = '700 18px "Pixelify Sans","Courier New",monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('OBSERVATORY', 64, 17); });
  const signT = new THREE.CanvasTexture(sc); signT.encoding = THREE.sRGBEncoding;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.33), new THREE.MeshLambertMaterial({ map: signT })); sign.position.set(0, Y + 2.15, 1.72); sign.userData.keep = true; dg.add(sign);
  if (document.fonts && document.fonts.load) document.fonts.load('700 18px "Pixelify Sans"').then(() => { const c = sc.getContext('2d'); c.fillStyle = '#5a3a1f'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#f3e3b0'; c.font = '700 18px "Pixelify Sans","Courier New",monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('OBSERVATORY', 64, 17); signT.needsUpdate = true; }).catch(() => {});
  // a bench and a little star-chart board on the hilltop
  { const bx = OBS_DOOR.x - OBS.x + 1.2, bz = OBS_DOOR.z - OBS.z - 1.6; B(g, 1.6, 0.12, 0.5, M.planks, bx, Y + 0.48, bz); for (const s of [-0.65, 0.65]) B(g, 0.12, 0.45, 0.45, M.dark, bx + s, Y + 0.22, bz); collide(OBS.x + bx - 0.85, OBS.x + bx + 0.85, OBS.z + bz - 0.3, OBS.z + bz + 0.3, Y + 0.9); }
  collide(OBS.x - 1.3, OBS.x + 1.3, OBS.z - 1.3, OBS.z + 1.3, Y + 6);
  bake(g);
  return { group: g, eye: new THREE.Vector3(OBS.x + Math.sin(facing) * 1.2, Y + 4.8, OBS.z + Math.cos(facing) * 1.2), facing, door: OBS_DOOR, label: [OBS.x, Y + 5.4, OBS.z] };
}

/* the view through the telescope: yaw and pitch (and the zoom) each follow their target on a
   critically damped spring, so the view glides and settles however it is pushed */
export function createScope(obs) {
  const s = { on: false, k: { v: 0, vel: 0 }, yaw: { v: 0, vel: 0 }, pitch: { v: 0, vel: 0 }, fov: { v: 40, vel: 0 }, ty: 0, tp: 0, tf: 40 };
  const spring = (o, target, w, dt) => { const x = o.v - target, e = Math.exp(-w * dt), q = (o.vel + w * x) * dt; o.v = target + (x + q) * e; o.vel = (o.vel - w * q) * e; return o.v; };
  // looking at the middle of the square to begin with
  const toward = (x, y, z) => { const dx = x - obs.eye.x, dy = y - obs.eye.y, dz = z - obs.eye.z; return [Math.atan2(dx, dz), Math.atan2(dy, Math.hypot(dx, dz))]; };
  const [y0, p0] = toward(6, 0, 3); // over the middle of the square, toward the pond
  const look = new THREE.Vector3();
  return {
    on: () => s.on, k: () => s.k.v,
    enter() { s.on = true; s.ty = y0; s.tp = p0; s.tf = 40; if (s.k.v < 0.05) { s.yaw.v = y0; s.pitch.v = p0; s.fov.v = 30; } },
    exit() { s.on = false; },
    // drag in pixels; held keys as -1..1
    drag(dx, dy, h) { const k = (s.fov.v / 40) * 2.2 / Math.max(300, h); s.ty -= dx * k; s.tp = Math.max(-1.0, Math.min(0.3, s.tp - dy * k)); },
    turn(ax, ay, dt) { const k = (s.fov.v / 40) * 1.1 * dt; s.ty -= ax * k; s.tp = Math.max(-1.0, Math.min(0.3, s.tp + ay * k)); },
    zoom(f) { s.tf = Math.max(14, Math.min(55, s.tf * f)); },
    // move the game camera toward the scope: camPos, camLook are changed in place; returns the fov to use
    update(dt, camPos, camLook, baseFov) {
      const k = spring(s.k, s.on ? 1 : 0, 3.2, dt), e = k * k * (3 - 2 * k);
      spring(s.yaw, s.ty, 9, dt); spring(s.pitch, s.tp, 9, dt); spring(s.fov, s.tf, 7, dt);
      if (e < 0.0005) return baseFov;
      const cp = Math.cos(s.pitch.v);
      look.set(obs.eye.x + Math.sin(s.yaw.v) * cp * 20, obs.eye.y + Math.sin(s.pitch.v) * 20, obs.eye.z + Math.cos(s.yaw.v) * cp * 20);
      camPos.lerp(obs.eye, e); camLook.lerp(look, e); camPos.y += Math.sin(Math.PI * e) * 2.5; // a lift mid-way, so it swoops up into the dome
      return baseFov + (s.fov.v - baseFov) * e;
    },
  };
}
