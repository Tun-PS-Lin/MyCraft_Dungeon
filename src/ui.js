// Interface layer: labels, the E prompt, the project popup, the menu, the wardrobe,
// the agent chat box and the achievement badge. Plain DOM on top of the canvas so
// text stays crisp and links are real links. All wording comes through i18n.js.
import { STALLS, AGENTS, HALL_LABEL, CREDIT, REPO_URL, INTRO_NAME, INTRO_BY, LANGUAGE_TOGGLE } from './config.js';
import { DEMOS } from './demos.js';
import { fill } from './textures.js';
import { sound, music } from './audio.js';
import { OUTFITS, SPRITE, drawSprite, drawFace } from './figures.js';
import { t, tr, getLang, setLang } from './i18n.js';
import { BASE } from './base.js';

const $ = (id) => document.getElementById(id);
// a lighter version of a stall colour, readable as text on a dark ground
const lighten = (hex, k = 0.5) => { const n = parseInt(hex.slice(1), 16); return 'rgb(' + [16, 8, 0].map((s) => Math.round(((n >> s) & 255) * (1 - k) + 255 * k)).join(',') + ')'; };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

/* 32×32 pixel-art picture for each popup. Replace with <img> files later if you like. */
const ART = {
  about(g) { // a little signpost
    const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    f('#5b3a1e', 8, 14, 3, 16); f('#5b3a1e', 21, 14, 3, 16); f('#3a2413', 4, 5, 24, 13); f('#c98a4b', 5, 6, 22, 11); f('#e4b93a', 5, 6, 22, 1);
    f('#3a2413', 8, 9, 10, 2); f('#3a2413', 8, 13, 15, 1); f('#7a4f1a', 2, 3, 28, 2); f('#ffd84a', 24, 9, 2, 2);
  },
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
  cinema(g) { // a clapperboard
    const f = (c, x, y, w, h) => fill(g, c, x, y, w, h);
    f('#1a1416', 4, 13, 24, 15); f('#2b2226', 5, 14, 22, 13);
    f('#f4f1e6', 6, 17, 20, 1); f('#f4f1e6', 6, 21, 20, 1); f('#ffd27a', 7, 23, 8, 2); f('#d8403a', 18, 23, 6, 2);
    for (let i = 0; i < 4; i++) { f('#f4f1e6', 4 + i * 6, 9 - Math.round(i * 1.4), 3, 4); f('#1a1416', 7 + i * 6, 9 - Math.round(i * 1.4) - 1, 3, 4); }
    f('#1a1416', 3, 9, 26, 1); f('#d8403a', 2, 12, 28, 1); f('#ffd27a', 27, 4, 1, 1); f('#ffd27a', 2, 5, 1, 1);
  },
  contact(g) {
    const f = (c, x, y, w, h) => fill(g, c, x, y, w, h);
    f('#8d8d8a', 5, 10, 24, 16); f('#fbfaf4', 4, 9, 24, 16); f('#d9d6ca', 4, 9, 24, 1);
    for (let i = 0; i < 12; i++) { f('#b9b6aa', 4 + i, 10 + Math.round(i * 0.6), 1, 1); f('#b9b6aa', 27 - i, 10 + Math.round(i * 0.6), 1, 1); }
    f('#d33b32', 14, 15, 4, 4); f('#ff9de0', 15, 16, 2, 2); f('#ff9de0', 29, 6, 1, 1); f('#ff9de0', 2, 22, 1, 1);
  },
};

// handlers: { goTo(id), pickOutfit(id), endWardrobe(keep), toggleTheme() -> bool, languageChanged(),
//             agentState(id) -> { status, where, last }, agentLog() -> [...], callAgent(id), agentDesign(id) }
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
    $('cardTitle').textContent = tr(p, 'title'); $('cardDesc').textContent = tr(p, 'desc');
    const go = $('cardGo'), email = $('cardEmail');
    if (p.about) { go.className = 'about'; go.href = '#'; go.removeAttribute('target'); go.removeAttribute('aria-disabled'); go.querySelector('span').textContent = tr(p, 'cta'); go.querySelector('small').textContent = tr(p, 'sub'); email.hidden = true; return; }
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
    const card = $('card'), img = $('cardImg'); card.style.setProperty('--accent', p.color); card.classList.toggle('noimg', !p.image);
    // empty the frame first, so the last stall's picture never shows while this one loads
    img.classList.remove('ready'); img.removeAttribute('src'); img.alt = '';
    if (p.image) { const pic = preload(p.image); const show = () => { if (openId !== id) return; img.src = pic.src; img.alt = tr(p, 'title'); requestAnimationFrame(() => img.classList.add('ready')); }; if (pic.complete && pic.naturalWidth) show(); else { pic.addEventListener('load', show, { once: true }); pic.addEventListener('error', () => { if (openId === id) card.classList.add('noimg'); }, { once: true }); } }
    card.scrollTop = 0; scrim.classList.add('show'); $('cardClose').focus({ preventScroll: true }); sound.play('open');
  }
  function closeCard() { if (!openId) return; openId = null; scrim.classList.remove('show'); sound.play('close'); focusGame(); }
  $('cardClose').onclick = closeCard;
  // the About Me signpost's button opens the village map rather than a link
  $('cardGo').addEventListener('click', (e) => { const p = STALLS.find((q) => q.id === openId); if (p && p.about) { e.preventDefault(); closeCard(); openMenu(); } });
  // fetch every popup picture ahead of time, once the page has settled
  const pics = {};
  function preload(file) { if (!pics[file]) { pics[file] = new Image(); pics[file].decoding = 'async'; pics[file].src = BASE + 'assets/images/' + file; } return pics[file]; }
  setTimeout(() => STALLS.forEach((p) => { if (p.image) preload(p.image); }), 2500);
  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) closeCard(); });
  $('emailCopy').onclick = () => {
    const done = () => { $('emailCopy').textContent = t('copied'); };
    const select = () => { const r = document.createRange(); r.selectNodeContents($('emailText')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText($('emailText').textContent).then(done).catch(select); else select();
  };

  /* menu */
  function openMenu() { side.classList.add('open'); menuBtn.classList.add('open'); menuScrim.classList.add('show'); menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu'); sound.play('menu'); sound.play('whoosh'); }
  function closeMenu(silent) { if (!menuOpen()) return; side.classList.remove('open'); menuBtn.classList.remove('open'); menuScrim.classList.remove('show'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); if (!silent) sound.play('menu'); }
  menuBtn.onclick = () => (menuOpen() ? closeMenu() : openMenu());
  menuScrim.addEventListener('pointerdown', () => closeMenu());
  const nav = {};
  const navItem = (id, color, list) => {
    const b = el('button', 'navbtn'); const sw = el('b'); sw.style.background = color; b.appendChild(sw); const name = el('span', 'navname'); b.appendChild(name);
    const tick = el('i', 'tick'); tick.setAttribute('aria-hidden', 'true'); b.appendChild(tick); nav[id] = { b, name };
    b.onclick = () => { closeMenu(true); focusGame(); handlers.goTo(id); }; $(list).appendChild(b);
  };
  STALLS.forEach((p) => navItem(p.id, p.color, p.email || p.about ? 'navContact' : p.kind === 'outfits' ? 'navVillage' : 'navProjects'));
  navItem('hall', '#8b8a86', 'navVillage'); nav.hall.b.classList.add('noTick');
  navItem('hideout', '#ffd060', 'navVillage'); nav.hideout.b.classList.add('noTick');
  navItem('pond', '#62c8ff', 'navVillage'); nav.pond.b.classList.add('noTick');

  /* top buttons */
  const toggleBtn = (id, isOn, flip, onWord, offWord) => {
    const b = $(id); const paint = b._paint = () => { const v = isOn(); b.classList.toggle('alt', !v); b.setAttribute('aria-pressed', String(v)); b.setAttribute('aria-label', v ? offWord : onWord); };
    b.onclick = () => { flip(); paint(); b.blur(); }; paint(); return b;
  };
  toggleBtn('soundBtn', sound.isOn, () => { if (sound.toggle()) sound.play('menu'); }, 'Turn sound on', 'Turn sound off');
  const musicBtn = toggleBtn('musicBtn', music.isOn, () => { music.toggle(); sound.play('menu'); }, 'Turn music on', 'Turn music off'); if (!music.available) musicBtn.hidden = true; music.onChange(() => musicBtn._paint());
  const themeBtn = $('themeBtn');
  const setTheme = (dark) => { themeBtn.classList.toggle('alt', dark); themeBtn.setAttribute('aria-pressed', String(dark)); themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode'); };
  themeBtn.onclick = () => { setTheme(handlers.toggleTheme()); sound.play('menu'); themeBtn.blur(); };

  /* credit line */
  const credit = $('credit');
  if (REPO_URL) { const a = el('a', '', CREDIT); a.href = REPO_URL; a.target = '_blank'; a.rel = 'noopener'; credit.appendChild(a); } else credit.textContent = CREDIT;

  /* labels: stalls, the town hall, and a name tag for each agent */
  const labels = {}, labelText = {}, agentStatus = {}, agentState = {};
  const addLabel = (key, color, onClick) => { const b = el('button', 'lbl'); b.appendChild(el('i')); labelText[key] = b.appendChild(el('span')); b.style.setProperty('--accent', color); b.style.setProperty('--accent-hi', lighten(color)); b.onclick = onClick; $('labels').appendChild(b); labels[key] = b; };
  STALLS.forEach((p) => addLabel(p.id, p.color, () => (p.kind === 'project' ? openCard(p.id) : handlers.goTo(p.id))));
  addLabel('hall', '#b9b6ae', () => handlers.goTo('hall'));
  AGENTS.forEach((a) => { const d = el('div', 'alab'); d.appendChild(el('strong', '', a.name)); const st = el('span'); st.appendChild(el('i')); agentStatus[a.id] = st.appendChild(el('b')); agentState[a.id] = 'working'; d.appendChild(st); $('labels').appendChild(d); labels[a.id] = d; });

  /* wardrobe */
  const grid = $('wardGrid'), cards = {};
  OUTFITS.forEach((o) => {
    const b = el('button', 'wcard'); b.style.setProperty('--i', grid.children.length); const c = document.createElement('canvas'); c.width = SPRITE.w; c.height = SPRITE.h; drawSprite(c.getContext('2d'), o);
    const name = el('span', 'wname'), tag = el('em'); b.appendChild(c); b.appendChild(name); b.appendChild(tag);
    b.onclick = () => { select(o.id); handlers.pickOutfit(o.id); sound.play('near'); }; grid.appendChild(b); cards[o.id] = { b, name, tag };
  });
  const select = (id) => { for (const k in cards) { cards[k].b.classList.toggle('sel', k === id); cards[k].b.setAttribute('aria-pressed', String(k === id)); } };
  function openWardrobe(current) { closeMenu(true); wardOpen = true; select(current); ward.classList.add('show'); sound.play('open'); cards[current].b.focus({ preventScroll: true }); }
  function closeWardrobe(keep) { if (!wardOpen) return; wardOpen = false; ward.classList.remove('show'); sound.play('close'); handlers.endWardrobe(keep); focusGame(); }
  $('wardDone').onclick = () => closeWardrobe(true); $('wardClose').onclick = () => closeWardrobe(false);

  /* agent chat, with that agent's demo underneath */
  let typer = 0, demoStop = () => {};
  function typeLine() {
    const line = tr(chatAgent, 'line'), out = $('chatText'), chars = Array.from(line); out.textContent = ''; clearInterval(typer); let i = 0;
    typer = setInterval(() => { i += 2; out.textContent = chars.slice(0, i).join(''); if (i >= chars.length) clearInterval(typer); }, 28);
    out.setAttribute('aria-label', line); $('chatRole').textContent = tr(chatAgent, 'role');
  }
  function openChat(a, design) {
    closeMenu(true); chatAgent = a; chatDesign = design; $('chatName').textContent = a.name;
    drawFace($('chatFace').getContext('2d'), design); $('chatFace').style.background = a.color;
    typeLine(); demoStop(); $('chatDemo').textContent = ''; if (DEMOS[a.id]) demoStop = DEMOS[a.id]($('chatDemo'), a) || demoStop;
    chat.scrollTop = 0; chat.classList.add('show'); sound.play('villager');
  }
  function closeChat() { if (!chatAgent) return; chatAgent = null; clearInterval(typer); demoStop(); demoStop = () => {}; chat.classList.remove('show'); sound.play('close'); focusGame(); }
  $('chatClose').onclick = closeChat;

  /* agent board: a row of character cards (portrait, name, role, what they do, a face badge and
     their colours); pick one and the strip underneath shows their desk: schedule, last run, call button */
  const board = $('board'); let boardOpen = false, boardPick = AGENTS[0].id, boardTick = 0, logSig = '', lastShown = '', portraitsIn = false;
  const sprite = (id) => { const c = document.createElement('canvas'); c.width = SPRITE.w; c.height = SPRITE.h; drawSprite(c.getContext('2d'), handlers.agentDesign(id)); return c; };
  // five shades of the agent's colour, light to dark
  const shades = (hex) => { const n = parseInt(hex.slice(1), 16), ch = [16, 8, 0].map((k) => (n >> k) & 255); return [0.62, 0.36, 0, -0.22, -0.42].map((k) => 'rgb(' + ch.map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))).join(',') + ')'); };
  const bcard = {};
  AGENTS.forEach((a, i) => {
    const b = el('button', 'bcard'); b.style.setProperty('--accent', a.color); b.style.setProperty('--accent-hi', lighten(a.color, 0.82)); b.style.setProperty('--i', i);
    const pic = el('div', 'bpic'); pic.appendChild(sprite(a.id));
    const face = document.createElement('canvas'); face.width = face.height = 16; face.className = 'bface'; drawFace(face.getContext('2d'), handlers.agentDesign(a.id));
    const who = el('div', 'bwho'), names = el('div'); names.append(el('strong', '', a.name), el('small', 'brole', tr(a, 'role'))); who.append(names, face);
    const st = el('span', 'bst'), about = el('p', 'babout', a.about || tr(a, 'line')), sw = el('div', 'bsw'); shades(a.color).forEach((c) => { const q = el('i'); q.style.background = c; sw.appendChild(q); });
    b.append(pic, who, st, about, sw, el('em'));
    b.onclick = () => { if (boardPick === a.id) return; boardPick = a.id; sound.play('near'); paintBoard(true); }; $('boardGrid').appendChild(b); bcard[a.id] = { b, st, pic, role: names.lastChild };
  });
  // the 3D portraits are drawn the first time the board opens (the renderer makes them)
  function loadPortraits() { if (portraitsIn || !handlers.agentPortrait) return; portraitsIn = true; AGENTS.forEach((a) => { try { const c = handlers.agentPortrait(a.id); if (c) { bcard[a.id].pic.textContent = ''; bcard[a.id].pic.appendChild(c); bcard[a.id].pic.classList.add('three'); } } catch (e) { /* keep the flat sprite */ } }); }
  const whereText = (w) => t(w.key, w);
  const lastText = (l) => (l.real ? [l.when, l.result] : l.none ? [t('notYet'), ''] : l.at ? [t(l.days ? 'yesterday' : 'today') + ' ' + l.at, l.result] : [l.mins < 1 ? t('justNow') : t('minsAgo', { n: l.mins }), l.result.charAt(0).toUpperCase() + l.result.slice(1)]);
  function paintBoard(full) {
    AGENTS.forEach((a) => { const s = handlers.agentState(a.id), c = bcard[a.id]; c.st.textContent = t(s.status); c.st.className = 'bst ' + s.status; c.b.classList.toggle('on', a.id === boardPick); c.b.setAttribute('aria-pressed', String(a.id === boardPick)); c.b.lastChild.textContent = t('selected'); if (full) c.role.textContent = tr(a, 'role'); });
    const a = AGENTS.find((q) => q.id === boardPick), s = handlers.agentState(a.id), d = $('boardHero');
    if (full) {
      d.textContent = ''; d.style.setProperty('--accent', a.color); d.classList.remove('swap'); void d.offsetWidth; d.classList.add('swap');
      const head = el('div', 'bdesk-head'), face = document.createElement('canvas'); face.width = face.height = 16; face.className = 'bface'; drawFace(face.getContext('2d'), handlers.agentDesign(a.id));
      const hn = el('div'); hn.append(el('small', '', t('deskOf')), el('strong', '', a.name)); const state = el('span', 'bst'); state.id = 'boardState';
      head.append(face, hn, state); d.appendChild(head);
      d.appendChild(el('p', 'bhero-about', a.about || tr(a, 'line'))); // shown on phones, where the cards are compact
      const facts = el('dl', 'bfacts');
      [['schedule', a.schedule], ['delivers', a.delivers], ['lastRun', null, 'boardLast'], ['where', null, 'boardWhere']].forEach(([k, v, id]) => { if (!id && !v) return; const box = el('div'); box.appendChild(el('dt', '', t(k))); const dd = el('dd', '', v || ''); if (id) dd.id = id; box.appendChild(dd); facts.appendChild(box); });
      d.appendChild(facts);
      const call = el('button', 'bcall'); call.id = 'boardCall'; call.onclick = () => { handlers.callAgent(a.id); sound.play('villager'); paintBoard(false); }; d.appendChild(call);
      d.appendChild(el('p', 'bnote', t(isTouch ? 'boardTalkTouch' : 'boardTalk')));
    }
    const st = $('boardState'); st.textContent = t(s.status); st.className = 'bst ' + s.status;
    $('boardWhere').textContent = whereText(s.where);
    const [when, result] = lastText(s.last), lastEl = $('boardLast'); if (lastShown !== a.id + when + result || full) { lastShown = a.id + when + result; lastEl.textContent = when; if (result) lastEl.appendChild(el('small', '', result)); }
    const call = $('boardCall'); call.disabled = s.status === 'coming' || s.status === 'here'; call.textContent = s.status === 'coming' ? t('called') : s.status === 'here' ? t('isHere') : t('call');
    // activity log, newest first
    const log = handlers.agentLog(), sig = log.length ? log[0].time + log[0].id + log[0].text + log.length : '';
    if (sig !== logSig || full) { logSig = sig; const ol = $('boardLog'); ol.textContent = ''; log.slice(0, 6).forEach((e) => { const li = el('li'); li.style.setProperty('--c', e.color); const tm = el('time', '', e.time), body = el('span'); body.append(el('b', '', e.name), document.createTextNode(' ' + e.text)); li.append(tm, body); ol.appendChild(li); }); }
  }
  function openBoard() { closeMenu(true); loadPortraits(); boardOpen = true; paintBoard(true); board.classList.add('show'); sound.play('open'); clearInterval(boardTick); boardTick = setInterval(() => paintBoard(false), 400); if (!isTouch) bcard[boardPick].b.focus({ preventScroll: true }); handlers.discovered && handlers.discovered('board'); }
  function closeBoard() { if (!boardOpen) return; boardOpen = false; clearInterval(boardTick); board.classList.remove('show'); sound.play('close'); focusGame(); }
  $('boardClose').onclick = closeBoard; board.addEventListener('pointerdown', (e) => { if (e.target === board) closeBoard(); });

  /* speech bubbles: a short line over an agent's head for a few seconds */
  const bubbleUntil = {};
  AGENTS.forEach((a) => { const b = el('div', 'bubble'); b.hidden = true; $('labels').appendChild(b); labels['say:' + a.id] = b; bubbleUntil[a.id] = 0; });
  function say(id, text) { labels['say:' + id].textContent = text; bubbleUntil[id] = performance.now() + 4200; }

  /* achievement badge */
  let toastT = 0;
  // the wolf badge by default; pass { title, text, icon(g) } for any other achievement
  function toast(o) {
    const g = $('toastArt').getContext('2d'); g.clearRect(0, 0, 16, 16); (o && o.icon ? o.icon : WOLF_ICON)(g);
    $('toastTitle').textContent = o ? o.title : t('achTitle'); $('toastText').textContent = o ? o.text : t('achText');
    toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 6500);
  }

  function paintProgress() {
    const counted = STALLS.filter((p) => !p.about), total = counted.length, n = counted.filter((p) => progress.visited.has(p.id)).length;
    STALLS.forEach((p) => nav[p.id].b.classList.toggle('done', !p.about && progress.visited.has(p.id))); nav.about && nav.about.b.classList.add('noTick');
    $('progCount').textContent = t('progress', { n, t: total }); $('progBar').style.width = (n / total) * 100 + '%';
    $('progHint').textContent = progress.unlocked ? t('progWon') : t('progHint'); $('progress').classList.toggle('won', progress.unlocked);
  }

  /* language: write every piece of text again in the current language */
  let promptVars = null;
  function paintText() {
    document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = t(e.dataset.t); });
    STALLS.forEach((p) => { labelText[p.id].textContent = tr(p, 'label'); nav[p.id].name.textContent = tr(p, 'title'); });
    labelText.hall.textContent = hallName(); nav.hall.name.textContent = t('townHall', { name: hallName() }); nav.hideout.name.textContent = t('hideoutNav'); nav.pond.name.textContent = t('pondNav');
    AGENTS.forEach((a) => { agentStatus[a.id].textContent = t(agentState[a.id]); });
    OUTFITS.forEach((o) => { cards[o.id].name.textContent = t('o.' + o.id); cards[o.id].tag.textContent = t('selected'); });
    $('chatHint').textContent = t(isTouch ? 'chatHintTouch' : 'chatHint'); $('toastTitle').textContent = t('achTitle'); $('toastText').textContent = t('achText');
    $('tJump').textContent = t('jump');
    if (promptKey) { $('promptText').textContent = t(promptKey, promptVars); tUse.textContent = t(promptKey === 'talkTo' ? 'talk' : 'use'); }
    langBtn.hidden = !LANGUAGE_TOGGLE;
    paintProgress(); if (openId) fillCard(); if (chatAgent) typeLine(); if (boardOpen) paintBoard(true);
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

  /* phones: language, music and sound live in the menu, leaving day/night and the menu button on screen */
  const narrow = window.matchMedia ? matchMedia('(max-width: 700px)') : null, tools = [...(LANGUAGE_TOGGLE ? [langBtn] : []), musicBtn, $('soundBtn')];
  const placeTools = () => tools.forEach((b) => { if (narrow && narrow.matches) $('sideTools').appendChild(b); else document.body.insertBefore(b, themeBtn); });
  placeTools(); if (narrow) { if (narrow.addEventListener) narrow.addEventListener('change', placeTools); else narrow.addListener(placeTools); }

  /* opening title card */
  const intro = $('intro'); $('introName').textContent = INTRO_NAME; $('introBy').textContent = INTRO_BY;
  const endIntro = () => {
    if (!intro.isConnected || intro.classList.contains('lift')) return;
    intro.classList.add('ready'); $('introState').textContent = 'Ready';
    setTimeout(() => { intro.classList.add('lift'); setTimeout(() => intro.remove(), 1200); }, 260);
  };

  const busy = () => !!openId || !!chatAgent || wardOpen || boardOpen || menuOpen();
  return {
    isTouch, endIntro, openCard, closeCard, openMenu, closeMenu, setTheme, openWardrobe, closeWardrobe, openChat, closeChat, openBoard, closeBoard, toast, say,
    openId: () => openId, chatId: () => (chatAgent ? chatAgent.id : null), wardrobeOpen: () => wardOpen, boardOpen: () => boardOpen,
    // the small status line under an agent's name tag
    setAgentStatus(id, key) { if (agentState[id] === key) return; agentState[id] = key; agentStatus[id].textContent = t(key); labels[id].classList.toggle('away', key !== 'working'); },
    paused: busy,
    // a name tag for something that is not a stall (the cave, the things in the Hideout)
    addPlace(key, text, color, onClick) { addLabel(key, color, onClick); labelText[key].textContent = text; },
    // closes whatever is open; returns true if something was
    escape() { if (openId) closeCard(); else if (chatAgent) closeChat(); else if (boardOpen) closeBoard(); else if (wardOpen) closeWardrobe(false); else if (menuOpen()) closeMenu(); else return false; return true; },
    // what E will do: an i18n key plus its values and an id for change detection, or null
    setPrompt(key, vars, id) {
      const sig = key ? key + '|' + id : null;
      if (sig !== this._sig) { this._sig = sig; promptKey = key; promptVars = vars; if (key) { sound.play('near'); $('promptText').textContent = t(key, vars); tUse.textContent = t(key === 'talkTo' ? 'talk' : 'use'); } }
      const show = !!promptKey && !busy(); promptEl.hidden = !show || isTouch; tUse.hidden = !show;
    },
    setProgress(visited, unlocked) { progress = { visited, unlocked }; paintProgress(); },
    placeLabel(key, sx, sy, near, alpha = 1) {
      if (key.startsWith('say:') && performance.now() > bubbleUntil[key.slice(4)]) alpha = 0;
      const e = labels[key]; if (alpha < 0.03) { if (!e.hidden) e.hidden = true; return; } if (e.hidden) e.hidden = false;
      e.style.transform = 'translate(-50%,-100%) translate(' + sx.toFixed(1) + 'px,' + Math.max(44, sy).toFixed(1) + 'px)'; e.style.opacity = (alpha * (near || labelText[key] === undefined ? 1 : 0.72)).toFixed(2); if (key === 'hall') e.hidden = true; // the hall now carries its own carved sign
    },
  };
}

function WOLF_ICON(g) {
  const f = (c, x, y, w, h) => fill(g, c, x, y, w, h), a = '#e9e6df', b = '#cfcac0', d = '#2a2623';
  f(a, 3, 1, 3, 3); f(a, 10, 1, 3, 3); f(b, 4, 2, 1, 2); f(b, 11, 2, 1, 2); f(a, 3, 4, 10, 7); f(b, 5, 9, 6, 4); f(d, 5, 6, 2, 2); f(d, 9, 6, 2, 2); f(d, 7, 10, 2, 1); f('#c23b32', 4, 13, 8, 2); f('#e4b93a', 7, 14, 2, 1);
}
