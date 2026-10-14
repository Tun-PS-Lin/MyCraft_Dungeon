// The gallery's project cube: a thin champagne-gold frame with one of my side projects filling
// each window, edge to edge, behind a sheet of glass. The remaining faces are sealed.
// Drag to turn it any way you like (it keeps its momentum and slows down by itself); the arrows
// and thumbnails glide it round to a project; clicking a window opens that project's details.
import * as THREE from 'three';
import { createStage, sp, spring, canvasTex, dragger } from './stage3d.js';
import { drawPainting } from './pixelart.js';
import { BASE } from './base.js';

const HALF = 1, BAR = 0.045, CORNER = 0.075, FACE = 2 * HALF - 2 * BAR + 0.006;
const OFFSET = 0.38, REST_PITCH = 0.26; // a project "in front": square on, turned a little so it reads as a cube
const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
// the four side faces in turn (face i is in front when the cube is turned -i·90°), then top and bottom
const NORMALS = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map((n) => new THREE.Vector3(...n));
const restFor = (i) => new THREE.Quaternion().setFromEuler(new THREE.Euler(REST_PITCH, -i * (Math.PI / 2) + OFFSET, 0, 'XYZ'));

function emblem(g, kind, cx, cy, r, color) {
  g.strokeStyle = color; g.lineWidth = Math.max(2, r * 0.07); g.lineCap = 'round'; g.beginPath();
  if (kind === 'moon') { g.arc(cx, cy, r, Math.PI * 0.3, Math.PI * 1.7); g.arc(cx + r * 0.42, cy, r * 0.78, Math.PI * 1.62, Math.PI * 0.38, true); g.closePath(); }
  else if (kind === 'sun') { g.arc(cx, cy, r * 0.42, 0, Math.PI * 2); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.moveTo(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } }
  else { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.42 : r; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); }
  g.stroke();
}

export function createProjectCube(host, projects, { onFace, onOpen, onSealed }) {
  const stage = createStage(host, { fov: 30, update });
  if (!stage.ok()) return null;
  const { scene, camera } = stage, aniso = Math.min(8, stage.maxAniso());
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x2a2238, 0.7));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.0); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa9c0ff, 0.55); rim.position.set(-5, 1, -3); scene.add(rim);

  // a soft halo behind the cube
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55,
    map: canvasTex(canvas(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(255,226,160,.42)'); gr.addColorStop(0.35, 'rgba(160,150,255,.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }), false) }));
  halo.scale.set(6.4, 6.4, 1); halo.position.z = -1.6; scene.add(halo);

  const cube = new THREE.Group(); scene.add(cube);
  // the frame: twelve slim gold bars and small corner blocks
  const gold = new THREE.MeshStandardMaterial({ color: lin('#d9c18c'), roughness: 0.24, metalness: 0.92, envMapIntensity: 1.35, emissive: lin('#3a2c10'), emissiveIntensity: 0.35 });
  const barGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let a = 0; a < 3; a++) for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    const o = [0, 1, 2].filter((k) => k !== a), size = [BAR, BAR, BAR], pos = [0, 0, 0];
    size[a] = 2 * HALF - 2 * CORNER + 0.01; pos[o[0]] = s1 * (HALF - BAR / 2); pos[o[1]] = s2 * (HALF - BAR / 2);
    const bar = new THREE.Mesh(barGeo, gold); bar.scale.set(...size); bar.position.set(...pos); cube.add(bar);
  }
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) { const c = new THREE.Mesh(barGeo, gold); c.scale.setScalar(CORNER); c.position.set(x * (HALF - CORNER / 2 + 0.012), y * (HALF - CORNER / 2 + 0.012), z * (HALF - CORNER / 2 + 0.012)); cube.add(c); }

  // shared overlays: a faint inner shadow at the window's edge, and the glow for the window in front
  const edgeTex = canvasTex(canvas(256, 256, (g) => { for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(6,8,18,${0.3 * (1 - i / 18)})`; g.lineWidth = 2; g.strokeRect(i * 2 + 1, i * 2 + 1, 254 - i * 4, 254 - i * 4); } }), false);
  const glowTex = canvasTex(canvas(256, 256, (g) => { for (let i = 0; i < 22; i++) { g.strokeStyle = `rgba(255,230,170,${0.07 * (1 - i / 22)})`; g.lineWidth = 2; g.strokeRect(i * 2 + 1, i * 2 + 1, 254 - i * 4, 254 - i * 4); } }), false);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0, envMapIntensity: 2.4, depthWrite: false });
  const loader = new THREE.TextureLoader();
  const faces = [], hits = [];
  NORMALS.forEach((n, i) => {
    const face = new THREE.Group(); face.position.copy(n).multiplyScalar(HALF); face.lookAt(n.clone().multiplyScalar(2)); cube.add(face);
    const p = i < 4 ? projects[i] : null;
    let mat;
    if (p) {
      // the project's picture, in its own colours (unlit, so it looks like the original)
      const fallback = canvasTex(canvas(32, 24, (g) => drawPainting(g, p.art)), true, aniso);
      mat = new THREE.MeshBasicMaterial({ map: fallback, color: 0xffffff });
      if (p.image) loader.load(BASE + 'assets/images/gallery/' + p.image + '.jpg', (t) => { t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso; mat.map = t; mat.needsUpdate = true; });
    } else {
      const label = i === 3 ? 'MORE SOON' : '';
      mat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.15, envMapIntensity: 0.55, map: canvasTex(canvas(512, 512, (g) => {
        const gr = g.createLinearGradient(0, 0, 512, 512); gr.addColorStop(0, '#1e2340'); gr.addColorStop(1, '#0c0e1c'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
        let s = 9 + i; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.5})`; const z = r() < 0.15 ? 2 : 1; g.fillRect(r() * 512, r() * 512, z, z); }
        g.strokeStyle = 'rgba(217,193,140,.45)'; g.lineWidth = 2; g.strokeRect(36, 36, 440, 440);
        emblem(g, ['star', 'moon', 'sun'][i % 3], 256, label ? 230 : 256, 64, '#d9c18c');
        if (label) { g.fillStyle = '#d9c18c'; g.font = '600 26px "Fraunces",Georgia,serif'; g.textAlign = 'center'; g.fillText(label, 256, 350); }
      }), false, aniso) });
    }
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(FACE, FACE), mat); pic.position.z = -0.006; face.add(pic);
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(FACE, FACE), new THREE.MeshBasicMaterial({ map: edgeTex, transparent: true, depthWrite: false })); edge.position.z = -0.004; face.add(edge);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(FACE, FACE), glassMat); glass.position.z = -0.002; face.add(glass);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(FACE, FACE), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.z = -0.001; face.add(glow);
    pic.userData.face = i; hits.push(pic);
    faces.push({ n, mat, open: !!p, glow, g: sp(0), lit: p ? mat : null });
  });
  const isOpen = (i) => i >= 0 && i < 4 && !!projects[i];

  /* motion. The cube's orientation is a quaternion with an angular velocity: dragging spins it
     about any axis, letting go keeps the spin and lets it slow down, and the arrows set a target
     that it springs to (critically damped, so it never overshoots or jolts). */
  const q = restFor(0), w = new THREE.Vector3(), dq = new THREE.Quaternion(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), axis = new THREE.Vector3();
  let target = restFor(0), dragging = false, current = 0, hover = -1, info = false, lastMove = 0;
  const pos = { x: sp(0), y: sp(0), s: sp(1) }, tgt = { x: 0, y: 0, s: 1 }, dragW = new THREE.Vector3();

  function goTo(i) { if (!isOpen(i)) return; target = restFor(i); if (i !== current) { current = i; if (onFace) onFace(i); } }
  function setInfo(on) { info = on; const wide = camera.aspect > 1.05; tgt.x = on && wide ? -1.25 : 0; tgt.y = on && !wide ? 0.95 : 0; tgt.s = on ? (wide ? 0.9 : 0.62) : 1; if (on) goTo(current); }
  function intro() { target = restFor(current); q.copy(target).multiply(tmpQ.setFromEuler(new THREE.Euler(0.4, 1.8, 0))); w.set(0, 0, 0); pos.s.v = 0.55; pos.s.vel = 0; }

  function integrate(dt) {
    const a = w.length(); if (a < 1e-6) return;
    dq.setFromAxisAngle(axis.copy(w).divideScalar(a), a * dt); q.premultiply(dq).normalize();
  }
  function update(dt, time) {
    // fit the cube, at any angle, between the title above and the caption below (and the arrows at the sides)
    const H = host.clientHeight || 1, Wd = host.clientWidth || 1, small = Wd < 700 || H < 500;
    const fh = Math.max(0.45, (H - (H < 500 ? 110 : small ? 170 : 210)) / H), fw = Math.max(0.45, (Wd - (small ? 96 : 150)) / Wd);
    const tan = Math.tan((camera.fov * Math.PI) / 360), R = 1.62, dist = Math.max(R / (tan * fh), R / (tan * camera.aspect * fw));
    const shift = (H < 500 ? 0 : small ? 10 : 6) / H * 2 * tan * dist; // a little up, off the caption
    camera.position.set(0, -shift, dist); camera.lookAt(0, -shift, 0);
    if (!dragging) {
      if (target) {
        // the remaining turn, as an axis times an angle, pulls on the spin like a spring
        tmpQ.copy(q).invert().premultiply(target); if (tmpQ.w < 0) { tmpQ.x *= -1; tmpQ.y *= -1; tmpQ.z *= -1; tmpQ.w *= -1; }
        const ang = 2 * Math.acos(Math.min(1, tmpQ.w)), s = Math.sqrt(Math.max(1e-12, 1 - tmpQ.w * tmpQ.w));
        tmpV.set(tmpQ.x / s, tmpQ.y / s, tmpQ.z / s).multiplyScalar(ang);
        const W = 6.2; w.addScaledVector(tmpV, W * W * dt).multiplyScalar(Math.max(0, 1 - 2 * W * dt));
        if (ang < 0.0015 && w.length() < 0.01) { q.copy(target); w.set(0, 0, 0); }
      } else w.multiplyScalar(Math.exp(-1.7 * dt)); // free spin slows down by itself
      integrate(dt);
    }
    cube.quaternion.copy(q);
    spring(pos.x, tgt.x, 6.5, dt); spring(pos.y, tgt.y, 6.5, dt); spring(pos.s, tgt.s, 6, dt);
    const float = Math.sin(time * 0.9) * 0.04;
    cube.position.set(pos.x.v, pos.y.v + float, 0); cube.scale.setScalar(pos.s.v); halo.position.x = pos.x.v; halo.position.y = pos.y.v;
    // which window faces you most; faces turned away are a little darker
    let best = -1, bd = 0.5;
    faces.forEach((f, i) => {
      const d = tmpV.copy(f.n).applyQuaternion(q).z;
      if (f.lit) f.lit.color.setScalar(0.5 + 0.5 * Math.max(0, d));
      if (f.open && d > bd) { bd = d; best = i; }
      spring(f.g, f.open ? (i === hover ? 1 : i === best ? 0.6 : 0.1) : 0, 8, dt); f.glow.material.opacity = f.g.v * (0.85 + Math.sin(time * 2 + i) * 0.15);
    });
    if (best >= 0 && best !== current && !target) { current = best; if (onFace) onFace(best); }
  }

  // drag: sideways turns it about the vertical, up and down about the horizontal, in screen terms
  dragger(host, {
    onStart() { dragging = true; target = null; w.set(0, 0, 0); dragW.set(0, 0, 0); lastMove = performance.now(); host.classList.add('grab'); },
    onMove(dx, dy) {
      const now = performance.now(), dts = Math.max(0.008, (now - lastMove) / 1000); lastMove = now;
      const k = 0.0095, ay = dx * k, ax = dy * k;
      q.premultiply(tmpQ.setFromAxisAngle(tmpV.set(0, 1, 0), ay)).premultiply(tmpQ.setFromAxisAngle(tmpV.set(1, 0, 0), ax)).normalize();
      dragW.lerp(tmpV.set(ax / dts, ay / dts, 0), 0.45);
    },
    onEnd(moved, e) {
      dragging = false; host.classList.remove('grab');
      if (moved < 5) { click(e); return; }
      // keep the spin you gave it (if you let go while still moving)
      w.copy(performance.now() - lastMove < 90 ? dragW : tmpV.set(0, 0, 0)); if (w.length() > 9) w.setLength(9);
    },
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickFace(e) {
    const r = host.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.face : -1;
  }
  function click(e) {
    const f = pickFace(e);
    if (f < 0) { if (info) onOpen(false); return; }
    if (!isOpen(f)) { w.y += 2.2; target = null; if (onSealed) onSealed(); return; } // a sealed face: a little spin
    if (info && f === current) { onOpen(false); return; }
    goTo(f); onOpen(true);
  }
  host.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || dragging) return; const f = pickFace(e); hover = isOpen(f) ? f : -1; host.classList.toggle('point', hover >= 0); });
  host.addEventListener('pointerleave', () => { hover = -1; host.classList.remove('point'); });

  return {
    start() { const ok = stage.start(); if (ok) intro(); return ok; }, stop: () => stage.stop(),
    go: (i) => goTo(i), setInfo, current: () => current,
    next: (d) => { let i = current; for (let s = 0; s < 4; s++) { i = (i + d + 4) % 4; if (isOpen(i)) break; } goTo(i); },
  };
}
