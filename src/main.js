// Entry point: builds the scene, reads input and runs the game loop.
import * as THREE from 'three';
import { PROJECTS, TUNING } from './config.js';
import { buildWorld } from './world.js';
import { buildStalls } from './stalls.js';
import { createPlayer } from './player.js';
import { createChickens } from './critters.js';
import { blocked, groundAt, rectDistance } from './collision.js';
import { createUI } from './ui.js';
import { sound } from './audio.js';
import { lamps, addLamp, MOOD } from './lights.js';

const canvas = document.getElementById('world');

/* ── renderer, scene, light ── */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // the world never moves, so its shadows are drawn once

const scene = new THREE.Scene();
const backdrop = MOOD.day.back.clone();
scene.background = backdrop; scene.fog = new THREE.Fog(backdrop, 60, 96);
const camera = new THREE.PerspectiveCamera(TUNING.cameraFov, 1, 1, 220);

// Late-afternoon light: a warm low sun with cool sky fill.
const hemi = new THREE.HemisphereLight('#b9c8ff', '#7a5a2c', 0.42); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffc67c', 1.22); // doubles as the moon at night, from the same direction sun.position.set(-30, 40, -16); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera; sc.left = -44; sc.right = 44; sc.top = 44; sc.bottom = -44; sc.near = 1; sc.far = 130;
sc.updateProjectionMatrix(); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; scene.add(sun);

/* ── world ── */
buildWorld(scene, renderer);
const stalls = buildStalls(scene);
const stallGroups = stalls.map((s) => s.group);
const player = createPlayer(scene), P = player.state;
const chickens = createChickens(scene);
const ui = createUI(canvas);
const torch = addLamp(scene, 0, 2, 0, 0, 0.85, 5.5, '#ffd9a0'); // a soft light that follows the player at night

/* ── day and night ── */
// `night` glides from 0 (day) to 1 (night); every light and the backdrop follow it.
let night = 0, nightTarget = 0;
try { if (localStorage.getItem('pv-theme') === 'dark') night = nightTarget = 1; } catch (e) { /* storage unavailable */ }
ui.setTheme(nightTarget === 1);
ui.onThemeToggle(() => { nightTarget = nightTarget ? 0 : 1; try { localStorage.setItem('pv-theme', nightTarget ? 'dark' : 'light'); } catch (e) { /* ignore */ } return nightTarget === 1; });
const mix = (a, b, t) => a + (b - a) * t;
function applyMood(time) {
  const d = MOOD.day, n = MOOD.night, t = night * night * (3 - 2 * night);
  hemi.color.copy(d.sky).lerp(n.sky, t); hemi.groundColor.copy(d.ground).lerp(n.ground, t); hemi.intensity = mix(d.hemi, n.hemi, t);
  sun.color.copy(d.sun).lerp(n.sun, t); sun.intensity = mix(d.sunI, n.sunI, t);
  backdrop.copy(d.back).lerp(n.back, t); scene.fog.color.copy(backdrop); renderer.toneMappingExposure = mix(d.exposure, n.exposure, t);
  for (const l of lamps) l.light.intensity = mix(l.day, l.night, t) * (1 + Math.sin(time * 9 + l.seed) * 0.05 + Math.sin(time * 23 + l.seed * 2) * 0.035);
}
renderer.shadowMap.needsUpdate = true;

/* ── input ── */
const keys = {}, joy = { x: 0, y: 0 };
let jumpQueued = false;
window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (k === 'Escape') { ui.escape(); return; }
  if (k === 'KeyE' && !e.repeat) { if (ui.openId()) ui.closeCard(); else if (ui.nearId() && !ui.paused()) ui.openCard(ui.nearId()); return; }
  if (k === 'Space' || k.startsWith('Arrow')) { if (ui.paused() && k === 'Space') return; e.preventDefault(); }
  if (k === 'Space' && !e.repeat) jumpQueued = true;
  keys[k] = true; sound.unlock();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space' && !ui.paused()) e.preventDefault(); });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// click or tap a stall
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(stallGroups, true)[0]; if (!hit) return null;
  let o = hit.object; while (o && !o.userData.id) o = o.parent; return o ? o.userData.id : null;
}
let down = null, hoverT = 0;
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; sound.unlock(); });
canvas.addEventListener('pointerup', (e) => { if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved < 8 && !ui.paused()) { const id = pick(e); if (id) ui.openCard(id); } });
canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const n = performance.now(); if (n - hoverT < 60) return; hoverT = n; canvas.style.cursor = pick(e) ? 'pointer' : 'default'; });

// on-screen stick and buttons for phones
{
  const stick = document.getElementById('stick'), knob = document.getElementById('knob'); let id = null;
  const move = (e) => { const r = stick.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const m = Math.hypot(dx, dy), max = 46; if (m > max) { dx *= max / m; dy *= max / m; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; joy.x = dx / max; joy.y = -dy / max; };
  const end = (e) => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); move(e); sound.unlock(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  document.getElementById('tJump').addEventListener('pointerdown', (e) => { e.preventDefault(); jumpQueued = true; sound.unlock(); });
  document.getElementById('tUse').addEventListener('click', () => { if (ui.nearId()) ui.openCard(ui.nearId()); });
}

/* ── camera: one fixed angle that glides with the player ── */
const sinY = Math.sin(TUNING.cameraYaw), cosY = Math.cos(TUNING.cameraYaw);
const CAM = new THREE.Vector3(sinY * TUNING.cameraBack, TUNING.cameraUp, cosY * TUNING.cameraBack);
const focus = new THREE.Vector3(P.x, 0, P.z - 2);
let camScale = 1;
function resize() {
  const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camScale = camera.aspect < 0.8 ? 1.5 : camera.aspect < 1.3 ? 1.2 : 1; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

/* ── loop ── */
let last = performance.now(), time = 0, birdT = 4;
const v3 = new THREE.Vector3();
function update(dt) {
  time += dt;
  let ix = 0, iy = 0;
  if (!ui.paused()) { ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x; iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y; }
  const mag = Math.hypot(ix, iy), moving = mag > 0.15, running = moving && (keys.ShiftLeft || keys.ShiftRight || Math.hypot(joy.x, joy.y) > 0.92);
  if (moving) {
    const n = Math.max(1, mag); ix /= n; iy /= n;
    // screen-right is (cos, -sin) on the ground, screen-up is (-sin, -cos)
    const sp = running ? TUNING.runSpeed : TUNING.walkSpeed, dx = (ix * cosY - iy * sinY) * sp, dz = (-ix * sinY - iy * cosY) * sp;
    const nx = P.x + dx * dt; if (!blocked(nx, P.z, P.y)) P.x = nx;
    const nz = P.z + dz * dt; if (!blocked(P.x, nz, P.y)) P.z = nz;
    let d = Math.atan2(dx, dz) - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * Math.min(1, dt * 14);
  }
  if (jumpQueued && P.grounded && !ui.paused()) { P.vy = TUNING.jumpSpeed; P.grounded = false; sound.play('jump'); }
  jumpQueued = false;
  P.vy -= TUNING.gravity * dt; P.y += P.vy * dt;
  const g = groundAt(P.x, P.z, P.y);
  if (P.y <= g) { if (!P.grounded && P.vy < -4) { P.squash = 1; sound.play('land'); } P.y = g; P.vy = 0; P.grounded = true; } else P.grounded = false;
  const before = Math.floor(P.phase / Math.PI); if (moving) P.phase += dt * (running ? 15 : 9.5);
  if (P.grounded && moving && Math.floor(P.phase / Math.PI) !== before) sound.play('step');
  player.animate(dt, time, moving, running, groundAt(P.x, P.z, 9));

  focus.x += (P.x - focus.x) * Math.min(1, dt * 5); focus.z += (P.z - 1.5 - focus.z) * Math.min(1, dt * 5); focus.y += (P.visY * 0.5 - focus.y) * Math.min(1, dt * 3);
  camera.position.copy(CAM).multiplyScalar(camScale).add(focus); camera.lookAt(focus.x, focus.y + 1, focus.z);

  // nearest stall, measured to its edge so any side counts
  let best = null, bd = TUNING.interactRange;
  for (const s of stalls) { const d = rectDistance(s.rect, P.x, P.z); if (d < bd) { bd = d; best = s.id; } }
  ui.setNear(best);

  if (night !== nightTarget) { night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), dt / 1.6); }
  torch.position.set(P.x, P.visY + 2.2, P.z + 0.6);
  applyMood(time);

  chickens.update(dt, P, () => sound.play('cluck'));
  birdT -= dt; if (birdT < 0) { birdT = 4 + Math.random() * 7; if (sound.started()) sound.play('bird'); }

  const w = window.innerWidth, h = window.innerHeight;
  stalls.forEach((s, i) => { v3.set(s.pos[0], 5.3, s.pos[1]).project(camera); ui.placeLabel(i, (v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * h, s.id); });
}
function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); renderer.render(scene, camera); requestAnimationFrame(frame); }

function start(saved) {
  if (saved && typeof saved.x === 'number' && !blocked(saved.x, saved.z, 0)) { P.x = saved.x; P.z = saved.z; P.yaw = saved.yaw || 0; focus.set(P.x, 0, P.z - 1.5); }
  canvas.tabIndex = 0;
  window.__village = { P, ui, stalls, blocked, groundAt, renderer, scene }; // handy in the browser console
  requestAnimationFrame((t) => { last = t; frame(t); });
}
// Only matters inside the Claude preview: keeps your place when the page is republished.
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => ({ x: P.x, z: P.z, yaw: P.yaw }));
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
