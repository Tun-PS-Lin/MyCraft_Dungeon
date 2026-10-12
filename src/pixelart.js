// Small pixel pictures drawn in code, shared by the Hideout room and its menus:
// music discs, journal icons and the gallery paintings. Each draws into a 2D canvas
// context at 1 pixel per "texel"; scale the canvas up with image-rendering: pixelated.
// (kept free of three.js so the simple version of the site can use it too)
const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = (k) => Math.max(0, Math.min(255, Math.round((n >> k & 255) * f))).toString(16).padStart(2, '0');
  return '#' + c(16) + c(8) + c(0);
}

/* A 16×16 music disc in the blocky game style: dark grooved vinyl, a coloured label, a hole. */
export function drawDisc(g, color) {
  g.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 7.6) continue;
    let c = d > 6.7 ? '#141418' : Math.floor(d) % 2 ? '#2b2b33' : '#232329';
    if (d < 3.6) c = d > 2.8 ? shade(color, 0.62) : color;
    if (d < 1.2) c = '#0d0d10';
    // a highlight across the top left of the vinyl
    if (d > 3.6 && d < 6.4 && x + y > 3 && x + y < 7 && x < 8 && y < 8) c = '#5a5a66';
    if (d > 3.6 && d < 6.4 && x + y > 22 && x + y < 25) c = '#3a3a44';
    px(g, c, x, y);
  }
  px(g, shade(color, 1.35), 6, 5, 2, 1); // a glint on the label
}

/* 16×16 icons for the journal list */
const ICONS = {
  house(g) { px(g, '#7a3f22', 3, 3, 10, 1); px(g, '#a3342e', 2, 4, 12, 2); px(g, '#c2473a', 3, 6, 10, 1); px(g, '#e9d9a8', 3, 7, 10, 7); px(g, '#6b3f22', 7, 10, 2, 4); px(g, '#62c8ff', 4, 8, 2, 2); px(g, '#62c8ff', 10, 8, 2, 2); px(g, '#3d7d40', 1, 14, 14, 1); },
  map(g) { px(g, '#e8d3a0', 2, 3, 12, 10); px(g, '#c9b27a', 6, 3, 1, 10); px(g, '#c9b27a', 10, 3, 1, 10); px(g, '#2f7a3c', 3, 5, 2, 2); px(g, '#2b6fd0', 7, 8, 3, 2); px(g, '#c23b32', 11, 5, 2, 2); px(g, '#7a5530', 4, 9, 1, 3); px(g, '#7a5530', 12, 9, 1, 2); },
  quill(g) { px(g, '#f1efe6', 9, 1, 3, 2); px(g, '#f1efe6', 8, 3, 3, 2); px(g, '#d6cfbc', 7, 5, 3, 2); px(g, '#d6cfbc', 6, 7, 2, 2); px(g, '#7a5530', 5, 9, 1, 3); px(g, '#2a2019', 4, 12, 1, 2); px(g, '#2b3a67', 9, 12, 5, 3); px(g, '#141418', 10, 12, 3, 1); },
  note(g) { px(g, '#f6f3e8', 3, 2, 10, 12); px(g, '#c9b27a', 3, 2, 10, 1); for (let y = 5; y < 13; y += 2) px(g, '#9a8f7a', 5, y, 6, 1); },
  lamp(g) { px(g, '#2a2019', 7, 1, 2, 2); px(g, '#2a2019', 5, 3, 6, 1); px(g, '#ffd84a', 5, 4, 6, 6); px(g, '#ffc76a', 6, 5, 4, 4); px(g, '#2a2019', 5, 10, 6, 1); px(g, '#2a2019', 6, 11, 4, 2); },
  lattice(g) { for (let i = 2; i < 15; i += 4) { px(g, '#7a5530', i, 2, 1, 12); px(g, '#7a5530', 2, i, 12, 1); } [[2, 2], [6, 6], [10, 10], [14, 6], [6, 14], [10, 2]].forEach(([x, y]) => px(g, '#e4b93a', x - 1, y - 1, 3, 3)); },
  eye(g) { px(g, '#f1efe6', 3, 6, 10, 4); px(g, '#f1efe6', 5, 5, 6, 6); px(g, '#2b6fd0', 6, 6, 4, 4); px(g, '#141418', 7, 7, 2, 2); px(g, '#ffffff', 9, 6, 1, 1); px(g, '#3a2a1f', 2, 7, 1, 2); px(g, '#3a2a1f', 13, 7, 1, 2); px(g, '#3a2a1f', 5, 4, 6, 1); px(g, '#3a2a1f', 5, 11, 6, 1); },
  dice(g) { px(g, '#f1efe6', 2, 4, 9, 9); px(g, '#d6cfbc', 2, 12, 9, 1); px(g, '#141418', 4, 6, 2, 2); px(g, '#141418', 8, 10, 2, 2); px(g, '#141418', 6, 8, 2, 2); px(g, '#c23b32', 9, 2, 5, 5); px(g, '#f1efe6', 11, 4, 1, 1); },
  fork(g) { px(g, '#7a5530', 7, 9, 2, 6); px(g, '#7a5530', 5, 7, 2, 2); px(g, '#7a5530', 9, 7, 2, 2); px(g, '#7a5530', 3, 4, 2, 3); px(g, '#7a5530', 11, 4, 2, 3); px(g, '#57d47c', 2, 1, 4, 3); px(g, '#d8403a', 10, 1, 4, 3); },
  circle(g) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 7 && d > 5.4) px(g, '#2b6fd0', x, y); else if (d <= 5.4) px(g, '#bfe6f5', x, y); } px(g, '#e4b93a', 7, 7, 2, 2); },
  ball(g) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6.5) px(g, '#f6f3e8', x, y); } for (let y = 3; y < 13; y++) { px(g, '#c23b32', 4 + (y % 3 === 0 ? 1 : 0), y); px(g, '#c23b32', 11 - (y % 3 === 0 ? 1 : 0), y); } },
  pig(g) { px(g, '#f1a7b8', 3, 4, 10, 9); px(g, '#e88aa0', 2, 3, 3, 3); px(g, '#e88aa0', 11, 3, 3, 3); px(g, '#141418', 5, 6, 2, 2); px(g, '#141418', 9, 6, 2, 2); px(g, '#e88aa0', 6, 9, 4, 3); px(g, '#8a3b4f', 7, 10, 1, 1); px(g, '#8a3b4f', 8, 10, 1, 1); },
  flame(g) { px(g, '#d8403a', 5, 4, 6, 10); px(g, '#d8403a', 7, 1, 2, 3); px(g, '#ff9a3d', 6, 7, 4, 6); px(g, '#ffd84a', 7, 10, 2, 3); px(g, '#62c8ff', 12, 2, 1, 4); px(g, '#62c8ff', 10, 4, 5, 1); },
  seed(g) { px(g, '#5a3a1f', 3, 12, 10, 3); px(g, '#7a5530', 4, 11, 8, 1); px(g, '#3d7d40', 7, 5, 2, 6); px(g, '#57d47c', 3, 3, 4, 3); px(g, '#57d47c', 9, 2, 4, 4); px(g, '#e4b93a', 12, 9, 2, 2); },
  wave(g) { const ys = [10, 8, 6, 5, 5, 6, 8, 10, 11, 11, 10, 8, 6, 5]; ys.forEach((y, i) => { px(g, '#2b6fd0', i + 1, y, 1, 2); px(g, '#62c8ff', i + 1, y, 1, 1); }); px(g, '#7a5530', 1, 14, 14, 1); },
  disc(g) { const c = document.createElement('canvas'); c.width = c.height = 16; drawDisc(c.getContext('2d'), '#e4b93a'); g.drawImage(c, 0, 0); },
};
export function drawIcon(g, name) { g.clearRect(0, 0, 16, 16); (ICONS[name] || ICONS.note)(g); }

/* 32×24 paintings for the gallery, in the spirit of the blocky game's paintings */
const PAINT = {
  voice(g) { // a dusk sky, a speech bubble and a sound wave
    ['#2a2040', '#3a2a50', '#5a2f86', '#7a3fb4', '#b0409a'].forEach((c, i) => px(g, c, 0, i * 5, 32, 5));
    px(g, '#f3ead2', 4, 4, 13, 8); px(g, '#f3ead2', 6, 12, 3, 2); px(g, '#f3ead2', 6, 14, 1, 1);
    px(g, '#2a2040', 6, 6, 9, 1); px(g, '#2a2040', 6, 8, 7, 1); px(g, '#2a2040', 6, 10, 5, 1);
    [3, 6, 9, 5, 8, 4, 7, 2].forEach((h, i) => px(g, i % 2 ? '#ffd84a' : '#ffc76a', 18 + i * 1.6 | 0, 16 - h, 1, h * 2));
    px(g, '#1d1830', 0, 22, 32, 2);
  },
  stars(g) { // a night sky with a moon and a little constellation
    px(g, '#0d1430', 0, 0, 32, 24); px(g, '#141d42', 0, 14, 32, 10);
    const r = rng(9); for (let i = 0; i < 26; i++) px(g, r() < 0.3 ? '#ffd84a' : '#cfe6ff', (r() * 32) | 0, (r() * 20) | 0);
    px(g, '#f1efe6', 22, 3, 5, 6); px(g, '#0d1430', 24, 3, 3, 4); px(g, '#d6cfbc', 22, 8, 3, 1);
    const pts = [[4, 15], [8, 11], [13, 13], [17, 9]]; pts.forEach(([x, y], i) => { px(g, '#ffd84a', x, y, 2, 2); if (i) { const [a, b] = pts[i - 1]; for (let t = 0; t <= 1; t += 0.2) px(g, '#5a6aa8', Math.round(a + (x - a) * t) + 1, Math.round(b + (y - b) * t) + 1); } });
    px(g, '#2a2040', 0, 21, 32, 3); px(g, '#3a2a50', 5, 20, 6, 1); px(g, '#3a2a50', 20, 19, 9, 2);
  },
  town(g) { // sky, sun, little houses and a pool
    px(g, '#8fd0ff', 0, 0, 32, 15); px(g, '#bfe6f5', 0, 11, 32, 4); px(g, '#ffd84a', 24, 2, 5, 5); px(g, '#ffe8a0', 25, 3, 3, 3);
    px(g, '#f1efe6', 4, 3, 6, 2); px(g, '#f1efe6', 3, 4, 9, 1);
    px(g, '#5f8f33', 0, 15, 32, 9); px(g, '#4f7a2a', 0, 21, 32, 3);
    [[3, 10, '#c2473a'], [11, 8, '#2f66c4'], [19, 10, '#c98a2b']].forEach(([x, y, roof]) => { px(g, roof, x - 1, y, 8, 2); px(g, '#e9e2cf', x, y + 2, 6, 15 - y); px(g, '#62c8ff', x + 1, y + 4, 2, 2); px(g, '#6b3f22', x + 3, y + 5, 2, 15 - y - 3); });
    px(g, '#62c8ff', 20, 18, 9, 3); px(g, '#bfe6f5', 21, 18, 3, 1);
  },
  world(g) { // a floating island town under a blue sky
    px(g, '#7fc4ff', 0, 0, 32, 24); px(g, '#a8daff', 0, 14, 32, 10); px(g, '#ffd84a', 25, 2, 4, 4); px(g, '#f1efe6', 3, 3, 7, 2); px(g, '#f1efe6', 5, 2, 3, 1);
    px(g, '#5f8f33', 5, 13, 22, 2); px(g, '#8a5a36', 6, 15, 20, 2); px(g, '#7a4f2a', 8, 17, 16, 2); px(g, '#6b4422', 11, 19, 10, 2); px(g, '#5a3a1f', 14, 21, 4, 1);
    [[8, 9, '#c2473a'], [14, 8, '#2f66c4'], [20, 9, '#e4b93a']].forEach(([x, y, roof]) => { px(g, roof, x - 1, y, 6, 1); px(g, '#e9e2cf', x, y + 1, 4, 13 - y - 1); px(g, '#62c8ff', x + 1, y + 2, 1, 1); });
    px(g, '#3d7d40', 25, 9, 3, 3); px(g, '#6b3f22', 26, 12, 1, 1);
  },
  bot(g) { px(g, '#2b6fd0', 0, 0, 32, 24); px(g, '#f1efe6', 9, 7, 14, 10); px(g, '#1d2333', 12, 10, 3, 3); px(g, '#1d2333', 18, 10, 3, 3); px(g, '#1d2333', 13, 14, 7, 1); px(g, '#ffd84a', 15, 3, 2, 4); },
  chart(g) { px(g, '#1d2638', 0, 0, 32, 24); [4, 7, 6, 10, 9, 13, 15, 18].forEach((h, i) => px(g, i % 2 ? '#57d47c' : '#2fa955', 3 + i * 3.4 | 0, 21 - h, 2, h)); },
};
export function drawPainting(g, art) { g.clearRect(0, 0, 32, 24); (PAINT[art] || PAINT.chart)(g); }

// a small canvas holding one picture, handy for <canvas> elements and textures
export function pictureCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return c; }
