// The Hideout's three menus: the CD player (pick a CD), the journal (read an entry)
// and the gallery (flip through side projects). Their content is in hideout-content.js.
import { RECORDS, JOURNAL, GALLERY, BOOKS } from './hideout-content.js';
import { drawIcon, drawPainting, pictureCanvas } from './pixelart.js';
import { music, sound } from './audio.js';
import { BASE } from './base.js';
import { createBookViewer } from './book3d.js';
import { createProjectCube } from './cube3d.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const closeBtn = () => { const b = el('button', 'xbtn', '×'); b.setAttribute('aria-label', 'Close'); return b; };
const cover = (r) => BASE + 'assets/images/cds/' + r.cover;
const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const anim = (node, frames, opts) => (reduced() || !node.animate ? { finished: Promise.resolve() } : node.animate(frames, opts));
const clock = (s) => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const svg = (d) => '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="' + d + '"/></svg>';
const ICON = {
  list: svg('M2 3h8v1H2zM2 6h8v1H2zM2 9h8v1H2z'), stop: svg('M3 3h6v6H3z'),
  prev: svg('M1 6l4-3v6zM6 6l4-3v6z'), next: svg('M11 6l-4-3v6zM6 6l-4-3v6z'),
  play: svg('M3 2h1v8H3zM4 3h2v6H4zM6 4h2v4H6zM8 5h1v2H8z'), pause: svg('M3 2h2v8H3zM7 2h2v8H7z'),
};

export function createHideoutUI({ onDisc, focusGame, onAllRead }) {
  // small tiled textures: the speckled plastic of the CD player and the grain of the journal's paper
  const tile = (n, pal, seed) => { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); let k = seed; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { k = (k * 16807) % 2147483647; g.fillStyle = pal[k % pal.length]; g.fillRect(x, y, 1, 1); } return 'url(' + c.toDataURL() + ')'; };
  document.documentElement.style.setProperty('--cdp-noise', tile(8, ['#e6dfcc', '#e9e2d0', '#e1dac6', '#ebe5d4', '#e3dcc9'], 7));
  document.documentElement.style.setProperty('--paper-grain', tile(32, ['rgba(241,234,214,0)', 'rgba(241,234,214,0)', 'rgba(241,234,214,0)', 'rgba(200,180,140,.12)', 'rgba(255,250,235,.2)'], 11));
  let open = null; // 'music' | 'journal' | 'gallery' | 'library' | null
  const root = el('div'); root.id = 'hideoutUI'; document.body.appendChild(root);
  const panels = {};
  function show(id) { if (open) hide(true); open = id; panels[id].wrap.classList.add('show'); sound.play('open'); if (panels[id].onShow) panels[id].onShow(); }
  function hide(silent) { if (!open) return; const p = panels[open]; p.wrap.classList.remove('show'); if (p.onHide) p.onHide(); open = null; if (!silent) { sound.play('close'); focusGame(); } }
  const shell = (id, label, cls) => {
    const wrap = el('div', 'hx ' + cls); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', label);
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) hide(); });
    root.appendChild(wrap); panels[id] = { wrap }; return wrap;
  };

  /* ── the CD player ── */
  {
    const wrap = shell('music', 'CD player', 'hx-cd'), box = el('div', 'cdp-wrap'); wrap.appendChild(box);
    const x = closeBtn(); x.classList.add('cdp-x'); x.onclick = () => hide(); box.appendChild(x);
    // a title in the same style as the gallery and the library
    const head = el('header', 'menu-head cdp-head'); head.append(el('small', '', 'The Hideout'), el('h2', '', 'The CD Player'), el('i', 'menu-rule')); box.appendChild(head);
    const body = el('div', 'cdp'); box.appendChild(body);
    body.append(el('i', 'cdp-hinge l'), el('i', 'cdp-hinge r'));
    const main = el('div', 'cdp-main'), side = el('div', 'cdp-side'); body.append(main, side);
    const well = el('div', 'cdp-well'); for (let i = 0; i < 4; i++) well.appendChild(el('i', 'cdp-clip c' + i));
    // the disc in the tray. Changing CD makes a second disc: the old one lifts out while the new one drops in.
    const makeDisc = (r) => { const d = el('div', 'cdp-disc'), sp = el('div', 'cdp-spin'), im = el('img'); im.alt = ''; im.decoding = 'async'; im.draggable = false; if (r) im.src = cover(r); sp.appendChild(im); d.appendChild(sp); well.appendChild(d); return d; };
    let disc = makeDisc(null); main.appendChild(well);
    const brand = el('div', 'cdp-brand'); brand.innerHTML = '<b>T</b>L-05'; main.appendChild(brand);
    const lcd = el('div', 'cdp-lcd'), lTrack = el('span', 'lcd-track'), lTime = el('span', 'lcd-time'), lVol = el('span', 'lcd-vol'), lTitle = el('div', 'lcd-title'), lText = el('span');
    lTitle.appendChild(lText); lcd.append(lTrack, lTime, lVol, lTitle); main.appendChild(lcd);
    const key = (cls, label, icon, fn, mark) => {
      const row = el('div', 'cdp-row ' + cls), b = el('button', 'cdp-key'); b.setAttribute('aria-label', label); b.onclick = () => { fn(); b.blur(); };
      const m = el('span', 'cdp-mark'); m.innerHTML = mark !== undefined ? mark : icon; row.append(m, b); side.appendChild(row); return b;
    };
    key('k-list', 'Show or hide the CD shelf', ICON.list, () => box.classList.toggle('noshelf'));
    key('k-stop', 'Stop', ICON.stop, () => music.stop());
    key('k-prev', 'Previous CD', ICON.prev, () => change(-1));
    key('k-next', 'Next CD', ICON.next, () => change(1));
    const play = key('k-play', 'Play or pause', ICON.play, () => { if (music.isOn()) music.toggle(); else music.play(music.current()); });
    const vol = el('div', 'cdp-vol'); side.appendChild(vol);
    for (const [txt, d, label] of [['+', 1, 'Volume up'], ['−', -1, 'Volume down']]) { const b = el('button', 'cdp-volkey'); b.setAttribute('aria-label', label); b.appendChild(el('span', '', txt)); b.onclick = () => { music.setVolume(music.volume() + d * 2); b.blur(); }; vol.appendChild(b); }
    // the shelf of CDs under the player
    const shelf = el('div', 'cdp-shelf'), cds = {};
    RECORDS.forEach((r, i) => {
      const b = el('button', 'cdp-cd'); b.setAttribute('aria-label', r.album + ', ' + r.by); b.style.setProperty('--c', r.color);
      const im = el('img'); im.src = cover(r); im.alt = ''; im.loading = 'lazy'; im.draggable = false;
      const t = el('span'); t.append(el('strong', '', r.album), el('small', '', r.by));
      b.append(im, t); b.onclick = () => pick(r.id); shelf.appendChild(b); cds[r.id] = b;
    });
    box.appendChild(shelf);

    let shown = null, busy = false, tick = 0;
    const rec = () => RECORDS.find((q) => q.id === music.current()) || RECORDS[0];
    function paint() {
      const r = rec(); if (!r) return; const i = RECORDS.indexOf(r) + 1, on = music.isOn();
      if (!busy && shown !== r.id) { disc.querySelector('img').src = cover(r); shown = r.id; }
      lTrack.textContent = String(i).padStart(3, '0'); lVol.textContent = '\u266a' + String(music.volume()).padStart(2, '0');
      const txt = r.title.toUpperCase() + '  \u00b7  ' + r.by.toUpperCase() + '  \u00b7  ' + r.album.toUpperCase();
      if (lText.textContent !== txt) { lText.textContent = txt; lTitle.classList.toggle('run', txt.length > 22); }
      body.classList.toggle('playing', on); body.style.setProperty('--glow', r.color);
      play.innerHTML = on ? ICON.pause : ICON.play; play.parentNode.querySelector('.cdp-mark').innerHTML = on ? ICON.pause : ICON.play;
      for (const id in cds) { cds[id].classList.toggle('on', id === r.id); cds[id].setAttribute('aria-pressed', String(id === r.id)); }
      lTime.textContent = clock(music.time());
    }
    // changing CD: the current disc lifts up and away to one side while the new one swings in from
    // the other and settles into the tray. Both are on screen at once.
    async function swap(r, dir) {
      const out = disc, inn = makeDisc(r); disc = inn; shown = r.id; onDisc(r);
      const spinOut = out.querySelector('.cdp-spin'); spinOut.style.animationPlayState = 'paused';
      await Promise.all([
        anim(out, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (-dir * 70) + '%, -14%) rotate(' + (-dir * 50) + 'deg) scale(.7)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.55,.05,.7,.3)', fill: 'forwards' }).finished,
        anim(inn, [{ transform: 'translate(' + (dir * 70) + '%, 10%) rotate(' + (dir * 70) + 'deg) scale(.7)', opacity: 0 }, { transform: 'translate(' + (dir * 8) + '%, 0) rotate(' + (dir * 6) + 'deg) scale(1.03)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 720, delay: 120, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' }).finished,
      ]);
      out.remove(); busy = false; paint();
    }
    function pick(id, dir) {
      if (busy) return;
      const from = RECORDS.findIndex((q) => q.id === music.current()), to = RECORDS.findIndex((q) => q.id === id);
      if (id === music.current()) { if (!music.isOn()) music.play(id); return; }
      busy = true; sound.play('near'); music.play(id); swap(RECORDS[to], dir || (to > from ? 1 : -1));
    }
    function change(d) { const n = RECORDS.length, i = RECORDS.findIndex((q) => q.id === music.current()); pick(RECORDS[(i + d + n) % n].id, d); }
    music.onChange(paint);
    panels.music.onShow = () => { busy = false; paint(); clearInterval(tick); tick = setInterval(() => { lTime.textContent = clock(music.time()); }, 250); };
    panels.music.onHide = () => clearInterval(tick);
    panels.music.key = (e) => { if (e.key === 'ArrowLeft') { change(-1); return true; } if (e.key === 'ArrowRight') { change(1); return true; } return false; };
    paint();
  }

  /* ── journal: an open book, the list on the left page and the entry on the right ── */
  {
    const wrap = shell('journal', 'Journal', 'hx-journal'), book = el('div', 'book'); wrap.appendChild(book);
    const left = el('div', 'page left'), right = el('div', 'page right'); book.append(left, right);
    for (const p of [left, right]) p.appendChild(el('i', 'orn'));
    left.append(el('h2', '', 'Journal'), el('p', 'jsub', 'Mental models'));
    const list = el('div', 'jlist'); left.appendChild(list);
    const rows = {};
    // entries the visitor has opened get a wax seal; reading all of them earns the Scholar's Lantern
    const read = new Set((() => { try { return (localStorage.getItem('pv-read') || '').split(','); } catch (e) { return []; } })().filter((id) => JOURNAL.some((q) => q.id === id)));
    const seal = () => { const c = pictureCanvas(12, 12, (g) => { const f = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); }; f('#8a1d1d', 3, 0, 6, 12); f('#8a1d1d', 0, 3, 12, 6); f('#8a1d1d', 1, 1, 10, 10); f('#b52a26', 2, 2, 8, 8); f('#d8403a', 3, 3, 6, 6); f('#8a1d1d', 5, 4, 2, 4); f('#8a1d1d', 4, 5, 4, 2); f('#f08a7a', 3, 3, 2, 1); }); c.className = 'seal'; return c; };
    function markRead(id) {
      if (read.has(id)) return; read.add(id); try { localStorage.setItem('pv-read', [...read].join(',')); } catch (e) { /* ignore */ }
      if (rows[id]) { const sl = seal(); rows[id].appendChild(sl); anim(sl, [{ transform: 'scale(2.4) rotate(-30deg)', opacity: 0 }, { transform: 'scale(.9) rotate(4deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'ease-out' }); }
      progress.textContent = read.size + ' of ' + JOURNAL.length + ' read';
      if (read.size === JOURNAL.length && onAllRead) onAllRead();
    }
    JOURNAL.forEach((e) => {
      const b = el('button', 'jrow'); b.appendChild(pictureCanvas(16, 16, (g) => drawIcon(g, e.icon)));
      const t = el('span'); t.append(el('small', '', 'No. ' + String(e.n).padStart(2, '0')), el('strong', '', e.title)); b.appendChild(t);
      b.onclick = () => { pick(e.id); book.classList.add('reading'); sound.play('near'); }; list.appendChild(b); rows[e.id] = b;
      if (read.has(e.id)) b.appendChild(seal());
    });
    const progress = el('p', 'jprogress', read.size + ' of ' + JOURNAL.length + ' read'); left.appendChild(progress);
    const back = el('button', 'jback', '‹ All entries'); back.onclick = () => book.classList.remove('reading'); right.appendChild(back);
    const page = el('div', 'jpage'); right.appendChild(page);
    const head = el('div', 'jhead'), icon = pictureCanvas(16, 16, () => {}); icon.className = 'jicon';
    const num = el('p', 'jnum'), jt = el('h2', 'jtitle'); head.append(icon, el('div')); head.lastChild.append(num, jt);
    const quote = el('blockquote', 'jquote'), qText = el('p'), qBy = el('cite'); quote.append(qText, qBy);
    const body = el('div', 'jbody'); body.tabIndex = 0;
    page.append(head, quote, body);
    const foot = el('div', 'book-foot'); foot.innerHTML = '<kbd>Esc</kbd> Close'; foot.onclick = () => hide(); wrap.appendChild(foot);
    const x = closeBtn(); x.classList.add('book-x'); x.onclick = () => hide(); book.appendChild(x);
    let current = JOURNAL[0] && JOURNAL[0].id;
    function pick(id) {
      const e = JOURNAL.find((q) => q.id === id); if (!e) return; const changed = current !== id; current = id;
      for (const k in rows) rows[k].classList.toggle('on', k === id);
      num.textContent = 'Mental model No. ' + String(e.n).padStart(2, '0'); jt.textContent = e.title; drawIcon(icon.getContext('2d'), e.icon);
      qText.textContent = '“' + e.quote + '”'; qBy.textContent = e.by ? '— ' + e.by : ''; qBy.hidden = !e.by;
      body.textContent = ''; body.appendChild(el('h3', '', 'Key ideas')); const ul = el('ul'); (e.points || []).forEach((p) => ul.appendChild(el('li', '', p))); body.appendChild(ul);
      (e.body || []).forEach((p) => body.appendChild(el('p', '', p)));
      page.scrollTop = 0; if (open === 'journal') markRead(id);
      if (changed) anim(page, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
    }
    if (current) pick(current);
    panels.journal.onShow = () => { book.classList.remove('reading'); markRead(current); if (rows[current]) rows[current].focus({ preventScroll: true }); };
    panels.journal.key = (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return false;
      if (document.activeElement && document.activeElement.classList.contains('jrow')) { const ids = JOURNAL.map((q) => q.id), i = ids.indexOf(current) + (e.key === 'ArrowDown' ? 1 : -1); if (i >= 0 && i < ids.length) { pick(ids[i]); rows[ids[i]].focus(); } return true; }
      page.scrollTop += e.key === 'ArrowDown' ? 40 : -40; return true;
    };
  }

  /* ── gallery: a 3D cube with a project in each window, under a night sky. Turn it any way with
     a drag, or glide to a project with the arrows and thumbnails; click a window to read about it ── */
  {
    const wrap = shell('gallery', 'Gallery', 'hx-gallery'), gal = el('div', 'gal'); wrap.appendChild(gal);
    const x = closeBtn(); x.classList.add('gal-x'); x.onclick = () => hide(); gal.appendChild(x);
    const top = el('header', 'gal-top'); top.append(el('h2', '', 'The Gallery'), el('p', 'gal-sub', 'Side projects  ·  ' + GALLERY.length + ' faces')); gal.appendChild(top);
    const wall = el('div', 'gal-wall'); gal.appendChild(wall);
    const host = el('div', 'gal-cube'); host.setAttribute('aria-label', 'A cube of side projects. Drag to turn it.'); wall.appendChild(host);
    const chev = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>';
    const prev = el('button', 'gal-arrow prev'), next = el('button', 'gal-arrow next'); prev.innerHTML = chev(-1); next.innerHTML = chev(1);
    prev.setAttribute('aria-label', 'Previous project'); next.setAttribute('aria-label', 'Next project'); wall.append(prev, next);
    // the caption under the cube, and the details card that slides in when a window is opened
    const cap = el('button', 'gal-cap'), capK = el('span', 'gal-kicker'), capT = el('strong'), capH = el('small', '', 'Click the window to step inside');
    cap.append(capK, capT, capH); wall.appendChild(cap);
    const infoBox = el('aside', 'gal-info'), shot = el('img', 'gal-shot'), ik = el('span', 'gal-kicker'), ih = el('h3'), ip = el('p'), go = el('a', 'gal-go'), back = el('button', 'gal-back', '← Back to the cube');
    shot.alt = ''; shot.decoding = 'async'; go.target = '_blank'; go.rel = 'noopener'; infoBox.append(shot, ik, ih, el('i', 'gal-rule'), ip, go, back); wall.appendChild(infoBox);
    wall.appendChild(el('p', 'gal-hint', 'Drag to turn the cube any way  ·  click a window to step inside'));
    const IMG = (g, thumb) => BASE + 'assets/images/gallery/' + g.image + (thumb ? '-thumb' : '') + '.jpg';
    // zoom in and out a little (the wheel and a pinch work too)
    const zoomBox = el('div', 'gal-zoom'), zIn = el('button', '', '+'), zOut = el('button', '', '−');
    zIn.setAttribute('aria-label', 'Zoom in'); zOut.setAttribute('aria-label', 'Zoom out'); zoomBox.append(zIn, zOut); wall.appendChild(zoomBox);
    // which face you're on, as a row of dots
    const dots = el('div', 'gal-dots'), dot = GALLERY.map((g, i) => { const d = el('button'); d.setAttribute('aria-label', g.title); d.onclick = () => turnTo(i); dots.appendChild(d); return d; }); wall.appendChild(dots);
    let at = 0, infoOpen = false;
    function fill() {
      const g = GALLERY[at]; if (!g) return; const k = 'Side project  ·  No. ' + String(at + 1).padStart(2, '0');
      capK.textContent = k; capT.textContent = g.title; ik.textContent = k; ih.textContent = g.title; ip.textContent = g.desc;
      if (g.image) { shot.src = IMG(g); shot.hidden = false; } else shot.hidden = true;
      // a link button only for projects that have one (or will soon); none at all when link is false
      go.hidden = g.link === false && !g.url;
      if (g.url) { go.href = g.url; go.textContent = (/github\.com/.test(g.url) ? 'View on GitHub' : 'Visit ' + g.title) + '  ↗'; go.classList.remove('off'); go.removeAttribute('aria-disabled'); }
      else { go.removeAttribute('href'); go.textContent = 'Link coming soon'; go.classList.add('off'); go.setAttribute('aria-disabled', 'true'); }
      dot.forEach((d, i) => { d.classList.toggle('on', i === at); d.setAttribute('aria-pressed', String(i === at)); });
    }
    // the words cross-fade as the cube turns
    let fadeT = 0;
    function face(i) { if (i === at) return; at = i; sound.play('near'); cap.classList.add('swap'); infoBox.classList.add('swap'); clearTimeout(fadeT); fadeT = setTimeout(() => { fill(); cap.classList.remove('swap'); infoBox.classList.remove('swap'); }, 200); }
    function setInfo(on) { if (on === infoOpen) return; infoOpen = on; gal.classList.toggle('reading', on); if (cube) cube.setInfo(on); sound.play(on ? 'open' : 'close'); }
    const cube = createProjectCube(host, GALLERY, { onFace: face, onOpen: setInfo, onSealed: () => { cap.classList.remove('nudge'); void cap.offsetWidth; cap.classList.add('nudge'); } });
    zIn.onclick = () => cube && cube.zoom(1.12); zOut.onclick = () => cube && cube.zoom(1 / 1.12); if (!cube) zoomBox.hidden = true;
    if (!cube) { gal.classList.add('flat'); const im = el('img', 'gal-flat'); im.alt = ''; host.appendChild(im); }
    const paintFlat = () => { if (!cube) { const g = GALLERY[at]; host.firstChild.src = g.image ? IMG(g) : ''; } };
    function turnTo(i) { if (cube) cube.go(i); else { face(i); setTimeout(paintFlat, 210); } }
    prev.onclick = () => (cube ? cube.next(-1) : turnTo((at + GALLERY.length - 1) % GALLERY.length));
    next.onclick = () => (cube ? cube.next(1) : turnTo((at + 1) % GALLERY.length));
    cap.onclick = () => setInfo(!infoOpen); back.onclick = () => setInfo(false);
    if (!cube) host.onclick = () => setInfo(!infoOpen);
    // fetch the full pictures ahead, so the cube and the card show them at once
    GALLERY.forEach((g) => { if (g.image) { const im = new Image(); im.src = IMG(g); } });
    panels.gallery.onShow = () => { if (cube) cube.start(); else paintFlat(); };
    panels.gallery.onHide = () => { if (cube) cube.stop(); if (infoOpen) { infoOpen = false; gal.classList.remove('reading'); if (cube) cube.setInfo(false); } };
    panels.gallery.key = (e) => {
      if (e.key === 'ArrowLeft') { prev.onclick(); return true; } if (e.key === 'ArrowRight') { next.onclick(); return true; }
      if (e.key === 'Enter' && document.activeElement === document.body) { setInfo(!infoOpen); return true; }
      if ((e.key === '+' || e.key === '=') && cube) { cube.zoom(1.12); return true; } if ((e.key === '-' || e.key === '_') && cube) { cube.zoom(1 / 1.12); return true; }
      if (e.key === 'Escape' && infoOpen) { setInfo(false); return 'stop'; }
      return false;
    };
    fill();
  }

  /* ── library: a shelf of book spines; pick one and it slides out, opening its card above ── */
  {
    const wrap = shell('library', 'Library', 'hx-library'), libp = el('div', 'lib'); wrap.appendChild(libp);
    const x = closeBtn(); x.classList.add('lib-x'); x.onclick = () => hide(); libp.appendChild(x);
    const card = el('div', 'lib-card'), coverBox = el('div', 'lib-cover'), coverImg = el('img'); coverImg.alt = ''; coverImg.draggable = false; coverBox.appendChild(coverImg);
    // the 3D book (falls back to the flat cover if WebGL isn't available)
    const stageBox = el('div', 'lib-stage'); stageBox.setAttribute('aria-label', 'The book in 3D. Drag to turn it.');
    const views = el('div', 'lib-views'); [['front', 'Cover'], ['spine', 'Spine'], ['back', 'Back']].forEach(([v, label]) => { const b = el('button', '', label); b.onclick = () => { if (viewer) viewer.view(v); views.querySelectorAll('button').forEach((q) => q.classList.toggle('on', q === b)); }; views.appendChild(b); });
    const turnHint = el('span', 'lib-turn', 'Drag to turn');
    stageBox.append(views, turnHint);
    const viewer = createBookViewer(stageBox);

    const info = el('div', 'lib-info'), lk = el('span', 'lib-kicker'), lt = el('h2'), la = el('p', 'lib-author'), ln = el('p', 'lib-note'), lq = el('p', 'lib-take');
    info.append(lk, lt, la, ln, el('i', 'lib-rule'), el('h3', '', 'My takeaway'), lq); card.append(viewer ? stageBox : coverBox, info); libp.appendChild(card);
    if (viewer) libp.classList.add('three');
    const shelfBox = el('div', 'lib-shelf'), row = el('div', 'lib-row'); shelfBox.appendChild(row); libp.appendChild(shelfBox);
    libp.appendChild(el('p', 'lib-hint', 'Pick a book from the shelf'));
    const spines = {};
    BOOKS.forEach((bk, i) => {
      const b = el('button', 'spine'); b.setAttribute('aria-label', bk.title + ' by ' + bk.author);
      b.style.setProperty('--bg', bk.spine.bg); b.style.setProperty('--fg', bk.spine.fg); b.style.setProperty('--band', bk.spine.band);
      b.style.setProperty('--h', (86 + ((i * 37) % 14)) + '%'); b.style.setProperty('--w', (54 + ((i * 23) % 16)) + 'px');
      b.append(el('i', 'sp-band'), el('span', 'sp-title', bk.spineTitle || bk.title), el('span', 'sp-author', bk.author.split(' ').slice(-1)[0]), el('i', 'sp-band b'));
      b.onclick = () => pick(bk.id); row.appendChild(b); spines[bk.id] = b;
      const im = new Image(); im.src = BASE + 'assets/images/books/' + bk.cover; // fetch the covers ahead
    });
    let current = null, moving = false, queued = null, swapT = 0;
    function fill(bk) {
      if (!viewer) coverImg.src = BASE + 'assets/images/books/' + bk.cover; libp.style.setProperty('--page', bk.page);
      // dark pages get light text, light pages dark text, so the card always reads clearly
      const n = parseInt(bk.page.slice(1), 16), lum = (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
      libp.classList.toggle('dark', lum < 0.5);
      lk.textContent = 'From the shelf · No. ' + String(BOOKS.indexOf(bk) + 1).padStart(2, '0'); lt.textContent = bk.title; la.textContent = bk.author; ln.textContent = bk.note || ''; ln.hidden = !bk.note; lq.textContent = bk.takeaway;
    }
    async function pick(id) {
      if (viewer) { // 3D: the book itself carries the motion; the words cross-fade
        if (id === current) return; const bk = BOOKS.find((q) => q.id === id); if (!bk) return; sound.play('near');
        const from = BOOKS.findIndex((q) => q.id === current), to = BOOKS.indexOf(bk);
        for (const k in spines) spines[k].classList.toggle('on', k === id);
        libp.classList.add('picked'); viewer.show(bk, to, from < 0 || to > from ? 1 : -1); current = id;
        views.querySelectorAll('button').forEach((q, i) => q.classList.toggle('on', i === 0));
        info.classList.add('swap'); clearTimeout(swapT); swapT = setTimeout(() => { fill(bk); info.classList.remove('swap'); }, 200);
        return;
      }
      if (moving) { queued = id; return; } if (id === current) return; const bk = BOOKS.find((q) => q.id === id); if (!bk) return; moving = true; sound.play('near');
      for (const k in spines) spines[k].classList.toggle('on', k === id);
      libp.classList.add('picked');
      if (current) await Promise.all([anim(card, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished]);
      current = id; fill(bk); card.style.opacity = '1';
      await new Promise((r) => (coverImg.complete ? r() : coverImg.addEventListener('load', r, { once: true }))).catch(() => {});
      anim(card, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' });
      await anim(coverBox, [{ transform: 'perspective(900px) rotateY(-70deg) translateX(-30px)', opacity: 0 }, { transform: 'perspective(900px) rotateY(-14deg)', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' }).finished;
      moving = false;
      if (queued) { const q = queued; queued = null; pick(q); }
    }
    panels.library.onShow = () => { if (viewer) viewer.start(); if (!current) pick(BOOKS[0].id); };
    panels.library.onHide = () => { if (viewer) viewer.stop(); };
    panels.library.key = (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return false; const i = BOOKS.findIndex((q) => q.id === current) + (e.key === 'ArrowRight' ? 1 : -1); if (i >= 0 && i < BOOKS.length) pick(BOOKS[i].id); return true; };
  }

  window.addEventListener('keydown', (e) => { if (!open || !panels[open].key) return; const r = panels[open].key(e); if (r) e.preventDefault(); if (r === 'stop') e.stopImmediatePropagation(); });
  return { show, hide: () => hide(), isOpen: () => !!open, which: () => open };
}
