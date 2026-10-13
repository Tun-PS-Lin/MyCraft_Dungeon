// The library's 3D book: a hardcover with its real cover on the front, a printed spine, my
// takeaway on the back and page edges you can see as it turns. Drag to turn it; it keeps a
// little momentum and settles. Picking another book slides this one away and brings the new
// one in spine-first, as if pulled from the shelf, before it turns to show its cover.
import * as THREE from 'three';
import { createStage, spring, sp, canvasTex, dragger } from './stage3d.js';
import { BASE } from './base.js';

const W = 2, H = 3, T = 0.055; // board size and thickness (the cover art is 2:3)
const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
const VIEWS = { front: 0.42, spine: Math.PI / 2, back: Math.PI - 0.42 };
const REST_PITCH = 0.1;

function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }

// words wrapped to a width, returned as lines
function wrap(g, text, max) {
  const words = text.split(/\s+/), out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

function paintSpine(g, w, h, bk) {
  const { bg, fg, band } = bk.spine;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // a soft rounded-spine shading across the width
  const sh = g.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, 'rgba(0,0,0,.28)'); sh.addColorStop(0.18, 'rgba(255,255,255,.08)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.3)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  g.fillStyle = band; g.fillRect(0, h * 0.05, w, h * 0.022); g.fillRect(0, h * 0.928, w, h * 0.022);
  g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 2); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  // the title, as large as fits along the spine
  const title = bk.spineTitle || bk.title; let size = Math.min(w * 0.42, 64);
  g.font = '700 ' + size + 'px "Pixelify Sans","Courier New",monospace'; while (g.measureText(title).width > h * 0.6 && size > 14) { size -= 2; g.font = '700 ' + size + 'px "Pixelify Sans","Courier New",monospace'; }
  g.fillText(title, -h * 0.06, 0);
  // the author's surname near the foot
  g.font = '500 ' + Math.round(Math.min(w * 0.24, 30)) + 'px "Pixelify Sans","Courier New",monospace'; g.globalAlpha = 0.85;
  g.fillText(bk.author.split(' ').slice(-1)[0].toUpperCase(), h * 0.34, 0); g.globalAlpha = 1;
  g.restore();
  // a small mark at the head of the spine
  g.fillStyle = fg; const m = w * 0.16; g.save(); g.translate(w / 2, h * 0.115); g.rotate(Math.PI / 4); g.fillRect(-m / 2, -m / 2, m, m); g.restore();
}

function paintBack(g, w, h, bk) {
  const { bg, fg } = bk.spine;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const sh = g.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, 'rgba(255,255,255,.06)'); sh.addColorStop(0.92, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.22)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '700 22px "Pixelify Sans","Courier New",monospace'; g.globalAlpha = 0.75; g.fillText('MY TAKEAWAY', w / 2, h * 0.3); g.globalAlpha = 1;
  g.fillRect(w / 2 - 28, h * 0.3 + 14, 56, 4);
  g.font = 'italic 600 34px "Fraunces",Georgia,serif';
  const lines = wrap(g, '“' + bk.takeaway + '”', w * 0.74), lh = 46, y0 = h * 0.42;
  lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * lh));
  g.font = '700 16px "Pixelify Sans","Courier New",monospace'; g.globalAlpha = 0.6;
  g.fillText('MYCRAFT DUNGEON  ·  THE LIBRARY', w / 2, h * 0.93); g.globalAlpha = 1;
}

// page edges: fine lines running along the book, a little uneven, darker toward the boards
const edgeCanvas = (w, h, along) => canvas(w, h, (g) => {
  g.fillStyle = '#efe6cf'; g.fillRect(0, 0, w, h); let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = along ? h : w;
  for (let i = 0; i < n; i += 2) { g.fillStyle = 'rgba(120,100,70,' + (0.05 + rnd() * 0.12) + ')'; if (along) g.fillRect(0, i, w, 1); else g.fillRect(i, 0, 1, h); }
  const gr = along ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(60,45,25,.25)'); gr.addColorStop(0.1, 'rgba(0,0,0,0)'); gr.addColorStop(0.9, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,45,25,.25)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

export function createBookViewer(host) {
  const stage = createStage(host, { fov: 26, update });
  if (!stage.ok()) return null;
  const { scene, camera } = stage, aniso = Math.min(8, stage.maxAniso());
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a684, 0.55));
  const key = new THREE.DirectionalLight(0xfff4e2, 1.05); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.45); rim.position.set(-5, 2, -4); scene.add(rim);
  // a soft shadow under the book
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(canvas(128, 64, (g) => { const gr = g.createRadialGradient(64, 32, 2, 64, 32, 62); gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.scale(1, 0.5); g.fillRect(0, 0, 128, 128); }), false) }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -H / 2 - 0.42; scene.add(blob);
  const edgeSide = canvasTex(edgeCanvas(64, 512, false), false, aniso), edgeTop = canvasTex(edgeCanvas(512, 64, true), false, aniso);
  const loader = new THREE.TextureLoader();

  const built = {};
  function build(bk, i) {
    if (built[bk.id]) return built[bk.id];
    const D = 0.36 + ((i * 23) % 16) / 16 * 0.2; // thickness, a little different for each book
    const board = new THREE.MeshStandardMaterial({ color: lin(bk.spine.bg), roughness: 0.55, envMapIntensity: 0.5 });
    const cover = new THREE.MeshStandardMaterial({ roughness: 0.48, envMapIntensity: 0.55 });
    const coverTex = loader.load(BASE + 'assets/images/books/' + bk.cover, (t) => { t.needsUpdate = true; });
    coverTex.encoding = THREE.sRGBEncoding; coverTex.magFilter = THREE.NearestFilter; coverTex.anisotropy = aniso; cover.map = coverTex;
    const spineC = canvas(Math.round(1200 * (D / H)), 1200, (g, w, h) => paintSpine(g, w, h, bk)), spineT = canvasTex(spineC, false, aniso);
    const backC = canvas(512, 768, (g, w, h) => paintBack(g, w, h, bk)), backT = canvasTex(backC, false, aniso);
    const spineM = new THREE.MeshStandardMaterial({ map: spineT, roughness: 0.5, envMapIntensity: 0.5 }), backM = new THREE.MeshStandardMaterial({ map: backT, roughness: 0.55, envMapIntensity: 0.5 });
    // repaint the printed faces once the fonts have arrived
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 40px "Pixelify Sans"'), document.fonts.load('italic 600 34px "Fraunces"')]).then(() => {
      paintSpine(spineC.getContext('2d'), spineC.width, spineC.height, bk); spineT.needsUpdate = true;
      paintBack(backC.getContext('2d'), backC.width, backC.height, bk); backT.needsUpdate = true;
    }).catch(() => {});
    const paper = new THREE.MeshStandardMaterial({ color: lin('#efe6cf'), roughness: 0.92, envMapIntensity: 0.2 });
    const pageSide = new THREE.MeshStandardMaterial({ map: edgeSide, roughness: 0.92, envMapIntensity: 0.2 }), pageTop = new THREE.MeshStandardMaterial({ map: edgeTop, roughness: 0.92, envMapIntensity: 0.2 });
    const g = new THREE.Group(), add = (geo, mats, x, y, z) => { const m = new THREE.Mesh(geo, mats); m.position.set(x, y, z); g.add(m); return m; };
    // order of box faces: +x, -x, +y, -y, +z, -z
    const bw = W - T;
    add(new THREE.BoxGeometry(bw, H, T), [board, board, board, board, cover, board], T / 2, 0, D / 2 - T / 2);
    add(new THREE.BoxGeometry(bw, H, T), [board, board, board, board, board, backM], T / 2, 0, -D / 2 + T / 2);
    add(new THREE.BoxGeometry(T, H, D), [board, spineM, board, board, board, board], -W / 2 + T / 2, 0, 0);
    const pw = bw - 0.08;
    add(new THREE.BoxGeometry(pw, H - 0.1, D - 2 * T), [pageSide, paper, pageTop, pageTop, paper, paper], -W / 2 + T + pw / 2, 0, 0);
    g.userData.D = D;
    return (built[bk.id] = g);
  }

  // motion: every value glides on a spring toward its target
  const S = { yaw: sp(VIEWS.spine), pitch: sp(REST_PITCH), x: sp(0), y: sp(-0.6), s: sp(0.86) };
  const tgt = { yaw: VIEWS.front, pitch: REST_PITCH, x: 0, y: 0, s: 1 };
  let book = null, leaving = [], dragging = false, velYaw = 0, lastInput = -9, timers = [], clock = 0;

  function show(bk, i, dir = 1) {
    timers.forEach(clearTimeout); timers = [];
    if (book) { // the old book slides away and turns as it goes
      const g = book, o = { yaw: sp(S.yaw.v), x: sp(S.x.v), s: sp(S.s.v), vy: S.yaw.vel, life: 0.9, g };
      o.yaw.vel = S.yaw.vel; o.tYaw = S.yaw.v - dir * 1.1; o.tX = -dir * 3.4; leaving.push(o);
    }
    book = build(bk, i); leaving = leaving.filter((o) => o.g !== book); if (book.parent) book.parent.remove(book); scene.add(book);
    // the new one comes in spine first, rises a little, then turns to show its cover
    S.x.v = dir * 3.2; S.x.vel = 0; S.yaw.v = VIEWS.spine + dir * 0.35; S.yaw.vel = 0; S.s.v = 0.9; S.y.v = -0.25; S.pitch.v = REST_PITCH;
    tgt.x = 0; tgt.s = 1; tgt.y = 0; tgt.yaw = VIEWS.spine; tgt.pitch = REST_PITCH;
    timers.push(setTimeout(() => { tgt.yaw = VIEWS.front; }, 520));
  }
  function view(name) { if (VIEWS[name] === undefined) return; timers.forEach(clearTimeout); const base = VIEWS[name], turns = Math.round((S.yaw.v - base) / (Math.PI * 2)); tgt.yaw = base + turns * Math.PI * 2; tgt.pitch = REST_PITCH; lastInput = clock; }

  function update(dt, time) {
    clock = time;
    // keep the whole book in frame at any width
    // keep the whole book in frame at any size, with room for the buttons underneath
    const tan = Math.tan((camera.fov * Math.PI) / 360), dist = Math.max(2.3 / tan, 1.5 / (tan * camera.aspect));
    camera.position.set(0, 0.1, dist); camera.lookAt(0, -0.3, 0);
    if (!dragging) {
      spring(S.yaw, tgt.yaw, 6.5, dt);
      // after a while untouched, the tilt settles back
      spring(S.pitch, clock - lastInput > 1.2 ? REST_PITCH : tgt.pitch, clock - lastInput > 1.2 ? 2.4 : 8, dt);
    }
    spring(S.x, tgt.x, 7, dt); spring(S.y, tgt.y, 6, dt); spring(S.s, tgt.s, 7, dt);
    if (book) {
      const float = Math.sin(time * 1.1) * 0.035, sway = dragging ? 0 : Math.sin(time * 0.6) * 0.015;
      book.position.set(S.x.v, S.y.v + float, 0); book.rotation.set(S.pitch.v, S.yaw.v + sway, 0, 'XYZ'); book.scale.setScalar(S.s.v);
      blob.position.x = S.x.v; blob.material.opacity = Math.max(0, 1 - Math.abs(S.x.v) / 3) * (1 - float * 2);
    }
    leaving = leaving.filter((o) => {
      o.life -= dt; spring(o.yaw, o.tYaw, 5, dt); spring(o.x, o.tX, 6, dt); spring(o.s, 0.85, 6, dt);
      o.g.position.x = o.x.v; o.g.rotation.y = o.yaw.v; o.g.scale.setScalar(o.s.v);
      if (o.life <= 0 || Math.abs(o.x.v) > 3.3) { if (o.g !== book) scene.remove(o.g); return false; }
      return true;
    });
  }

  // drag to turn: sideways turns the book, up and down tilts it; it keeps a little momentum
  dragger(host, {
    onStart() { dragging = true; velYaw = 0; timers.forEach(clearTimeout); host.classList.add('grab'); },
    onMove(dx, dy) {
      const k = 0.011; S.yaw.v += dx * k; velYaw = velYaw * 0.6 + dx * k * 60 * 0.4;
      S.pitch.v = Math.max(-0.75, Math.min(0.75, S.pitch.v + dy * 0.008)); tgt.pitch = S.pitch.v; lastInput = clock;
    },
    onEnd(moved) {
      dragging = false; host.classList.remove('grab'); lastInput = clock;
      S.yaw.vel = moved < 4 ? 0 : velYaw; tgt.yaw = S.yaw.v + (moved < 4 ? 0 : velYaw * 0.22); S.pitch.vel = 0;
    },
  });
  host.addEventListener('dblclick', () => view('front'));
  host.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); tgt.yaw -= e.deltaX * 0.01; lastInput = clock; } }, { passive: false });

  return { show, view, start: () => stage.start(), stop: () => stage.stop(), turn: (d) => { tgt.yaw += d; lastInput = clock; } };
}
