// Weather: clear, cloudy, rain and mist, each easing into the next over several seconds.
// On "Auto" the village works through a gentle cycle of its own; the menu can also hold one.
// What falls depends on the festival: rain, or snow at Christmas, rose petals at Valentine's
// and blossom at Easter. Everything that falls is moved on the graphics card (each drop's place
// is worked out in its shader from the time), fixed in the world and wrapped round the camera,
// so it costs almost nothing per frame and stays put as you walk through it.
// Rain leaves puddles on the paving: they spread while it rains, ripple with the drops, splash
// when you step in them, and dry up slowly afterwards.
import * as THREE from 'three';
import { FESTIVAL, FESTIVALS } from './festival.js';
import { cv, rng } from './textures.js';

// how cloudy (c), how rainy (r) and how misty (m) each kind of weather is
const KINDS = {
  clear: { c: 0.12, r: 0, m: 0 },
  cloudy: { c: 1, r: 0, m: 0.12 },
  rain: { c: 1, r: 1, m: 0.35 },
  mist: { c: 0.4, r: 0, m: 1 },
};
// the Auto cycle: [kind, seconds]
const CYCLE = [['clear', 100], ['cloudy', 45], ['rain', 75], ['cloudy', 35], ['clear', 130], ['mist', 55], ['clear', 90], ['rain', 60], ['cloudy', 40]];
const KEY = 'pv-weather';
const BOX = new THREE.Vector3(46, 22, 38); // the volume kept round the camera
const DAY_RAIN = new THREE.Color('#8fa3c2'), NIGHT_RAIN = new THREE.Color('#dbe6f6');
const PUD_DAY = new THREE.Color('#3a4352').convertSRGBToLinear(), PUD_NIGHT = new THREE.Color('#0c1018').convertSRGBToLinear(); // (colours here are linear)
// what falls: rain, or the festival's own
export const PRECIP = FESTIVAL ? FESTIVALS[FESTIVAL].precip : 'rain';

// world-fixed wrap round the camera: a point's place in the box, kept still as the box moves
const WRAP = `
  vec3 wrapBox(vec3 p, vec3 center, vec3 box) {
    vec3 lo = center - 0.5 * box;
    return vec3(lo.x + mod(p.x - lo.x, box.x), p.y, lo.z + mod(p.z - lo.z, box.z));
  }`;
const rainVert = `
  uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform vec2 uWind; uniform float uLen;
  attribute float aEnd;
  varying float vFade; varying float vEnd;
  ${WRAP}
  void main() {
    float y = fract(position.y - uTime * 0.85);          // 0 at the ground, 1 at the top of the box
    float fall = (1.0 - y) * uBox.y;                     // how far it has fallen
    vec3 p = wrapBox(vec3(position.x * uBox.x + uWind.x * fall, y * uBox.y, position.z * uBox.z + uWind.y * fall), uCenter, uBox);
    p += aEnd * vec3(uWind.x * uLen, -uLen, uWind.y * uLen);
    vFade = smoothstep(0.0, 0.08, y) * (1.0 - smoothstep(0.82, 1.0, y));
    vEnd = aEnd;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }`;
const rainFrag = `
  uniform vec3 uColor; uniform float uOpacity;
  varying float vFade; varying float vEnd;
  void main() { gl_FragColor = vec4(uColor, uOpacity * vFade * mix(0.1, 1.0, vEnd)); }`;
// snow, petals and blossom: soft flakes that drift down, swaying (petals also tumble)
const flakeVert = `
  uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uScale; uniform float uSpeed; uniform float uSize; uniform float uTumble;
  attribute vec3 color; attribute float aSeed;
  varying vec3 vColor; varying float vFade; varying float vTurn;
  ${WRAP}
  void main() {
    float y = fract(position.y - uTime * uSpeed * (0.8 + 0.4 * aSeed));
    float s = uTime * (0.6 + aSeed) + aSeed * 40.0;
    vec3 p = wrapBox(vec3(position.x * uBox.x + sin(s) * 0.7 + (1.0 - y) * uBox.y * 0.12, y * uBox.y, position.z * uBox.z + cos(s * 0.8) * 0.5), uCenter, uBox);
    vec4 mv = viewMatrix * vec4(p, 1.0);
    vColor = color; vFade = smoothstep(0.0, 0.05, y) * (1.0 - smoothstep(0.85, 1.0, y));
    vTurn = mix(1.0, abs(sin(s * 2.3)), uTumble);         // petals turn edge-on now and then
    gl_PointSize = uSize * (0.7 + 0.6 * aSeed) * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const flakeFrag = `
  uniform float uOpacity; uniform float uRound;
  varying vec3 vColor; varying float vFade; varying float vTurn;
  void main() {
    vec2 q = gl_PointCoord - 0.5; q.x /= max(0.25, vTurn);
    float d = length(q);
    float a = uRound > 0.5 ? smoothstep(0.5, 0.2, d) : step(d, 0.5) * step(abs(q.y), 0.32);
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, uOpacity * vFade * a);
  }`;
const ringVert = `
  uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uScale; uniform float uRate;
  attribute float aPhase; attribute float aSize;
  varying float vT;
  void main() {
    float t = fract(uTime * uRate + aPhase);
    vec4 mv = viewMatrix * vec4(position, 1.0);
    vT = t;
    gl_PointSize = (0.12 + t * aSize) * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const splashVert = `
  uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uScale;
  attribute float aPhase;
  varying float vT;
  ${WRAP}
  void main() {
    float t = fract(uTime * 1.6 + aPhase);
    float cycle = floor(uTime * 1.6 + aPhase);
    // each splash lands somewhere new every time round; the spot is fixed in the world
    vec2 r = fract(vec2(sin(cycle * 12.9898 + aPhase * 78.233), sin(cycle * 39.425 + aPhase * 11.13)) * 43758.5453);
    vec3 p = wrapBox(vec3(fract(position.x + r.x) * uBox.x, 0.2, fract(position.z + r.y) * uBox.z), uCenter, uBox);
    vec4 mv = viewMatrix * vec4(p, 1.0);
    vT = t;
    gl_PointSize = (0.18 + t * 0.5) * uScale / -mv.z; // world size: a ring growing to about half a block
    gl_Position = projectionMatrix * mv;
  }`;
const ringFrag = `
  uniform vec3 uColor; uniform float uOpacity; varying float vT;
  void main() {
    float d = length((gl_PointCoord - 0.5) * vec2(1.0, 2.4)); // squashed: a ring lying on the ground
    float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.22, 0.36, d);
    gl_FragColor = vec4(uColor, uOpacity * ring * (1.0 - vT));
  }`;

const FLAKES = {
  snow: { speed: 0.075, size: 0.16, tumble: 0, round: 1, n: [650, 1300], colors: ['#ffffff', '#f1f6ff', '#e8f0ff'] },
  petals: { speed: 0.05, size: 0.2, tumble: 1, round: 0, n: [240, 460], colors: ['#e8344e', '#ff6f8a', '#ff9db3', '#c81d3a', '#ffd1dc'] },
  blossom: { speed: 0.05, size: 0.19, tumble: 1, round: 0, n: [240, 460], colors: ['#ffe4ef', '#ffc2d6', '#fff6fa', '#f9d8ff', '#fff0b8'] },
};

// opts: { phone, blocked(x, z, y), groundAt(x, z, y), paving(x, z) -> true on stone or dirt }
export function createWeather(scene, { phone, blocked, groundAt, paving }) {
  let mode = 'auto'; try { const v = localStorage.getItem(KEY); if (v && (v === 'auto' || KINDS[v])) mode = v; } catch (e) { /* ignore */ }
  const lv = { c: 0.12, r: 0, m: 0 }; // where the weather is now
  let step = 0, stepT = 0, pinned = null, pinnedT = 0; // the Auto cycle (and a short visit, for "Show me")
  if (mode !== 'auto') Object.assign(lv, KINDS[mode]);
  const scale = { value: 400 }, time = { value: 0 }, center = { value: new THREE.Vector3() }, box = { value: BOX };
  const isRain = PRECIP === 'rain';

  // rain: one short line per drop, two points each
  let rain = null, rg = null, N = 0;
  const U = { uTime: time, uCenter: center, uBox: box, uWind: { value: new THREE.Vector2(0.12, 0.05) }, uLen: { value: 0.75 }, uColor: { value: new THREE.Color('#dbe6f6') }, uOpacity: { value: 0 } };
  if (isRain) {
    N = phone ? 520 : 1100; const pos = new Float32Array(N * 6), end = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const x = Math.random(), y = Math.random(), z = Math.random(); pos.set([x, y, z, x, y, z], i * 6); end[i * 2 + 1] = 1; }
    rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rg.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    rain = new THREE.LineSegments(rg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: rainVert, fragmentShader: rainFrag, transparent: true, depthWrite: false }));
    rain.frustumCulled = false; rain.visible = false; rain.renderOrder = 4; scene.add(rain);
  }
  // snow / petals / blossom
  let flakes = null, FU = null, fg = null, FN = 0;
  if (!isRain) {
    const F = FLAKES[PRECIP]; FN = F.n[phone ? 0 : 1];
    const pos = new Float32Array(FN * 3), col = new Float32Array(FN * 3), seed = new Float32Array(FN), c = new THREE.Color();
    for (let i = 0; i < FN; i++) { pos.set([Math.random(), Math.random(), Math.random()], i * 3); c.set(F.colors[(Math.random() * F.colors.length) | 0]); col.set([c.r, c.g, c.b], i * 3); seed[i] = Math.random(); }
    fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fg.setAttribute('color', new THREE.BufferAttribute(col, 3)); fg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    FU = { uTime: time, uCenter: center, uBox: box, uScale: scale, uSpeed: { value: F.speed }, uSize: { value: F.size }, uTumble: { value: F.tumble }, uRound: { value: F.round }, uOpacity: { value: 0 } };
    flakes = new THREE.Points(fg, new THREE.ShaderMaterial({ uniforms: FU, vertexShader: flakeVert, fragmentShader: flakeFrag, transparent: true, depthWrite: false }));
    flakes.frustumCulled = false; flakes.visible = false; flakes.renderOrder = 4; scene.add(flakes);
  }
  // splashes: little rings on the ground, as the rain lands
  let splash = null; const SU = { uTime: time, uCenter: center, uBox: box, uScale: scale, uColor: { value: new THREE.Color('#dfe8f5') }, uOpacity: { value: 0 } };
  if (isRain) {
    const M = phone ? 90 : 180, sp = new Float32Array(M * 3), ph = new Float32Array(M);
    for (let i = 0; i < M; i++) { sp.set([Math.random(), 0, Math.random()], i * 3); ph[i] = Math.random(); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    splash = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: SU, vertexShader: splashVert, fragmentShader: ringFrag, transparent: true, depthWrite: false }));
    splash.frustumCulled = false; splash.visible = false; splash.renderOrder = 4; scene.add(splash);
  }

  /* puddles: dark, glossy patches on open paving that spread while it rains */
  const puddles = []; let wet = 0, puddleGroup = null, pmat = null, sheen = null, ripples = null; const RU = { uTime: time, uCenter: center, uBox: box, uScale: scale, uRate: { value: 0.9 }, uColor: { value: new THREE.Color('#e6eef8') }, uOpacity: { value: 0 } };
  if (isRain && blocked) {
    const r = rng(404), shapes = [0, 1, 2].map((k) => {
      const c = cv(64, 64, (g) => {
        // a blobby outline: a few overlapping ellipses, in pixel steps
        const rr = rng(500 + k), blobs = Array.from({ length: 4 }, () => [20 + rr() * 24, 22 + rr() * 20, 9 + rr() * 9, 6 + rr() * 6]);
        for (let y = 0; y < 64; y += 2) for (let x = 0; x < 64; x += 2) {
          const inside = blobs.some(([bx, by, ax, ay]) => ((x - bx) / ax) ** 2 + ((y - by) / ay) ** 2 < 1);
          if (inside) { g.fillStyle = '#fff'; g.fillRect(x, y, 2, 2); }
        }
      });
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
    });
    pmat = shapes.map((map) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color('#4a5a70'), transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.5 }));
    sheen = shapes.map((map) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color('#a9bfdc'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    puddleGroup = new THREE.Group(); scene.add(puddleGroup);
    // spots on open ground round the square, away from walls and stalls
    const spots = [];
    for (let tries = 0; tries < 900 && spots.length < (phone ? 12 : 18); tries++) {
      const x = -13 + r() * 30, z = -7 + r() * 22, w = 1.6 + r() * 1.6, d = 1.1 + r() * 1.0;
      if (!paving(x, z) || (Math.abs(x) < 3.9 && Math.abs(z) < 2.8) || spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3.6)) continue; // (not on the movement guide)
      let ok = true; for (const [ox, oz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, 0]]) if (blocked(x + ox, z + oz, 0.2) || !paving(x + ox, z + oz)) { ok = false; break; }
      if (!ok) continue;
      const y = groundAt(x, z, 1) + 0.012, k = spots.length % 3;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pmat[k]); m.rotation.x = -Math.PI / 2; m.rotation.z = r() * 0.6 - 0.3; m.position.set(x, y, z); m.renderOrder = 1; puddleGroup.add(m);
      const s = new THREE.Mesh(m.geometry, sheen[k]); s.rotation.copy(m.rotation); s.position.set(x, y + 0.004, z); s.scale.set(0.45, 0.3, 1); s.position.x += w * 0.12; // a faint glint of sky s.renderOrder = 1; puddleGroup.add(s);
      spots.push({ x, z, w, d, rot: m.rotation.z });
    }
    puddles.push(...spots);
    // raindrops ringing on each puddle
    const P = phone ? 2 : 3, rp = new Float32Array(spots.length * P * 3), rph = new Float32Array(spots.length * P), rs = new Float32Array(spots.length * P);
    spots.forEach((s, i) => { for (let j = 0; j < P; j++) { const k = i * P + j, a = r() * 6.28, u = Math.sqrt(r()) * 0.32; rp.set([s.x + Math.cos(a) * s.w * u, groundAt(s.x, s.z, 1) + 0.03, s.z + Math.sin(a) * s.d * u], k * 3); rph[k] = r(); rs[k] = 0.25 + r() * 0.2; } });
    const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rgeo.setAttribute('aPhase', new THREE.BufferAttribute(rph, 1)); rgeo.setAttribute('aSize', new THREE.BufferAttribute(rs, 1));
    ripples = new THREE.Points(rgeo, new THREE.ShaderMaterial({ uniforms: RU, vertexShader: ringVert, fragmentShader: ringFrag, transparent: true, depthWrite: false }));
    ripples.frustumCulled = false; ripples.visible = false; ripples.renderOrder = 2; puddleGroup.add(ripples);
  }
  // a splash of drops when you step in a puddle
  const dropGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06), dropMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe0f2'), transparent: true, opacity: 0 });
  const drops = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(dropGeo, dropMat); m.visible = false; scene.add(m); return { m, vx: 0, vy: 0, vz: 0 }; });
  let dropT = -1, lastSplash = -9;

  const target = () => {
    if (mode !== 'auto') return KINDS[mode];
    if (pinned) return KINDS[pinned];
    return KINDS[CYCLE[step][0]];
  };
  const inside = (s, x, z) => { const c = Math.cos(-s.rot), n = Math.sin(-s.rot), dx = x - s.x, dz = z - s.z, lx = dx * c - dz * n, lz = dx * n + dz * c; return (lx / (s.w * 0.42)) ** 2 + (lz / (s.d * 0.42)) ** 2 < 1; };
  const listeners = [];
  return {
    levels: () => lv,
    mode: () => mode,
    precip: () => PRECIP,
    // what it is doing now, in a word
    now() { const t = target(); return Object.keys(KINDS).find((k) => KINDS[k] === t) || 'clear'; },
    setMode(m) { if (m !== 'auto' && !KINDS[m]) return; mode = m; pinned = null; try { localStorage.setItem(KEY, m); } catch (e) { /* ignore */ } listeners.forEach((f) => f()); },
    // bring a kind of weather for a little while, leaving the setting on Auto
    visit(kind) { if (mode !== 'auto') { mode = 'auto'; try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ } listeners.forEach((f) => f()); } pinned = kind; pinnedT = 60; },
    onChange: (f) => listeners.push(f),
    // how wet the ground is (0..1), and whether a point is in a puddle you'd splash in
    wet: () => wet, setWet: (v) => { wet = v; }, // (setWet: for testing)
    inPuddle: (x, z) => wet > 0.35 && puddles.some((s) => inside(s, x, z)),
    splashAt(x, z, y) {
      if (performance.now() - lastSplash < 120) return; lastSplash = performance.now();
      dropT = 0; drops.forEach((d) => { const a = Math.random() * 6.28, s = 0.6 + Math.random() * 0.8; d.vx = Math.cos(a) * s; d.vz = Math.sin(a) * s; d.vy = 1.6 + Math.random() * 1.2; d.m.position.set(x, y + 0.05, z); d.m.visible = true; });
    },
    // focus: the point the camera looks at; height: the canvas height in pixels
    update(dt, t, focus, { hidden, indoors, calm, height, fov = 30, night = 0 }) {
      if (mode === 'auto') {
        if (pinned) { pinnedT -= dt; if (pinnedT <= 0) pinned = null; }
        else { stepT += dt; if (stepT > CYCLE[step][1]) { stepT = 0; step = (step + 1) % CYCLE.length; } }
      }
      // ease toward the weather it is turning into (a change takes about twenty seconds)
      const tg = target(), k = 1 - Math.exp(-dt / 6), kr = 1 - Math.exp(-dt / (tg.r > lv.r ? 9 : 5));
      lv.c += (tg.c - lv.c) * k; lv.m += (tg.m - lv.m) * k; lv.r += (tg.r - lv.r) * kr;
      time.value = t * (calm ? 0.6 : 1); center.value.set(focus.x, BOX.y / 2, focus.z + 5); scale.value = height / (2 * Math.tan((fov * Math.PI) / 360));
      const a = hidden ? 0 : lv.r * (1 - indoors * 0.85);
      if (rain) {
        rain.visible = splash.visible = a > 0.01;
        if (rain.visible) {
          U.uColor.value.copy(DAY_RAIN).lerp(NIGHT_RAIN, night); // a little darker by day, so it shows on pale paving
          U.uOpacity.value = a * 0.7; SU.uOpacity.value = a * (1 - indoors) * 0.55;
          rg.setDrawRange(0, Math.round(N * Math.min(1, 0.25 + a * 0.75)) * 2);
        }
      }
      if (flakes) {
        flakes.visible = a > 0.01;
        if (flakes.visible) { FU.uOpacity.value = Math.min(1, a * 1.2) * (PRECIP === 'snow' ? 0.95 : 0.9); fg.setDrawRange(0, Math.round(FN * Math.min(1, 0.2 + a * 0.8))); }
      }
      // the ground gets wet while it rains and dries slowly after
      if (puddleGroup) {
        wet = Math.max(0, Math.min(1, wet + (lv.r > 0.4 ? dt / 22 : -dt / 70)));
        puddleGroup.visible = !hidden && wet > 0.01;
        if (puddleGroup.visible) {
          const e = wet * wet * (3 - 2 * wet);
          pmat.forEach((m) => { m.opacity = e * 0.72; m.color.copy(PUD_DAY).lerp(PUD_NIGHT, night); });
          sheen.forEach((m) => { m.opacity = e * (0.05 + 0.02 * Math.sin(t * 0.7)) * (1 - night * 0.6); });
          ripples.visible = lv.r > 0.2; RU.uOpacity.value = Math.min(1, lv.r) * e * 0.8;
        }
      }
      if (dropT >= 0) {
        dropT += dt; dropMat.opacity = Math.max(0, 0.9 - dropT * 1.6);
        drops.forEach((d) => { d.vy -= 9 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; });
        if (dropT > 0.6) { dropT = -1; drops.forEach((d) => { d.m.visible = false; }); }
      }
      return lv;
    },
  };
}
