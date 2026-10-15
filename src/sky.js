// The sky, as far as a camera looking down on the square can see it:
//  - by day, a layer of blocky clouds drifts slowly over the village. You see the clouds
//    themselves only from high up (the opening flight starts above them), but their shadows
//    slide across the paving, the roofs and the people all day.
//  - by night, the moon and a scatter of stars show in the pond, wobbling with the ripples.
import * as THREE from 'three';
import { POND } from './config.js';
import { cv, rng } from './textures.js';
import { inPondWater } from './collision.js';

const CLOUD_Y = 38;      // height of the cloud layer (above the highest game camera)
const CELL = 2.5;        // one cloud block, in world units
const N = 48;            // cloud map cells across (the map repeats every N * CELL units)
const WIND = new THREE.Vector2(0.55, 0.22); // units per second

// a tiling map of blocky clouds: smooth noise, thresholded per cell
function cloudCanvas() {
  const r = rng(31), G = 8, grid = []; for (let i = 0; i < G * G; i++) grid.push(r());
  const at = (x, y) => grid[((y % G + G) % G) * G + ((x % G + G) % G)];
  const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx, b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx; return a + (b - a) * sy; };
  return cv(N, N, (g) => {
    const img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x / N) * G, v = (y / N) * G, n = noise(u, v) * 0.65 + noise(u * 2 + 3.1, v * 2 + 1.7) * 0.35;
      const a = n > 0.6 ? 255 : n > 0.575 ? 110 : 0, k = (y * N + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a;
    }
    g.putImageData(img, 0, 0);
  });
}

export function createSky(scene) {
  const tex = new THREE.CanvasTexture(cloudCanvas());
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const S = 1 / (N * CELL), off = new THREE.Vector2(Math.random(), Math.random());
  const U = { cloudMap: { value: tex }, cloudOff: { value: off }, cloudAmt: { value: 0 }, cloudScale: { value: S }, cloudSun: { value: new THREE.Vector3(0, 1, 0) } };

  // cloud shadows: a small addition to the lit materials, darkening whatever lies under a cloud
  // (seen along the sun's direction, so the shadows line up with the clouds above)
  const patched = new WeakSet();
  function patch(mat) {
    if (!mat || patched.has(mat) || !(mat.isMeshLambertMaterial || mat.isMeshStandardMaterial || mat.isMeshPhongMaterial)) return;
    patched.add(mat);
    mat.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCloudW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 cw = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\ncw = instanceMatrix * cw;\n#endif\nvCloudW = ( modelMatrix * cw ).xyz; }');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCloudW;\nuniform sampler2D cloudMap;\nuniform vec2 cloudOff;\nuniform float cloudAmt;\nuniform float cloudScale;\nuniform vec3 cloudSun;')
        .replace('#include <tonemapping_fragment>', 'if ( cloudAmt > 0.001 ) { vec2 cxz = vCloudW.xz + cloudSun.xz * ( ( ' + CLOUD_Y.toFixed(1) + ' - vCloudW.y ) / max( cloudSun.y, 0.2 ) );\n gl_FragColor.rgb *= 1.0 - cloudAmt * texture2D( cloudMap, cxz * cloudScale + cloudOff ).a; }\n#include <tonemapping_fragment>');
    };
    mat.customProgramCacheKey = () => 'clouds';
    mat.needsUpdate = true;
  }
  function patchAll(root) { root.traverse((o) => { if (!o.material) return; if (Array.isArray(o.material)) o.material.forEach(patch); else patch(o.material); }); }

  // the clouds themselves: chunky white blocks, one per full cell of the map, high above the
  // village. They are only seen from the top of the opening flight, which starts above them.
  const T = N * CELL, cells = [];
  { const d = tex.image.getContext('2d').getImageData(0, 0, N, N).data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 200) cells.push([(x + 0.5) * CELL, (N - y - 0.5) * CELL]); }
  const box = new THREE.BoxGeometry(CELL, 1.3, CELL), shade = [];
  { const n = box.attributes.normal; for (let i = 0; i < n.count; i++) { const v = n.getY(i) > 0.5 ? 1 : n.getY(i) < -0.5 ? 0.78 : 0.9; shade.push(v, v, v); } }
  box.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const sheet = new THREE.InstancedMesh(box, cloudMat, cells.length * 9);
  { const m = new THREE.Matrix4(); let i = 0; for (let tx = -1; tx <= 1; tx++) for (let tz = -1; tz <= 1; tz++) for (const [x, z] of cells) sheet.setMatrixAt(i++, m.makeTranslation(x + tx * T, 0, z + tz * T)); }
  sheet.frustumCulled = false; sheet.visible = false; sheet.renderOrder = 6; scene.add(sheet);
  // drawn twice: first only into the depth buffer, then in colour where it is the nearest surface,
  // so the see-through blocks show one smooth face instead of every edge inside the cloud
  const depthOnly = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, fog: false }), cells.length * 9);
  depthOnly.instanceMatrix = sheet.instanceMatrix; depthOnly.frustumCulled = false; depthOnly.renderOrder = 5; sheet.add(depthOnly); depthOnly.position.set(0, 0, 0);
  const frac = (v) => v - Math.floor(v);
  // start with the clouds placed so the opening flight passes over some, while the middle of the
  // square is in sunshine: of a few random positions, keep the best one
  { const d = tex.image.getContext('2d').getImageData(0, 0, N, N).data;
    const cloudAt = (x, z, o) => { const u = frac(x * S + o.x), v = frac(z * S + o.y), px = Math.floor(u * N), py = N - 1 - Math.floor(v * N); return d[(py * N + px) * 4 + 3] > 200 ? 1 : 0; };
    let best = -1e9; const o = new THREE.Vector2();
    for (let n = 0; n < 40; n++) {
      o.set(Math.random(), Math.random()); let ring = 0, mid = 0;
      for (let a = 0; a < 6.28; a += 0.4) for (const r of [10, 15, 20]) ring += cloudAt(2 + Math.cos(a) * r, -3 + Math.sin(a) * r, o);
      for (let a = 0; a < 6.28; a += 0.8) for (const r of [0, 3, 6]) mid += cloudAt(2 + Math.cos(a) * r, -3 + Math.sin(a) * r, o);
      const score = Math.min(ring, 18) - mid * 3; if (score > best) { best = score; off.copy(o); }
    } }

  /* the moon and stars in the pond */
  const glow = cv(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(255,250,225,1)'); r.addColorStop(0.28, 'rgba(255,246,210,.95)'); r.addColorStop(0.34, 'rgba(220,230,255,.35)'); r.addColorStop(1, 'rgba(200,215,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  const moonMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glow), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), moonMat); moon.rotation.x = -Math.PI / 2;
  const MX = POND.x + 0.6, MZ = POND.z - 0.7; moon.position.set(MX, -0.16, MZ); moon.renderOrder = 3; scene.add(moon);
  // broken streaks of moonlight on the ripples below it
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const streaks = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 - i * 0.08, 0.05), streakMat); m.rotation.x = -Math.PI / 2; m.renderOrder = 3; scene.add(m); streaks.push(m); }
  const starCount = 22, starPos = new Float32Array(starCount * 3), starCol = new Float32Array(starCount * 3), seeds = [];
  { const r = rng(57); let i = 0, tries = 0; while (i < starCount && tries++ < 400) {
    const a = r() * 6.28, d = Math.sqrt(r()) * 0.92, x = POND.x + Math.cos(a) * d * POND.rx, z = POND.z + Math.sin(a) * d * POND.rz;
    if (!inPondWater(x, z) || Math.hypot(x - MX, (z - MZ) * 1.3) < 0.9 || (x < POND.dock.x1 + 0.3 && Math.abs(z - POND.dock.z) < 0.8) || Math.abs(x - POND.bridgeX) < POND.bridgeW / 2 + 0.25) continue;
    starPos.set([x, -0.17, z], i * 3); seeds.push(r() * 6.28, 0.6 + r() * 1.8); i++; } }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3)); sgeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const dot = cv(8, 8, (g) => { g.fillStyle = '#fff'; g.fillRect(3, 1, 2, 6); g.fillRect(1, 3, 6, 2); }); // a tiny pixel twinkle
  const stars = new THREE.Points(sgeo, new THREE.PointsMaterial({ size: 0.38, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
  stars.renderOrder = 3; stars.frustumCulled = false; scene.add(stars);

  const sunDir = new THREE.Vector3();
  // night: 0 by day, 1 at night; indoors: 0 outside, 1 inside the hall; hidden: underground
  function update(dt, time, night, indoors, hidden, sun, camera) {
    off.x += WIND.x * S * dt; off.y += WIND.y * S * dt;
    sunDir.copy(sun.position).sub(sun.target.position).normalize(); U.cloudSun.value.copy(sunDir);
    U.cloudAmt.value = hidden ? 0 : (api.strength === null ? 0.28 : api.strength) * (1 - night) * (1 - indoors * 0.6);
    // the sheet shows only when the camera is up above it, fading out as it comes down through
    const k = hidden ? 0 : Math.max(0, Math.min(1, (camera.position.y - CLOUD_Y - 0.5) / 5)) * (1 - night * 0.7);
    sheet.visible = k > 0.01; cloudMat.opacity = k * 0.62; cloudMat.color.setScalar(1 - night * 0.6);
    // a map point (u, v) shows at world (u - off) / S, so the blocks move with the shadows
    if (sheet.visible) sheet.position.set(-frac(off.x) * T, CLOUD_Y, -frac(off.y) * T);
    // in the pond: the moon and stars come out with the night and shimmer with the water
    const n = hidden ? 0 : night;
    moon.visible = streaks[0].visible = stars.visible = n > 0.01;
    if (n > 0.01) {
      moonMat.opacity = n * 0.85; moon.scale.set(1 + Math.sin(time * 1.3) * 0.05, 1 + Math.sin(time * 1.7 + 1) * 0.04, 1);
      moon.position.x = MX + Math.sin(time * 0.9) * 0.03;
      streakMat.opacity = n * 0.5;
      streaks.forEach((m, i) => { m.visible = true; m.position.set(MX + Math.sin(time * (1.1 + i * 0.3) + i * 2) * 0.12, -0.165, MZ + 0.62 + i * 0.16); m.scale.x = 0.7 + 0.3 * Math.sin(time * 2.1 + i); });
      stars.material.opacity = n;
      for (let i = 0; i < starCount; i++) { const c = 0.35 + 0.65 * Math.max(0, Math.sin(time * seeds[i * 2 + 1] + seeds[i * 2])); starCol[i * 3] = c; starCol[i * 3 + 1] = c; starCol[i * 3 + 2] = c * 0.92 + 0.08; }
      sgeo.attributes.color.needsUpdate = true;
    }
  }
  const api = { patch, patchAll, update, strength: null, uniforms: U }; // strength: set to test the shadows
  return api;
}
