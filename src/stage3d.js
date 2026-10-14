// A small 3D stage for the Hideout's menus (the library's books and the gallery's cube).
// One WebGL renderer is shared by every stage and moves into whichever menu is open, so the
// page never holds more than two WebGL contexts (the village and this). A stage only draws
// while its menu is open.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let R = null, env = null;
function renderer() {
  if (R !== null) return R || null;
  try {
    R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    R.setPixelRatio(Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1)); // phones: a little lighter
    R.outputEncoding = THREE.sRGBEncoding; R.setClearColor(0x000000, 0);
    R.domElement.className = 'stage3d';
    // soft studio reflections for glossy covers, glass and gold
    const pm = new THREE.PMREMGenerator(R); env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  } catch (e) { R = false; }
  return R || null;
}

// critically damped spring: moves o.v toward target without overshoot, carrying its velocity,
// so a motion can be redirected at any moment without a jolt
export function spring(o, target, w, dt) {
  const x = o.v - target, e = Math.exp(-w * dt), q = (o.vel + w * x) * dt;
  o.v = target + (x + q) * e; o.vel = (o.vel - w * q) * e; return o.v;
}
export const sp = (v) => ({ v, vel: 0 });

// host: the element the canvas fills; update(dt, time) runs before each frame is drawn
export function createStage(host, { fov = 28, update }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  let running = false, last = 0, raf = 0;
  const size = new THREE.Vector2();
  function frame(t) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000)); last = t;
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    if (R.domElement.parentNode !== host) host.appendChild(R.domElement);
    R.getSize(size); if (size.x !== w || size.y !== h) R.setSize(w, h, false);
    if (Math.abs(camera.aspect - w / h) > 1e-4) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    update(dt, t / 1000);
    R.render(scene, camera);
  }
  return {
    scene, camera,
    ok: () => !!renderer(),
    env: () => (renderer() ? env : null),
    canvas: () => (R ? R.domElement : null),
    maxAniso: () => (R ? R.capabilities.getMaxAnisotropy() : 1),
    start() { if (!renderer() || running) return false; running = true; scene.environment = env; last = performance.now(); raf = requestAnimationFrame(frame); return true; },
    stop() { running = false; cancelAnimationFrame(raf); },
    running: () => running,
  };
}

// a canvas texture in sRGB, sharp for pixel art when asked
export function canvasTex(c, pixel, aniso = 4) {
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso;
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; }
  return t;
}

// pointer dragging on an element: calls onMove(dx, dy, e) while dragging and onEnd(moved, e) on release
export function dragger(elm, { onStart, onMove, onEnd }) {
  let id = null, x0 = 0, y0 = 0, lx = 0, ly = 0, moved = 0;
  // buttons and links inside the area keep their own clicks (capturing the pointer would swallow them)
  elm.addEventListener('pointerdown', (e) => { if (e.button > 0 || id !== null || (e.target.closest && e.target.closest('button,a'))) return; id = e.pointerId; elm.setPointerCapture(id); x0 = lx = e.clientX; y0 = ly = e.clientY; moved = 0; if (onStart) onStart(e); });
  elm.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved = Math.max(moved, Math.hypot(e.clientX - x0, e.clientY - y0)); onMove(dx, dy, e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; onEnd(moved, e); };
  elm.addEventListener('pointerup', end); elm.addEventListener('pointercancel', end);
}
