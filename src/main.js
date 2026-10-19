// Entry point: builds the scene, reads input and runs the game loop.
import * as THREE from 'three';
import { STALLS, TUNING, HALL, FLOOR, CAVE, POND } from './config.js';
import { AGENTS } from './config.js';
import { buildWorld, refreshSlab, groundType } from './world.js';
import { buildStalls } from './stalls.js';
import { buildHall } from './hall.js';
import { createAgents, dayPhase } from './agents.js';
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
import { createParrot, PARROT_ICON } from './parrot.js';
import { RECORDS } from './hideout-content.js';
import { BASE } from './base.js';
import { t, tr } from './i18n.js';
import { lamps, addLamp, MOOD, createLightPool, updateLightPool } from './lights.js';
import { cv } from './textures.js';
import { drawSprite, drawFace, SPRITE, createFigure } from './figures.js';
import { inject as analytics } from '@vercel/analytics';
import { access, bindAccess } from './access.js';
import { createLife } from './life.js';
import { createSky } from './sky.js';
import { createShowViewer } from './show.js';
import { buildHill, createScope } from './observatory.js';
import { buildRooftop, LADDER } from './rooftop.js';
import { createWeather, PRECIP } from './weather.js';
import { FESTIVAL, FESTIVALS, festivalChoice, chooseFestival, takeResume } from './festival.js';
import { decorateVillage, decorateHideout } from './festive.js';

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
// if the browser takes the GPU away for a moment (Safari can, when a phone is short of memory),
// three.js waits for it to come back; then the shadows are drawn again
canvas.addEventListener('webglcontextrestored', () => { bakeFrames = 4; });
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
// the lanterns' light: a few real lights shared out to the nearest lamps (see lights.js)
createLightPool(scene, phone ? 10 : 16);
const lampFill = new THREE.AmbientLight('#ffb36a', 0); scene.add(lampFill); let fillLevel = 0; const FILL_K = 0.06;

/* ── world ── */
const fixed = scene.children.length; // the sky light and the sun above stay where they are
buildWorld(scene, renderer);
const obs = buildHill(scene); // the hill behind the north-west stalls, and its observatory
const stalls = buildStalls(scene);
const roof = buildRooftop(scene); // the ladder, walkways and lookout over the north-west stalls
const hall = buildHall(scene);
const agents = createAgents(scene, hall);
// a plank hung in the hall's doorway at night: the agents (all but Friday) have gone home
const closedSign = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  const paint = () => { g.fillStyle = '#8a5a2f'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#6b4422'; for (let y = 0; y < 96; y += 24) g.fillRect(0, y, 256, 3);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2a1a0e'; g.font = '700 40px "Pixelify Sans","Courier New",monospace'; g.fillText('CLOSED', 128, 38);
    g.font = '700 20px "Pixelify Sans","Courier New",monospace'; g.fillText('back at 6:00 · Friday is in', 128, 72); tex.needsUpdate = true; };
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; paint();
  if (document.fonts && document.fonts.load) document.fonts.load('700 40px "Pixelify Sans"').then(paint).catch(() => {});
  const grp = new THREE.Group(); grp.position.set(HALL.doorX, 2.6, HALL.z1 + 0.62); scene.add(grp);
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 0.08), new THREE.MeshLambertMaterial({ color: '#5a3a1f' })));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.68), new THREE.MeshLambertMaterial({ map: tex })); face.position.z = 0.045; grp.add(face);
  for (const sx of [-0.7, 0.7]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), new THREE.MeshLambertMaterial({ color: '#2a2019' })); r.position.set(sx, 0.8, 0); grp.add(r); }
  grp.visible = false; return grp;
})();
const chickens = createChickens(scene);
const ambience = createAmbience(scene);
const cave = buildCave(scene);
const pond = buildPond(scene);
const life = createLife(scene, blocked); // washing lines and the pigeons
// festival decorations round the village (festive.js); the About Me centrepiece is built with the stalls
const decor = FESTIVAL ? decorateVillage(scene, FESTIVAL, { stalls, blocked, groundAt, groundType, renderer, camera, phone }) : null;
const aboutStall = stalls.find((q) => q.about);
let soakT = 0, soaked = false;
// Everything built so far is the village. It goes in one group, and the Hideout in another, so
// only the place the player is in gets drawn (and lit): the other one is switched off entirely.
const village = new THREE.Group(); for (const o of scene.children.slice(fixed)) village.add(o); scene.add(village);
const hideoutRoot = new THREE.Group(); hideoutRoot.visible = false; scene.add(hideoutRoot);
const hideout = buildHideout(hideoutRoot);
const decorHx = FESTIVAL ? decorateHideout(hideoutRoot, FESTIVAL) : null;
// Valentine's: every lantern burns a little pink
{ const tint = { valentine: '#ff8fb0', thadingyut: '#ff9a3a' }[FESTIVAL]; if (tint) { const c = new THREE.Color(tint); for (const L of lamps) L.light.color.lerp(c, 0.3); } }
const player = createPlayer(scene), P = player.state;
pond.setHand((v) => player.hand(v));
/* footsteps sound like what you're walking on: planks, paving or grass */
function stepSound() {
  // stepping in a puddle: a splash of drops and a wet footstep
  if (!underground && P.y < 1 && weather.inPuddle(P.x, P.z)) { weather.splashAt(P.x, P.z, P.visY); return 'stepPuddle'; }
  if (underground || insideHall(P.x, P.z)) return 'stepWood';
  const onSlab = Math.abs(P.x) < 3.3 && Math.abs(P.z) < 2.2;
  if (!onSlab && P.y > FLOOR + 0.06) return 'stepWood'; // the bridge, the dock, a stall's platform
  const g = groundType(P.x, P.z); return g === 'stone' ? 'step' : 'stepGrass';
}
/* the parrot: catch all three facts at the pond and it comes to sit on your shoulder */
const parrot = createParrot(scene, player);
let parrotDue = false;
if (store.get('pv-parrot') === 'yes') parrot.enable('perch');
// its speech bubble
const parrotSay = document.createElement('div'); parrotSay.className = 'parrot-say'; parrotSay.setAttribute('aria-live', 'polite'); document.body.appendChild(parrotSay);
let sayUntil = 0, sayNext = null, cardWas = null;
function say(text) { parrotSay.textContent = text; sayUntil = performance.now() + 2600; sound.play('squawk'); }
// whistle: it flies to the pond and comes back with a fact
function whistle() {
  if (!parrot.on() || pondUI.isOpen()) return;
  sound.play('whistle');
  if (underground) { setTimeout(() => say('Squawk! No pond down here!'), 450); return; }
  const ok = parrot.fetch(new THREE.Vector3(POND.x - 0.6, -0.15, POND.z), () => { say('Squawk! A fact!'); setTimeout(() => { if (!paused()) pondUI.show(pondUI.next()); }, 500); });
  if (!ok) setTimeout(() => say('Squawk! Busy!'), 400);
}
// where a stall's sign is: the top of its front edge
const signAt = {};
function signPoint(s) {
  if (!signAt[s.id]) { const b = new THREE.Box3().setFromObject(s.group); signAt[s.id] = new THREE.Vector3(s.pos[0] + (s.front[0] - s.pos[0]) * 0.5, b.max.y + 0.02, s.pos[1] + (s.front[1] - s.pos[1]) * 0.5); }
  return signAt[s.id];
}
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
// visitors who caught every fact before the parrot existed get it too
if (disc.has('facts') && !parrot.on()) { store.set('pv-parrot', 'yes'); parrot.enable('perch'); }
  if (!wolfUnlocked && STALLS.every((s) => s.about || visited.has(s.id))) pendingReward = true;
  ui.setProgress(visited, wolfUnlocked);
}
let pendingReward = false; // shown once the popup that completed the set is closed

/* ── interface ── */
let wardrobePrev = null;
// the AI Cinema's showing, large (opened from the cinema's card)
const showViewer = createShowViewer({ onOpen: () => sound.play('open'), onClose: () => { sound.play('close'); canvas.focus({ preventScroll: true }); } });
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
  watchShow: () => { showViewer.show(); discover('cinema'); },
  toggleTheme: () => { nightTarget = nightTarget ? 0 : 1; try { sessionStorage.setItem('pv-theme', nightTarget ? 'dark' : 'light'); } catch (e) { /* ignore */ } return nightTarget === 1; },
});
ui.setProgress(visited, wolfUnlocked);
if (wolfUnlocked) wolf.activate(P);

/* ── accessibility settings, in the menu ── */
bindAccess(document.getElementById('access'), () => sound.play('menu'));
const exposure = () => { renderer.toneMappingExposure = access.contrast() ? 1.14 : 1.0; };
exposure(); access.onChange(exposure);

/* ── the discovery checklist and the mini-map, together in the top-left corner ── */
const focusGame = () => canvas.focus({ preventScroll: true });
const disc = createDiscoveries({ toast: (o) => ui.toast(o), focusGame, stallCount: STALLS.filter((q) => !q.about).length,
  go: (to) => {
    if (to === 'nextStall') { const s = STALLS.find((q) => !q.about && !visited.has(q.id)); if (s) goTo(s.id); }
    else if (to === 'nextAgent') { const a = AGENTS.find((q) => !disc.collected('agents').has(q.id)); if (a) goTo('agent:' + a.id); }
    else if (to === 'night') { if (!nightTarget) document.getElementById('themeBtn').click(); }
    else if (to === 'rain') weather.visit('rain');
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
// on phones the parrot's whistle is a button beside the discoveries (on a keyboard it's F)
const whistleBtn = document.createElement('button'); whistleBtn.className = 'whistle-btn'; whistleBtn.hidden = true; whistleBtn.setAttribute('aria-label', 'Whistle for the parrot');
{ const c = document.createElement('canvas'); c.width = c.height = 16; PARROT_ICON(c.getContext('2d')); whistleBtn.append(c, Object.assign(document.createElement('span'), { textContent: 'Whistle' })); }
whistleBtn.onclick = () => { whistle(); focusGame(); };
hud.append(disc.button, whistleBtn, disc.chip); document.body.append(minimap.el, hud, minimap.scrim);

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
  pond.fish(P, () => { sound.play('splash'); const id = pondUI.next(); pondUI.show(id); disc.add('facts', id); if (disc.has('facts') && !parrot.on()) parrotDue = true; });
}
// a panel that covers the whole view (the world behind it can be drawn less often). The side menu,
// an agent's chat and the discoveries list leave most of the village showing, so they never count.
const covered = () => showViewer.isOpen() || !!ui.openId() || ui.boardOpen() || hx.isOpen() || pondUI.isOpen() || minimap.isBig();
const paused = () => showViewer.isOpen() || ui.paused() || hx.isOpen() || travelling || pondUI.isOpen() || pond.fishing() || disc.isOpen() || minimap.isBig();
ui.addPlace('cave', 'The Hideout', '#ffd060', () => goTo('hideout'));
ui.addPlace('pond', 'Fishing Pond', '#62c8ff', () => goTo('pond'));
ui.addPlace('obs', 'Observatory', '#9ec3ff', () => goTo('observatory'));
/* ── the observatory's telescope: a look-around view from the dome ── */
const scope = createScope(obs);
const SCOPE_SKY = { day: new THREE.Color('#a9cbe8').convertSRGBToLinear(), night: new THREE.Color('#141c3a').convertSRGBToLinear() };
const scopeUI = document.createElement('div'); scopeUI.id = 'scope'; scopeUI.setAttribute('aria-hidden', 'true');
scopeUI.innerHTML = '<i class="scope-ring"></i><p class="scope-hint">Drag or use the arrow keys to look around · scroll or pinch to zoom</p><button type="button" class="scope-x">Step back</button>';
document.body.appendChild(scopeUI);
function enterScope() { if (scope.on()) return; auto = null; P.vx = P.vz = 0; scope.enter(); scopeUI.classList.add('show'); document.body.classList.add('scoping'); sound.play('open'); discover('observatory'); }
function exitScope() { if (!scope.on()) return; scope.exit(); scopeUI.classList.remove('show'); document.body.classList.remove('scoping'); sound.play('close'); canvas.focus({ preventScroll: true }); }
scopeUI.querySelector('.scope-x').onclick = exitScope;
/* ── the rooftop route: climb the ladder at Alacrity's east end ── */
let climb = null; // { dir: 1 up / -1 down, k: 0 at the foot .. 1 at the top, then, ox, oz, oy }
const climbPt = { x: 0, y: 0, z: 0, rung: false };
const onRoof = () => !underground && roof.on(P.x, P.z, P.y);
function startClimb(dir, then) {
  if (climb || travelling || scope.on()) return; auto = null; rollT = -1; P.rollK = -1; P.vx = P.vz = P.vy = 0;
  const k = dir > 0 ? 0 : 1; roof.climbAt(k, climbPt);
  climb = { dir, k, then, ox: P.x - climbPt.x, oz: P.z - climbPt.z, oy: P.y - climbPt.y, rung: -1 };
}
function updateClimb(dt) {
  const c = climb, px = P.x, pz = P.z; c.k = Math.max(0, Math.min(1, c.k + (c.dir * dt) / 2.3));
  const fade = Math.exp(-dt * 9); c.ox *= fade; c.oz *= fade; c.oy *= fade; // where they started eases into the ladder's line
  roof.climbAt(c.k, climbPt); P.x = climbPt.x + c.ox; P.z = climbPt.z + c.oz; P.y = P.visY = climbPt.y + c.oy; P.vy = 0; P.grounded = true;
  P.vx = climbPt.rung ? 0 : (P.x - px) / Math.max(dt, 1e-3); P.vz = climbPt.rung ? 0 : (P.z - pz) / Math.max(dt, 1e-3); // (so the feet step on the short walks on and off)
  const face = climbPt.rung || c.dir > 0 ? -Math.PI / 2 : Math.PI / 2; let d = face - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * Math.min(1, dt * 10);
  P.climb = climbPt.rung ? 1 : 0; P.climbPhase = c.k * 44;
  const rung = Math.floor(c.k * 16); if (climbPt.rung && rung !== c.rung) { c.rung = rung; sound.play('stepWood'); }
  if ((c.dir > 0 && c.k >= 1) || (c.dir < 0 && c.k <= 0)) { climb = null; P.climb = 0; P.vx = P.vz = 0; if (c.dir > 0) sound.play('land'); if (c.then) c.then(); }
}
// the chest on the lookout
function openChest() { sound.play('open'); ui.toast({ title: 'Rooftop chest', text: 'Inside: the first sketch of this village, on squared paper, with “start here” circled by the fountain.', icon: null }); }
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
  hall.board.draw(agents.list.map((n) => ({ name: n.name, role: tr(n, 'role'), color: n.color, sprite: sprites[n.id], face: faces[n.id], about: n.about, palette: [n.design.top, n.design.top2, n.design.trim, n.design.pants, n.design.hair], status: t(agents.status(n)), live: !n.outside && !n.home && n.task !== 'break' && n.task !== 'lunch' })), agents.log);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { boardSig = ''; });
function openBoard() { auto = null; ui.openBoard(); }

/* ── walk-to: the menu sends the character somewhere on foot ── */
let auto = null; // { path: [[x, z], ...], then: fn }
function walkTo(x, z, then) { if (underground) { auto = { path: [[x, z]], then }; return true; } // the Hideout is one open room
  if (climb) return false;
  if (onRoof()) { auto = { path: [[Math.max(-19.6, Math.min(LADDER.land[0], P.x)), LADDER.z], LADDER.land], then: () => startClimb(-1, () => walkTo(x, z, then)) }; return true; } // down the ladder first
  const path = findPath(P.x, P.z, x, z); if (!path || !path.length) { if (then) then(); return false; } auto = { path, then }; return true; }

// tap (or click) the ground to walk there; a ring marks the spot
const marker = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, map: new THREE.CanvasTexture(cv(64, 64, (g) => { g.strokeStyle = '#ffd24a'; g.lineWidth = 7; g.strokeRect(10, 10, 44, 44); g.fillStyle = '#ffd24a'; g.fillRect(28, 28, 8, 8); })) }));
marker.rotation.x = -Math.PI / 2; marker.renderOrder = 3; scene.add(marker);
let markerLife = 0;
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPoint = new THREE.Vector3();
function tapGround() {
  // tapping the water goes fishing
  if (!underground) { ground.constant = -FLOOR; if (ray.ray.intersectPlane(ground, hitPoint) && inPondWater(hitPoint.x, hitPoint.z)) { goTo('pond'); return; } }
  // up on the roofs, a tap on the boards walks there
  if (!underground && onRoof()) { ground.constant = -P.y; if (ray.ray.intersectPlane(ground, hitPoint) && roof.on(hitPoint.x, hitPoint.z, P.y)) { auto = { path: [[hitPoint.x, hitPoint.z]] }; marker.position.set(hitPoint.x, P.y + 0.06, hitPoint.z); markerLife = 1; sound.play('near'); return; } }
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
  if (id === 'observatory') { if (Math.hypot(P.x - obs.door.x, P.z - obs.door.z) < 1.4) enterScope(); else walkTo(obs.door.x, obs.door.z, enterScope); return; }
  if (id === 'ladder') { const look = () => { auto = { path: [[-12, LADDER.z], [-19.4, -10.75]] }; }; if (onRoof()) look(); else if (Math.hypot(P.x - LADDER.foot[0], P.z - LADDER.foot[1]) < 1.1) startClimb(1, look); else walkTo(LADDER.foot[0], LADDER.foot[1], () => startClimb(1, look)); return; }
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
// the colours the sky passes through on the way between day and night: a sunset or a sunrise
const DUSK = { sky: new THREE.Color('#ffb08a'), sun: new THREE.Color('#ff7a3a'), back: new THREE.Color('#e88a72').convertSRGBToLinear(), ground: new THREE.Color('#6a3a4a') };
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
    // halfway through a change the whole sky glows warm, like the sun setting (or rising)
    const dusk = 4 * t * (1 - t) * (1 - indoors * 0.7);
    if (dusk > 0.001) { hemi.color.lerp(DUSK.sky, dusk * 0.6); hemi.groundColor.lerp(DUSK.ground, dusk * 0.4); sun.color.lerp(DUSK.sun, dusk * 0.75); sun.intensity *= 1 + dusk * 0.25; backdrop.lerp(DUSK.back, dusk * 0.7); scene.fog.color.copy(backdrop); }
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
  // looking through the telescope: the movement keys look round; E or Esc steps back
  if (scope.on()) {
    if (k === 'Escape' || (k === 'KeyE' && !e.repeat)) { exitScope(); e.preventDefault(); return; }
    if (k === 'Equal' || k === 'NumpadAdd') scope.zoom(0.85); if (k === 'Minus' || k === 'NumpadSubtract') scope.zoom(1.18);
    if (k.startsWith('Arrow') || k === 'Space') e.preventDefault();
    keys[k] = true; return;
  }
  if (k === 'Escape') { if (minimap.isBig()) { minimap.close(); return; } if (disc.isOpen()) { disc.close(); return; } if (showViewer.isOpen()) { showViewer.hide(); return; } if (pondUI.isOpen()) { pondUI.hide(); return; } if (!ui.escape()) hx.hide(); return; }
  // M opens the big map, C the checklist (when nothing else is open)
  if ((k === 'KeyM' || k === 'KeyC') && !e.repeat && !e.metaKey && !e.ctrlKey && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) {
    if (k === 'KeyM' && (minimap.isBig() || (!paused() && !disc.isOpen()))) { minimap.toggle(); return; }
    if (k === 'KeyC' && (disc.isOpen() || (!paused() && !minimap.isBig()))) { if (disc.isOpen()) disc.close(); else disc.show(); return; }
  }
  if (k === 'KeyF' && !e.repeat && !e.metaKey && !e.ctrlKey && !paused()) { whistle(); return; }
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
/* the entrance: on a fresh visit the camera sweeps once round and over the whole village, high up,
   then glides down into the usual view behind the player. It is a single smooth path (radius, angle and
   height each eased from start to end), it ends exactly on the game camera, and any key or tap speeds
   it to a quick finish. */
let fly = null;
// fly: { t, dur, rate } while the entrance flight runs
const FLY_C = new THREE.Vector3(2, 0, -3), flyRel = new THREE.Vector3(), flyLook = new THREE.Vector3();
const smoother = (k) => k * k * k * (k * (k * 6 - 15) + 10);
let titleFor = 0; // seconds of drawn frames before the title card lifts, so it never lifts onto a half-built scene
const setZoom = (z) => { zoomTarget = Math.max(TUNING.zoomMin, Math.min(TUNING.zoomMax, z)); };
canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (scope.on()) { scope.zoom(Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0022)); return; } if (!paused()) setZoom(zoomTarget * Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0016)); }, { passive: false });
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
  lift(e); if (scope.on()) { down = null; return; } if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved >= 8 || paused()) return;
  const hit = pick(e); if (!hit) { tapGround(); return; }
  if (hit.board) { if (nearBoard()) openBoard(); else walkTo(hall.board.stand[0], hall.board.stand[1], openBoard); }
  else if (hit.agent) { const n = hit.agent; if (Math.hypot(P.x - n.x, P.z - n.z) < TUNING.talkRange * 1.7) talkTo(n); else walkTo(n.x, n.z + 1.3); }
  else if (hit.prop) goTo('hx:' + hit.prop);
  else if (hit.stall.kind === 'outfits') goTo('outfits'); else openStall(hit.stall);
});
canvas.addEventListener('pointermove', (e) => {
  if (scope.on()) {
    if (!touches.has(e.pointerId)) return; const was = touches.get(e.pointerId); touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2 && pinch) { const s = spread(); if (s > 0) scope.zoom(pinch / s); pinch = s; } else if (touches.size === 1) scope.drag(e.clientX - was[0], e.clientY - was[1], canvas.clientHeight);
    return;
  }
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
  if (scope.on()) {
    const ax = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, ay = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y;
    if (ax || ay) scope.turn(ax, ay, dt);
    jumpQueued = false; rollQueued = false;
  } else if (!busy && !climb) { ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x; iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y; }
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
  // walking into the ladder from its foot climbs it; walking into the gap at the top climbs down
  if (mag > 0.15 && !busy && !climb && !underground && Math.abs(P.z - LADDER.z) < 0.5) {
    if (P.y < 1 && P.x > LADDER.x && P.x < LADDER.x + 0.9 && dx < -0.5 * Math.abs(dz)) startClimb(1);
    else if (onRoof() && P.x > LADDER.land[0] - 0.15 && dx > 0.5 * Math.abs(dz)) startClimb(-1);
  }
  if (climb) { dx = dz = 0; jumpQueued = rollQueued = false; }
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
  if (climb) updateClimb(dt);
  else {
    P.vy -= TUNING.gravity * dt; P.y += P.vy * dt;
    const g = groundAt(P.x, P.z, P.y);
    if (P.y <= g) { if (!P.grounded && P.vy < -4) { P.squash = 1; sound.play('land'); } P.y = g; P.vy = 0; P.grounded = true; } else P.grounded = false;
  }
  // the lookout at the end of the rooftop route
  if (!underground && !disc.has('rooftop') && roof.onLookout(P.x, P.z, P.y)) { discover('rooftop'); ui.toast({ title: 'Rooftop lookout', text: 'The best-kept secret in the village: the whole square from above the stalls.', icon: null }); sound.play('achieve'); }
  roof.update(time);
  if (player.stride(dt, rollT >= 0 ? 0 : speed, running) && rollT < 0) sound.play(stepSound());

  // town hall: the roof lifts away while the player is inside
  hall.update(dt, !underground && insideHall(P.x, P.z) || (Math.abs(P.x - HALL.doorX) < HALL.doorW / 2 && P.z < HALL.z1 + 0.2), time);
  const indoors = hall.openness();
  if (night !== nightTarget) night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), dt / 3.4); // a slow sweep through dusk
  torch.position.set(P.x, P.visY + 2.2, P.z + 0.6);
  applyMood(time, indoors);
  // clouds and rain dim the daylight and grey it a little (outdoors; underground only the window light)
  { const w = weather.levels(), dull = Math.max(w.c * 0.55, WET ? w.r : w.r * 0.25) * (underground ? 0.5 : 1);
    sun.intensity *= 1 - 0.62 * dull; hemi.intensity *= 1 + 0.08 * dull; hemi.color.lerp(WX.grey, 0.35 * dull); } // overcast: less sun, so softer shadows
  { const rest = updateLightPool(focus); fillLevel += (rest - fillLevel) * Math.min(1, dt * 3); lampFill.intensity = Math.min(0.35, fillLevel * FILL_K); }
  if (night > 0.9 && !underground && !disc.has('night')) discover('night');
  player.setHold(pond.hold());
  player.animate(dt, time, groundAt(P.x, P.z, 9), (1 - ease(night)) * (1 - indoors) * (underground ? 0 : 1));
  parrot.update(dt, time);
  // while a stall's card is open the parrot sits on its sign; afterwards it comes home and says the name
  { const id = ui.openId();
    if (id !== cardWas) { const was = cardWas; cardWas = id;
      if (id && parrot.on() && !underground) { const st = stalls.find((q) => q.id === id); if (st) parrot.visit(signPoint(st)); }
      else if (!id && was) { parrot.home(); const st = stalls.find((q) => q.id === was); if (st && parrot.on()) sayNext = 'Squawk! ' + tr(st, 'label') + '!'; } }
    if (sayNext && parrot.state() === 'perch') { say(sayNext); sayNext = null; } }
  whistleBtn.hidden = !parrot.on();
  // the parrot arrives once the card for the last fact has been closed (and the rod put away)
  if (parrotDue && !pondUI.isOpen() && !pond.active()) { parrotDue = false; store.set('pv-parrot', 'yes'); parrot.enable('arrive'); ui.toast({ title: 'Parrot Friend', text: 'You caught every fact. A parrot now rides on your shoulder (try a dash roll).', icon: PARROT_ICON }); sound.play('achieve'); }
  cave.update(time); hideout.update(time, ease(night), music.isOn());
  if (!underground) pond.update(time, dt, ease(night));
  if (!underground) for (const st of stalls) if (st.update) st.update(time, focus);
  if (pond.holding() && !pondUI.isOpen()) pond.release(); // the card closed: put the rod away
  // listening mode
  const byDeck = underground && music.isOn() && rectDistance(hideout.musicRect, P.x, P.z) < 2.8;
  if (byDeck && mag <= 0.15 && !auto && speed < 0.2 && rollT < 0 && !paused()) listenT += dt; else listenT = 0;
  { const want = listenT > 3 ? 1 : 0; listen += (want - listen) * Math.min(1, dt * (want ? 0.9 : 4)); if (listen < 0.002) listen = 0; }
  if (listen > 0.01) { const r = RECORDS.find((q) => q.id === music.current()); if (r && nowPlaying.dataset.id !== r.id) { nowPlaying.dataset.id = r.id; nowPlaying.querySelector('img').src = BASE + 'assets/images/cds/' + r.cover; nowPlaying.querySelector('strong').textContent = r.title; nowPlaying.querySelector('span').textContent = r.by + ' \u00b7 ' + r.album; } }
  nowPlaying.style.opacity = listen.toFixed(3); nowPlaying.classList.toggle('on', listen > 0.5);
  // ambient sound by place, fading with distance
  if (sound.started()) {
    const near = (d, a, b) => Math.max(0, Math.min(1, 1 - (d - a) / (b - a)));
    sound.ambient({
      fire: underground ? near(Math.hypot(P.x - hideout.fireAt[0], P.z - hideout.fireAt[1]), 1.5, 9) : 0,
    });
  }
  // a crackle from the fireplace now and then when you are near it
  if (underground && sound.started() && Math.hypot(P.x - hideout.fireAt[0], P.z - hideout.fireAt[1]) < 5 && Math.random() < dt * 1.4) sound.play('crackle');
  // walking down the cave stairs, or into the glowing doorway in the Hideout, travels
  if (!travelling && !underground && inCave(P.x, P.z) && P.z > CAVE.z0 + 1.6) travel(true);
  if (!travelling && underground && Math.abs(P.x - HIDEOUT_EXIT.x) < 0.7 && P.z < HIDEOUT_EXIT.z0 + 1.1) travel(false);

  // camera
  closeUp += Math.sign((ui.wardrobeOpen() ? 1 : 0) - closeUp) * Math.min(Math.abs((ui.wardrobeOpen() ? 1 : 0) - closeUp), dt / 0.95);
  if (titleFor <= 0) { zoom += (zoomTarget - zoom) * Math.min(1, dt * (opening > 0 ? 1.7 : 7)); if (opening > 0) opening -= dt; }
  // while fishing the camera leans a little toward the line and closes in, then eases back
  const lean = underground ? 0 : pond.lean(), [lx, lz] = pond.lookAt();
  const fx = P.x + (lx - P.x) * 0.38 * lean, fz = P.z + (lz - P.z) * 0.38 * lean;
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
  if (fly) {
    if (titleFor <= 0) fly.t += dt * fly.rate;
    const u = Math.min(1, Math.max(0, fly.t / fly.dur)), e = smoother(u);
    flyRel.copy(camPos).sub(FLY_C);
    const rEnd = flyRel.length(), thEnd = Math.atan2(flyRel.x, flyRel.z), phEnd = Math.asin(flyRel.y / rEnd);
    const r = mix(rEnd * 1.25 + 12, rEnd, e), th = mix(thEnd + 2.5, thEnd, e), ph = mix(1.02, phEnd, smoother(Math.min(1, u * 1.1)));
    camPos.set(FLY_C.x + Math.sin(th) * Math.cos(ph) * r, FLY_C.y + Math.sin(ph) * r, FLY_C.z + Math.cos(th) * Math.cos(ph) * r);
    // first it looks over the square, then its gaze settles on the player
    camLook.copy(flyLook.copy(FLY_C).lerp(camLook, smoother(Math.min(1, Math.max(0, (u - 0.3) / 0.7)))));
    if (u >= 1) { fly = null; document.body.classList.remove('flying'); }
  }
  // the telescope: the camera rises into the dome and looks where you point it
  { const f = scope.update(dt, camPos, camLook, TUNING.cameraFov); if (Math.abs(camera.fov - f) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
    const e = scope.k(); obs.group.visible = e < 0.5; }
  camera.position.copy(camPos); camera.lookAt(camLook);
  // haze begins a little beyond the player and thickens toward the far trees, at any zoom
  const reach = camPos.distanceTo(camLook); scene.fog.near = reach + (underground ? 6 : 13); scene.fog.far = reach + (underground ? 26 : 54);
  // mist (and a little with rain) pulls the haze in close and turns it pale
  if (!underground) { const w = weather.levels(), m = Math.max(w.m, WET ? w.r * 0.35 : 0) * (1 - indoors * 0.7);
    if (m > 0.005) { scene.fog.near = mix(scene.fog.near, reach * 0.62, m); scene.fog.far = mix(scene.fog.far, reach + 16, m); backdrop.lerp(night > 0.5 ? WX.mistNight : WX.mistDay, m * 0.75); scene.fog.color.copy(backdrop); } }
  // through the telescope the horizon shows: the far trees fade into a sky colour instead of the dark edge
  { const e = scope.k(); if (e > 0.001) { scene.fog.near = mix(scene.fog.near, 34, e); scene.fog.far = mix(scene.fog.far, 82, e); backdrop.lerp(SCOPE_SKY.day.clone().lerp(SCOPE_SKY.night, ease(night)), e); scene.fog.color.copy(backdrop); } }

  // what E would do right now: the nearest stall (measured to its edge) or agent
  near = null; let bd = TUNING.interactRange, nearKey = null;
  for (const s of stalls) {
    const d = rectDistance(s.rect, P.x, P.z); if (d < bd) { bd = d; nearKey = s.id; near = s.kind === 'outfits' ? { key: 'changeOutfit', act: () => goTo('outfits') } : { key: 'open', vars: { name: tr(s, 'label') }, act: () => openStall(s) }; }
  }
  { const n = underground ? null : agents.nearest(P, indoors); if (n) { nearKey = n.id; near = { key: 'talkTo', vars: { name: n.name }, act: () => talkTo(n) }; } }
  // anywhere round the pond (or on its bridge and benches) E walks you out to the end of the dock and casts
  if (!underground && !near && nearPond()) { nearKey = 'pond'; near = { key: 'goFishing', act: () => goTo('pond') }; }
  if (!underground && Math.hypot(P.x - obs.door.x, P.z - obs.door.z) < 1.6) { nearKey = 'obs'; near = { key: 'useScope', act: enterScope }; }
  if (!underground && Math.hypot(P.x - cave.top[0], P.z - cave.top[1]) < 2.3) { nearKey = 'cave'; near = { key: 'enterCave', act: () => travel(true) }; }
  if (underground) { near = null; nearKey = null; bd = TUNING.interactRange; for (const p of hideout.props) { const d = rectDistance(p.rect, P.x, P.z); if (d < Math.min(bd, p.range || bd)) { bd = d; nearKey = 'hx:' + p.id; near = { key: p.key, act: () => useProp(p.id) }; } } }
  // the board wins when you are right up against it
  if (!underground && indoors > 0.5 && nearBoard() && (!near || near.key !== 'talkTo' || rectDistance(hall.board.rect, P.x, P.z) < 1.1)) { nearKey = 'board'; near = { key: 'openBoard', act: openBoard }; }
  refreshBoard();
  if (!underground && P.y < 1 && Math.hypot(P.x - LADDER.foot[0], P.z - LADDER.foot[1]) < 1.1) { nearKey = 'ladder'; near = { key: 'climbUp', act: () => startClimb(1) }; }
  if (onRoof()) { // up on the roofs: only the ladder and the chest
    near = null; nearKey = null;
    if (Math.hypot(P.x - LADDER.land[0], P.z - LADDER.land[1]) < 1.0) { nearKey = 'ladderDown'; near = { key: 'climbDown', act: () => startClimb(-1) }; }
    else if (Math.hypot(P.x - roof.chest.x, P.z - roof.chest.z) < 1.3) { nearKey = 'chest'; near = { key: 'openChest', act: openChest }; }
  }
  if (scope.on() || climb || fly || auto || !near || hx.isOpen() || travelling || listen > 0.3 || pondUI.isOpen() || pond.fishing()) ui.setPrompt(null); else ui.setPrompt(near.key, near.vars, nearKey);
  if (markerLife > 0) { markerLife = auto ? Math.max(0.35, markerLife - dt * 0.8) : markerLife - dt * 3; marker.material.opacity = Math.max(0, markerLife) * 0.9; marker.scale.setScalar(0.8 + Math.sin(time * 6) * 0.08); marker.rotation.z = time * 1.2; }
  if (pendingReward && !paused()) { pendingReward = false; wolfUnlocked = true; store.set('pv-wolf', 'yes'); wolf.activate(P); ui.setProgress(visited, true); ui.toast(); sound.play('achieve'); setTimeout(() => sound.play('bark'), 700); }

  agents.update(dt, time, P, ui.chatId());
  if ((time | 0) % 3 === 0) closedSign.visible = dayPhase() === 'night';
  chickens.update(dt, P, () => sound.play('cluck'));
  if (!underground) life.update(dt, time, P, speed, rollT >= 0, ease(night) > 0.6, () => sound.play('flutter'));
  { const w = weather.update(dt, time, focus, { hidden: underground, indoors, calm: access.calm(), height: renderer.domElement.height, fov: camera.fov, night: ease(night) });
    // cloud shadows: clearer on bright broken-cloud days, gone under full overcast or rain
    sky.strength = Math.max(0, 0.18 + 0.22 * w.c - 0.4 * w.r - 0.3 * w.m);
    if (FESTIVAL === 'christmas') sky.snow(underground ? 0 : 0.86 + 0.12 * w.r); // a full layer, deeper while it is snowing
    if (w.r > 0.6 && !underground && !indoors && !disc.has('rain')) discover('rain');
  }
  sky.update(dt, time, ease(night), indoors, underground, sun, camera);
  if (decor && !underground) decor.update(time, ease(night), indoors, dt);
  if (decorHx && underground) decorHx.update(time);
  if (aboutStall.festive && !underground) aboutStall.festive.update(time, ease(night), decor && decor.scale ? decor.scale() : 0);
  // Thingyan: stand by the waterfall and the spray splashes you (and blesses you)
  if (aboutStall.wetZones && !underground) {
    const hit = aboutStall.wetZones.some(([x, z]) => Math.hypot(P.x - x, P.z - z) < 1.4);
    if (hit) { soakT -= dt; if (soakT <= 0) { soakT = 0.32; weather.splashAt(P.x, P.z, P.visY + 0.9); sound.play('stepPuddle'); }
      if (!soaked) { soaked = true; ui.toast({ title: 'Happy Thingyan!', text: 'Splashed by the waterfall. Thingyan water washes away last year’s bad luck.', icon: null }); discover('rain'); } }
  }
  wolf.update(dt, time, P);
  ambience.update(time, ease(night), underground ? 1 : Math.max(indoors, WET ? weather.levels().r : 0));
  chirpT -= dt; if (chirpT < 0) { chirpT = 4 + Math.random() * 7; if (sound.started() && indoors < 0.5 && !underground) sound.play(night > 0.5 ? 'cricket' : 'bird'); }

  // labels
  const w = window.innerWidth, h = window.innerHeight, hide = Math.max(0, 1 - closeUp * 3) * (fly ? Math.max(0, (fly.t / fly.dur - 0.82) / 0.18) : 1);
  const place = (key, x, y, z, isNear, alpha) => { v3.set(x, y, z).project(camera); ui.placeLabel(key, (v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * h, isNear, v3.z > 1 ? 0 : alpha * hide); };
  { const n = performance.now(), a = Math.max(0, Math.min(1, (sayUntil - n) / 400));
    if (a > 0 && parrot.on()) { parrot.headAt(v3).project(camera); parrotSay.style.opacity = (a * hide).toFixed(2); parrotSay.style.transform = 'translate(-50%,-100%) translate(' + ((v3.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-v3.y * 0.5 + 0.5) * h).toFixed(1) + 'px)'; }
    else if (parrotSay.style.opacity !== '0') parrotSay.style.opacity = '0'; }
  const up = underground ? 0 : 1, quiet = 1 - listen;
  for (const s of stalls) place(s.id, s.pos[0], s.labelY || 5.3, s.pos[1], s.id === nearKey, up);
  place('cave', cave.labelAt[0], cave.labelAt[1], cave.labelAt[2], nearKey === 'cave', up);
  place('obs', obs.label[0], obs.label[1], obs.label[2], nearKey === 'obs', up * (1 - scope.k()));
  place('pond', pond.labelAt[0], pond.labelAt[1], pond.labelAt[2], nearKey === 'pond', up * (pond.fishing() ? 0 : 1));
  for (const p of hideout.props) place('hx:' + p.id, p.labelAt[0], p.labelAt[1], p.labelAt[2], nearKey === 'hx:' + p.id, (1 - up) * quiet);
  place('hall', hall.labelAt[0], hall.labelAt[1], hall.labelAt[2], false, 1 - indoors);
  for (const n of agents.list) { const a = (n.outside ? 1 : indoors) * up, top = n.y + 2.75 - n.sit * 0.3; place(n.id, n.x, top, n.z, n.id === nearKey, a); place('say:' + n.id, n.x, top + 1.6, n.z, false, a); }
}
// If the first few seconds run slowly, render at a lower resolution from then on.
let probe = { frames: 0, time: 0 };
// One bad frame (or one feature failing on an unusual browser) must not stop the village, so the
// next frame is always asked for first. If every frame keeps failing, the title card says why.
let failing = 0;
function frame(now) {
  requestAnimationFrame(frame);
  try { step(now); failing = 0; } catch (e) {
    failing++; if (failing === 1) console.error(e);
    if (failing === 20 && window.__villageFail) window.__villageFail(String((e && e.message) || e));
  }
}
function step(now) {
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
  idle = covered() && !travelling && !parrot.flying() && !ui.wardrobeOpen() && closeUp === 0 && listen === 0 && !(pond.active() && !pondUI.isOpen()) && pondCalm <= 0 ? idle + 1 : 0;
  // behind the library's books and the gallery's cube (which have their own 3D stage) the village
  // is dimmed and still, so after a few frames it isn't redrawn at all: the menu gets the GPU
  const stage3d = showViewer.isOpen() || (hx.isOpen() && (hx.which() === 'gallery' || hx.which() === 'library'));
  if (bakeFrames > 0 || (stage3d ? idle < 4 : idle % 3 === 0)) renderer.render(scene, camera);
}

/* ── the sky: drifting cloud shadows by day, the moon and stars in the pond at night ── */
const sky = createSky(scene);
for (const o of scene.children) if (o !== hideoutRoot) sky.patchAll(o);

/* ── weather: clear, cloudy, rain and mist (see weather.js); chosen in the menu, Auto by default ── */
const weather = createWeather(scene, { phone, blocked, groundAt, paving: (x, z) => groundType(x, z) !== 'grass' });
const WET = PRECIP === 'rain' || PRECIP === 'snow'; // real weather, not a shower of petals
const WX = { grey: new THREE.Color('#8f98a8'), mistDay: new THREE.Color('#c9cdd2').convertSRGBToLinear(), mistNight: new THREE.Color('#1c2230').convertSRGBToLinear() };
{ const pick = document.getElementById('weatherPick');
  const paint = () => pick.querySelectorAll('[data-wx]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wx === weather.mode())));
  pick.querySelectorAll('[data-wx]').forEach((b) => { b.onclick = () => { sound.play('menu'); weather.setMode(b.dataset.wx); }; });
  weather.onChange(paint); paint();
  // what falls is the festival's own: the Rain button says so
  if (PRECIP !== 'rain') { const b = pick.querySelector('[data-wx="rain"]'); b.dataset.t = { snow: 'wxSnow', petals: 'wxPetals', blossom: 'wxBlossom', padauk: 'wxPadauk' }[PRECIP]; b.textContent = t(b.dataset.t); } }
/* ── festivals, in the menu: Auto follows the calendar; a change reloads behind the loading screen ── */
{ const pick = document.getElementById('festPick');
  const paint = (choice) => pick.querySelectorAll('[data-fest]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fest === choice)));
  paint(festivalChoice);
  pick.querySelectorAll('[data-fest]').forEach((b) => { b.onclick = () => {
    sound.play('menu'); paint(b.dataset.fest);
    const changing = chooseFestival(b.dataset.fest, { x: P.x, z: P.z, yaw: P.yaw, under: underground });
    if (!changing) note();
  }; });
  const note = () => { document.getElementById('festNote').textContent = FESTIVAL ? 'Now: ' + FESTIVALS[FESTIVAL].name + (festivalChoice === 'auto' ? ' (from the calendar)' : '') : 'Auto follows the calendar: Thingyan in April, Thadingyut at the October full moon, Christmas, Valentine’s and Easter.'; };
  note(); }

function start(saved) {
  if (saved && typeof saved.x === 'number' && !blocked(saved.x, saved.z, floorAt(saved.x, saved.z))) { P.x = saved.x; P.z = saved.z; P.y = P.visY = floorAt(P.x, P.z); P.yaw = saved.yaw || 0; focus.set(P.x, 0, P.z - 1.5); }
  canvas.tabIndex = 0;
  // a saved position skips the opening; a fresh visit glides in over about two seconds
  const still = !access.flight(); // turned off in the menu, or reduced motion
  if (saved && saved.festive) titleFor = 1.0; // back from a festival change: the loading card stays up until the new village has drawn
  else if (saved && typeof saved.x === 'number') ui.endIntro();
  else {
    titleFor = 1.3;
    if (still) { zoom = TUNING.zoomStart * (access.calm() ? 1 : 1.55); opening = 2.8; } // no flight: the old gentle settle (or none at all)
    else { zoom = zoomTarget; fly = { t: 0, dur: 7.2, rate: 1 }; document.body.classList.add('flying'); }
    // the first key or tap lifts the title at once and hurries the flight to a smooth finish (about a second)
    for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, () => { titleFor = 0; ui.endIntro(); if (fly) fly.rate = Math.max(1, (fly.dur - fly.t) / 1.1); }, { once: true });
  }
  window.__village = { camera, scope, enterScope, exitScope, obs, roof, startClimb, climbing: () => !!climb, sky, life, weather, showViewer, setNight: (v) => { night = nightTarget = v; }, flying: () => !!fly, night: () => night, parrot, disc, minimap, P, ui, stalls, agents, hall, wolf, blocked, fill: () => fillLevel, groundAt, goTo, renderer, scene, FLOOR, travel, hx, under: () => underground, listening: () => listen, pond, pondUI, goFish }; // handy in the browser console
  requestAnimationFrame((t) => { last = t; frame(t); });
}
// back from a festival change: put the player where they were, without the opening flight
{ const back = takeResume();
  if (back && typeof back.x === 'number') start(Object.assign(back.under ? { x: cave.top[0], z: cave.top[1] - 0.6, yaw: Math.PI } : back, { festive: true })); else start({}); }
