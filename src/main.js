// Entry point: builds the scene, reads input and runs the game loop.
import * as THREE from 'three';
import { STALLS, TUNING, HALL, FLOOR, CAVE, POND } from './config.js';
import { AGENTS } from './config.js';
import { buildWorld, refreshSlab } from './world.js';
import { buildStalls } from './stalls.js';
import { buildHall } from './hall.js';
import { createAgents } from './agents.js';
import { createPlayer } from './player.js';
import { createChickens, createWolf } from './critters.js';
import { createAmbience } from './ambience.js';
import { blocked, groundAt, floorAt, rectDistance, insideHall, inCave, inPondWater, HIDEOUT_EXIT } from './collision.js';
import { findPath } from './nav.js';
import { createUI } from './ui.js';
import { sound, music } from './audio.js';
import { buildCave, buildHideout } from './hideout.js';
import { createHideoutUI } from './hideout-ui.js';
import { buildPond } from './pond.js';
import { createPondUI } from './pond-ui.js';
import { createDiscoveries } from './discover.js';
import { createMinimap } from './minimap.js';
import { RECORDS } from './hideout-content.js';
import { BASE } from './base.js';
import { t, tr } from './i18n.js';
import { lamps, addLamp, MOOD } from './lights.js';
import { cv } from './textures.js';
import { drawSprite, drawFace, SPRITE, createFigure } from './figures.js';
import { inject as analytics } from '@vercel/analytics';

// Page views for Vercel Web Analytics (turn it on in the Vercel project, under Analytics).
// No cookies are set; on any host other than Vercel this quietly does nothing.
analytics();

// Devices without WebGL (very old phones, some locked-down work machines) get the simple version.
const webgl = (() => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } })();
if (!webgl) { location.replace('./plain.html?from=3d'); throw new Error('WebGL is not available'); }

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
const fixed = scene.children.length; // the sky light and the sun above stay where they are
buildWorld(scene, renderer);
const stalls = buildStalls(scene);
const hall = buildHall(scene);
const agents = createAgents(scene, hall);
const chickens = createChickens(scene);
const ambience = createAmbience(scene);
const cave = buildCave(scene);
const pond = buildPond(scene);
// Everything built so far is the village. It goes in one group, and the Hideout in another, so
// only the place the player is in gets drawn (and lit): the other one is switched off entirely.
const village = new THREE.Group(); for (const o of scene.children.slice(fixed)) village.add(o); scene.add(village);
const hideoutRoot = new THREE.Group(); hideoutRoot.visible = false; scene.add(hideoutRoot);
const hideout = buildHideout(hideoutRoot);
const player = createPlayer(scene), P = player.state;
pond.setHand((v) => player.hand(v));
const wolf = createWolf(scene, blocked);
const torch = addLamp(scene, 0, 2, 0, 0, 0.85, 5.5, '#ffd9a0'); // a soft light that follows the player at night
const pickable = [...stalls.map((s) => s.group), ...agents.groups, hall.board.mesh];
let bakeFrames = 4; // draw the sun shadows over the first few frames, then keep them

/* ── progress: which stalls have been opened, and the wolf reward ── */
const visited = new Set((store.get('pv-visited') || '').split(',').filter((id) => STALLS.some((s) => s.id === id)));
let wolfUnlocked = store.get('pv-wolf') === 'yes';
function visit(id) {
  if (id === 'about') discover('about');
  if (visited.has(id)) return; visited.add(id); store.set('pv-visited', [...visited].join(','));
  disc.setStalls([...visited].filter((v) => v !== 'about'));
  if (!wolfUnlocked && STALLS.every((s) => s.about || visited.has(s.id))) pendingReward = true;
  ui.setProgress(visited, wolfUnlocked);
}
let pendingReward = false; // shown once the popup that completed the set is closed

/* ── interface ── */
let wardrobePrev = null;
const ui = createUI(canvas, {
  goTo,
  pickOutfit: (id) => player.setOutfit(id, false),
  endWardrobe: (keep) => { if (keep && player.outfit() !== wardrobePrev) discover('outfit'); player.setOutfit(keep ? player.outfit() : wardrobePrev, true); },
  languageChanged: () => { refreshSlab(); boardSig = ''; },
  agentState: (id) => { const n = agents.list.find((q) => q.id === id); return { status: agents.status(n), where: agents.where(n), last: agents.lastRun(n) }; },
  agentLog: () => agents.log,
  agentDesign: (id) => agents.list.find((q) => q.id === id).design,
  callAgent: (id) => { agents.call(id); discover('call'); },
  agentPortrait,
  discovered: (id) => discover(id),
  toggleTheme: () => { nightTarget = nightTarget ? 0 : 1; try { sessionStorage.setItem('pv-theme', nightTarget ? 'dark' : 'light'); } catch (e) { /* ignore */ } return nightTarget === 1; },
});
ui.setProgress(visited, wolfUnlocked);
if (wolfUnlocked) wolf.activate(P);

/* ── the discovery checklist and the mini-map, together in the top-left corner ── */
const focusGame = () => canvas.focus({ preventScroll: true });
const disc = createDiscoveries({ toast: (o) => ui.toast(o), focusGame, stallCount: STALLS.filter((q) => !q.about).length,
  go: (to) => {
    if (to === 'nextStall') { const s = STALLS.find((q) => !q.about && !visited.has(q.id)); if (s) goTo(s.id); }
    else if (to === 'nextAgent') { const a = AGENTS.find((q) => !disc.collected('agents').has(q.id)); if (a) goTo('agent:' + a.id); }
    else if (to === 'night') { if (!nightTarget) document.getElementById('themeBtn').click(); }
    else goTo(to);
  } });
function discover(id) { disc.mark(id); }
disc.setStalls([...visited].filter((v) => v !== 'about'));
const hud = document.createElement('div'); hud.id = 'hud';
const minimap = createMinimap({
  places: () => [
    ...STALLS.map((s) => ({ id: s.id, x: s.pos[0], z: s.pos[1], color: s.color, label: tr(s, 'label'), found: visited.has(s.id), area: 'village' })),
    { id: 'hall', x: (HALL.x0 + HALL.x1) / 2, z: (HALL.z0 + HALL.z1) / 2, color: '#b9b6ae', label: 'Town hall', found: disc.has('board'), area: 'village' },
    { id: 'hideout', x: CAVE.x, z: CAVE.z0 + 0.8, color: '#ffd060', label: 'The Hideout', found: disc.has('hideout'), area: 'village' },
    { id: 'pond', x: POND.x, z: POND.z, color: '#62c8ff', label: 'Fishing pond', found: disc.has('facts'), area: 'village' },
    ...hideout.props.map((p) => ({ id: 'hx:' + p.id, x: (p.rect.x0 + p.rect.x1) / 2, z: (p.rect.z0 + p.rect.z1) / 2, color: p.color, label: p.label, found: p.id === 'exit' || disc.has(p.id === 'music' ? 'cd' : p.id), area: 'hideout' })),
  ],
  player: () => ({ x: P.x, z: P.z, yaw: P.yaw, under: underground }),
  others: () => agents.list.map((n) => ({ x: n.x, z: n.z, color: n.color })),
  go: (id) => goTo(id),
  walk: (x, z) => { if (walkTo(x, z) && auto) { const end = auto.path[auto.path.length - 1]; marker.position.set(end[0], floorAt(end[0], end[1]) + 0.06, end[1]); markerLife = 1; sound.play('near'); } },
  focusGame,
});
hud.append(disc.button, disc.chip); document.body.append(minimap.el, hud, minimap.scrim);

/* ── the Hideout: the cave at the bottom of the square leads to a private room underground ── */
// the Scholar's Lantern: earned by reading every journal entry; the player carries it and it lights the way
let lantern = store.get('pv-lantern') === 'yes';
const torchLamp = lamps.find((l) => l.light === torch);
function lightLantern() { player.setLantern(true); torchLamp.day = 0.45; torchLamp.night = 1.7; torch.distance = 8.5; torch.color.set('#ffd27a'); }
if (lantern) lightLantern();
const LANTERN_ICON = (g) => { const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; f('#2a2019', 7, 0, 2, 2); f('#2a2019', 4, 2, 8, 2); f('#ffd27a', 5, 4, 6, 7); f('#fff2b0', 7, 5, 2, 4); f('#2a2019', 4, 11, 8, 2); f('#2a2019', 4, 4, 1, 7); f('#2a2019', 11, 4, 1, 7); };
const hx = createHideoutUI({ onDisc: (r) => { hideout.setDisc(r.id); discover('cd'); }, focusGame: () => canvas.focus({ preventScroll: true }),
  onAllRead: () => { if (lantern) return; lantern = true; store.set('pv-lantern', 'yes'); lightLantern(); setTimeout(() => { ui.toast({ title: 'Scholar\u2019s Lantern', text: 'You read every journal entry. A lantern now lights your way.', icon: LANTERN_ICON }); sound.play('achieve'); }, 400); } });

/* listening mode: stand by the CD player while a CD plays, and after a few quiet seconds the camera
   leans in, the room dims and the record's card appears. Any movement or key ends it. */
let listenT = 0, listen = 0;
const nowPlaying = document.createElement('div'); nowPlaying.id = 'nowPlaying'; nowPlaying.setAttribute('aria-live', 'polite');
nowPlaying.innerHTML = '<div class="np-disc"><img alt=""></div><div class="np-text"><small>Now playing</small><strong></strong><span></span><em>Move to leave listening mode</em></div>';
document.body.appendChild(nowPlaying);
const deckLook = new THREE.Vector3(), deckCam = new THREE.Vector3();
hideout.setDisc(music.current()); music.onChange(() => hideout.setDisc(music.current()));
let underground = false, travelling = false;
/* the fishing pond: cast from the end of the dock and something about me bites */
const pondUI = createPondUI({ focusGame: () => canvas.focus({ preventScroll: true }), onCastAgain: () => goFish() });
function goFish() {
  if (pond.fishing() && !pond.holding()) return; auto = null; ui.closeMenu(true);
  P.vx = P.vz = 0; setTimeout(() => sound.play('cast'), pond.holding() ? 300 : 860); // the whoosh lands with the throw
  pond.fish(P, () => { sound.play('splash'); const id = pondUI.next(); pondUI.show(id); disc.add('facts', id); });
}
const paused = () => ui.paused() || hx.isOpen() || travelling || pondUI.isOpen() || pond.fishing() || disc.isOpen() || minimap.isBig();
ui.addPlace('cave', 'The Hideout', '#ffd060', () => goTo('hideout'));
ui.addPlace('pond', 'Fishing Pond', '#62c8ff', () => goTo('pond'));
for (const p of hideout.props) ui.addPlace('hx:' + p.id, p.label, p.color, () => goTo('hx:' + p.id));
// a short fade through dark, then the character is in the other place
function travel(down, then) {
  if (travelling) return; travelling = true; auto = null; ui.closeMenu(true); hx.hide();
  const veil = document.getElementById('travel'); veil.querySelector('strong').textContent = down ? 'The Hideout' : 'The Village'; veil.classList.add('show');
  sound.play('roll');
  setTimeout(() => {
    underground = down; village.visible = !down; hideoutRoot.visible = down;
    if (down) { P.x = hideout.arrive[0]; P.z = hideout.arrive[1]; P.yaw = 0; } else { P.x = cave.top[0]; P.z = cave.top[1] - 0.6; P.yaw = Math.PI; }
    P.vx = P.vz = P.vy = 0; P.y = P.visY = floorAt(P.x, P.z); focus.set(P.x, 0, P.z - 1.5 * zoom);
    setTimeout(() => { veil.classList.remove('show'); travelling = false; if (down) discover('hideout'); if (then) then(); }, 260);
  }, 480);
}
function useProp(id) {
  auto = null;
  if (id === 'exit') travel(false); else if (id === 'cat') { hideout.pet(); sound.play('meow'); discover('cat'); } else { hx.show(id); if (id !== 'music') discover(id); }
}

function openStall(s) {
  auto = null;
  if (s.kind === 'outfits') { wardrobePrev = player.outfit(); ui.openWardrobe(wardrobePrev); } else ui.openCard(s.id);
  visit(s.id);
}
function talkTo(n) { auto = null; ui.openChat(n, n.design); disc.add('agents', n.id); }

/* ── a 3D portrait of an agent for the board menu: the same blocky figure, turned three-quarters,
   drawn once into an off-screen picture ── */
const portraits = {};
function agentPortrait(id) {
  if (portraits[id]) return portraits[id];
  const n = agents.list.find((q) => q.id === id), W = 300, H = 420;
  const fig = createFigure(n.design, { nose: true }); fig.pose(0, 0, 0.4);
  fig.parts.armL.rotation.x = 0.1; fig.parts.armR.rotation.x = -0.08; fig.parts.head.rotation.y = 0.12;
  fig.group.rotation.y = -0.5;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#b8a684', 0.95));
  const key = new THREE.DirectionalLight('#fff3e0', 0.85); key.position.set(-3, 4, 6); sc.add(key, fig.group);
  const cam = new THREE.PerspectiveCamera(16, W / H, 0.1, 40); cam.position.set(0, 1.35, 10); cam.lookAt(0, 1.1, 0);
  const rt = new THREE.WebGLRenderTarget(W, H); rt.texture.encoding = THREE.sRGBEncoding;
  const prevRT = renderer.getRenderTarget(), prevC = new THREE.Color(), prevA = renderer.getClearAlpha(); renderer.getClearColor(prevC);
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
  const buf = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  renderer.setRenderTarget(prevRT); renderer.setClearColor(prevC, prevA); rt.dispose();
  fig.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); // the picture comes out upside down
  g.putImageData(img, 0, 0);
  return (portraits[id] = c);
}

/* ── the agent board in the hall: repainted whenever somebody's status changes ── */
const sprites = {}, faces = {}; for (const n of agents.list) { sprites[n.id] = cv(SPRITE.w, SPRITE.h, (g) => drawSprite(g, n.design)); faces[n.id] = cv(16, 16, (g) => drawFace(g, n.design)); }
let boardSig = '';
// each thing an agent does goes to the log on the board and, briefly, into a speech bubble
agents.onEvent((e) => { if (e.bubble) ui.say(e.id, e.bubble); if (e.id === 'bobby') hall.setPapers(agents.list.find((n) => n.id === 'bobby').done); boardSig = ''; });
function refreshBoard() {
  const sig = agents.list.map((n) => agents.status(n)).join();
  for (const n of agents.list) ui.setAgentStatus(n.id, agents.status(n));
  if (sig === boardSig) return; boardSig = sig;
  hall.board.draw(agents.list.map((n) => ({ name: n.name, role: tr(n, 'role'), color: n.color, sprite: sprites[n.id], face: faces[n.id], about: n.about, palette: [n.design.top, n.design.top2, n.design.trim, n.design.pants, n.design.hair], status: t(agents.status(n)), live: !n.outside && n.task !== 'break' })), agents.log);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { boardSig = ''; });
function openBoard() { auto = null; ui.openBoard(); }

/* ── walk-to: the menu sends the character somewhere on foot ── */
let auto = null; // { path: [[x, z], ...], then: fn }
function walkTo(x, z, then) { if (underground) { auto = { path: [[x, z]], then }; return true; } // the Hideout is one open room
  const path = findPath(P.x, P.z, x, z); if (!path || !path.length) { if (then) then(); return false; } auto = { path, then }; return true; }

// tap (or click) the ground to walk there; a ring marks the spot
const marker = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, map: new THREE.CanvasTexture(cv(64, 64, (g) => { g.strokeStyle = '#ffd24a'; g.lineWidth = 7; g.strokeRect(10, 10, 44, 44); g.fillStyle = '#ffd24a'; g.fillRect(28, 28, 8, 8); })) }));
marker.rotation.x = -Math.PI / 2; marker.renderOrder = 3; scene.add(marker);
let markerLife = 0;
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPoint = new THREE.Vector3();
function tapGround() {
  // tapping the water goes fishing
  if (!underground) { ground.constant = -FLOOR; if (ray.ray.intersectPlane(ground, hitPoint) && inPondWater(hitPoint.x, hitPoint.z)) { goTo('pond'); return; } }
  // the ray is already aimed by pick(); try the hall floor first when the roof is off, then the square
  for (const y of hall.openness() > 0.5 ? [HALL.floor, FLOOR] : [FLOOR]) {
    ground.constant = -y; if (!ray.ray.intersectPlane(ground, hitPoint)) continue;
    if (floorAt(hitPoint.x, hitPoint.z) !== y) continue;
    if (walkTo(hitPoint.x, hitPoint.z)) { const end = auto.path[auto.path.length - 1]; marker.position.set(end[0], floorAt(end[0], end[1]) + 0.06, end[1]); markerLife = 1; sound.play('near'); }
    return;
  }
}
function goTo(id) {
  if (id === 'pond') { if (underground) { travel(false, () => goTo('pond')); return; } if (rectDistance(pond.rect, P.x, P.z) < 0.9) goFish(); else walkTo(pond.front[0], pond.front[1], goFish); return; }
  if (id === 'hideout') { if (!underground) walkTo(cave.top[0], cave.top[1], () => travel(true)); return; }
  if (id.startsWith('hx:')) {
    const p = hideout.props.find((q) => 'hx:' + q.id === id); if (!p) return;
    if (!underground) { travel(true, () => goTo(id)); return; }
    if (rectDistance(p.rect, P.x, P.z) < TUNING.interactRange) useProp(p.id); else walkTo(p.front[0], p.front[1], () => useProp(p.id)); return;
  }
  if (underground) { travel(false, () => goTo(id)); return; } // everything else is up in the village
  if (id === 'hall') { walkTo(hall.entrance[0], hall.entrance[1]); return; }
  if (id === 'board') { if (nearBoard()) openBoard(); else walkTo(hall.board.stand[0], hall.board.stand[1], openBoard); return; }
  if (id.startsWith('agent:')) { const n = agents.list.find((q) => 'agent:' + q.id === id); if (n) { if (Math.hypot(P.x - n.x, P.z - n.z) < TUNING.talkRange) talkTo(n); else walkTo(n.x, n.z + 1.3, () => { if (Math.hypot(P.x - n.x, P.z - n.z) < TUNING.talkRange * 1.7) talkTo(n); }); } return; }
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
const UNDER = { sky: new THREE.Color('#ffd9a8'), ground: new THREE.Color('#3a2a1a'), sunDay: new THREE.Color('#ffe2b0'), sunNight: new THREE.Color('#7f95e0'), back: new THREE.Color('#0a0705').convertSRGBToLinear() };
function applyMood(time, indoors) {
  // walking into the hall dims the daylight so the candles carry the room
  const d = MOOD.day, n = MOOD.night, t = underground ? ease(night) : Math.min(1, ease(night) + (1 - ease(night)) * indoors * 0.8);
  if (underground) {
    // underground: warm low fill, and the sun (or moon) only as the light through the window
    hemi.color.copy(UNDER.sky); hemi.groundColor.copy(UNDER.ground); hemi.intensity = mix(0.36, 0.15, t);
    sun.color.copy(UNDER.sunDay).lerp(UNDER.sunNight, t); sun.intensity = mix(0.62, 0.12, t);
    backdrop.copy(UNDER.back); scene.fog.color.copy(backdrop);
  } else {
    hemi.color.copy(d.sky).lerp(n.sky, t); hemi.groundColor.copy(d.ground).lerp(n.ground, t); hemi.intensity = mix(d.hemi, n.hemi, t);
    sun.color.copy(d.sun).lerp(n.sun, t); sun.intensity = mix(d.sunI, n.sunI, t);
    backdrop.copy(d.back).lerp(n.back, t); scene.fog.color.copy(backdrop);
  }
  const dim = 1 - listen * 0.6;
  for (const l of lamps) l.light.intensity = mix(l.day, l.night, t) * dim * (1 + Math.sin(time * 9 + l.seed) * 0.05 + Math.sin(time * 23 + l.seed * 2) * 0.035);
  if (underground) hemi.intensity *= 1 - listen * 0.4;
}

const nearBoard = () => rectDistance(hall.board.rect, P.x, P.z) < 2.3;
// within a few steps of the water's edge
const nearPond = () => rectDistance(pond.rect, P.x, P.z) < 0.9 || ((P.x - POND.x) / (POND.rx + 2.6)) ** 2 + ((P.z - POND.z) / (POND.rz + 2.6)) ** 2 < 1;

/* ── input ── */
const keys = {}, joy = { x: 0, y: 0 };
let jumpQueued = false, near = null; // near: { act: fn, text }
// Space (or the Jump button) twice in quick succession is a dash roll
let lastJumpPress = -9, rollQueued = false, rollT = -1, rollCool = 0;
const rollDir = [0, 1];
function pressJump() { if (time - lastJumpPress < 0.3) { rollQueued = true; lastJumpPress = -9; } else { jumpQueued = true; lastJumpPress = time; } }
window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (k === 'Escape') { if (minimap.isBig()) { minimap.close(); return; } if (disc.isOpen()) { disc.close(); return; } if (pondUI.isOpen()) { pondUI.hide(); return; } if (!ui.escape()) hx.hide(); return; }
  // M opens the big map, C the checklist (when nothing else is open)
  if ((k === 'KeyM' || k === 'KeyC') && !e.repeat && !e.metaKey && !e.ctrlKey && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) {
    if (k === 'KeyM' && (minimap.isBig() || (!paused() && !disc.isOpen()))) { minimap.toggle(); return; }
    if (k === 'KeyC' && (disc.isOpen() || (!paused() && !minimap.isBig()))) { if (disc.isOpen()) disc.close(); else disc.show(); return; }
  }
  if (k === 'KeyE' && !e.repeat) { if (ui.openId() || ui.chatId() || ui.boardOpen()) ui.escape(); else if (hx.isOpen()) hx.hide(); else if (pondUI.isOpen()) pondUI.hide(); else if (near && !paused()) near.act(); return; }
  if (k === 'Space' || k.startsWith('Arrow')) { if (paused()) return; e.preventDefault(); } // leave these keys to buttons and sliders while a panel is open
  if (k === 'Space' && !e.repeat) pressJump();
  keys[k] = true; sound.unlock();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space' && !paused()) e.preventDefault(); });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// click or tap a stall or an agent
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  for (const hit of ray.intersectObjects(underground ? hideout.pickables : pickable, true)) {
    { let o = hit.object; while (o && !o.userData.prop) o = o.parent; if (o) return { prop: o.userData.prop }; }
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
canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (!paused()) setZoom(zoomTarget * Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0016)); }, { passive: false });
window.addEventListener('keydown', (e) => { if (paused()) return; if (e.code === 'Equal' || e.code === 'NumpadAdd') setZoom(zoomTarget - 0.06); if (e.code === 'Minus' || e.code === 'NumpadSubtract') setZoom(zoomTarget + 0.06); });
const touches = new Map(); let pinch = 0;
const spread = () => { const p = [...touches.values()]; return Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); };
const lift = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = 0; };
canvas.addEventListener('pointercancel', lift); canvas.addEventListener('pointerleave', lift);
canvas.addEventListener('pointerdown', (e) => {
  sound.unlock(); touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (touches.size === 2) { pinch = spread(); down = null; } else down = [e.clientX, e.clientY];
});
canvas.addEventListener('pointerup', (e) => {
  lift(e); if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved >= 8 || paused()) return;
  const hit = pick(e); if (!hit) { tapGround(); return; }
  if (hit.board) { if (nearBoard()) openBoard(); else walkTo(hall.board.stand[0], hall.board.stand[1], openBoard); }
  else if (hit.agent) { const n = hit.agent; if (Math.hypot(P.x - n.x, P.z - n.z) < TUNING.talkRange * 1.7) talkTo(n); else walkTo(n.x, n.z + 1.3); }
  else if (hit.prop) goTo('hx:' + hit.prop);
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
  document.getElementById('tJump').addEventListener('pointerdown', (e) => { e.preventDefault(); pressJump(); sound.unlock(); });
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
let last = performance.now(), time = 0, chirpT = 4, idle = 0, overlayOn = false, hudOpen = false, pondWas = false, pondCalm = 0;
const v3 = new THREE.Vector3();
function update(dt) {
  time += dt;
  const busy = paused();
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
  // the dash roll: a burst in the direction you are steering (or facing) that eases off
  rollCool -= dt;
  if (rollQueued && !busy && rollT < 0 && rollCool <= 0 && !ui.wardrobeOpen()) {
    const m = Math.hypot(dx, dz); if (m > 0.1) { rollDir[0] = dx / m; rollDir[1] = dz / m; } else { rollDir[0] = Math.sin(P.yaw); rollDir[1] = Math.cos(P.yaw); }
    rollT = 0; P.vy = Math.min(P.vy, 1.5); auto = null; sound.play('roll'); discover('roll');
  }
  rollQueued = false;
  let accel = Math.min(1, dt * (dx || dz ? 9 : 12)); // ease into and out of motion instead of snapping to full speed
  if (rollT >= 0) {
    rollT += dt; const k = Math.min(1, rollT / TUNING.rollTime), sp = mix(TUNING.rollSpeed, dx || dz ? TUNING.walkSpeed : 1.2, k * k);
    dx = rollDir[0] * sp; dz = rollDir[1] * sp; accel = Math.min(1, dt * 30); running = false; P.rollK = k;
    if (k >= 1) { rollT = -1; rollCool = 0.25; P.rollK = -1; P.squash = 0.55; }
  } P.vx += (dx - P.vx) * accel; P.vz += (dz - P.vz) * accel;
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
  if (jumpQueued && P.grounded && !busy && rollT < 0) { P.vy = TUNING.jumpSpeed; P.grounded = false; auto = null; sound.play('jump'); }
  jumpQueued = false;
  P.vy -= TUNING.gravity * dt; P.y += P.vy * dt;
  const g = groundAt(P.x, P.z, P.y);
  if (P.y <= g) { if (!P.grounded && P.vy < -4) { P.squash = 1; sound.play('land'); } P.y = g; P.vy = 0; P.grounded = true; } else P.grounded = false;
  if (player.stride(dt, rollT >= 0 ? 0 : speed, running) && rollT < 0) sound.play('step');

  // town hall: the roof lifts away while the player is inside
  hall.update(dt, !underground && insideHall(P.x, P.z) || (Math.abs(P.x - HALL.doorX) < HALL.doorW / 2 && P.z < HALL.z1 + 0.2), time);
  const indoors = hall.openness();
  if (night !== nightTarget) night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), dt / 1.6);
  torch.position.set(P.x, P.visY + 2.2, P.z + 0.6);
  applyMood(time, indoors);
  if (night > 0.9 && !underground && !disc.has('night')) discover('night');
  player.setHold(pond.hold());
  player.animate(dt, time, groundAt(P.x, P.z, 9), (1 - ease(night)) * (1 - indoors) * (underground ? 0 : 1));
  cave.update(time); hideout.update(time, ease(night), music.isOn());
  if (!underground) pond.update(time, dt, ease(night));
  if (pond.holding() && !pondUI.isOpen()) pond.release(); // the card closed: put the rod away
  // listening mode
  const byDeck = underground && music.isOn() && rectDistance(hideout.musicRect, P.x, P.z) < 2.8;
  if (byDeck && mag <= 0.15 && !auto && speed < 0.2 && rollT < 0 && !paused()) listenT += dt; else listenT = 0;
  { const want = listenT > 3 ? 1 : 0; listen += (want - listen) * Math.min(1, dt * (want ? 0.9 : 4)); if (listen < 0.002) listen = 0; }
  if (listen > 0.01) { const r = RECORDS.find((q) => q.id === music.current()); if (r && nowPlaying.dataset.id !== r.id) { nowPlaying.dataset.id = r.id; nowPlaying.querySelector('img').src = BASE + 'assets/images/cds/' + r.cover; nowPlaying.querySelector('strong').textContent = r.title; nowPlaying.querySelector('span').textContent = r.by + ' \u00b7 ' + r.album; } }
  nowPlaying.style.opacity = listen.toFixed(3); nowPlaying.classList.toggle('on', listen > 0.5);
  // a crackle from the fireplace now and then when you are near it
  if (underground && sound.started() && Math.hypot(P.x - hideout.fireAt[0], P.z - hideout.fireAt[1]) < 5 && Math.random() < dt * 1.4) sound.play('crackle');
  // walking down the cave stairs, or into the glowing doorway in the Hideout, travels
  if (!travelling && !underground && inCave(P.x, P.z) && P.z > CAVE.z0 + 1.6) travel(true);
  if (!travelling && underground && Math.abs(P.x - HIDEOUT_EXIT.x) < 0.7 && P.z < HIDEOUT_EXIT.z0 + 1.1) travel(false);

  // camera
  closeUp += Math.sign((ui.wardrobeOpen() ? 1 : 0) - closeUp) * Math.min(Math.abs((ui.wardrobeOpen() ? 1 : 0) - closeUp), dt / 0.95);
  if (titleFor <= 0) { zoom += (zoomTarget - zoom) * Math.min(1, dt * (opening > 0 ? 1.7 : 7)); if (opening > 0) opening -= dt; }
  // while fishing the camera leans a little toward the line and closes in, then eases back
  const lean = underground ? 0 : pond.lean(), [lx, lz] = pond.lookAt(), fx = P.x + (lx - P.x) * 0.38 * lean, fz = P.z + (lz - P.z) * 0.38 * lean;
  focus.x += (fx - focus.x) * Math.min(1, dt * 5); focus.z += (fz - 1.5 * zoom - focus.z) * Math.min(1, dt * 5); focus.y += (P.visY * 0.5 - focus.y) * Math.min(1, dt * 3);
  camPos.copy(CAM).multiplyScalar(camScale * zoom * (1 - 0.13 * lean)).add(focus); camLook.set(focus.x, focus.y + 1, focus.z);
  if (listen > 0.001) {
    const e = ease(listen), [dx2, dy2, dz2] = hideout.deckAt; deckLook.set(dx2, dy2 + 0.4, dz2 + 0.4);
    deckCam.copy(CAM).multiplyScalar(0.32 * camScale).add(deckLook); camPos.lerp(deckCam, e); camLook.lerp(deckLook, e);
  }
  if (closeUp > 0) {
    // smootherstep, so the move starts and settles without a jolt
    const wide = camera.aspect >= 1, dist = wide ? 8 : 13, c = closeUp, e = c * c * c * (c * (c * 6 - 15) + 10), shift = wide ? 2.1 : 0;
    closePos.set(P.x + sinY * dist + cosY * shift, P.visY + 2.2, P.z + cosY * dist - sinY * shift);
    closeLook.set(P.x + cosY * shift, P.visY + (wide ? 1.35 : -0.9), P.z - sinY * shift);
    camPos.lerp(closePos, e); camLook.lerp(closeLook, e);
    // lift the arc a little mid-move so the camera swings round rather than sliding through things
    camPos.y += Math.sin(Math.PI * e) * 1.6;
    // clip the fence that would stand in front, but only once the camera is nearly there
    const nearT = Math.max(0, (e - 0.55) / 0.45); camera.near = mix(1, dist - 1.2, nearT * nearT); camera.updateProjectionMatrix();
  } else if (camera.near !== 1) { camera.near = 1; camera.updateProjectionMatrix(); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  // haze begins a little beyond the player and thickens toward the far trees, at any zoom
  const reach = camPos.distanceTo(camLook); scene.fog.near = reach + (underground ? 6 : 13); scene.fog.far = reach + (underground ? 26 : 54);

  // what E would do right now: the nearest stall (measured to its edge) or agent
  near = null; let bd = TUNING.interactRange, nearKey = null;
  for (const s of stalls) {
    const d = rectDistance(s.rect, P.x, P.z); if (d < bd) { bd = d; nearKey = s.id; near = s.kind === 'outfits' ? { key: 'changeOutfit', act: () => goTo('outfits') } : { key: 'open', vars: { name: tr(s, 'label') }, act: () => openStall(s) }; }
  }
  { const n = underground ? null : agents.nearest(P, indoors); if (n) { nearKey = n.id; near = { key: 'talkTo', vars: { name: n.name }, act: () => talkTo(n) }; } }
  // anywhere round the pond (or on its bridge and benches) E walks you out to the end of the dock and casts
  if (!underground && !near && nearPond()) { nearKey = 'pond'; near = { key: 'goFishing', act: () => goTo('pond') }; }
  if (!underground && Math.hypot(P.x - cave.top[0], P.z - cave.top[1]) < 2.3) { nearKey = 'cave'; near = { key: 'enterCave', act: () => travel(true) }; }
  if (underground) { near = null; nearKey = null; bd = TUNING.interactRange; for (const p of hideout.props) { const d = rectDistance(p.rect, P.x, P.z); if (d < Math.min(bd, p.range || bd)) { bd = d; nearKey = 'hx:' + p.id; near = { key: p.key, act: () => useProp(p.id) }; } } }
  // the board wins when you are right up against it
  if (!underground && indoors > 0.5 && nearBoard() && (!near || near.key !== 'talkTo' || rectDistance(hall.board.rect, P.x, P.z) < 1.1)) { nearKey = 'board'; near = { key: 'openBoard', act: openBoard }; }
  refreshBoard();
  if (auto || !near || hx.isOpen() || travelling || listen > 0.3 || pondUI.isOpen() || pond.fishing()) ui.setPrompt(null); else ui.setPrompt(near.key, near.vars, nearKey);
  if (markerLife > 0) { markerLife = auto ? Math.max(0.35, markerLife - dt * 0.8) : markerLife - dt * 3; marker.material.opacity = Math.max(0, markerLife) * 0.9; marker.scale.setScalar(0.8 + Math.sin(time * 6) * 0.08); marker.rotation.z = time * 1.2; }
  if (pendingReward && !paused()) { pendingReward = false; wolfUnlocked = true; store.set('pv-wolf', 'yes'); wolf.activate(P); ui.setProgress(visited, true); ui.toast(); sound.play('achieve'); setTimeout(() => sound.play('bark'), 700); }

  agents.update(dt, time, P, ui.chatId());
  chickens.update(dt, P, () => sound.play('cluck'));
  wolf.update(dt, time, P);
  ambience.update(time, ease(night), underground ? 1 : indoors);
  chirpT -= dt; if (chirpT < 0) { chirpT = 4 + Math.random() * 7; if (sound.started() && indoors < 0.5 && !underground) sound.play(night > 0.5 ? 'cricket' : 'bird'); }

  // labels
  const w = window.innerWidth, h = window.innerHeight, hide = Math.max(0, 1 - closeUp * 3);
  const place = (key, x, y, z, isNear, alpha) => { v3.set(x, y, z).project(camera); ui.placeLabel(key, (v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * h, isNear, v3.z > 1 ? 0 : alpha * hide); };
  const up = underground ? 0 : 1, quiet = 1 - listen;
  for (const s of stalls) place(s.id, s.pos[0], s.labelY || 5.3, s.pos[1], s.id === nearKey, up);
  place('cave', cave.labelAt[0], cave.labelAt[1], cave.labelAt[2], nearKey === 'cave', up);
  place('pond', pond.labelAt[0], pond.labelAt[1], pond.labelAt[2], nearKey === 'pond', up * (pond.fishing() ? 0 : 1));
  for (const p of hideout.props) place('hx:' + p.id, p.labelAt[0], p.labelAt[1], p.labelAt[2], nearKey === 'hx:' + p.id, (1 - up) * quiet);
  place('hall', hall.labelAt[0], hall.labelAt[1], hall.labelAt[2], false, 1 - indoors);
  for (const n of agents.list) { const a = (n.outside ? 1 : indoors) * up, top = n.y + 2.75 - n.sit * 0.3; place(n.id, n.x, top, n.z, n.id === nearKey, a); place('say:' + n.id, n.x, top + 1.6, n.z, false, a); }
}
// If the first few seconds run slowly, render at a lower resolution from then on.
let probe = { frames: 0, time: 0 };
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now; update(dt);
  if (probe && document.visibilityState === 'visible') { probe.frames++; if (probe.frames > 30) probe.time += raw; if (probe.frames === 150) { if (probe.time / 120 > 1 / 42 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.5); renderer.setPixelRatio(pixelRatio); resize(); probe = { frames: 0, time: 0 }; } else probe = null; } }
  if (bakeFrames > 0) { bakeFrames--; renderer.shadowMap.needsUpdate = true; }
  else if (titleFor > 0) { titleFor -= Math.min(raw, 0.3); if (titleFor <= 0) ui.endIntro(); }
  // while a menu covers the screen the world behind it is only redrawn every third frame,
  // which leaves the browser free to animate the menu smoothly
  // while a panel covers the screen, hide the touch controls behind it (and on short screens the top buttons)
  { const over = hx.isOpen() || pondUI.isOpen() || !!ui.openId() || !!ui.chatId() || ui.boardOpen() || ui.wardrobeOpen(); if (over !== overlayOn) { overlayOn = over; document.body.classList.toggle('overlay', over); } }
  // (never while the wardrobe is up or the camera is moving: those need every frame)
  minimap.draw(time, Math.min(0.05, raw));
  { const on = disc.isOpen() || minimap.isBig(); if (on !== hudOpen) { hudOpen = on; document.body.classList.toggle('hudopen', on); } }
  // (and never while fishing, or just after the fact card opens or closes)
  if (pondUI.isOpen() !== pondWas) { pondWas = pondUI.isOpen(); pondCalm = 0.9; } pondCalm -= Math.min(raw, 0.1);
  idle = paused() && !travelling && !ui.wardrobeOpen() && closeUp === 0 && listen === 0 && !(pond.active() && !pondUI.isOpen()) && pondCalm <= 0 ? idle + 1 : 0;
  if (idle % 3 === 0 || bakeFrames > 0) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function start(saved) {
  if (saved && typeof saved.x === 'number' && !blocked(saved.x, saved.z, floorAt(saved.x, saved.z))) { P.x = saved.x; P.z = saved.z; P.y = P.visY = floorAt(P.x, P.z); P.yaw = saved.yaw || 0; focus.set(P.x, 0, P.z - 1.5); }
  canvas.tabIndex = 0;
  // a saved position skips the opening; a fresh visit glides in over about two seconds
  if (saved && typeof saved.x === 'number') ui.endIntro(); else { zoom = TUNING.zoomStart * 1.55; opening = 2.8; titleFor = 1.3; for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, () => { titleFor = 0; ui.endIntro(); }, { once: true }); }
  window.__village = { disc, minimap, P, ui, stalls, agents, hall, wolf, blocked, groundAt, goTo, renderer, scene, FLOOR, travel, hx, under: () => underground, listening: () => listen, pond, pondUI, goFish }; // handy in the browser console
  requestAnimationFrame((t) => { last = t; frame(t); });
}
start({});
