// Weather: clear, cloudy, rain and mist, each easing into the next over several seconds.
// On "Auto" the village works through a gentle cycle of its own; the menu can also hold one.
// Rain is drawn entirely on the graphics card (each drop's fall is worked out in its shader
// from the time), so it costs almost nothing per frame; splashes ring out on the ground.
import * as THREE from 'three';

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
const BOX = new THREE.Vector3(46, 22, 38); // the volume of rain kept round the camera
const DAY_RAIN = new THREE.Color('#8fa3c2'), NIGHT_RAIN = new THREE.Color('#dbe6f6');

const rainVert = `
  uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform vec2 uWind; uniform float uLen;
  attribute float aEnd;
  varying float vFade; varying float vEnd;
  void main() {
    float y = fract(position.y - uTime * 0.85);          // 0 at the ground, 1 at the top of the box
    float fall = (1.0 - y) * uBox.y;                     // how far it has fallen
    vec3 lo = uCenter - 0.5 * uBox;
    // fixed in the world, wrapped round the camera, so walking through the rain looks right
    float x = lo.x + mod(position.x * uBox.x - lo.x + uWind.x * fall, uBox.x);
    float z = lo.z + mod(position.z * uBox.z - lo.z + uWind.y * fall, uBox.z);
    vec3 p = vec3(x, y * uBox.y, z) + aEnd * vec3(uWind.x * uLen, -uLen, uWind.y * uLen);
    vFade = smoothstep(0.0, 0.08, y) * (1.0 - smoothstep(0.82, 1.0, y));
    vEnd = aEnd;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }`;
const rainFrag = `
  uniform vec3 uColor; uniform float uOpacity;
  varying float vFade; varying float vEnd;
  void main() { gl_FragColor = vec4(uColor, uOpacity * vFade * mix(0.1, 1.0, vEnd)); }`;
const splashVert = `
  uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uScale;
  attribute float aPhase;
  varying float vT;
  void main() {
    float t = fract(uTime * 1.6 + aPhase);
    float cycle = floor(uTime * 1.6 + aPhase);
    // each splash lands somewhere new every time round
    vec2 r = fract(vec2(sin(cycle * 12.9898 + aPhase * 78.233), sin(cycle * 39.425 + aPhase * 11.13)) * 43758.5453);
    vec3 lo = uCenter - 0.5 * uBox;
    vec3 p = vec3(lo.x + fract(position.x + r.x) * uBox.x, 0.2, lo.z + fract(position.z + r.y) * uBox.z);
    vec4 mv = viewMatrix * vec4(p, 1.0);
    vT = t;
    gl_PointSize = (0.18 + t * 0.5) * uScale / -mv.z; // world size: a ring growing to about half a block
    gl_Position = projectionMatrix * mv;
  }`;
const splashFrag = `
  uniform vec3 uColor; uniform float uOpacity; varying float vT;
  void main() {
    float d = length((gl_PointCoord - 0.5) * vec2(1.0, 2.4)); // squashed: a ring lying on the ground
    float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.22, 0.36, d);
    gl_FragColor = vec4(uColor, uOpacity * ring * (1.0 - vT));
  }`;

export function createWeather(scene, { phone }) {
  let mode = 'auto'; try { const v = localStorage.getItem(KEY); if (v && (v === 'auto' || KINDS[v])) mode = v; } catch (e) { /* ignore */ }
  const lv = { c: 0.12, r: 0, m: 0 }; // where the weather is now
  let step = 0, stepT = 0, pinned = null, pinnedT = 0; // the Auto cycle (and a short visit, for "Show me")
  if (mode !== 'auto') Object.assign(lv, KINDS[mode]);

  // rain: one short line per drop, two points each; the shader moves them
  const N = phone ? 520 : 1100, pos = new Float32Array(N * 6), end = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { const x = Math.random(), y = Math.random(), z = Math.random(); pos.set([x, y, z, x, y, z], i * 6); end[i * 2 + 1] = 1; }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rg.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const U = { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: BOX }, uWind: { value: new THREE.Vector2(0.12, 0.05) }, uLen: { value: 0.75 },
    uColor: { value: new THREE.Color('#dbe6f6') }, uOpacity: { value: 0 } };
  const rain = new THREE.LineSegments(rg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: rainVert, fragmentShader: rainFrag, transparent: true, depthWrite: false }));
  rain.frustumCulled = false; rain.visible = false; rain.renderOrder = 4; scene.add(rain);
  // splashes: little rings on the ground
  const M = phone ? 90 : 180, sp = new Float32Array(M * 3), ph = new Float32Array(M);
  for (let i = 0; i < M; i++) { sp.set([Math.random(), 0, Math.random()], i * 3); ph[i] = Math.random(); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const SU = { uTime: U.uTime, uCenter: U.uCenter, uBox: U.uBox, uScale: { value: 400 }, uColor: { value: new THREE.Color('#dfe8f5') }, uOpacity: { value: 0 } };
  const splash = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: SU, vertexShader: splashVert, fragmentShader: splashFrag, transparent: true, depthWrite: false }));
  splash.frustumCulled = false; splash.visible = false; splash.renderOrder = 4; scene.add(splash);

  const target = () => {
    if (mode !== 'auto') return KINDS[mode];
    if (pinned) return KINDS[pinned];
    return KINDS[CYCLE[step][0]];
  };
  const listeners = [];
  return {
    levels: () => lv,
    mode: () => mode,
    // what it is doing now, in a word
    now() { const t = target(); return Object.keys(KINDS).find((k) => KINDS[k] === t) || 'clear'; },
    setMode(m) { if (m !== 'auto' && !KINDS[m]) return; mode = m; pinned = null; try { localStorage.setItem(KEY, m); } catch (e) { /* ignore */ } listeners.forEach((f) => f()); },
    // bring a kind of weather for a little while, leaving the setting on Auto
    visit(kind) { if (mode !== 'auto') { mode = 'auto'; try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ } listeners.forEach((f) => f()); } pinned = kind; pinnedT = 60; },
    onChange: (f) => listeners.push(f),
    // focus: the point the camera looks at; height: the canvas height in pixels
    update(dt, time, focus, { hidden, indoors, calm, height, fov = 30, night = 0 }) {
      if (mode === 'auto') {
        if (pinned) { pinnedT -= dt; if (pinnedT <= 0) pinned = null; }
        else { stepT += dt; if (stepT > CYCLE[step][1]) { stepT = 0; step = (step + 1) % CYCLE.length; } }
      }
      // ease toward the weather it is turning into (a change takes about twenty seconds)
      const t = target(), k = 1 - Math.exp(-dt / 6), kr = 1 - Math.exp(-dt / (t.r > lv.r ? 9 : 5));
      lv.c += (t.c - lv.c) * k; lv.m += (t.m - lv.m) * k; lv.r += (t.r - lv.r) * kr;
      // the rain itself
      const a = hidden ? 0 : lv.r * (1 - indoors * 0.85);
      rain.visible = splash.visible = a > 0.01;
      if (rain.visible) {
        U.uTime.value = time * (calm ? 0.6 : 1); U.uCenter.value.set(focus.x, BOX.y / 2, focus.z + 5);
        U.uColor.value.copy(DAY_RAIN).lerp(NIGHT_RAIN, night); // a little darker by day, so it shows on pale paving
        U.uOpacity.value = a * 0.7; SU.uOpacity.value = a * (1 - indoors) * 0.55; SU.uScale.value = height / (2 * Math.tan((fov * Math.PI) / 360));
        rg.setDrawRange(0, Math.round(N * Math.min(1, 0.25 + a * 0.75)) * 2);
      }
      return lv;
    },
  };
}
