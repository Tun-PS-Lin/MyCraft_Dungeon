// The Hideout's three menus: the music box (pick a record), the journal (read an entry)
// and the gallery (flip through side projects). Their content is in hideout-content.js.
import { RECORDS, JOURNAL, GALLERY } from './hideout-content.js';
import { drawDisc, drawIcon, drawPainting, pictureCanvas } from './pixelart.js';
import { music, sound } from './audio.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const close = () => { const b = el('button', 'xbtn', '×'); b.setAttribute('aria-label', 'Close'); return b; };

export function createHideoutUI({ onDisc, focusGame }) {
  let open = null; // 'music' | 'journal' | 'gallery' | null
  const root = el('div'); root.id = 'hideoutUI'; document.body.appendChild(root);
  const panels = {};
  function show(id) { if (open) hide(true); open = id; panels[id].wrap.classList.add('show'); sound.play('open'); if (panels[id].onShow) panels[id].onShow(); }
  function hide(silent) { if (!open) return; panels[open].wrap.classList.remove('show'); open = null; if (!silent) { sound.play('close'); focusGame(); } }
  const shell = (id, title, cls) => {
    const wrap = el('div', 'hx ' + cls); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', title);
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) hide(); });
    root.appendChild(wrap); panels[id] = { wrap }; return wrap;
  };

  /* ── music box ── */
  {
    const wrap = shell('music', 'Music box', 'hx-music'), panel = el('div', 'hx-panel mb-panel'); wrap.appendChild(panel);
    const head = el('div', 'hx-head'); head.append(el('strong', '', 'Music Box')); const x = close(); x.onclick = () => hide(); head.appendChild(x); panel.appendChild(head);
    const stage = el('div', 'mb-stage'), box = el('div', 'mb-case'), big = pictureCanvas(16, 16, () => {}); big.className = 'mb-disc'; box.append(big, el('i', 'mb-glint')); stage.appendChild(box); panel.appendChild(stage);
    const now = el('div', 'mb-now'), title = el('strong'), by = el('span'); now.append(title, by); panel.appendChild(now);
    panel.appendChild(el('p', 'mb-hint', 'Pick a record to play it. It keeps playing as you explore.'));
    const bar = el('div', 'mb-bar'), discs = {};
    RECORDS.forEach((r) => { const b = el('button', 'mb-pick'); b.setAttribute('aria-label', r.title); b.appendChild(pictureCanvas(16, 16, (g) => drawDisc(g, r.disc))); b.onclick = () => { music.play(r.id); onDisc(r); }; bar.appendChild(b); discs[r.id] = b; });
    bar.appendChild(el('span', 'mb-sep'));
    const play = el('button', 'mb-play'); play.setAttribute('aria-label', 'Play or pause'); bar.appendChild(play);
    play.onclick = () => { if (music.isOn()) music.toggle(); else music.play(music.current()); };
    panel.appendChild(bar);
    const paint = () => {
      const r = RECORDS.find((q) => q.id === music.current()) || RECORDS[0]; if (!r) return;
      drawDisc(big.getContext('2d'), r.disc); title.textContent = r.title; by.textContent = r.by || '';
      for (const id in discs) { discs[id].classList.toggle('on', id === r.id); discs[id].setAttribute('aria-pressed', String(id === r.id)); }
      const on = music.isOn(); box.classList.toggle('spin', on); play.classList.toggle('on', on); play.innerHTML = on ? '<svg viewBox="0 0 12 12"><path d="M3 2h2v8H3zM7 2h2v8H7z"/></svg>' : '<svg viewBox="0 0 12 12"><path d="M3 2h1v8H3zM4 3h2v6H4zM6 4h2v4H6zM8 5h1v2H8z"/></svg>';
    };
    music.onChange(paint); panels.music.onShow = paint; paint();
  }

  /* ── journal: an open book, the list on the left page and the entry on the right ── */
  {
    const wrap = shell('journal', 'Journal', 'hx-journal'), book = el('div', 'book'); wrap.appendChild(book);
    const left = el('div', 'page left'), right = el('div', 'page right'); book.append(left, right);
    for (const p of [left, right]) p.appendChild(el('i', 'orn'));
    left.appendChild(el('h2', '', 'Journal'));
    const list = el('div', 'jlist'); left.appendChild(list);
    const rows = {}, tags = [...new Set(JOURNAL.map((e) => e.tag || 'Notes'))];
    tags.forEach((tag) => {
      list.appendChild(el('h3', '', tag));
      JOURNAL.filter((e) => (e.tag || 'Notes') === tag).forEach((e) => {
        const b = el('button', 'jrow'); b.appendChild(pictureCanvas(16, 16, (g) => drawIcon(g, e.icon)));
        const t = el('span'); t.append(el('strong', '', e.title), el('small', '', e.date)); b.appendChild(t);
        b.onclick = () => { pick(e.id); book.classList.add('reading'); sound.play('near'); }; list.appendChild(b); rows[e.id] = b;
      });
    });
    const back = el('button', 'jback', '‹ All entries'); back.onclick = () => book.classList.remove('reading'); right.appendChild(back);
    const icon = pictureCanvas(16, 16, () => {}); icon.className = 'jicon';
    const jt = el('h2', 'jtitle'), meta = el('p', 'jmeta'), body = el('div', 'jbody'); body.tabIndex = 0;
    right.append(jt, icon, meta, body);
    const foot = el('div', 'book-foot'); foot.innerHTML = '<kbd>Esc</kbd> Close'; foot.onclick = () => hide(); wrap.appendChild(foot);
    const x = close(); x.classList.add('book-x'); x.onclick = () => hide(); book.appendChild(x);
    let current = JOURNAL[0] && JOURNAL[0].id;
    function pick(id) {
      current = id; const e = JOURNAL.find((q) => q.id === id); if (!e) return;
      for (const k in rows) rows[k].classList.toggle('on', k === id);
      jt.textContent = e.title; meta.textContent = [e.tag, e.date].filter(Boolean).join(' · '); drawIcon(icon.getContext('2d'), e.icon);
      body.textContent = ''; (e.body || []).forEach((p) => body.appendChild(el('p', '', p))); body.scrollTop = 0;
    }
    if (current) pick(current);
    panels.journal.onShow = () => { book.classList.remove('reading'); (rows[current] || {}).focus && rows[current].focus({ preventScroll: true }); };
    body.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { body.scrollTop += 40; e.preventDefault(); } if (e.key === 'ArrowUp') { body.scrollTop -= 40; e.preventDefault(); } });
  }

  /* ── gallery: a carousel of paintings ── */
  {
    const wrap = shell('gallery', 'Gallery', 'hx-gallery'), panel = el('div', 'hx-panel gal-panel'); wrap.appendChild(panel);
    const head = el('div', 'hx-head'); head.append(el('strong', '', 'Gallery')); const x = close(); x.onclick = () => hide(); head.appendChild(x); panel.appendChild(head);
    const stage = el('div', 'gal-stage'), prev = el('button', 'gal-arrow prev', '‹'), next = el('button', 'gal-arrow next', '›'), frame = el('div', 'gal-frame'), pic = pictureCanvas(32, 24, () => {});
    prev.setAttribute('aria-label', 'Previous painting'); next.setAttribute('aria-label', 'Next painting');
    frame.appendChild(pic); stage.append(prev, frame, next); panel.appendChild(stage);
    const info = el('div', 'gal-info'), h = el('h3'), p = el('p'), go = el('a', 'gal-go'); go.target = '_blank'; go.rel = 'noopener'; info.append(h, p, go); panel.appendChild(info);
    const dots = el('div', 'gal-dots'), thumbs = [];
    GALLERY.forEach((g, i) => { const b = el('button', 'gal-thumb'); b.setAttribute('aria-label', g.title); b.appendChild(pictureCanvas(32, 24, (c) => drawPainting(c, g.art))); b.onclick = () => go2(i); dots.appendChild(b); thumbs.push(b); });
    panel.appendChild(dots);
    let at = 0;
    function paint(dir) {
      const g = GALLERY[at]; if (!g) return;
      frame.classList.remove('in-l', 'in-r'); void frame.offsetWidth; if (dir) frame.classList.add(dir > 0 ? 'in-r' : 'in-l');
      drawPainting(pic.getContext('2d'), g.art); h.textContent = g.title; p.textContent = g.desc;
      if (g.url) { go.href = g.url; go.textContent = 'Visit the project ↗'; go.classList.remove('off'); go.removeAttribute('aria-disabled'); }
      else { go.removeAttribute('href'); go.textContent = 'Link coming soon'; go.classList.add('off'); go.setAttribute('aria-disabled', 'true'); }
      thumbs.forEach((b, i) => { b.classList.toggle('on', i === at); b.setAttribute('aria-pressed', String(i === at)); });
    }
    function go2(i, dir) { const n = GALLERY.length; if (!n) return; const d = dir || (i > at ? 1 : -1); at = (i + n) % n; paint(d); sound.play('near'); }
    prev.onclick = () => go2(at - 1, -1); next.onclick = () => go2(at + 1, 1);
    panels.gallery.onShow = () => paint(0);
    panels.gallery.key = (e) => { if (e.key === 'ArrowLeft') { go2(at - 1, -1); return true; } if (e.key === 'ArrowRight') { go2(at + 1, 1); return true; } return false; };
    // swipe on phones
    let sx = null; frame.addEventListener('pointerdown', (e) => { sx = e.clientX; }); frame.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) go2(at + (e.clientX < sx ? 1 : -1), e.clientX < sx ? 1 : -1); sx = null; });
    paint(0);
  }

  window.addEventListener('keydown', (e) => { if (open && panels[open].key && panels[open].key(e)) e.preventDefault(); });
  return { show, hide: () => hide(), isOpen: () => !!open };
}
