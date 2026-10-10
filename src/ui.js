// Interface layer: labels, the E prompt, the project popup, the menu, the wardrobe,
// the agent chat box and the achievement badge. Plain DOM on top of the canvas so
// text stays crisp and links are real links.
import { STALLS, AGENTS, HALL_LABEL, ACHIEVEMENT, CREDIT, REPO_URL } from './config.js';
import { fill } from './textures.js';
import { sound, music } from './audio.js';
import { OUTFITS, drawSprite, drawFace } from './figures.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

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

// handlers: { goTo(id), pickOutfit(id), endWardrobe(keep), toggleTheme() -> bool }
export function createUI(canvas, handlers) {
  const scrim = $('scrim'), side = $('side'), menuBtn = $('menuBtn'), menuScrim = $('menuScrim'), promptEl = $('prompt'), touchUI = $('touch'), tUse = $('tUse');
  const ward = $('wardrobe'), chat = $('chat'), toastEl = $('toast');
  const isTouch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (isTouch) touchUI.hidden = false;
  let openId = null, chatId = null, wardOpen = false, promptText = null;
  const menuOpen = () => side.classList.contains('open');
  const focusGame = () => canvas.focus({ preventScroll: true });

  /* project popup */
  function openCard(id) {
    const p = STALLS.find((q) => q.id === id); if (!p || p.kind !== 'project') return;
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
    scrim.classList.add('show'); $('cardClose').focus({ preventScroll: true }); sound.play('open');
  }
  function closeCard() { if (!openId) return; openId = null; scrim.classList.remove('show'); sound.play('close'); focusGame(); }
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
  const ticks = {};
  const navItem = (id, title, color, list) => {
    const b = el('button', 'navbtn'); const sw = el('b'); sw.style.background = color; b.appendChild(sw); b.appendChild(el('span', 'navname', title));
    const t = el('i', 'tick'); t.setAttribute('aria-hidden', 'true'); b.appendChild(t); ticks[id] = b;
    b.onclick = () => { closeMenu(true); focusGame(); handlers.goTo(id); }; $(list).appendChild(b);
  };
  STALLS.forEach((p) => navItem(p.id, p.title, p.color, p.email ? 'navContact' : p.kind === 'outfits' ? 'navVillage' : 'navProjects'));
  navItem('hall', HALL_LABEL + ' (town hall)', '#8b8a86', 'navVillage'); ticks.hall.classList.add('noTick');

  /* top buttons */
  const toggleBtn = (id, isOn, flip, onWord, offWord) => {
    const b = $(id); const paint = () => { const v = isOn(); b.classList.toggle('alt', !v); b.setAttribute('aria-pressed', String(v)); b.setAttribute('aria-label', v ? offWord : onWord); };
    b.onclick = () => { flip(); paint(); b.blur(); }; paint(); return b;
  };
  toggleBtn('soundBtn', sound.isOn, () => { if (sound.toggle()) sound.play('menu'); }, 'Turn sound on', 'Turn sound off');
  const musicBtn = toggleBtn('musicBtn', music.isOn, () => { music.toggle(); sound.play('menu'); }, 'Turn music on', 'Turn music off'); if (!music.available) musicBtn.hidden = true;
  const themeBtn = $('themeBtn');
  const setTheme = (dark) => { themeBtn.classList.toggle('alt', dark); themeBtn.setAttribute('aria-pressed', String(dark)); themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode'); };
  themeBtn.onclick = () => { setTheme(handlers.toggleTheme()); sound.play('menu'); themeBtn.blur(); };

  /* credit line */
  const credit = $('credit');
  if (REPO_URL) { const a = el('a', '', CREDIT); a.href = REPO_URL; a.target = '_blank'; a.rel = 'noopener'; credit.appendChild(a); } else credit.textContent = CREDIT;

  /* labels: stalls, the town hall, and a name tag for each agent */
  const labels = {};
  const addLabel = (key, text, onClick) => { const b = el('button', 'lbl', text); b.onclick = onClick; $('labels').appendChild(b); labels[key] = b; };
  STALLS.forEach((p) => addLabel(p.id, p.label, () => (p.kind === 'project' ? openCard(p.id) : handlers.goTo(p.id))));
  addLabel('hall', HALL_LABEL, () => handlers.goTo('hall'));
  AGENTS.forEach((a) => { const d = el('div', 'alab'); d.appendChild(el('strong', '', a.name)); const s = el('span', '', 'Working'); s.prepend(el('i')); d.appendChild(s); $('labels').appendChild(d); labels[a.id] = d; });

  /* wardrobe */
  const grid = $('wardGrid'), cards = {};
  OUTFITS.forEach((o) => {
    const b = el('button', 'wcard'); const c = document.createElement('canvas'); c.width = 16; c.height = 32; drawSprite(c.getContext('2d'), o);
    b.appendChild(c); b.appendChild(el('span', 'wname', o.name)); b.appendChild(el('em', '', 'Selected'));
    b.onclick = () => { select(o.id); handlers.pickOutfit(o.id); sound.play('near'); }; grid.appendChild(b); cards[o.id] = b;
  });
  const select = (id) => { for (const k in cards) { cards[k].classList.toggle('sel', k === id); cards[k].setAttribute('aria-pressed', String(k === id)); } };
  function openWardrobe(current) { closeMenu(true); wardOpen = true; select(current); ward.classList.add('show'); sound.play('open'); cards[current].focus({ preventScroll: true }); }
  function closeWardrobe(keep) { if (!wardOpen) return; wardOpen = false; ward.classList.remove('show'); sound.play('close'); handlers.endWardrobe(keep); focusGame(); }
  $('wardDone').onclick = () => closeWardrobe(true); $('wardClose').onclick = () => closeWardrobe(false);

  /* agent chat */
  let typer = 0;
  function openChat(a, design) {
    closeMenu(true); chatId = a.id; $('chatName').textContent = a.name; $('chatRole').textContent = a.role;
    drawFace($('chatFace').getContext('2d'), design); $('chatFace').style.background = a.color;
    const out = $('chatText'); out.textContent = ''; clearInterval(typer); let i = 0;
    typer = setInterval(() => { i += 2; out.textContent = a.line.slice(0, i); if (i >= a.line.length) clearInterval(typer); }, 28);
    out.setAttribute('aria-label', a.line); chat.classList.add('show'); sound.play('villager');
  }
  function closeChat() { if (!chatId) return; chatId = null; clearInterval(typer); chat.classList.remove('show'); sound.play('close'); focusGame(); }
  $('chatClose').onclick = closeChat;

  /* achievement badge */
  let toastT = 0;
  function toast() {
    const g = $('toastArt').getContext('2d'); g.clearRect(0, 0, 16, 16); WOLF_ICON(g);
    $('toastTitle').textContent = ACHIEVEMENT.title; $('toastText').textContent = ACHIEVEMENT.text;
    toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 6500);
  }

  const busy = () => !!openId || !!chatId || wardOpen || menuOpen();
  return {
    isTouch, openCard, closeCard, openMenu, closeMenu, setTheme, openWardrobe, closeWardrobe, openChat, closeChat, toast,
    openId: () => openId, chatId: () => chatId, wardrobeOpen: () => wardOpen,
    paused: busy,
    // closes whatever is open; returns true if something was
    escape() { if (openId) closeCard(); else if (chatId) closeChat(); else if (wardOpen) closeWardrobe(false); else if (menuOpen()) closeMenu(); else return false; return true; },
    // text is what E will do, or null for nothing in range
    setPrompt(text) {
      if (text !== promptText) { promptText = text; if (text) { sound.play('near'); $('promptText').textContent = text; tUse.textContent = text.split(' ')[0]; } }
      const show = !!promptText && !busy(); promptEl.hidden = !show || isTouch; tUse.hidden = !show;
    },
    setProgress(visited, unlocked) {
      const total = STALLS.length, n = STALLS.filter((p) => visited.has(p.id)).length;
      STALLS.forEach((p) => ticks[p.id].classList.toggle('done', visited.has(p.id)));
      $('progCount').textContent = n + ' of ' + total + ' stalls explored'; $('progBar').style.width = (n / total) * 100 + '%';
      $('progHint').textContent = unlocked ? 'Wolf companion unlocked' : 'Open every stall to earn a companion';
      $('progress').classList.toggle('won', unlocked);
    },
    placeLabel(key, sx, sy, near, alpha = 1) {
      const e = labels[key]; if (alpha < 0.03) { if (!e.hidden) e.hidden = true; return; } if (e.hidden) e.hidden = false;
      e.style.transform = 'translate(-50%,-100%) translate(' + sx.toFixed(1) + 'px,' + Math.max(44, sy).toFixed(1) + 'px)'; e.style.opacity = alpha.toFixed(2); e.classList.toggle('near', !!near);
    },
  };
}

function WOLF_ICON(g) {
  const f = (c, x, y, w, h) => fill(g, c, x, y, w, h), a = '#e9e6df', b = '#cfcac0', d = '#2a2623';
  f(a, 3, 1, 3, 3); f(a, 10, 1, 3, 3); f(b, 4, 2, 1, 2); f(b, 11, 2, 1, 2); f(a, 3, 4, 10, 7); f(b, 5, 9, 6, 4); f(d, 5, 6, 2, 2); f(d, 9, 6, 2, 2); f(d, 7, 10, 2, 1); f('#c23b32', 4, 13, 8, 2); f('#e4b93a', 7, 14, 2, 1);
}
