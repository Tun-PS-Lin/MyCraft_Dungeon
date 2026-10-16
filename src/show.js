// The AI Cinema's showing: a short demo loop standing in for the "38 Mingalar Blessings" series
// until real clips are ready. It is drawn in pixel art onto a small canvas, so the same picture
// can play on the cinema's screen in the village (as a texture) and, larger, in the viewer that
// opens from the cinema's card. Everything moves with time, not frames, so it stays smooth.
//
// To show a real clip later, replace drawShow() or play a <video> in the viewer instead.

export const SHOW_W = 224, SHOW_H = 112, LOOP = 15;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
// a fixed scatter of stars, birds and lanterns, so every loop looks the same
const R = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const STARS = Array.from({ length: 46 }, () => [R(), R() * 0.6, R() * TAU]);
const LANTERNS = Array.from({ length: 14 }, () => [R(), R(), 0.6 + R() * 0.6, R() * TAU]);
const PETALS = 8;

// sky gradient from top colour to bottom colour, in a few flat bands (it reads as pixel art)
function sky(g, w, h, top, bottom, bands = 10) {
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1), c = top.map((v, j) => Math.round(lerp(v, bottom[j], k)));
    g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(0, Math.floor((i * h) / bands), w, Math.ceil(h / bands) + 1);
  }
}
const mixc = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function text(g, s, x, y, size, color, alpha = 1, font = '"Pixelify Sans","Courier New",monospace') {
  if (alpha <= 0.01) return;
  g.globalAlpha = alpha; g.font = `700 ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(s, x + Math.max(1, size / 12), y + Math.max(1, size / 12));
  g.fillStyle = color; g.fillText(s, x, y); g.globalAlpha = 1;
}
// a stupa in silhouette, golden where the light catches it
function pagoda(g, cx, base, s, body, shine) {
  g.fillStyle = body;
  g.fillRect(cx - 30 * s, base - 8 * s, 60 * s, 8 * s); g.fillRect(cx - 22 * s, base - 14 * s, 44 * s, 6 * s);
  g.beginPath(); g.moveTo(cx - 18 * s, base - 14 * s); g.quadraticCurveTo(cx, base - 34 * s, cx + 18 * s, base - 14 * s); g.fill();
  g.beginPath(); g.moveTo(cx - 8 * s, base - 26 * s); g.lineTo(cx, base - 58 * s); g.lineTo(cx + 8 * s, base - 26 * s); g.fill();
  if (shine) { g.fillStyle = shine; g.fillRect(cx - 1.5 * s, base - 58 * s, 3 * s, 32 * s); g.fillRect(cx - 18 * s, base - 15 * s, 36 * s, 1.5 * s); }
}
function bird(g, x, y, s, flap) { g.fillRect(x - 3 * s, y - flap * s, 3 * s, 1); g.fillRect(x, y, 1, 1); g.fillRect(x + 1, y - flap * s, 3 * s, 1); }

// scene timings in seconds within the loop: [start, end]
const SCENES = [[0, 4.6], [4.6, 8.6], [8.6, 12.4], [12.4, LOOP]];

export function drawShow(g, t, w = SHOW_W, h = SHOW_H) {
  t = ((t % LOOP) + LOOP) % LOOP;
  const sx = w / SHOW_W; g.save(); g.scale(sx, sx); w = SHOW_W; h = SHOW_H;
  g.imageSmoothingEnabled = false;
  let scene = 0; for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) scene = i;
  const [a, b] = SCENES[scene], local = t - a, len = b - a;

  if (scene === 0) {
    // dawn over the pagoda: the stars fade, the sun climbs, birds cross, the title comes up
    const k = clamp(local / len);
    sky(g, w, h, mixc([14, 18, 52], [60, 52, 120], k), mixc([60, 40, 90], [255, 170, 100], k), 12);
    for (const [x, y, p] of STARS) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + p); g.globalAlpha = (1 - k) * tw; g.fillStyle = '#fff'; g.fillRect(Math.floor(x * w), Math.floor(y * h), 1, 1); }
    g.globalAlpha = 1;
    const sunY = lerp(h + 6, h * 0.58, ease(k)), sr = 15;
    g.fillStyle = 'rgba(255,214,140,.35)'; g.beginPath(); g.arc(w / 2, sunY, sr + 8, 0, TAU); g.fill();
    g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(w / 2, sunY, sr, 0, TAU); g.fill();
    // far hills, then the pagoda
    g.fillStyle = '#3d2047'; g.beginPath(); g.moveTo(0, h * 0.8); for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.78 + Math.sin(x * 0.05) * 4); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    pagoda(g, w / 2, h * 0.86, 0.9, '#2a1230', k > 0.35 ? `rgba(240,190,80,${(k - 0.35) * 1.4})` : null);
    g.fillStyle = '#1c0c22'; g.fillRect(0, h * 0.86, w, h);
    g.fillStyle = '#1c0c22'; for (let i = 0; i < 3; i++) bird(g, ((local * 26 + i * 22) % (w + 30)) - 15, 30 + i * 6 + Math.sin(local * 2 + i) * 2, 1.4, Math.sin(local * 10 + i) > 0 ? 1.5 : 0);
    text(g, '38 MINGALAR BLESSINGS', w / 2, 22, 13, '#ffd76a', clamp((local - 1.2) / 0.8));
    text(g, 'မင်္ဂလာ ၃၈ ပါး', w / 2, 38, 9, '#ffe9c0', clamp((local - 1.9) / 0.8), '"Noto Sans Myanmar",sans-serif');
  } else if (scene === 1) {
    // Blessing 1: a lotus opens on still water at sunset
    const k = clamp(local / len);
    sky(g, w, h, [70, 40, 96], [250, 150, 110], 10);
    g.fillStyle = '#ffd08a'; g.beginPath(); g.arc(w * 0.78, h * 0.5, 10, 0, TAU); g.fill();
    // water, with gently moving light streaks
    g.fillStyle = '#3a2d63'; g.fillRect(0, h * 0.58, w, h);
    g.fillStyle = 'rgba(255,200,140,.55)'; for (let i = 0; i < 7; i++) { const y = h * 0.62 + i * 6, ww = 18 - i * 2 + Math.sin(t * 2 + i) * 3; g.fillRect(w * 0.78 - ww / 2 + Math.sin(t * 1.3 + i * 2) * 3, y, ww, 1); }
    // lily pads
    g.fillStyle = '#2f6b4a'; for (const [px, py, r] of [[0.3, 0.8, 9], [0.62, 0.72, 6], [0.18, 0.66, 5]]) { g.beginPath(); g.ellipse(w * px, h * py, r * 1.6, r * 0.5, 0, 0, TAU); g.fill(); }
    // the lotus, petals opening in turn
    const cx = w * 0.42, cy = h * 0.74, open = ease(clamp((local - 0.3) / 2.6));
    for (let i = 0; i < PETALS; i++) {
      const ang = -Math.PI / 2 + (i - (PETALS - 1) / 2) * 0.32 * (0.3 + open * 0.9);
      const L = 13 + (i % 2) * 2;
      g.save(); g.translate(cx, cy); g.rotate(ang + Math.PI / 2);
      g.fillStyle = i % 2 ? '#f39bb6' : '#ffc4d4'; g.beginPath(); g.ellipse(0, -L / 2, 3.2, L / 2, 0, 0, TAU); g.fill(); g.restore();
    }
    g.fillStyle = '#ffd76a'; g.fillRect(cx - 2, cy - 4, 4, 3);
    text(g, 'BLESSING 1', w / 2, 16, 10, '#ffe2a0', clamp((local - 0.4) / 0.6));
    text(g, 'Keep away from foolish company', w / 2, 30, 8, '#fff4dc', clamp((local - 0.9) / 0.6), '"Nunito",sans-serif');
  } else if (scene === 2) {
    // Blessing 2: two figures under a tree as lanterns rise into the night
    sky(g, w, h, [10, 14, 40], [40, 36, 90], 10);
    for (const [x, y, p] of STARS) { g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2.5 + p); g.fillStyle = '#fff'; g.fillRect(Math.floor(x * w), Math.floor(y * h * 0.8), 1, 1); }
    g.globalAlpha = 1;
    g.fillStyle = '#ffeec4'; g.beginPath(); g.arc(w * 0.82, 20, 7, 0, TAU); g.fill(); g.fillStyle = '#1b2049'; g.beginPath(); g.arc(w * 0.82 + 3, 18, 6, 0, TAU); g.fill();
    for (const [x, y0, sp, p] of LANTERNS) {
      const y = h * 0.95 - ((local * 9 * sp + y0 * h) % (h * 1.05)), lx = x * w + Math.sin(local * 0.8 + p) * 3;
      g.fillStyle = 'rgba(255,170,70,.25)'; g.fillRect(lx - 3, y - 3, 7, 8);
      g.fillStyle = '#ffb04a'; g.fillRect(lx - 2, y - 2, 4, 5); g.fillStyle = '#ffe2a0'; g.fillRect(lx - 1, y + 1, 2, 2);
    }
    // ground, the tree and the two sitting figures (a teacher and a student)
    g.fillStyle = '#121232'; g.fillRect(0, h * 0.84, w, h);
    g.fillStyle = '#0c0c22'; g.fillRect(w * 0.3 - 3, h * 0.5, 6, h * 0.36);
    g.beginPath(); g.ellipse(w * 0.3, h * 0.46, 30, 18, 0, 0, TAU); g.fill();
    g.fillRect(w * 0.42, h * 0.74, 8, 10); g.fillRect(w * 0.42 + 1, h * 0.68, 6, 6); // teacher
    g.fillRect(w * 0.53, h * 0.77, 6, 7); g.fillRect(w * 0.53 + 1, h * 0.72, 4, 5); // student
    g.fillStyle = '#d58a3a'; g.fillRect(w * 0.42, h * 0.74, 8, 3); // a monk's robe catches the lantern light
    text(g, 'BLESSING 2', w / 2, 16, 10, '#ffe2a0', clamp((local - 0.4) / 0.6));
    text(g, 'Keep the company of the wise', w / 2, 30, 8, '#fff4dc', clamp((local - 0.9) / 0.6), '"Nunito",sans-serif');
  } else {
    // end card
    g.fillStyle = '#120a10'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(((i * 37 + Math.floor(t * 24) * 13) % w), ((i * 23 + Math.floor(t * 24) * 7) % h), 1, 1); }
    text(g, 'AI ANIMATED SERIES', w / 2, h * 0.38, 12, '#ffd76a', clamp(local / 0.6));
    text(g, 'Coming soon', w / 2, h * 0.58, 9, '#f3e6cf', clamp((local - 0.5) / 0.6), '"Nunito",sans-serif');
  }
  // fade through black between scenes, a soft vignette, and a faint flicker like film
  const edge = Math.min(local, len - local), fade = 1 - clamp(edge / 0.45);
  if (fade > 0.01) { g.fillStyle = `rgba(0,0,0,${fade.toFixed(3)})`; g.fillRect(0, 0, w, h); }
  g.fillStyle = `rgba(0,0,0,${(0.04 + 0.03 * Math.sin(t * 37)).toFixed(3)})`; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
  g.restore();
}

/* the viewer: the showing, large, in a small theatre panel */
export function createShowViewer({ onOpen, onClose } = {}) {
  const box = document.createElement('div'); box.id = 'show'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'AI Cinema: now showing');
  box.innerHTML = `<div class="show-panel">
    <header class="menu-head"><small>AI Cinema</small><h2>Now Showing</h2><i class="menu-rule"></i></header>
    <button class="xbtn show-x" type="button" aria-label="Close">×</button>
    <div class="show-screen"><canvas width="${SHOW_W * 2}" height="${SHOW_H * 2}"></canvas></div>
    <div class="show-bar"><i></i></div>
    <p class="show-note">38 Mingalar Blessings · a demo of the opening while the series is being made</p>
  </div>`;
  document.body.appendChild(box);
  const cv = box.querySelector('canvas'), g = cv.getContext('2d'), bar = box.querySelector('.show-bar i');
  let open = false, raf = 0, t0 = 0;
  const frame = (now) => {
    if (!open) return; raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000; drawShow(g, t, cv.width, cv.height);
    bar.style.transform = `scaleX(${((t % LOOP) / LOOP).toFixed(4)})`;
  };
  function show() { if (open) return; open = true; box.classList.add('open'); t0 = performance.now(); raf = requestAnimationFrame(frame); box.querySelector('.show-x').focus({ preventScroll: true }); if (onOpen) onOpen(); }
  function hide() { if (!open) return; open = false; cancelAnimationFrame(raf); box.classList.remove('open'); if (onClose) onClose(); }
  box.querySelector('.show-x').onclick = hide;
  box.addEventListener('pointerdown', (e) => { if (e.target === box) hide(); });
  return { show, hide, isOpen: () => open };
}
