// Two Myanmar festivals (see festival.js and festive.js):
//
//  Thadingyut, the festival of lights, at the October full moon: paper lanterns strung across the
//  square and over every stall, clay oil lamps along the paving, a golden lantern stupa in place of
//  the About Me signpost, lotus lamps floating on the pond, and sky lanterns rising into the night.
//
//  Thingyan, the water festival and new year, in April: a mini waterfall with a little pool in
//  place of the signpost (stand in front of it and the spray reaches you), golden padauk flowers everywhere and falling from the sky,
//  bright bunting, water barrels, drinking-water pot stands and wet paving.
//
// Like the other festivals, everything still is merged into a few meshes per material when the
// page loads. The moving things (water spray, sky lanterns, flickering flames) are a few shared
// materials and two particle systems whose motion is worked out on the graphics card.
import * as THREE from 'three';
import { B, M, flat, wool, glow, bake, lin } from './textures.js';
import { collide } from './collision.js';
import { addLamp } from './lights.js';
import { HALL, HIDEOUT, POND, FLOOR } from './config.js';
import { TURN, V, sag, wire, bunting } from './festive-kit.js';

const THINGYAN_COLORS = ['#ff4f9a', '#ffd23f', '#21b6d8', '#2ec27e', '#ff8c1a', '#9b5de5'];
const LANTERN_COLORS = ['#ff9a2e', '#ffcf4a', '#ff5a3c', '#ff7fa8', '#ffe08a'];
const rand = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

/* ── flames and lanterns that flicker: a few shared materials, each a little out of step ── */
function flicker(colors) {
  const mats = colors.map((c) => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: lin(c) })));
  const base = colors.map((c) => lin(c)); let i = 0;
  return {
    next: () => { const m = mats[i % colors.length][Math.floor(i / colors.length) % 3]; i++; return m; },
    update(time, night) {
      mats.forEach((row, ci) => row.forEach((m, p) => { const k = 0.82 + 0.1 * Math.sin(time * 7.3 + p * 2.1) + 0.08 * Math.sin(time * 13.1 + p * 4.3 + ci); m.color.copy(base[ci]).multiplyScalar(k * (0.7 + night * 0.45)); }));
    },
  };
}

/* ── Thadingyut pieces ── */
function paperLantern(g, x, y, z, mat, s = 1) {
  B(g, 0.02, 0.18, 0.02, M.dark, x, y + 0.3 * s, z, true);                    // the thread
  B(g, 0.24 * s, 0.05, 0.24 * s, flat('#8a2a1a'), x, y + 0.22 * s, z, true);  // top cap
  B(g, 0.32 * s, 0.38 * s, 0.32 * s, mat, x, y, z, true);                      // the glowing paper
  B(g, 0.34 * s, 0.035, 0.34 * s, flat('#d9a93a'), x, y, z, true);            // a gold band
  B(g, 0.2 * s, 0.05, 0.2 * s, flat('#8a2a1a'), x, y - 0.21 * s, z, true);    // bottom cap
  B(g, 0.04, 0.16 * s, 0.04, flat('#c62f2f'), x, y - 0.33 * s, z, true);      // tassel
}
function lanternString(g, a, b, n, drop, fl, s = 1) {
  const pts = sag(a, b, n, drop); wire(g, pts, M.dark);
  pts.forEach((p, i) => { if (i > 0 && i < n) paperLantern(g, p.x, p.y - 0.38 * s, p.z, fl.next(), s); });
}
function oilLamp(g, x, y, z, flame) { B(g, 0.17, 0.06, 0.17, flat('#9a4a2a'), x, y + 0.03, z, true); B(g, 0.05, 0.1, 0.05, flame, x, y + 0.11, z, true); }
function bambooPole(g, x, z, h, solid = true) { B(g, 0.14, h, 0.14, flat('#b89a52'), x, h / 2, z); for (let y = 0.6; y < h; y += 0.9) B(g, 0.16, 0.04, 0.16, flat('#8f7638'), x, y, z, true); if (solid) collide(x - 0.12, x + 0.12, z - 0.12, z + 0.12, h); }
function lotusLamp(g, flame) {
  const c = new THREE.Group(); g.add(c); c.userData.keep = true;
  const pink = flat('#ff8fb3'), pale = flat('#ffd1e0');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, m = B(c, 0.1, 0.08, 0.18, i % 2 ? pink : pale, Math.cos(a) * 0.13, 0.04 + (i % 2) * 0.03, Math.sin(a) * 0.13, true); m.rotation.y = -a; }
  B(c, 0.14, 0.08, 0.14, flat('#ffd84a'), 0, 0.06, 0, true); B(c, 0.05, 0.1, 0.05, flame, 0, 0.16, 0, true);
  bake(c); return c;
}

/* ── Thingyan pieces ── */
function padauk(g, x, y, z, s = 1) { // a sprig of padauk: green leaves and golden flowers
  const leaf = flat('#3f8a3a'), gold = [flat('#ffd23f'), flat('#f5c518'), flat('#ffe27a')];
  B(g, 0.32 * s, 0.22 * s, 0.32 * s, leaf, x, y, z, true);
  [[-0.12, 0.12, 0.08], [0.1, 0.16, -0.06], [0.02, 0.2, 0.12], [-0.08, 0.06, -0.14], [0.14, 0.05, 0.1]].forEach(([dx, dy, dz], i) => B(g, 0.12 * s, 0.12 * s, 0.12 * s, gold[i % 3], x + dx * s, y + dy * s, z + dz * s, true));
}
function potStand(g, x, z, rot = 0) { // a yay-o-zin: a little roofed stand of drinking-water pots
  const p = new THREE.Group(); p.position.set(x, 0.1, z); p.rotation.y = rot; g.add(p);
  const wood = M.planks, clay = flat('#a4522e');
  for (const sx of [-0.7, 0.7]) B(p, 0.12, 1.7, 0.12, M.log, sx, 0.85, 0);
  B(p, 1.6, 0.1, 0.6, wood, 0, 0.7, 0); B(p, 1.8, 0.12, 0.8, flat('#7a3a2a'), 0, 1.75, 0); B(p, 1.4, 0.12, 0.6, flat('#8a4a32'), 0, 1.86, 0);
  for (const px of [-0.42, 0, 0.42]) { B(p, 0.34, 0.32, 0.34, clay, px, 0.92, 0); B(p, 0.2, 0.08, 0.2, clay, px, 1.12, 0); B(p, 0.24, 0.04, 0.24, flat('#e8e2d4'), px, 1.17, 0, true); }
  padauk(p, 0, 1.98, 0, 0.7);
  collide(x - 0.85, x + 0.85, z - 0.4, z + 0.4, 2);
}
function waterBarrel(g, x, z, solid = true) { B(g, 0.7, 0.9, 0.7, flat('#2f7fc4'), x, 0.55, z); B(g, 0.74, 0.06, 0.74, flat('#1f5a90'), x, 0.85, z, true); B(g, 0.6, 0.02, 0.6, flat('#7fc8ef'), x, 1.0, z, true); B(g, 0.32, 0.1, 0.32, flat('#c9ced6'), x + 0.15, 1.06, z - 0.1, true); if (solid) collide(x - 0.38, x + 0.38, z - 0.38, z + 0.38, 1.1); }
function silverBowl(g, x, y, z, s = 1) { B(g, 0.36 * s, 0.12 * s, 0.36 * s, flat('#c9ced6'), x, y + 0.06 * s, z, true); B(g, 0.28 * s, 0.02, 0.28 * s, flat('#7fc8ef'), x, y + 0.12 * s, z, true); }

/* ── particles worked out on the graphics card ── */
// water from a hose: each drop follows a parabola from the nozzle, starting at its own moment
function waterSpray(parent, nozzle, vel, count, uniforms) {
  const pos = new Float32Array(count * 3), ph = new Float32Array(count), jit = new Float32Array(count * 3), r = rand(Math.abs(Math.round(nozzle.x * 1000)) + 7);
  for (let i = 0; i < count; i++) { pos.set([nozzle.x, nozzle.y, nozzle.z], i * 3); ph[i] = r(); jit.set([(r() - 0.5) * 0.5, (r() - 0.5) * 0.4, (r() - 0.5) * 0.5], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1)); geo.setAttribute('aJit', new THREE.BufferAttribute(jit, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uVel: { value: vel } }, uniforms), transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime; uniform vec3 uVel; uniform float uScale; uniform float uFlight;
      attribute float aPhase; attribute vec3 aJit; varying float vK;
      void main() {
        float k = fract(uTime * 0.85 + aPhase), t = k * uFlight;
        vec3 v = uVel + aJit;
        vec3 p = position + v * t + vec3(0.0, -4.9, 0.0) * t * t;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vK = k; gl_PointSize = min((0.07 + k * 0.1) * uScale / -mv.z, 7.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uOpacity; varying float vK;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(mix(vec3(0.93, 0.98, 1.0), vec3(0.55, 0.8, 0.98), vK), uOpacity * (1.0 - vK * 0.6) * smoothstep(0.5, 0.25, d)); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; pts.userData.keep = true; parent.add(pts);
  return pts;
}
// rings where the water lands
function landingRings(parent, at, count, uniforms) {
  const pos = new Float32Array(count * 3), ph = new Float32Array(count), r = rand(41 + count);
  for (let i = 0; i < count; i++) { pos.set([at.x + (r() - 0.5) * 1.0, at.y, at.z + (r() - 0.5) * 1.0], i * 3); ph[i] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime; uniform float uScale; attribute float aPhase; varying float vT;
      void main() { vT = fract(uTime * 1.7 + aPhase); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (0.15 + vT * 0.55) * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOpacity; varying float vT;
      void main() { float d = length((gl_PointCoord - 0.5) * vec2(1.0, 2.4)); float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.22, 0.36, d); gl_FragColor = vec4(0.88, 0.95, 1.0, uOpacity * ring * (1.0 - vT)); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 3; pts.userData.keep = true; parent.add(pts);
}
// sky lanterns: rising slowly from round the village, swaying, fading out high up
function skyLanterns(scene, count, uniforms) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count), r = rand(311);
  for (let i = 0; i < count; i++) { pos.set([-16 + r() * 40, 0, -12 + r() * 30], i * 3); seed[i] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime; uniform float uScale; attribute float aSeed; varying float vFade; varying float vSeed;
      void main() {
        float y = fract(uTime * (0.008 + aSeed * 0.007) + aSeed * 7.13);
        vec3 p = position + vec3(sin(uTime * 0.3 + aSeed * 30.0) * 0.6 + y * 5.0, 2.2 + y * 17.0, cos(uTime * 0.25 + aSeed * 20.0) * 0.5 - y * 3.0);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vFade = smoothstep(0.0, 0.06, y) * (1.0 - smoothstep(0.7, 1.0, y)); vSeed = aSeed;
        gl_PointSize = min(1.1 * uScale / -mv.z, 30.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uOpacity; uniform float uTime; varying float vFade; varying float vSeed;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float body = step(abs(q.x), 0.17) * step(abs(q.y + 0.03), 0.23);           // the paper
        float glowA = smoothstep(0.5, 0.0, length(q * vec2(1.3, 1.0))) * 0.45;      // its halo
        float fl = 0.85 + 0.15 * sin(uTime * 9.0 + vSeed * 40.0);
        vec3 c = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.86, 0.5), smoothstep(0.2, -0.2, q.y));
        float a = (body * 0.95 + glowA) * vFade * uOpacity * fl;
        if (a < 0.01) discard;
        gl_FragColor = vec4(c * a, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  return pts;
}

/* ── the About Me centrepiece (g: the signpost's group, drawn 1.2x) ── */
export function mmCenterpiece(g, kind, makeBoard) {
  const ret = { rect: [-1.8, 1.8, -0.5, 0.6], labelY: 5.6, update: () => {} };
  if (kind === 'thadingyut') {
    // a golden stupa ringed with oil lamps, the board on a stand in front, lantern poles either side
    const fl = flicker(['#ffb347', '#ffd27a', '#ff8a2a']), lan = flicker(LANTERN_COLORS);
    const gold = flat('#d9a93a'), gold2 = flat('#e8bd4a'), stone = M.stone;
    B(g, 4.6, 0.3, 3.6, stone, 0, 0.15, -0.3);
    const tiers = [[3.0, 0.55, 2.5], [2.4, 0.5, 2.0], [1.8, 0.45, 1.55]]; let y = 0.3;
    tiers.forEach(([w, h, d], i) => { B(g, w, h, d, i % 2 ? gold2 : gold, 0, y + h / 2, -0.3); y += h;
      for (let k = 0; k < 7; k++) { const t = (k + 0.5) / 7; oilLamp(g, -w / 2 + 0.1 + (w - 0.2) * t, y, -0.3 + d / 2 - 0.1, fl.next()); } });
    B(g, 1.2, 0.75, 1.1, gold, 0, y + 0.37, -0.3); B(g, 0.85, 0.4, 0.85, gold2, 0, y + 0.95, -0.3); B(g, 0.45, 0.55, 0.45, gold, 0, y + 1.42, -0.3); B(g, 0.22, 0.7, 0.22, gold2, 0, y + 2.0, -0.3);
    B(g, 0.6, 0.1, 0.6, glow('#ffd84a'), 0, y + 2.4, -0.3, true); B(g, 0.12, 0.3, 0.12, glow('#fff1b0'), 0, y + 2.6, -0.3, true); // the hti, the umbrella at the top
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; oilLamp(g, Math.cos(a) * 2.05, 0.3, -0.3 + Math.sin(a) * 1.55, fl.next()); }
    const board = makeBoard(2.0, 1.0); board.position.set(0, 1.4, 1.62); g.add(board); B(g, 2.2, 1.2, 0.1, M.dark, 0, 1.4, 1.55, true);
    for (const sx of [-0.9, 0.9]) B(g, 0.12, 1.4, 0.12, M.log, sx, 0.7, 1.5);
    for (const sx of [-1, 1]) { bambooPole(g, sx * 2.6, 1.1, 3.9, false); for (const [dy, dx] of [[3.4, 0.45], [2.7, -0.45], [2.0, 0.45]]) { B(g, Math.abs(dx) + 0.1, 0.05, 0.05, M.dark, sx * 2.6 + dx / 2, dy + 0.42, 1.1, true); paperLantern(g, sx * 2.6 + dx, dy, 1.1, lan.next(), 1.2); } }
    addLamp(g, 0, 2.6, 1.5, 0.3, 1.9, 10, '#ffb347');
    ret.rect = [-2.9, 2.9, -2.2, 1.9]; ret.labelY = 7.2;
    ret.update = (time, night) => { fl.update(time, night); lan.update(time, night); };
  } else {
    // a little waterfall: a mossy rock face with water tumbling into a round stone pool, padauk
    // growing over the top, silver bowls on the rim, and the About Me board on a post beside it
    const rock = [flat('#7d776d'), flat('#8a857c'), flat('#6e695f')], moss = flat('#5c7a3c'), moss2 = flat('#6a8a44');
    const RX = 0, RZ = -0.55; // the rock face, at the back
    [[-1.3, 1.3, 0.9], [-0.55, 2.2, 1.0], [0.25, 2.7, 1.0], [1.05, 2.0, 0.9], [1.6, 1.1, 0.7]].forEach(([x, h, d], i) => {
      B(g, 0.85, h, d, rock[i % 3], RX + x, h / 2, RZ - 0.15 + (i % 2) * 0.08); B(g, 0.86, 0.14, d * 0.7, i % 2 ? moss : moss2, RX + x, h + 0.04, RZ - 0.1);
    });
    for (const [x, y] of [[-0.9, 1.6], [0.6, 2.3], [-0.2, 2.75], [1.3, 1.55]]) padauk(g, RX + x, y, RZ - 0.15, 0.85);
    // the pool: a ring of stones round a disc of water
    const PZ = 0.45, PR = 1.05, water = new THREE.Mesh(new THREE.CircleGeometry(PR - 0.12, 20), new THREE.MeshBasicMaterial({ color: lin('#3f9fd6') }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.42, PZ); water.userData.keep = true; g.add(water);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; if (Math.sin(a) < -0.55) continue; const m = B(g, 0.42, 0.46 + (i % 2) * 0.08, 0.32, rock[i % 3], Math.cos(a) * PR, 0.24, PZ + Math.sin(a) * PR * 0.85); m.rotation.y = -a; }
    B(g, 2.2, 0.3, 1.6, rock[2], 0, 0.15, PZ); // the pool's floor
    // falling water: a strip with streaks that scroll down, a pale foam band where it lands
    const fc = document.createElement('canvas'); fc.width = 16; fc.height = 64; const fx = fc.getContext('2d');
    for (let y = 0; y < 64; y++) for (let x = 0; x < 16; x++) { const v = (x * 7 + y * 3 + ((x * 13) % 5) * 9) % 23; fx.fillStyle = v < 3 ? '#ffffff' : v < 9 ? '#bfe6fb' : v < 16 ? '#7cc8f0' : '#4fa8de'; fx.fillRect(x, y, 1, 1); }
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.magFilter = THREE.NearestFilter; ft.repeat.set(1, 2.5);
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 2.3), new THREE.MeshBasicMaterial({ map: ft, transparent: true, opacity: 0.92 }));
    fall.position.set(-0.05, 1.55, RZ + 0.42); fall.userData.keep = true; g.add(fall);
    B(g, 0.8, 0.12, 0.5, glow('#e8f6ff'), -0.05, 0.47, RZ + 0.62, true);
    // the board, on a post to the right of the pool
    const board = makeBoard(1.5, 0.75); board.position.set(1.95, 1.75, 0.56); board.rotation.y = -0.35; g.add(board);
    const bk = B(g, 1.66, 0.9, 0.1, M.dark, 1.97, 1.75, 0.49, true); bk.rotation.y = -0.35;
    B(g, 0.16, 1.9, 0.16, M.log, 1.95, 0.95, 0.4);
    silverBowl(g, -0.75, 0.48, PZ + 0.75, 0.8); silverBowl(g, 0.7, 0.48, PZ + 0.8, 0.8);
    // spray rising from where the water lands, and rings on the pool
    const U = { uTime: { value: 0 }, uScale: { value: 400 }, uFlight: { value: 0.45 }, uOpacity: { value: 0.7 } };
    const RU = { uTime: U.uTime, uScale: U.uScale, uOpacity: { value: 0.55 } };
    waterSpray(g, V(-0.05, 0.45, RZ + 0.6), V(0, 1.6, 0.6), 70, U);
    landingRings(g, V(0, 0.44, PZ), 6, RU);
    ret.wet = [[0, 1.55]]; // just in front of the pool: stand here and the spray reaches you
    ret.rect = [-1.75, 2.2, -1.25, 1.4]; ret.labelY = 4.6;
    ret.update = (time, night, scale) => { U.uTime.value = time; if (scale) U.uScale.value = scale; ft.offset.y = (time * 1.4) % 1; };
  }
  return ret;
}

/* ── the village ── ctx: { stalls, blocked, groundAt, groundType, renderer, camera } */
export function mmVillage(scene, kind, ctx) {
  const g = new THREE.Group(), live = new THREE.Group(); scene.add(g); scene.add(live);
  const updates = [], r = rand(211), F = HALL.floor;
  const fl = flicker(['#ffb347', '#ffd27a', '#ff8a2a']), lan = flicker(LANTERN_COLORS);
  const cols = THINGYAN_COLORS.map((c) => wool(c));
  updates.push((t, n) => { fl.update(t, n); lan.update(t, n); });
  const free = (x, z) => !ctx.blocked(x, z, 0.25);

  // the stalls
  for (const s of ctx.stalls) {
    if (s.about) continue;
    const sg = new THREE.Group(); sg.position.set(s.pos[0], 0.1, s.pos[1]); sg.rotation.y = TURN[s.face || 'south']; sg.scale.setScalar(s.scale || 1); g.add(sg);
    const hw = s.id === 'outfits' ? 2.85 : 2.4, y = s.id === 'cinema' ? 2.95 : 2.62, z = 2.02;
    if (kind === 'thadingyut') {
      lanternString(sg, V(-hw, y, z), V(hw, y, z), 6, 0.15, lan, 0.8);
      for (let k = 0; k < 11; k++) oilLamp(sg, -2.6 + k * 0.52, 0.2, 2.18, fl.next());
    } else {
      bunting(sg, V(-hw, y, z), V(hw, y, z), 9, 0.25, cols, 'flag');
      for (const sx of [-2.55, 2.55]) padauk(sg, sx, 2.78, 1.75, 0.8);
      silverBowl(sg, -2.0, 0.2, 2.25, 0.9);
    }
  }

  // the town hall's front (merged on its own, so it can hide while you are inside)
  const hall = new THREE.Group(); hall.userData.keep = true; g.add(hall);
  { const dx = HALL.doorX, zf = HALL.z1 + 0.42, half = HALL.doorW / 2 + 0.05;
    if (kind === 'thadingyut') {
      lanternString(hall, V(dx - half - 1.6, 4.5, zf), V(dx + half + 1.6, 4.5, zf), 7, 0.35, lan);
      for (let k = 0; k < 24; k++) { const x = HALL.x0 + 1.2 + k * ((HALL.x1 - HALL.x0 - 2.4) / 23); if (Math.abs(x - dx) > half + 0.3) oilLamp(hall, x, 0.1, HALL.z1 + 0.75, fl.next()); }
    } else {
      bunting(hall, V(dx - half - 1.6, 4.45, zf), V(dx + half + 1.6, 4.45, zf), 12, 0.45, cols, 'flag');
      for (let i = 0; i < 11; i++) padauk(hall, dx - half + i * (2 * half / 10), 4.15, zf - 0.05, 0.55);
    }
    bake(hall); updates.push((t, n, indoors) => { hall.visible = indoors < 0.4; });
  }
  // inside the town hall
  { const wx = HALL.x0 + 1, x1 = HALL.x1 - 1, cz = (HALL.z0 + HALL.z1) / 2, nz = HALL.z0 + 1;
    if (kind === 'thadingyut') {
      for (const zz of [cz - 4, cz + 0.2, cz + 4]) lanternString(g, V(wx + 0.6, F + 4.8, zz), V(x1, F + 4.8, zz), 9, 0.45, lan);
      for (let k = 0; k < 14; k++) { oilLamp(g, HALL.doorX - 1.25, F + 0.07, cz - 5.6 + k * 0.82, fl.next()); oilLamp(g, HALL.doorX + 1.25, F + 0.07, cz - 5.6 + k * 0.82, fl.next()); }
    } else {
      for (const zz of [cz - 4, cz + 4]) bunting(g, V(wx + 0.6, F + 4.7, zz), V(x1, F + 4.7, zz), 20, 0.4, cols, 'flag');
      for (const [x, z] of [[wx + 0.75, nz + 2.8], [x1 - 0.75, nz + 2.8]]) { B(g, 0.5, 0.5, 0.5, flat('#a4522e'), x, F + 0.25, z); padauk(g, x, F + 0.7, z, 1.2); collide(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 1); }
      silverBowl(g, HALL.doorX - 0.4, F + 0.82, cz, 0.9); silverBowl(g, HALL.doorX + 0.4, F + 0.82, cz, 0.9);
    }
  }

  if (kind === 'thadingyut') {
    // long strings of lanterns across the square, on bamboo poles
    for (const [x0, x1, z, h] of [[-13, 13.4, -1.2, 4.9], [-12.6, 13.4, 7.6, 4.9], [-4.5, 4.5, 14.2, 4.2]]) {
      let a = x0, b = x1; while (!free(a, z) && a < 0) a += 0.5; while (!free(b, z) && b > 0) b -= 0.5;
      bambooPole(g, a, z, h + 0.3); bambooPole(g, b, z, h + 0.3);
      lanternString(g, V(a, h, z), V(b, h, z), Math.round((b - a) / 1.15), 0.9, lan);
    }
    // oil lamps along the rim of the movement guide and round the pond
    for (let k = 0; k < 40; k++) { const t = k / 40, per = 2 * (6.1 + 3.9), d = t * per; let x, z;
      if (d < 6.1) { x = -3.05 + d; z = -1.95; } else if (d < 10) { x = 3.05; z = -1.95 + (d - 6.1); } else if (d < 16.1) { x = 3.05 - (d - 10); z = 1.95; } else { x = -3.05; z = 1.95 - (d - 16.1); }
      oilLamp(g, x, 0.35, z, fl.next()); }
    for (let k = 0; k < 34; k++) { const a = (k / 34) * Math.PI * 2, x = POND.x + Math.cos(a) * (POND.rx + 1.9), z = POND.z + Math.sin(a) * (POND.rz + 1.9); if (free(x, z) && ctx.groundAt(x, z, 1) < 0.4) oilLamp(g, x, ctx.groundAt(x, z, 1), z, fl.next()); }
    // lotus lamps floating on the pond
    for (let i = 0; i < 9; i++) {
      const c = lotusLamp(live, fl.next()), a = (i / 9) * 6.28 + 0.4, x0 = POND.x - 0.5 + Math.cos(a) * POND.rx * 0.5, z0 = POND.z + Math.sin(a) * POND.rz * 0.45;
      updates.push((t) => { c.position.set(x0 + Math.sin(t * 0.18 + i) * 0.3, -0.15 + Math.sin(t * 1.3 + i) * 0.012, z0 + Math.cos(t * 0.15 + i * 2) * 0.2); c.rotation.y = t * 0.08 + i; });
      if (i % 3 === 0) addLamp(live, x0, 0.5, z0, 0, 0.7, 4, '#ffb347');
    }
    for (const [x, z] of [[-6, -1.2], [6, -1.2], [-6, 7.6], [6, 7.6]]) addLamp(g, x, 4.0, z, 0, 1.0, 9, '#ffb347');
    // sky lanterns
    const SU = { uTime: { value: 0 }, uScale: { value: 400 }, uOpacity: { value: 0 } };
    const sky = skyLanterns(scene, ctx.phone ? 50 : 90, SU);
    updates.push((t, n, indoors) => { SU.uTime.value = t; SU.uOpacity.value = (0.35 + 0.65 * n) * (1 - indoors); sky.visible = indoors < 0.95; });
    updates.scale = SU.uScale;
  } else {
    // drinking-water pot stands, water barrels, padauk in pots, and flowers floating on the pond
    potStand(g, HALL.doorX - 6.4, HALL.z1 + 2.4); potStand(g, POND.x - POND.rx - 2.8, POND.z - POND.rz - 1.0, 0.4);
    for (const [x, z] of [[-11.5, -1.5], [12.6, 5.6], [-3.5, 9.6], [8.4, -4.8]]) { let px = x, pz = z; for (let k = 0; k < 8 && !free(px, pz); k++) { px += 0.6; } if (free(px, pz)) waterBarrel(g, px, pz); }
    for (const [x, z] of [[-8.5, -5.6], [5.5, -5.6], [-9.5, 9.2], [14.5, 1.0]]) { if (!free(x, z)) continue; B(g, 0.7, 0.5, 0.7, flat('#a4522e'), x, 0.35, z); padauk(g, x, 0.95, z, 1.6); collide(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 1.2); }
    const flower = [flat('#ffd23f'), flat('#f5c518'), flat('#ffe27a')];
    for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = Math.sqrt(r()), x = POND.x - 0.4 + Math.cos(a) * d * POND.rx * 0.8, z = POND.z + Math.sin(a) * d * POND.rz * 0.75; B(g, 0.1, 0.02, 0.1, flower[i % 3], x, -0.175, z, true).rotation.y = r() * 3; }
    for (let i = 0; i < 160; i++) { const a = r() * 6.28, d = 2.5 + Math.sqrt(r()) * 11, x = Math.cos(a) * d * 1.3, z = 3 + Math.sin(a) * d * 0.8; if (!free(x, z)) continue; B(g, 0.1, 0.02, 0.1, flower[i % 3], x, ctx.groundAt(x, z, 1) + 0.012, z, true).rotation.y = r() * 3; }
  }
  bake(g);
  const scaleOf = () => ctx.renderer.domElement.height / (2 * Math.tan((ctx.camera.fov * Math.PI) / 360));
  return { update: (time, night, indoors, dt) => { if (updates.scale) updates.scale.value = scaleOf(); updates.forEach((f) => f(time, night, indoors, dt)); }, scale: scaleOf };
}

/* ── the Hideout (local coordinates of the room) ── */
export function mmHideout(root, kind) {
  const g = new THREE.Group(); g.position.set(HIDEOUT.cx, 0, HIDEOUT.cz); root.add(g);
  const F = FLOOR, fx = HIDEOUT.x1, fz = 1.6, back = HIDEOUT.z0 + 0.12, Y = F + 0.16, tx = 1.4, tz = 1.7, top = 0.5 + Y;
  const fl = flicker(['#ffb347', '#ffd27a', '#ff8a2a']), lan = flicker(LANTERN_COLORS);
  if (kind === 'thadingyut') {
    lanternString(g, V(-11.8, 5.6, back), V(-6.2, 5.6, back), 5, 0.4, lan); lanternString(g, V(2.2, 5.6, back), V(11.8, 5.6, back), 8, 0.4, lan);
    lanternString(g, V(-2.0, 4.6, 0.2), V(4.8, 4.6, 0.2), 5, 0.3, lan);
    for (let k = 0; k < 6; k++) oilLamp(g, fx - 0.75, 2.42, fz - 1.3 + k * 0.52, fl.next());
    for (let k = 0; k < 14; k++) oilLamp(g, -1.9 + k * 0.5, Y, -0.6, fl.next());
    const c = lotusLamp(g, fl.next()); c.position.set(tx, top, tz);
    addLamp(g, 1.4, 3.6, 0.2, 0.2, 0.9, 7, '#ffb347');
  } else {
    const cols = THINGYAN_COLORS.map((c) => wool(c));
    bunting(g, V(-11.8, 5.5, back), V(-6.2, 5.5, back), 8, 0.35, cols, 'flag'); bunting(g, V(2.2, 5.5, back), V(11.8, 5.5, back), 12, 0.35, cols, 'flag');
    bunting(g, V(-0.2, 1.1 + Y, 3.85), V(3.0, 1.1 + Y, 3.85), 8, 0.15, cols, 'flag');
    for (const z of [fz - 1.1, fz + 0.9]) padauk(g, fx - 0.75, 2.7, z, 0.9);
    B(g, 0.22, 0.24, 0.22, flat('#a4522e'), tx - 0.3, top + 0.12, tz, true); padauk(g, tx - 0.3, top + 0.38, tz, 0.7); silverBowl(g, tx + 0.35, top, tz, 0.9);
    B(g, 0.5, 0.5, 0.5, flat('#a4522e'), -11.1, F + 0.25, -5.3); padauk(g, -11.1, F + 0.7, -5.3, 1.2);
    // round the lounge: bunting on two poles along its front, padauk in pots, a big bowl of water
    for (const x of [-2.1, 4.9]) B(g, 0.1, 1.7, 0.1, M.log, x, Y + 0.85, -0.68);
    bunting(g, V(-2.1, Y + 1.65, -0.68), V(4.9, Y + 1.65, -0.68), 12, 0.25, cols, 'flag');
    for (const [x, z] of [[-1.5, 3.6], [4.3, 3.6]]) { B(g, 0.46, 0.44, 0.46, flat('#a4522e'), x, Y + 0.22, z); padauk(g, x, Y + 0.62, z, 1.1); }
    B(g, 0.5, 0.4, 0.5, M.planks, -1.4, Y + 0.2, 1.0); silverBowl(g, -1.4, Y + 0.4, 1.0, 1.4);
  }
  bake(g);
  return { update: (time) => { fl.update(time, 1); lan.update(time, 1); } };
}
