// The card that pops up when you catch something at the pond: one fact about me, with its
// pictures. Photos scroll past slowly in a loop; tap one to see it full size.
import { FACTS } from './pond-content.js';
import { sound } from './audio.js';
import { BASE } from './base.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const img = (src, alt, cls) => { const i = el('img', cls); i.src = src; i.alt = alt || ''; i.decoding = 'async'; i.draggable = false; return i; };
const PHOTO = (f, thumb) => BASE + 'assets/images/photos/' + f + (thumb ? '-thumb' : '') + '.jpg';
const FACT = (f) => BASE + 'assets/images/facts/' + f;

export function createPondUI({ focusGame, onCastAgain }) {
  let open = false, lastId = null, lbOpen = false, lbAt = 0, lbList = [];
  const wrap = el('div', 'hx hx-pond'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'A fact from the pond'); document.body.appendChild(wrap);
  const card = el('div', 'pond-card'); wrap.appendChild(card);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) hide(); });
  const x = el('button', 'xbtn pond-x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = () => hide(); card.appendChild(x);
  const fishIcon = document.createElement('canvas'); fishIcon.className = 'pond-fish'; fishIcon.width = fishIcon.height = 16;
  { const g = fishIcon.getContext('2d'), f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    f('#e06a2a', 1, 5, 2, 6); f('#e06a2a', 3, 6, 1, 4); f('#ff8a3a', 4, 5, 8, 6); f('#ff8a3a', 6, 4, 5, 1); f('#ff8a3a', 6, 11, 5, 1); f('#ffb070', 5, 6, 6, 2);
    f('#ff8a3a', 12, 6, 2, 4); f('#141418', 11, 6, 1, 1); f('#e06a2a', 7, 9, 3, 1); f('#e06a2a', 8, 3, 2, 1); f('#e8f6ff', 14, 3, 1, 1); f('#e8f6ff', 13, 1, 1, 1); }
  const head = el('div', 'pond-head'), kick = el('span', 'pond-kicker'), title = el('h2', 'pond-title');
  const ht = el('div'); ht.append(kick, title); head.append(fishIcon, ht); card.appendChild(head);
  const body = el('div', 'pond-body'); card.appendChild(body);
  const foot = el('div', 'pond-foot'), dots = el('div', 'pond-dots'), again = el('button', 'pond-again', 'Cast again');
  again.onclick = () => { hide(true); onCastAgain(); }; foot.append(dots, again); card.appendChild(foot);

  // the full-size photo viewer
  const lb = el('div', 'pond-lb'); lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Photo'); document.body.appendChild(lb);
  const lbImg = img('', ''), lbCap = el('p', 'pond-lb-cap'), lbX = el('button', 'xbtn pond-lb-x', '×'), lbPrev = el('button', 'pond-lb-arrow prev', '‹'), lbNext = el('button', 'pond-lb-arrow next', '›');
  lbX.setAttribute('aria-label', 'Close photo'); lbPrev.setAttribute('aria-label', 'Previous photo'); lbNext.setAttribute('aria-label', 'Next photo');
  const lbFig = el('figure', 'pond-lb-fig'); lbFig.append(lbImg, lbCap); lb.append(lbFig, lbPrev, lbNext, lbX);
  const lbShow = (i) => { lbAt = (i + lbList.length) % lbList.length; const p = lbList[lbAt]; lbImg.classList.remove('in'); lbImg.onload = () => lbImg.classList.add('in'); lbImg.src = PHOTO(p.file); lbImg.alt = p.caption; lbCap.textContent = p.caption + '  ·  ' + (lbAt + 1) + ' / ' + lbList.length; };
  const lbOpenAt = (list, i) => { lbList = list; lbOpen = true; lbShow(i); lb.classList.add('show'); sound.play('open'); };
  const lbClose = () => { if (!lbOpen) return; lbOpen = false; lb.classList.remove('show'); sound.play('close'); };
  lbX.onclick = lbClose; lbPrev.onclick = () => lbShow(lbAt - 1); lbNext.onclick = () => lbShow(lbAt + 1);
  lb.addEventListener('pointerdown', (e) => { if (e.target === lb || e.target === lbFig) lbClose(); });
  let sx = null; lbImg.addEventListener('pointerdown', (e) => { sx = e.clientX; }); lbImg.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) lbShow(lbAt + (e.clientX < sx ? 1 : -1)); sx = null; });

  const renderers = {
    photos(f) {
      const strip = el('div', 'pond-strip'), track = el('div', 'pond-track');
      // two copies of the row, so the slow loop never shows a gap
      for (let k = 0; k < 2; k++) f.photos.forEach((p, i) => {
        const b = el('button', 'pond-photo'); b.setAttribute('aria-label', p.caption); if (k) { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
        b.appendChild(img(PHOTO(p.file, true), p.caption)); b.appendChild(el('span', '', p.caption)); b.onclick = () => lbOpenAt(f.photos, i); track.appendChild(b);
      });
      strip.appendChild(track); body.append(strip, el('p', 'pond-note', f.note));
      f.photos.forEach((p) => { const pre = new Image(); pre.src = PHOTO(p.file); }); // fetch the full-size ones ahead
    },
    coffee(f) {
      const stage = el('div', 'pond-coffee'), cup = img(FACT('coffee.webp'), 'A pixel-art cup of coffee with coffee beans', 'pond-cup');
      const steam = el('div', 'pond-steam'); for (let i = 0; i < 6; i++) { const s = el('i'); s.style.setProperty('--i', i); steam.appendChild(s); }
      stage.append(cup, steam); body.append(stage, el('p', 'pond-note', f.note));
    },
    writing(f) {
      const a = f.article, box = el('div', 'pond-article'), cover = el('a', 'pond-cover'); cover.href = a.url; cover.target = '_blank'; cover.rel = 'noopener';
      cover.appendChild(img(FACT(a.cover), 'Pixel-art illustration of the Curve StableSwap invariant'));
      const info = el('div', 'pond-art-info'), go = el('a', 'pond-read', 'Read on Medium ↗'); go.href = a.url; go.target = '_blank'; go.rel = 'noopener';
      info.append(el('span', 'pond-art-where', a.where), el('h3', '', a.title), el('p', 'pond-note', f.note), go);
      box.append(cover, info); body.appendChild(box);
    },
  };

  function show(id) {
    const f = FACTS.find((q) => q.id === id) || FACTS[0]; lastId = f.id;
    body.textContent = ''; body.className = 'pond-body kind-' + f.kind;
    kick.textContent = 'You caught a fact about me  ·  ' + (FACTS.indexOf(f) + 1) + ' of ' + FACTS.length; title.textContent = f.title;
    renderers[f.kind](f);
    dots.textContent = ''; FACTS.forEach((q) => dots.appendChild(el('i', q.id === f.id ? 'on' : '')));
    open = true; wrap.classList.add('show'); card.scrollTop = 0; sound.play('achieve');
    setTimeout(() => again.focus({ preventScroll: true }), 50);
  }
  function hide(silent) { if (!open) return; lbClose(); open = false; wrap.classList.remove('show'); if (!silent) { sound.play('close'); focusGame(); } }
  // the next catch is always a different fact from the last one
  const next = () => { const pool = FACTS.filter((q) => q.id !== lastId); return pool[(Math.random() * pool.length) | 0].id; };
  window.addEventListener('keydown', (e) => {
    if (!lbOpen) return;
    if (e.key === 'ArrowLeft') { lbShow(lbAt - 1); e.preventDefault(); } else if (e.key === 'ArrowRight') { lbShow(lbAt + 1); e.preventDefault(); } else if (e.key === 'Escape') { lbClose(); e.stopImmediatePropagation(); }
  }, true);
  return { show, hide: () => hide(), isOpen: () => open, next };
}
