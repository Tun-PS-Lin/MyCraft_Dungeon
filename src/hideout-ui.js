// The Hideout's three menus: the CD player (pick a CD), the journal (read an entry)
// and the gallery (flip through side projects). Their content is in hideout-content.js.
import { RECORDS, JOURNAL, GALLERY } from './hideout-content.js';
import { drawIcon, drawPainting, pictureCanvas } from './pixelart.js';
import { music, sound } from './audio.js';
import { BASE } from './base.js';

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

export function createHideoutUI({ onDisc, focusGame }) {
  // small tiled textures: the speckled plastic of the CD player and the grain of the journal's paper
  const tile = (n, pal, seed) => { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); let k = seed; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { k = (k * 16807) % 2147483647; g.fillStyle = pal[k % pal.length]; g.fillRect(x, y, 1, 1); } return 'url(' + c.toDataURL() + ')'; };
  document.documentElement.style.setProperty('--cdp-noise', tile(8, ['#e6dfcc', '#e9e2d0', '#e1dac6', '#ebe5d4', '#e3dcc9'], 7));
  document.documentElement.style.setProperty('--paper-grain', tile(32, ['rgba(241,234,214,0)', 'rgba(241,234,214,0)', 'rgba(241,234,214,0)', 'rgba(200,180,140,.12)', 'rgba(255,250,235,.2)'], 11));
  let open = null; // 'music' | 'journal' | 'gallery' | null
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
    const body = el('div', 'cdp'); box.appendChild(body);
    body.append(el('i', 'cdp-hinge l'), el('i', 'cdp-hinge r'));
    const main = el('div', 'cdp-main'), side = el('div', 'cdp-side'); body.append(main, side);
    const well = el('div', 'cdp-well'); for (let i = 0; i < 4; i++) well.appendChild(el('i', 'cdp-clip c' + i));
    const disc = el('div', 'cdp-disc'), spin = el('div', 'cdp-spin'), img = el('img'); img.alt = ''; img.decoding = 'async'; img.draggable = false;
    spin.appendChild(img); disc.appendChild(spin); well.appendChild(disc); main.appendChild(well);
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
      if (!busy && shown !== r.id) { img.src = cover(r); shown = r.id; }
      lTrack.textContent = String(i).padStart(3, '0'); lVol.textContent = '♪' + String(music.volume()).padStart(2, '0');
      const txt = r.title.toUpperCase() + '  ·  ' + r.by.toUpperCase() + '  ·  ' + r.album.toUpperCase();
      if (lText.textContent !== txt) { lText.textContent = txt; lTitle.classList.toggle('run', txt.length > 22); }
      body.classList.toggle('playing', on); body.style.setProperty('--glow', r.color);
      play.innerHTML = on ? ICON.pause : ICON.play; play.parentNode.querySelector('.cdp-mark').innerHTML = on ? ICON.pause : ICON.play;
      for (const id in cds) { cds[id].classList.toggle('on', id === r.id); cds[id].setAttribute('aria-pressed', String(id === r.id)); }
      lTime.textContent = clock(music.time());
    }
    // changing CD: the disc lifts out of the well and the new one drops in, spinning up
    async function swap(r, dir) {
      busy = true;
      await anim(disc, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (dir * -40) + '%, -18%) rotate(' + (dir * -140) + 'deg) scale(.55)', opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'forwards' }).finished;
      img.src = cover(r); shown = r.id; onDisc(r);
      await anim(disc, [{ transform: 'translate(' + (dir * 40) + '%, 14%) rotate(' + (dir * 160) + 'deg) scale(.6)', opacity: 0 }, { transform: 'translate(0,0) rotate(0) scale(1.04)', opacity: 1, offset: 0.78 }, { transform: 'none', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' }).finished;
      busy = false; paint();
    }
    function pick(id, dir) {
      const from = RECORDS.findIndex((q) => q.id === music.current()), to = RECORDS.findIndex((q) => q.id === id);
      if (id === music.current()) { if (!music.isOn()) music.play(id); return; }
      sound.play('near'); music.play(id); swap(RECORDS[to], dir || (to > from ? 1 : -1));
    }
    function change(d) { const n = RECORDS.length, i = RECORDS.findIndex((q) => q.id === music.current()); pick(RECORDS[(i + d + n) % n].id, d); }
    music.onChange(paint);
    panels.music.onShow = () => { paint(); clearInterval(tick); tick = setInterval(() => { lTime.textContent = clock(music.time()); }, 250); };
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
    JOURNAL.forEach((e) => {
      const b = el('button', 'jrow'); b.appendChild(pictureCanvas(16, 16, (g) => drawIcon(g, e.icon)));
      const t = el('span'); t.append(el('small', '', 'No. ' + String(e.n).padStart(2, '0')), el('strong', '', e.title)); b.appendChild(t);
      b.onclick = () => { pick(e.id); book.classList.add('reading'); sound.play('near'); }; list.appendChild(b); rows[e.id] = b;
    });
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
      page.scrollTop = 0;
      if (changed) anim(page, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
    }
    if (current) pick(current);
    panels.journal.onShow = () => { book.classList.remove('reading'); if (rows[current]) rows[current].focus({ preventScroll: true }); };
    panels.journal.key = (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return false;
      if (document.activeElement && document.activeElement.classList.contains('jrow')) { const ids = JOURNAL.map((q) => q.id), i = ids.indexOf(current) + (e.key === 'ArrowDown' ? 1 : -1); if (i >= 0 && i < ids.length) { pick(ids[i]); rows[ids[i]].focus(); } return true; }
      page.scrollTop += e.key === 'ArrowDown' ? 40 : -40; return true;
    };
  }

  /* ── gallery: a framed painting under a spotlight, with a brass plaque ── */
  {
    const wrap = shell('gallery', 'Gallery', 'hx-gallery'), gal = el('div', 'gal'); wrap.appendChild(gal);
    const x = closeBtn(); x.classList.add('gal-x'); x.onclick = () => hide(); gal.appendChild(x);
    const top = el('div', 'gal-top'); top.append(el('strong', '', 'Gallery'), el('span', 'gal-count')); gal.appendChild(top);
    const wall = el('div', 'gal-wall'); gal.appendChild(wall);
    const prev = el('button', 'gal-arrow prev'), next = el('button', 'gal-arrow next');
    prev.innerHTML = ICON.prev.replace('M6 6l4-3v6z', ''); next.innerHTML = ICON.next.replace('M6 6l-4-3v6z', '');
    prev.setAttribute('aria-label', 'Previous painting'); next.setAttribute('aria-label', 'Next painting');
    const stage = el('div', 'gal-stage'), frame = el('figure', 'gal-frame'), pic = pictureCanvas(32, 24, () => {}); frame.appendChild(pic); stage.appendChild(frame);
    wall.append(el('i', 'gal-light'), prev, stage, next);
    const plaque = el('div', 'gal-plaque'), h = el('h3'), p = el('p'), go = el('a', 'gal-go'); go.target = '_blank'; go.rel = 'noopener';
    plaque.append(h, p, go); wall.appendChild(plaque);
    const rail = el('div', 'gal-rail'), thumbs = [];
    GALLERY.forEach((g, i) => { const b = el('button', 'gal-thumb'); b.setAttribute('aria-label', g.title); b.appendChild(pictureCanvas(32, 24, (c) => drawPainting(c, g.art))); b.appendChild(el('span', '', g.title)); b.onclick = () => go2(i); rail.appendChild(b); thumbs.push(b); });
    gal.appendChild(rail);
    let at = 0, moving = false;
    function fill() {
      const g = GALLERY[at]; if (!g) return;
      drawPainting(pic.getContext('2d'), g.art); h.textContent = g.title; p.textContent = g.desc;
      if (g.url) { go.href = g.url; go.textContent = 'Visit ' + g.title + ' ↗'; go.classList.remove('off'); go.removeAttribute('aria-disabled'); }
      else { go.removeAttribute('href'); go.textContent = 'Link coming soon'; go.classList.add('off'); go.setAttribute('aria-disabled', 'true'); }
      thumbs.forEach((b, i) => { b.classList.toggle('on', i === at); b.setAttribute('aria-pressed', String(i === at)); });
      top.lastChild.textContent = (at + 1) + ' / ' + GALLERY.length;
    }
    async function go2(i, dir) {
      const n = GALLERY.length; if (!n || moving) return; const to = (i + n) % n; if (to === at) return;
      const d = dir || (to > at ? 1 : -1); moving = true; sound.play('near');
      await Promise.all([
        anim(frame, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(' + (-d * 18) + '%) rotate(' + (-d * 3) + 'deg)', opacity: 0 }], { duration: 240, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished,
        anim(plaque, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished,
      ]);
      at = to; fill();
      anim(plaque, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out', fill: 'forwards' });
      await anim(frame, [{ transform: 'translateX(' + (d * 18) + '%) rotate(' + (d * 3) + 'deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' }).finished;
      moving = false;
    }
    prev.onclick = () => go2(at - 1, -1); next.onclick = () => go2(at + 1, 1);
    panels.gallery.key = (e) => { if (e.key === 'ArrowLeft') { go2(at - 1, -1); return true; } if (e.key === 'ArrowRight') { go2(at + 1, 1); return true; } return false; };
    let sx = null; stage.addEventListener('pointerdown', (e) => { sx = e.clientX; }); stage.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) go2(at + (e.clientX < sx ? 1 : -1), e.clientX < sx ? 1 : -1); sx = null; });
    fill();
  }

  window.addEventListener('keydown', (e) => { if (open && panels[open].key && panels[open].key(e)) e.preventDefault(); });
  return { show, hide: () => hide(), isOpen: () => !!open };
}
