// Entry point: builds the scene, reads input and runs the game loop.
import * as THREE from 'three';
import { STALLS, TUNING, HALL, FLOOR } from './config.js';
import { buildWorld, refreshSlab } from './world.js';
import { buildStalls } from './stalls.js';
import { buildHall } from './hall.js';
import { createAgents } from './agents.js';
import { createPlayer } from './player.js';
import { createChickens, createWolf } from './critters.js';
import { createAmbience } from './ambience.js';
import { blocked, groundAt, floorAt, rectDistance, insideHall } from './collision.js';
import { findPath } from './nav.js';
import { createUI } from './ui.js';
import { sound } from './audio.js';
import { t, tr } from './i18n.js';
import { lamps, addLamp, MOOD } from './lights.js';
import { cv } from './textures.js';
import { drawFace } from './figures.js';

const canvas = document.getElementById('world');
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };

/* ── renderer, scene, light ── */
// Phones get a lighter setup: no multisampling, a lower pixel ratio and a smaller shadow map.
const phone = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // the world never moves, so its shadows are drawn once

const scene = new THREE.Scene();
const backdrop = MOOD.day.back.clone();
scene.background = backdrop;
scene.fog = new THREE.Fog(backdrop, 62, 100);
const camera = new THREE.PerspectiveCamera(TUNING.cameraFov, 1, 1, 230);

// Late-afternoon light: a warm low sun with cool sky fill. The same light is the moon at night.
const hemi = new THREE.HemisphereLight('#b9c8ff', '#7a5a2c', 0.42);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffc67c', 1.22);
sun.position.set(-30 + 2, 40, -16 - 7);
sun.target.position.set(2, 0, -7);
sun.castShadow = true;
sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
const sc = sun.shadow.camera;
sc.left = -52; sc.right = 52; sc.top = 52; sc.bottom = -52; sc.near = 1; sc.far = 150;
sc.updateProjectionMatrix();
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

/* ── world ── */
buildWorld(scene, renderer);
const stalls = buildStalls(scene);
const hall = buildHall(scene);
const agents = createAgents(scene, hall.board);
const player = createPlayer(scene), P = player.state;
const chickens = createChickens(scene);
const wolf = createWolf(scene, blocked);
const ambience = createAmbience(scene);
const torch = addLamp(scene, 0, 2, 0, 0, 0.85, 5.5, '#ffd9a0'); // a soft light that follows the player at night
const pickable = [...stalls.map((s) => s.group), ...agents.groups, hall.board.mesh];
let bakeFrames = 4; // draw the sun shadows over the first few frames, then keep them

/* ── progress: which stalls have been opened, and the wolf reward ── */
const visited = new Set((store.get('pv-visited') || '').split(',').filter((id) => STALLS.some((s) => s.id === id)));
let wolfUnlocked = store.get('pv-wolf') === 'yes';
function visit(id) {
  if (visited.has(id)) return; visited.add(id); store.set('pv-visited', [...visited].join(','));
  if (!wolfUnlocked && STALLS.every((s) => visited.has(s.id))) pendingReward = true;
  ui.setProgress(visited, wolfUnlocked);
}
let pendingReward = false; // shown once the popup that completed the set is closed

/* ── interface ── */
let wardrobePrev = null;
const ui = createUI(canvas, {
  goTo,
  pickOutfit: (id) => player.setOutfit(id, false),
  endWardrobe: (keep) => { player.setOutfit(keep ? player.outfit() : wardrobePrev, true); },
  languageChanged: () => { refreshSlab(); boardSig = ''; },
  agentState: (id) => { const n = agents.list.find((q) => q.id === id); return { status: agents.status(n), where: agents.where(n) }; },
  agentDesign: (id) => agents.list.find((q) => q.id === id).design,
  callAgent: (id) => agents.call(id),
  toggleTheme: () => { nightTarget = nightTarget ? 0 : 1; try { sessionStorage.setItem('pv-theme', nightTarget ? 'dark' : 'light'); } catch (e) { /* ignore */ } return nightTarget === 1; },
});
ui.setProgress(visited, wolfUnlocked);
if (wolfUnlocked) wolf.activate(P);

function openStall(s) {
  auto = null;
  if (s.kind === 'outfits') { wardrobePrev = player.outfit(); ui.openWardrobe(wardrobePrev); } else ui.openCard(s.id);
  visit(s.id);
}
function talkTo(n) { auto = null; ui.openChat(n, n.design); }

/* ── the agent board in the hall: repainted whenever somebody's status changes ── */
const faces = {}; for (const n of agents.list) { faces[n.id] = cv(16, 16, (g) => drawFace(g, n.design)); }
let boardSig = '';
function refreshBoard() {
  const sig = agents.list.map((n) => agents.status(n)).join();
  for (const n of agents.list) ui.setAgentStatus(n.id, agents.status(n));
  if (sig === boardSig) return; boardSig = sig;
  hall.board.draw(agents.list.map((n) => ({ name: n.name, role: tr(n, 'role'), color: n.color, face: faces[n.id], status: t(agents.status(n)), live: !n.outside && n.task !== 'break' })));
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { boardSig = ''; });
function openBoard() { auto = null; ui.openBoard(); }

/* ── walk-to: the menu sends the character somewhere on foot ── */
let auto = null; // { path: [[x, z], ...], then: fn }
function walkTo(x, z, then) { const path = findPath(P.x, P.z, x, z); if (!path || !path.length) { if (then) then(); return false; } auto = { path, then }; return true; }

// tap (or click) the ground to walk there; a ring marks the spot
const marker = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, map: new THREE.CanvasTexture(cv(64, 64, (g) => { g.strokeStyle = '#ffd24a'; g.lineWidth = 7; g.strokeRect(10, 10, 44, 44); g.fillStyle = '#ffd24a'; g.fillRect(28, 28, 8, 8); })) }));
marker.rotation.x = -Math.PI / 2; marker.renderOrder = 3; scene.add(marker);
let markerLife = 0;
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPoint = new THREE.Vector3();
function tapGround() {
  // the ray is already aimed by pick(); try the hall floor first when the roof is off, then the square
  for (const y of hall.openness() > 0.5 ? [HALL.floor, FLOOR] : [FLOOR]) {
    ground.constant = -y; if (!ray.ray.intersectPlane(ground, hitPoint)) continue;
    if (floorAt(hitPoint.x, hitPoint.z) !== y) continue;
    if (walkTo(hitPoint.x, hitPoint.z)) { const end = auto.path[auto.path.length - 1]; marker.position.set(end[0], floorAt(end[0], end[1]) + 0.06, end[1]); markerLife = 1; sound.play('near'); }
    return;
  }
}
function goTo(id) {
  if (id === 'hall') { walkTo(hall.entrance[0], hall.entrance[1]); return; }
  const s = stalls.find((q) => q.id === id); if (!s) return;
  if (Math.hypot(P.x - s.front[0], P.z - s.front[1]) < 0.7) openStall(s); else walkTo(s.front[0], s.front[1], () => openStall(s));
}

/* ── day and night ── */
// `night` glides from 0 (day) to 1 (night). A fresh visit follows the visitor's clock;
// the button overrides it for the rest of the visit.
const hour = new Date().getHours() + new Date().getMinutes() / 60;
let nightTarget = hour >= TUNING.nightStartsAt || hour < TUNING.nightEndsAt ? 1 : 0;
try { const t = sessionStorage.getItem('pv-theme'); if (t) nightTarget = t === 'dark' ? 1 : 0; } catch (e) { /* storage unavailable */ }
let night = nightTarget;
ui.setTheme(nightTarget === 1);
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
function applyMood(time, indoors) {
  // walking into the hall dims the daylight so the candles carry the room
  const d = MOOD.day, n = MOOD.night, t = Math.min(1, ease(night) + (1 - ease(night)) * indoors * 0.8);
  hemi.color.copy(d.sky).lerp(n.sky, t); hemi.groundColor.copy(d.ground).lerp(n.ground, t); hemi.intensity = mix(d.hemi, n.hemi, t);
  sun.color.copy(d.sun).lerp(n.sun, t); sun.intensity = mix(d.sunI, n.sunI, t);
  backdrop.copy(d.back).lerp(n.back, t); scene.fog.color.copy(backdrop);
  for (const l of lamps) l.light.intensity = mix(l.day, l.night, t) * (1 + Math.sin(time * 9 + l.seed) * 0.05 + Math.sin(time * 23 + l.seed * 2) * 0.035);
}

const nearBoard = () => rectDistance(hall.board.rect, P.x, P.z) < 2.3;

/* ── input ── */
const keys = {}, joy = { x: 0, y: 0 };
let jumpQueued = false, near = null; // near: { act: fn, text }
window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (k === 'Escape') { ui.escape(); return; }
  if (k === 'KeyE' && !e.repeat) { if (ui.openId() || ui.chatId() || ui.boardOpen()) ui.escape(); else if (near && !ui.paused()) near.act(); return; }
  if (k === 'Space' || k.startsWith('Arrow')) { if (ui.paused()) return; e.preventDefault(); } // leave these keys to buttons and sliders while a panel is open
  if (k === 'Space' && !e.repeat) jumpQueued = true;
  keys[k] = true; sound.unlock();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space' && !ui.paused()) e.preventDefault(); });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// click or tap a stall or an agent
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  for (const hit of ray.intersectObjects(pickable, true)) {
    if (hit.object.userData.board) { if (hall.openness() > 0.6) return { board: true }; continue; }
    if (hit.object.userData.agent) { const n = agents.list.find((q) => q.id === hit.object.userData.agent); if (n.outside || hall.openness() > 0.6) return { agent: n }; continue; }
    let o = hit.object; while (o && !o.userData.id) o = o.parent; if (o) return { stall: stalls.find((s) => s.id === o.userData.id) };
  }
  return null;
}
let down = null, hoverT = 0;
// zoom: mouse wheel, two-finger pinch, or the + and - keys. The camera angle never changes.
let zoom = TUNING.zoomStart, zoomTarget = TUNING.zoomStart;
let opening = 0; // seconds left of the opening glide; the camera starts high and settles while the title lifts
let titleFor = 0; // seconds of drawn frames before the title card lifts, so it never lifts onto a half-built scene
const setZoom = (z) => { zoomTarget = Math.max(TUNING.zoomMin, Math.min(TUNING.zoomMax, z)); };
canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (!ui.paused()) setZoom(zoomTarget * Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0016)); }, { passive: false });
window.addEventListener('keydown', (e) => { if (ui.paused()) return; if (e.code === 'Equal' || e.code === 'NumpadAdd') setZoom(zoomTarget - 0.06); if (e.code === 'Minus' || e.code === 'NumpadSubtract') setZoom(zoomTarget + 0.06); });
const touches = new Map(); let pinch = 0;
const spread = () => { const p = [...touches.values()]; return Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); };
const lift = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = 0; };
canvas.addEventListener('pointercancel', lift); canvas.addEventListener('pointerleave', lift);
canvas.addEventListener('pointerdown', (e) => {
  sound.unlock(); touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (touches.size === 2) { pinch = spread(); down = null; } else down = [e.clientX, e.clientY];
});
canvas.addEventListener('pointerup', (e) => {
  lift(e); if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved >= 8 || ui.paused()) return;
  const hit = pick(e); if (!hit) { tapGround(); return; }
  if (hit.board) { if (nearBoard()) openBoard(); else walkTo(hall.board.stand[0], hall.board.stand[1], openBoard); }
  else if (hit.agent) { const n = hit.agent; if (Math.hypot(P.x - n.x, P.z - n.z) < TUNING.talkRange * 1.7) talkTo(n); else walkTo(n.x, n.z + 1.3); }
  else if (hit.stall.kind === 'outfits') goTo('outfits'); else openStall(hit.stall);
});
canvas.addEventListener('pointermove', (e) => {
  if (touches.has(e.pointerId)) { touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2 && pinch) { const s = spread(); if (s > 0) setZoom(zoomTarget * (pinch / s)); pinch = s; return; } }
  if (e.pointerType !== 'mouse') return; const n = performance.now(); if (n - hoverT < 60) return; hoverT = n; canvas.style.cursor = pick(e) ? 'pointer' : 'default'; });

// on-screen stick and buttons for phones
{
  const stick = document.getElementById('stick'), knob = document.getElementById('knob'); let id = null;
  const move = (e) => { const r = stick.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const m = Math.hypot(dx, dy), max = 46; if (m > max) { dx *= max / m; dy *= max / m; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; joy.x = dx / max; joy.y = -dy / max; };
  const end = (e) => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); move(e); sound.unlock(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  document.getElementById('tJump').addEventListener('pointerdown', (e) => { e.preventDefault(); jumpQueued = true; sound.unlock(); });
  document.getElementById('tUse').addEventListener('click', () => { if (near) near.act(); });
}

/* ── camera: one fixed angle that glides with the player, plus a close-up for the wardrobe ── */
const sinY = Math.sin(TUNING.cameraYaw), cosY = Math.cos(TUNING.cameraYaw);
const CAM = new THREE.Vector3(sinY * TUNING.cameraBack, TUNING.cameraUp, cosY * TUNING.cameraBack);
const focus = new THREE.Vector3(P.x, 0, P.z - 1.5);
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), closePos = new THREE.Vector3(), closeLook = new THREE.Vector3();
let camScale = 1, closeUp = 0;
function resize() {
  const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camScale = camera.aspect < 0.8 ? 1.5 : camera.aspect < 1.3 ? 1.2 : 1; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

/* ── loop ── */
let last = performance.now(), time = 0, chirpT = 4;
const v3 = new THREE.Vector3();
function update(dt) {
  time += dt;
  const busy = ui.paused();
  let ix = 0, iy = 0;
  if (!busy) { ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x; iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y; }
  let mag = Math.hypot(ix, iy), dx = 0, dz = 0, running = false;
  if (mag > 0.15) {
    auto = null; // any key or stick movement takes back control
    const n = Math.max(1, mag); ix /= n; iy /= n; running = !!(keys.ShiftLeft || keys.ShiftRight || Math.hypot(joy.x, joy.y) > 0.92);
    // screen-right is (cos, -sin) on the ground, screen-up is (-sin, -cos)
    const sp = running ? TUNING.runSpeed : TUNING.walkSpeed; dx = (ix * cosY - iy * sinY) * sp; dz = (-ix * sinY - iy * cosY) * sp;
  } else if (auto && !busy) {
    let t = auto.path[0], ddx = t[0] - P.x, ddz = t[1] - P.z, dist = Math.hypot(ddx, ddz);
    while (dist < 0.3 && auto.path.length > 1) { auto.path.shift(); t = auto.path[0]; ddx = t[0] - P.x; ddz = t[1] - P.z; dist = Math.hypot(ddx, ddz); }
    if (dist < 0.3) { const then = auto.then; auto = null; if (then) then(); }
    else { running = auto.path.length > 1 || dist > 6; const sp = Math.min(running ? TUNING.runSpeed : TUNING.walkSpeed, dist / dt); dx = (ddx / dist) * sp; dz = (ddz / dist) * sp; }
  }
  // ease into and out of motion instead of snapping to full speed
  const accel = Math.min(1, dt * (dx || dz ? 9 : 12)); P.vx += (dx - P.vx) * accel; P.vz += (dz - P.vz) * accel;
  if (Math.hypot(P.vx, P.vz) < 0.05) P.vx = P.vz = 0;
  if (P.vx || P.vz) {
    const ox = P.x, oz = P.z;
    const nx = P.x + P.vx * dt; if (!blocked(nx, P.z, P.y)) P.x = nx; else P.vx = 0;
    const nz = P.z + P.vz * dt; if (!blocked(P.x, nz, P.y)) P.z = nz; else P.vz = 0;
    if (auto && P.x === ox && P.z === oz) { auto.stuck = (auto.stuck || 0) + dt; if (auto.stuck > 0.6) auto = null; } else if (auto) auto.stuck = 0;
  }
  const speed = Math.hypot(P.vx, P.vz);
  if (speed > 0.4) { let d = Math.atan2(P.vx, P.vz) - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * Math.min(1, dt * 11); }
  if (ui.wardrobeOpen()) { let d = TUNING.cameraYaw + Math.sin(time * 0.8) * 0.45 - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * Math.min(1, dt * 5); }
  if (jumpQueued && P.grounded && !busy) { P.vy = TUNING.jumpSpeed; P.grounded = false; auto = null; sound.play('jump'); }
  jumpQueued = false;
  P.vy -= TUNING.gravity * dt; P.y += P.vy * dt;
  const g = groundAt(P.x, P.z, P.y);
  if (P.y <= g) { if (!P.grounded && P.vy < -4) { P.squash = 1; sound.play('land'); } P.y = g; P.vy = 0; P.grounded = true; } else P.grounded = false;
  if (player.stride(dt, speed, running)) sound.play('step');

  // town hall: the roof lifts away while the player is inside
  hall.update(dt, insideHall(P.x, P.z) || (Math.abs(P.x - HALL.doorX) < HALL.doorW / 2 && P.z < HALL.z1 + 0.2), time);
  const indoors = hall.openness();
  if (night !== nightTarget) night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), dt / 1.6);
  torch.position.set(P.x, P.visY + 2.2, P.z + 0.6);
  applyMood(time, indoors);
  player.animate(dt, time, groundAt(P.x, P.z, 9), (1 - ease(night)) * (1 - indoors));

  // camera
  closeUp += Math.sign((ui.wardrobeOpen() ? 1 : 0) - closeUp) * Math.min(Math.abs((ui.wardrobeOpen() ? 1 : 0) - closeUp), dt / 0.7);
  if (titleFor <= 0) { zoom += (zoomTarget - zoom) * Math.min(1, dt * (opening > 0 ? 1.7 : 7)); if (opening > 0) opening -= dt; }
  focus.x += (P.x - focus.x) * Math.min(1, dt * 5); focus.z += (P.z - 1.5 * zoom - focus.z) * Math.min(1, dt * 5); focus.y += (P.visY * 0.5 - focus.y) * Math.min(1, dt * 3);
  camPos.copy(CAM).multiplyScalar(camScale * zoom).add(focus); camLook.set(focus.x, focus.y + 1, focus.z);
  if (closeUp > 0) {
    const wide = camera.aspect >= 1, dist = wide ? 8 : 13, e = ease(closeUp), shift = wide ? 2.1 : 0;
    closePos.set(P.x + sinY * dist + cosY * shift, P.visY + 2.2, P.z + cosY * dist - sinY * shift);
    closeLook.set(P.x + cosY * shift, P.visY + (wide ? 1.35 : -0.9), P.z - sinY * shift);
    camPos.lerp(closePos, e); camLook.lerp(closeLook, e);
    camera.near = mix(1, dist - 1.2, e); camera.updateProjectionMatrix(); // clip the fence that would stand in front
  } else if (camera.near !== 1) { camera.near = 1; camera.updateProjectionMatrix(); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  // haze begins a little beyond the player and thickens toward the far trees, at any zoom
  const reach = camPos.distanceTo(camLook); scene.fog.near = reach + 13; scene.fog.far = reach + 54;

  // what E would do right now: the nearest stall (measured to its edge) or agent
  near = null; let bd = TUNING.interactRange, nearKey = null;
  for (const s of stalls) {
    const d = rectDistance(s.rect, P.x, P.z); if (d < bd) { bd = d; nearKey = s.id; near = s.kind === 'outfits' ? { key: 'changeOutfit', act: () => goTo('outfits') } : { key: 'open', vars: { name: tr(s, 'label') }, act: () => openStall(s) }; }
  }
  { const n = agents.nearest(P, indoors); if (n) { nearKey = n.id; near = { key: 'talkTo', vars: { name: n.name }, act: () => talkTo(n) }; } }
  // the board wins when you are right up against it
  if (indoors > 0.5 && nearBoard() && (!near || near.key !== 'talkTo' || rectDistance(hall.board.rect, P.x, P.z) < 1.1)) { nearKey = 'board'; near = { key: 'openBoard', act: openBoard }; }
  refreshBoard();
  if (auto || !near) ui.setPrompt(null); else ui.setPrompt(near.key, near.vars, nearKey);
  if (markerLife > 0) { markerLife = auto ? Math.max(0.35, markerLife - dt * 0.8) : markerLife - dt * 3; marker.material.opacity = Math.max(0, markerLife) * 0.9; marker.scale.setScalar(0.8 + Math.sin(time * 6) * 0.08); marker.rotation.z = time * 1.2; }
  if (pendingReward && !ui.paused()) { pendingReward = false; wolfUnlocked = true; store.set('pv-wolf', 'yes'); wolf.activate(P); ui.setProgress(visited, true); ui.toast(); sound.play('achieve'); setTimeout(() => sound.play('bark'), 700); }

  agents.update(dt, time, P, ui.chatId());
  chickens.update(dt, P, () => sound.play('cluck'));
  wolf.update(dt, time, P);
  ambience.update(time, ease(night), indoors);
  chirpT -= dt; if (chirpT < 0) { chirpT = 4 + Math.random() * 7; if (sound.started() && indoors < 0.5) sound.play(night > 0.5 ? 'cricket' : 'bird'); }

  // labels
  const w = window.innerWidth, h = window.innerHeight, hide = closeUp > 0.3 ? 0 : 1;
  const place = (key, x, y, z, isNear, alpha) => { v3.set(x, y, z).project(camera); ui.placeLabel(key, (v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * h, isNear, v3.z > 1 ? 0 : alpha * hide); };
  for (const s of stalls) place(s.id, s.pos[0], 5.3, s.pos[1], s.id === nearKey, 1);
  place('hall', hall.labelAt[0], hall.labelAt[1], hall.labelAt[2], false, 1 - indoors);
  for (const n of agents.list) place(n.id, n.x, n.y + 2.5 - n.sit * 0.3, n.z, n.id === nearKey, n.outside ? 1 : indoors);
}
// If the first few seconds run slowly, render at a lower resolution from then on.
let probe = { frames: 0, time: 0 };
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now; update(dt);
  if (probe && document.visibilityState === 'visible') { probe.frames++; if (probe.frames > 30) probe.time += raw; if (probe.frames === 150) { if (probe.time / 120 > 1 / 42 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.5); renderer.setPixelRatio(pixelRatio); resize(); probe = { frames: 0, time: 0 }; } else probe = null; } }
  if (bakeFrames > 0) { bakeFrames--; renderer.shadowMap.needsUpdate = true; }
  else if (titleFor > 0) { titleFor -= Math.min(raw, 0.3); if (titleFor <= 0) ui.endIntro(); }
  renderer.render(scene, camera); requestAnimationFrame(frame);
}

function start(saved) {
  if (saved && typeof saved.x === 'number' && !blocked(saved.x, saved.z, floorAt(saved.x, saved.z))) { P.x = saved.x; P.z = saved.z; P.y = P.visY = floorAt(P.x, P.z); P.yaw = saved.yaw || 0; focus.set(P.x, 0, P.z - 1.5); }
  canvas.tabIndex = 0;
  // a returning preview session skips the opening; a fresh visit glides in over about two seconds
  if (saved && typeof saved.x === 'number') ui.endIntro(); else { zoom = TUNING.zoomStart * 1.55; opening = 2.8; titleFor = 1.3; for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, () => { titleFor = 0; ui.endIntro(); }, { once: true }); }
  window.__village = { P, ui, stalls, agents, hall, wolf, blocked, groundAt, goTo, renderer, scene, FLOOR }; // handy in the browser console
  requestAnimationFrame((t) => { last = t; frame(t); });
}
// Only matters inside the Claude preview: keeps your place when the page is republished.
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => ({ x: P.x, z: P.z, yaw: P.yaw }));
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
