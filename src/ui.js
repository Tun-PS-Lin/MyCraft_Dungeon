// Interface layer: stall labels, the E prompt, the project popup and the menu.
// Plain DOM on top of the canvas so text stays crisp and links are real links.
import { PROJECTS, CREDIT, REPO_URL } from './config.js';
import { fill } from './textures.js';
import { sound } from './audio.js';

const $ = (id) => document.getElementById(id);

/* 32×32 pixel-art picture for each popup. Replace with <img> files later if you like. */
const ART = {
  alacrity(g) {
    const f = (c, x, y, w, h) => fill(g, c, x, y, w, h);
    f('#b88f4d', 3, 6, 26, 20); f('#ecd9a8', 4, 7, 11, 18); f('#e4cd96', 17, 7, 11, 18); f('#c9a763', 15, 7, 2, 18);
    f('#2f66c4', 6, 10, 4, 3); f('#2f66c4', 7, 9, 2, 1); f('#ecd9a8', 7, 11, 2, 2);
    [[10, 14], [11, 15], [12, 16], [13, 16], [14, 17], [17, 17], [18, 16], [19, 15], [20, 14], [21, 13], [22, 12]].forEach((p) => f('#3b8be0', p[0], p[1], 1, 1));
    f('#62e4ff', 22, 11, 2, 2); f('#62e4ff', 9, 13, 2, 2);
    f('#d2542f', 7, 20, 1, 1); f('#d2542f', 9, 20, 1, 1); f('#d2542f', 8, 21, 1, 1); f('#d2542f', 7, 22, 1, 1); f('#d2542f', 9, 22, 1, 1);
    f('#2b3a67', 21, 18, 5, 5); f('#ecd9a8', 22, 19, 3, 3); f('#d33b32', 23, 19, 1, 2);
    f('#62e4ff', 2, 4, 1, 1); f('#62e4ff', 29, 9, 1, 1); f('#62e4ff', 1, 20, 1, 1); f('#62e4ff', 28, 27, 1, 1);
  },
  mingalar(g) {
    const f = (c, x, y, w, h) => fill(g, c, x, y, w, h);
    f('#8d8d8a', 7, 6, 20, 22); f('#fbfaf4', 6, 5, 20, 22); f('#2f7a3c', 8, 7, 16, 4); f('#fbfaf4', 10, 8, 2, 2); f('#fbfaf4', 14, 8, 6, 1);
    f('#62a0d8', 8, 13, 7, 6); f('#ffd84a', 12, 14, 2, 2); f('#3f7a3a', 8, 17, 7, 2);
    for (let y = 13; y < 19; y += 2) f('#6c6c6a', 17, y, 7, 1); for (let y = 21; y < 26; y += 2) f('#6c6c6a', 8, y, 16, 1);
    f('#ffd84a', 27, 4, 1, 1); f('#ffd84a', 3, 24, 1, 1);
  },
  urban(g) {
    fill(g, '#163a6e', 3, 3, 26, 26); fill(g, '#1f4e8f', 4, 4, 24, 24);
    for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) { const d = Math.round(Math.hypot(x - 15.5, y - 15.5)); if (d === 4 || d === 8 || d === 11) fill(g, d === 4 ? '#e8f2ff' : d === 8 ? '#8fd0ff' : '#5d9ad8', x, y, 1, 1); }
    fill(g, '#ffd84a', 15, 15, 2, 2); fill(g, '#e8f2ff', 16, 5, 1, 10); fill(g, '#e8f2ff', 17, 15, 10, 1);
  },
  contact(g) {
    const f = (c, x, y, w, h) => fill(g, c, x, y, w, h);
    f('#8d8d8a', 5, 10, 24, 16); f('#fbfaf4', 4, 9, 24, 16); f('#d9d6ca', 4, 9, 24, 1);
    for (let i = 0; i < 12; i++) { f('#b9b6aa', 4 + i, 10 + Math.round(i * 0.6), 1, 1); f('#b9b6aa', 27 - i, 10 + Math.round(i * 0.6), 1, 1); }
    f('#d33b32', 14, 15, 4, 4); f('#ff9de0', 15, 16, 2, 2); f('#ff9de0', 29, 6, 1, 1); f('#ff9de0', 2, 22, 1, 1);
  },
};

export function createUI(canvas) {
  const scrim = $('scrim'), side = $('side'), menuBtn = $('menuBtn'), menuScrim = $('menuScrim'), promptEl = $('prompt'), touchUI = $('touch'), tUse = $('tUse');
  const isTouch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (isTouch) touchUI.hidden = false;
  let openId = null, nearId = null;
  const menuOpen = () => side.classList.contains('open');

  /* popup */
  function openCard(id) {
    const p = PROJECTS.find((q) => q.id === id); if (!p) return;
    closeMenu(true); openId = id;
    $('cardKicker').textContent = p.label; $('cardTitle').textContent = p.title; $('cardDesc').textContent = p.desc;
    const g = $('cardArt').getContext('2d'); g.clearRect(0, 0, 32, 32); ART[id](g);
    const go = $('cardGo'), email = $('cardEmail');
    email.hidden = !p.email; if (p.email) { $('emailText').textContent = p.email; $('emailCopy').textContent = 'Copy'; }
    if (p.url) {
      go.className = ''; go.href = p.url; go.removeAttribute('aria-disabled');
      if (p.email) go.removeAttribute('target'); else go.target = '_blank';
      go.querySelector('span').textContent = p.cta + (p.email ? '' : ' ↗'); go.querySelector('small').textContent = p.sub;
    } else {
      go.className = 'off'; go.removeAttribute('href'); go.setAttribute('aria-disabled', 'true');
      go.querySelector('span').textContent = 'Link coming soon'; go.querySelector('small').textContent = 'Project link not added yet';
    }
    scrim.classList.add('show'); promptEl.hidden = true; $('cardClose').focus({ preventScroll: true }); sound.play('open');
  }
  function closeCard() { if (!openId) return; openId = null; scrim.classList.remove('show'); sound.play('close'); canvas.focus({ preventScroll: true }); }
  $('cardClose').onclick = closeCard;
  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) closeCard(); });
  $('emailCopy').onclick = () => {
    const done = () => { $('emailCopy').textContent = 'Copied'; };
    const select = () => { const r = document.createRange(); r.selectNodeContents($('emailText')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText($('emailText').textContent).then(done).catch(select); else select();
  };

  /* menu */
  function openMenu() { side.classList.add('open'); menuBtn.classList.add('open'); menuScrim.classList.add('show'); menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu'); sound.play('menu'); }
  function closeMenu(silent) { if (!menuOpen()) return; side.classList.remove('open'); menuBtn.classList.remove('open'); menuScrim.classList.remove('show'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); if (!silent) sound.play('menu'); }
  menuBtn.onclick = () => (menuOpen() ? closeMenu() : openMenu());
  menuScrim.addEventListener('pointerdown', () => closeMenu());
  PROJECTS.forEach((p) => {
    const b = document.createElement('button'); b.className = 'navbtn';
    const sw = document.createElement('b'); sw.style.background = p.color; b.appendChild(sw); b.appendChild(document.createTextNode(p.title));
    b.onclick = () => openCard(p.id); $(p.email ? 'navContact' : 'navProjects').appendChild(b);
  });

  /* sound and day/night buttons */
  const soundBtn = $('soundBtn'), themeBtn = $('themeBtn');
  const paintSound = () => { const on = sound.isOn(); soundBtn.classList.toggle('alt', !on); soundBtn.setAttribute('aria-pressed', String(on)); soundBtn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on'); };
  soundBtn.onclick = () => { if (sound.toggle()) sound.play('menu'); paintSound(); soundBtn.blur(); }; paintSound();
  let themeHandler = null;
  const setTheme = (dark) => { themeBtn.classList.toggle('alt', dark); themeBtn.setAttribute('aria-pressed', String(dark)); themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode'); };
  themeBtn.onclick = () => { if (themeHandler) setTheme(themeHandler()); sound.play('menu'); themeBtn.blur(); };

  /* credit line */
  const credit = $('credit');
  if (REPO_URL) { const a = document.createElement('a'); a.href = REPO_URL; a.target = '_blank'; a.rel = 'noopener'; a.textContent = CREDIT; credit.appendChild(a); } else credit.textContent = CREDIT;

  /* stall labels */
  const labels = PROJECTS.map((p) => { const b = document.createElement('button'); b.className = 'lbl'; b.textContent = p.label; b.onclick = () => openCard(p.id); $('labels').appendChild(b); return b; });

  return {
    isTouch, openCard, closeCard, openMenu, closeMenu, setTheme,
    onThemeToggle(fn) { themeHandler = fn; },
    openId: () => openId,
    nearId: () => nearId,
    paused: () => !!openId || menuOpen(),
    escape() { if (openId) closeCard(); else closeMenu(); },
    setNear(id) {
      if (id !== nearId) { nearId = id; if (id) { sound.play('near'); $('promptText').textContent = 'Open ' + PROJECTS.find((p) => p.id === id).label; } }
      const show = !!nearId && !openId && !menuOpen(); promptEl.hidden = !show || isTouch; tUse.hidden = !show;
    },
    placeLabel(i, sx, sy, id) { const el = labels[i]; el.style.transform = 'translate(-50%,-100%) translate(' + sx.toFixed(1) + 'px,' + Math.max(44, sy).toFixed(1) + 'px)'; el.classList.toggle('near', id === nearId); },
  };
}
