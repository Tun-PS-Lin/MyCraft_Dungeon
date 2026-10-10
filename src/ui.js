// Interface layer: labels, the E prompt, the project popup, the menu, the wardrobe,
// the agent chat box and the achievement badge. Plain DOM on top of the canvas so
// text stays crisp and links are real links. All wording comes through i18n.js.
import { STALLS, AGENTS, HALL_LABEL, CREDIT, REPO_URL } from './config.js';
import { fill } from './textures.js';
import { sound, music } from './audio.js';
import { OUTFITS, drawSprite, drawFace } from './figures.js';
import { t, tr, getLang, setLang } from './i18n.js';
import { BASE } from './base.js';

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
  urbansim(g) {
    const heat = ['#2b6fd0', '#2fa0a8', '#57d47c', '#e4d23a', '#f08a2a', '#d8403a'];
    fill(g, '#0f1420', 2, 2, 28, 28); fill(g, '#2a3145', 3, 3, 26, 26);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const d = Math.hypot(i - 3.3, j - 2.2), k = Math.max(0, Math.min(5, Math.round(5 - d * 1.35 + (((i * 7 + j * 3) % 3) - 1) * 0.5))); fill(g, heat[k], 4 + i * 4, 4 + j * 4, 3, 3); }
    fill(g, '#ffffff', 17, 12, 1, 1);
  },
  contact(g) {
    const f = (c, x, y, w, h) => fill(g, c, x, y, w, h);
    f('#8d8d8a', 5, 10, 24, 16); f('#fbfaf4', 4, 9, 24, 16); f('#d9d6ca', 4, 9, 24, 1);
    for (let i = 0; i < 12; i++) { f('#b9b6aa', 4 + i, 10 + Math.round(i * 0.6), 1, 1); f('#b9b6aa', 27 - i, 10 + Math.round(i * 0.6), 1, 1); }
    f('#d33b32', 14, 15, 4, 4); f('#ff9de0', 15, 16, 2, 2); f('#ff9de0', 29, 6, 1, 1); f('#ff9de0', 2, 22, 1, 1);
  },
};

// handlers: { goTo(id), pickOutfit(id), endWardrobe(keep), toggleTheme() -> bool, languageChanged() }
export function createUI(canvas, handlers) {
  const scrim = $('scrim'), side = $('side'), menuBtn = $('menuBtn'), menuScrim = $('menuScrim'), promptEl = $('prompt'), touchUI = $('touch'), tUse = $('tUse');
  const ward = $('wardrobe'), chat = $('chat'), toastEl = $('toast');
  const isTouch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (isTouch) { touchUI.hidden = false; document.body.classList.add('touch'); }
  let openId = null, chatAgent = null, chatDesign = null, wardOpen = false, promptKey = null, progress = { visited: new Set(), unlocked: false };
  const menuOpen = () => side.classList.contains('open');
  const focusGame = () => canvas.focus({ preventScroll: true });
  const hallName = () => HALL_LABEL[getLang()] || HALL_LABEL.en;

  /* project popup */
  function fillCard() {
    const p = STALLS.find((q) => q.id === openId); if (!p) return;
    $('cardKicker').textContent = tr(p, 'label'); $('cardTitle').textContent = tr(p, 'title'); $('cardDesc').textContent = tr(p, 'desc');
    const go = $('cardGo'), email = $('cardEmail');
    email.hidden = !p.email; if (p.email) { $('emailText').textContent = p.email; $('emailCopy').textContent = t('copy'); }
    if (p.url) {
      go.className = ''; go.href = p.url; go.removeAttribute('aria-disabled');
      if (p.email) go.removeAttribute('target'); else go.target = '_blank';
      go.querySelector('span').textContent = tr(p, 'cta') + (p.email ? '' : ' ↗'); go.querySelector('small').textContent = tr(p, 'sub');
    } else {
      go.className = 'off'; go.removeAttribute('href'); go.setAttribute('aria-disabled', 'true');
      go.querySelector('span').textContent = t('soon'); go.querySelector('small').textContent = t('soonSub');
    }
  }
  function openCard(id) {
    const p = STALLS.find((q) => q.id === id); if (!p || p.kind !== 'project') return;
    closeMenu(true); openId = id; fillCard();
    const g = $('cardArt').getContext('2d'); g.clearRect(0, 0, 32, 32); ART[id](g);
    const img = $('cardImg'); if (p.image) { img.src = BASE + 'assets/images/' + p.image; img.alt = tr(p, 'title'); img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
    $('card').scrollTop = 0; scrim.classList.add('show'); $('cardClose').focus({ preventScroll: true }); sound.play('open');
  }
  function closeCard() { if (!openId) return; openId = null; scrim.classList.remove('show'); sound.play('close'); focusGame(); }
  $('cardClose').onclick = closeCard; $('cardImg').onerror = () => { $('cardImg').hidden = true; };
  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) closeCard(); });
  $('emailCopy').onclick = () => {
    const done = () => { $('emailCopy').textContent = t('copied'); };
    const select = () => { const r = document.createRange(); r.selectNodeContents($('emailText')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText($('emailText').textContent).then(done).catch(select); else select();
  };

  /* menu */
  function openMenu() { side.classList.add('open'); menuBtn.classList.add('open'); menuScrim.classList.add('show'); menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu'); sound.play('menu'); }
  function closeMenu(silent) { if (!menuOpen()) return; side.classList.remove('open'); menuBtn.classList.remove('open'); menuScrim.classList.remove('show'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); if (!silent) sound.play('menu'); }
  menuBtn.onclick = () => (menuOpen() ? closeMenu() : openMenu());
  menuScrim.addEventListener('pointerdown', () => closeMenu());
  const nav = {};
  const navItem = (id, color, list) => {
    const b = el('button', 'navbtn'); const sw = el('b'); sw.style.background = color; b.appendChild(sw); const name = el('span', 'navname'); b.appendChild(name);
    const tick = el('i', 'tick'); tick.setAttribute('aria-hidden', 'true'); b.appendChild(tick); nav[id] = { b, name };
    b.onclick = () => { closeMenu(true); focusGame(); handlers.goTo(id); }; $(list).appendChild(b);
  };
  STALLS.forEach((p) => navItem(p.id, p.color, p.email ? 'navContact' : p.kind === 'outfits' ? 'navVillage' : 'navProjects'));
  navItem('hall', '#8b8a86', 'navVillage'); nav.hall.b.classList.add('noTick');

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
  const labels = {}, agentStatus = [];
  const addLabel = (key, onClick) => { const b = el('button', 'lbl'); b.onclick = onClick; $('labels').appendChild(b); labels[key] = b; };
  STALLS.forEach((p) => addLabel(p.id, () => (p.kind === 'project' ? openCard(p.id) : handlers.goTo(p.id))));
  addLabel('hall', () => handlers.goTo('hall'));
  AGENTS.forEach((a) => { const d = el('div', 'alab'); d.appendChild(el('strong', '', a.name)); const s = el('span'); s.appendChild(el('i')); const w = el('b'); s.appendChild(w); agentStatus.push(w); d.appendChild(s); $('labels').appendChild(d); labels[a.id] = d; });

  /* wardrobe */
  const grid = $('wardGrid'), cards = {};
  OUTFITS.forEach((o) => {
    const b = el('button', 'wcard'); const c = document.createElement('canvas'); c.width = 16; c.height = 32; drawSprite(c.getContext('2d'), o);
    const name = el('span', 'wname'), tag = el('em'); b.appendChild(c); b.appendChild(name); b.appendChild(tag);
    b.onclick = () => { select(o.id); handlers.pickOutfit(o.id); sound.play('near'); }; grid.appendChild(b); cards[o.id] = { b, name, tag };
  });
  const select = (id) => { for (const k in cards) { cards[k].b.classList.toggle('sel', k === id); cards[k].b.setAttribute('aria-pressed', String(k === id)); } };
  function openWardrobe(current) { closeMenu(true); wardOpen = true; select(current); ward.classList.add('show'); sound.play('open'); cards[current].b.focus({ preventScroll: true }); }
  function closeWardrobe(keep) { if (!wardOpen) return; wardOpen = false; ward.classList.remove('show'); sound.play('close'); handlers.endWardrobe(keep); focusGame(); }
  $('wardDone').onclick = () => closeWardrobe(true); $('wardClose').onclick = () => closeWardrobe(false);

  /* agent chat */
  let typer = 0;
  function typeLine() {
    const line = tr(chatAgent, 'line'), out = $('chatText'), chars = Array.from(line); out.textContent = ''; clearInterval(typer); let i = 0;
    typer = setInterval(() => { i += 2; out.textContent = chars.slice(0, i).join(''); if (i >= chars.length) clearInterval(typer); }, 28);
    out.setAttribute('aria-label', line); $('chatRole').textContent = tr(chatAgent, 'role');
  }
  function openChat(a, design) {
    closeMenu(true); chatAgent = a; chatDesign = design; $('chatName').textContent = a.name;
    drawFace($('chatFace').getContext('2d'), design); $('chatFace').style.background = a.color;
    typeLine(); chat.classList.add('show'); sound.play('villager');
  }
  function closeChat() { if (!chatAgent) return; chatAgent = null; clearInterval(typer); chat.classList.remove('show'); sound.play('close'); focusGame(); }
  $('chatClose').onclick = closeChat;

  /* achievement badge */
  let toastT = 0;
  function toast() {
    const g = $('toastArt').getContext('2d'); g.clearRect(0, 0, 16, 16); WOLF_ICON(g);
    toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 6500);
  }

  function paintProgress() {
    const total = STALLS.length, n = STALLS.filter((p) => progress.visited.has(p.id)).length;
    STALLS.forEach((p) => nav[p.id].b.classList.toggle('done', progress.visited.has(p.id)));
    $('progCount').textContent = t('progress', { n, t: total }); $('progBar').style.width = (n / total) * 100 + '%';
    $('progHint').textContent = progress.unlocked ? t('progWon') : t('progHint'); $('progress').classList.toggle('won', progress.unlocked);
  }

  /* language: write every piece of text again in the current language */
  let promptVars = null;
  function paintText() {
    document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = t(e.dataset.t); });
    STALLS.forEach((p) => { labels[p.id].textContent = tr(p, 'label'); nav[p.id].name.textContent = tr(p, 'title'); });
    labels.hall.textContent = hallName(); nav.hall.name.textContent = t('townHall', { name: hallName() });
    agentStatus.forEach((w) => { w.textContent = t('working'); });
    OUTFITS.forEach((o) => { cards[o.id].name.textContent = t('o.' + o.id); cards[o.id].tag.textContent = t('selected'); });
    $('chatHint').textContent = t(isTouch ? 'chatHintTouch' : 'chatHint'); $('toastTitle').textContent = t('achTitle'); $('toastText').textContent = t('achText');
    $('tJump').textContent = t('jump');
    if (promptKey) { $('promptText').textContent = t(promptKey, promptVars); tUse.textContent = t(promptKey === 'talkTo' ? 'talk' : 'use'); }
    paintProgress(); if (openId) fillCard(); if (chatAgent) typeLine();
    langBtn.classList.toggle('alt', getLang() === 'my'); langBtn.setAttribute('aria-pressed', String(getLang() === 'my')); langBtn.setAttribute('aria-label', getLang() === 'my' ? 'Switch to English' : 'ဗမာစာသို့ ပြောင်းရန်');
  }
  // fade the words out, swap them, fade back in
  const langBtn = $('langBtn'); let swapping = 0;
  langBtn.onclick = () => {
    langBtn.blur(); sound.play('menu'); clearTimeout(swapping); document.body.classList.add('lang-swap');
    const next = getLang() === 'my' ? 'en' : 'my'; langBtn.classList.toggle('alt', next === 'my');
    swapping = setTimeout(() => { setLang(next); paintText(); handlers.languageChanged(); document.body.classList.remove('lang-swap'); }, 300);
  };
  paintText();

  const busy = () => !!openId || !!chatAgent || wardOpen || menuOpen();
  return {
    isTouch, openCard, closeCard, openMenu, closeMenu, setTheme, openWardrobe, closeWardrobe, openChat, closeChat, toast,
    openId: () => openId, chatId: () => (chatAgent ? chatAgent.id : null), wardrobeOpen: () => wardOpen,
    paused: busy,
    // closes whatever is open; returns true if something was
    escape() { if (openId) closeCard(); else if (chatAgent) closeChat(); else if (wardOpen) closeWardrobe(false); else if (menuOpen()) closeMenu(); else return false; return true; },
    // what E will do: an i18n key plus its values and an id for change detection, or null
    setPrompt(key, vars, id) {
      const sig = key ? key + '|' + id : null;
      if (sig !== this._sig) { this._sig = sig; promptKey = key; promptVars = vars; if (key) { sound.play('near'); $('promptText').textContent = t(key, vars); tUse.textContent = t(key === 'talkTo' ? 'talk' : 'use'); } }
      const show = !!promptKey && !busy(); promptEl.hidden = !show || isTouch; tUse.hidden = !show;
    },
    setProgress(visited, unlocked) { progress = { visited, unlocked }; paintProgress(); },
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
