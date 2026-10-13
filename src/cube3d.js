// The gallery's project cube: a lacquered frame with gold corners, where each side is a window
// set into the cube with one of my side projects inside it. The rest of the faces are sealed.
// Arrows, thumbnails or a drag turn it from window to window (it always settles square on one);
// clicking the window in front opens that project's details.
import * as THREE from 'three';
import { createStage, spring, sp, canvasTex, dragger } from './stage3d.js';
import { drawPainting } from './pixelart.js';

const HALF = 1, BAR = 0.15, DEPTH = 0.46, OPEN = 2 * HALF - 2 * BAR + 0.02;
const OFFSET = 0.4, REST_PITCH = 0.3; // the resting angle: square on, turned a little so the cube reads as a cube
const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const QUARTER = Math.PI / 2;

// the four side faces in turn (face i turns to the front at yaw = -i·90°), then top and bottom
const FACES = [
  { n: [0, 0, 1] }, { n: [1, 0, 0] }, { n: [0, 0, -1] }, { n: [-1, 0, 0] }, { n: [0, 1, 0] }, { n: [0, -1, 0] },
];

// small gold emblems for the corners and the sealed faces
const EMBLEMS = ['moon', 'sun', 'spiral', 'wave', 'cross', 'star'];
function drawEmblem(g, kind, cx, cy, r, color) {
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(2, r * 0.14); g.lineCap = 'round'; g.beginPath();
  if (kind === 'moon') { g.arc(cx, cy, r, Math.PI * 0.3, Math.PI * 1.7); g.arc(cx + r * 0.42, cy, r * 0.78, Math.PI * 1.62, Math.PI * 0.38, true); g.closePath(); g.stroke(); }
  else if (kind === 'sun') { g.arc(cx, cy, r * 0.45, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.moveTo(cx + Math.cos(a) * r * 0.65, cy + Math.sin(a) * r * 0.65); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.stroke(); }
  else if (kind === 'spiral') { for (let t = 0; t < 14; t += 0.1) { const rr = (t / 14) * r, a = t; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (t === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  else if (kind === 'wave') { for (let k = -1; k <= 1; k++) { g.moveTo(cx - r, cy + k * r * 0.5); for (let x = -r; x <= r; x += 2) g.lineTo(cx + x, cy + k * r * 0.5 + Math.sin((x / r) * Math.PI * 1.5) * r * 0.18); } g.stroke(); }
  else if (kind === 'cross') { g.arc(cx, cy, r, 0, Math.PI * 2); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke(); }
  else { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); g.stroke(); }
}

// a project painting turned into a square window scene: the sky carries on above, the ground below
function windowArt(art) {
  const p = canvas(32, 24, (g) => drawPainting(g, art));
  return canvas(512, 512, (g) => {
    const top = p.getContext('2d').getImageData(0, 0, 32, 1).data, bot = p.getContext('2d').getImageData(0, 23, 32, 1).data;
    g.imageSmoothingEnabled = false;
    for (let x = 0; x < 32; x++) { g.fillStyle = `rgb(${top[x * 4]},${top[x * 4 + 1]},${top[x * 4 + 2]})`; g.fillRect(x * 16, 0, 16, 64); g.fillStyle = `rgb(${bot[x * 4]},${bot[x * 4 + 1]},${bot[x * 4 + 2]})`; g.fillRect(x * 16, 448, 16, 64); }
    g.drawImage(p, 0, 64, 512, 384);
    // a soft darkening toward the edges, so the picture sits deep inside the window
    const v = g.createRadialGradient(256, 256, 150, 256, 256, 380); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(6,8,16,.55)'); g.fillStyle = v; g.fillRect(0, 0, 512, 512);
  });
}

export function createProjectCube(host, projects, { onFace, onOpen, onSealed }) {
  const stage = createStage(host, { fov: 30, update });
  if (!stage.ok()) return null;
  const { scene, camera } = stage, aniso = Math.min(8, stage.maxAniso());
  scene.add(new THREE.HemisphereLight(0xc8d4ff, 0x2a2030, 0.6));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.1); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.6); rim.position.set(-5, 1, -3); scene.add(rim);

  const cube = new THREE.Group(); scene.add(cube);
  const lacquer = new THREE.MeshStandardMaterial({ color: lin('#161a28'), roughness: 0.28, metalness: 0.35, envMapIntensity: 1.1 });
  const gold = new THREE.MeshStandardMaterial({ color: lin('#c9a24a'), roughness: 0.3, metalness: 0.9, envMapIntensity: 1.3 });
  // the frame: twelve lacquered bars with a thin gold line along each
  const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (const a of axes) for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    const len = 2 * HALF - BAR, size = a.map((v) => (v ? len : BAR)), pos = [0, 0, 0], others = [0, 1, 2].filter((k) => !a[k]);
    pos[others[0]] = s1 * (HALF - BAR / 2); pos[others[1]] = s2 * (HALF - BAR / 2);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(...size), lacquer); bar.position.set(...pos); cube.add(bar);
    // a thin gold fin through the bar shows as a line down the middle of each outer side
    const ai = a.indexOf(1);
    for (const q of others) { const sz = [0, 0, 0]; sz[ai] = len - 0.06; sz[q] = BAR + 0.012; sz[others.find((o) => o !== q)] = BAR * 0.16; const fin = new THREE.Mesh(new THREE.BoxGeometry(...sz), gold); fin.position.set(...pos); cube.add(fin); }
  }
  // the corners: gold-trimmed blocks, each face stamped with an emblem
  const cornerTex = EMBLEMS.map((k) => canvasTex(canvas(128, 128, (g) => { g.fillStyle = '#1b1f2e'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(8, 8, 112, 112); drawEmblem(g, k, 64, 64, 30, '#e2c070'); }), false, aniso));
  const cornerMats = cornerTex.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.4, envMapIntensity: 1 }));
  let ci = 0;
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(BAR + 0.08, BAR + 0.08, BAR + 0.08), [0, 1, 2, 3, 4, 5].map((k) => cornerMats[(ci + k) % cornerMats.length]));
    c.position.set(x * (HALF - BAR / 2), y * (HALF - BAR / 2), z * (HALF - BAR / 2)); cube.add(c); ci++;
  }

  // the faces
  const glowTex = canvasTex(canvas(256, 256, (g) => {
    for (let i = 0; i < 24; i++) { const a = 0.05 * (1 - i / 24); g.strokeStyle = `rgba(255,232,170,${a})`; g.lineWidth = 2; g.strokeRect(i * 2 + 1, i * 2 + 1, 254 - i * 4, 254 - i * 4); }
  }), false);
  const hits = [], glows = [];
  FACES.forEach((f, i) => {
    const n = new THREE.Vector3(...f.n), face = new THREE.Group(); cube.add(face);
    face.lookAt(n); face.position.copy(n).multiplyScalar(HALF); // the face group's +z points out of the cube
    const p = projects[i];
    if (i < 4 && p) {
      // an open window: a short tunnel into the cube, the project at the far end, glass in front
      const art = new THREE.Mesh(new THREE.PlaneGeometry(OPEN, OPEN), new THREE.MeshBasicMaterial({ map: canvasTex(windowArt(p.art), true, aniso) }));
      art.position.z = -DEPTH; face.add(art);
      const wall = new THREE.MeshStandardMaterial({ color: lin('#0d1018'), roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide, envMapIntensity: 0.4 });
      for (let k = 0; k < 4; k++) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(OPEN, DEPTH), wall), a = (k * Math.PI) / 2;
        const holder = new THREE.Group(); holder.rotation.z = a; face.add(holder);
        w.rotation.x = Math.PI / 2; w.position.set(0, OPEN / 2, -DEPTH / 2); holder.add(w);
      }
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(OPEN, OPEN), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, roughness: 0.04, metalness: 0, envMapIntensity: 2.2, depthWrite: false }));
      glass.position.z = -0.012; face.add(glass);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(OPEN, OPEN), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.z = -0.02; face.add(glow); glows[i] = { m: glow, o: sp(0) };
    } else {
      // a sealed face: a lacquered panel with a gold emblem
      const label = i === 3 && projects.length <= 3 ? 'MORE SOON' : '';
      const tex = canvasTex(canvas(256, 256, (g) => {
        const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#1d2233'); gr.addColorStop(1, '#10131d'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = 'rgba(201,162,74,.55)'; g.lineWidth = 3; g.strokeRect(22, 22, 212, 212);
        drawEmblem(g, EMBLEMS[(i + 2) % EMBLEMS.length], 128, label ? 112 : 128, 40, '#c9a24a');
        if (label) { g.fillStyle = '#c9a24a'; g.font = '700 18px "Pixelify Sans","Courier New",monospace'; g.textAlign = 'center'; g.fillText(label, 128, 196); }
      }), false, aniso);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(OPEN, OPEN), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.3, envMapIntensity: 0.9 }));
      panel.position.z = -0.03; face.add(panel);
    }
    // an invisible plane at the face, for clicks
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF, 2 * HALF), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.face = i; face.add(hit); hits.push(hit);
  });
  const isOpen = (i) => i < 4 && !!projects[i];

  // motion
  const S = { yaw: sp(OFFSET + 1.8), pitch: sp(REST_PITCH + 0.25), x: sp(0), y: sp(0), s: sp(0.6) };
  const tgt = { yaw: OFFSET, pitch: REST_PITCH, x: 0, y: 0, s: 1 };
  let K = 0, dragging = false, velYaw = 0, hover = -1, info = false, clock = 0;
  const faceOf = (k) => ((k % 4) + 4) % 4;
  const yawOf = (k) => -k * QUARTER + OFFSET;

  function settle(k) { K = k; tgt.yaw = yawOf(k); tgt.pitch = REST_PITCH; if (onFace) onFace(faceOf(k)); }
  // turn to a project's window; dir picks the way round when both are as near
  function go(i, dir) {
    if (!isOpen(i)) return; const cur = faceOf(K); if (cur === i && !dir) { settle(K); return; }
    let fwd = (i - cur + 4) % 4, back = fwd - 4; // steps forward (next) or back (previous)
    if (fwd === 0) fwd = dir < 0 ? -4 : 4;
    const step = dir > 0 ? fwd : dir < 0 ? (back === 0 ? -4 : back) : (Math.abs(back) < fwd ? back : fwd);
    settle(K + step);
  }
  function setInfo(on) { info = on; tgt.x = on ? (camera.aspect > 1.05 ? -1.05 : 0) : 0; tgt.y = on && camera.aspect <= 1.05 ? 0.75 : 0; tgt.s = on ? (camera.aspect > 1.05 ? 0.92 : 0.7) : 1; }
  function intro() { S.yaw.v = tgt.yaw + 1.9; S.yaw.vel = 0; S.pitch.v = REST_PITCH + 0.35; S.s.v = 0.55; S.s.vel = 0; tgt.s = info ? tgt.s : 1; }

  function update(dt, time) {
    clock = time;
    // keep the cube clear of the caption below it, at any width
    const tan = Math.tan((camera.fov * Math.PI) / 360), dist = Math.max(2.3 / tan, 1.95 / (tan * camera.aspect));
    camera.position.set(0, -0.3, dist); camera.lookAt(0, -0.3, 0);
    if (!dragging) { spring(S.yaw, tgt.yaw, 6, dt); spring(S.pitch, tgt.pitch, 5, dt); }
    spring(S.x, tgt.x, 6.5, dt); spring(S.y, tgt.y, 6.5, dt); spring(S.s, tgt.s, 6, dt);
    const float = Math.sin(time * 0.9) * 0.05, sway = dragging ? 0 : Math.sin(time * 0.5) * 0.02;
    cube.position.set(S.x.v, S.y.v + float, 0); cube.rotation.set(S.pitch.v, S.yaw.v + sway, 0, 'XYZ'); cube.scale.setScalar(S.s.v);
    const front = faceOf(K);
    glows.forEach((gl, i) => { if (!gl) return; spring(gl.o, i === front ? (i === hover ? 1 : 0.65) : i === hover ? 0.7 : 0.18, 8, dt); gl.m.material.opacity = gl.o.v * (0.85 + Math.sin(time * 2 + i) * 0.15); });
  }

  // drag to turn; on release it settles on the nearest window
  dragger(host, {
    onStart() { dragging = true; velYaw = 0; host.classList.add('grab'); },
    onMove(dx, dy) { const k = 0.0105; S.yaw.v += dx * k; velYaw = velYaw * 0.6 + dx * k * 60 * 0.4; S.pitch.v = Math.max(-0.25, Math.min(0.95, S.pitch.v + dy * 0.006)); },
    onEnd(moved, e) {
      dragging = false; host.classList.remove('grab');
      if (moved < 5) { click(e); return; }
      S.yaw.vel = velYaw; const projected = S.yaw.v + velYaw * 0.28;
      let k = Math.round((OFFSET - projected) / QUARTER);
      if (!isOpen(faceOf(k))) { const a = k - 1, b = k + 1, pa = (OFFSET - projected) / QUARTER; k = isOpen(faceOf(a)) && (!isOpen(faceOf(b)) || Math.abs(pa - a) < Math.abs(pa - b)) ? a : b; }
      settle(k);
    },
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickFace(e) {
    const r = host.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.face : -1;
  }
  function click(e) {
    const f = pickFace(e); if (f < 0) { if (info) onOpen(false); return; }
    if (!isOpen(f)) { S.yaw.vel += 1.6; if (onSealed) onSealed(); return; } // a little nudge: this one is sealed
    if (f === faceOf(K)) onOpen(!info); else { go(f); if (info) onOpen(true); }
  }
  host.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || dragging) return; const f = pickFace(e); hover = isOpen(f) ? f : -1; host.classList.toggle('point', hover >= 0); });
  host.addEventListener('pointerleave', () => { hover = -1; });

  return {
    start() { const ok = stage.start(); if (ok) intro(); return ok; }, stop: () => stage.stop(),
    go, setInfo, current: () => faceOf(K),
    next: (d) => { let i = faceOf(K); for (let s = 0; s < 4; s++) { i = (i + d + 4) % 4; if (isOpen(i)) break; } go(i, d); },
  };
}
